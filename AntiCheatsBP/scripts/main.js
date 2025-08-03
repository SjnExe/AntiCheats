import {
    system,
    world,
} from '@minecraft/server';
import {
    logError,
} from './modules/utils/playerUtils.js';
import * as dependencies from './core/dependencyManager.js';

const {
    config,
    checks,
    playerDataManager,
    logManager,
    reportManager,
    worldBorderManager,
    playerUtils,
    tpaManager,
} = dependencies;

const periodicDataPersistenceIntervalTicks = 600;
const stalePurgeCleanupIntervalTicks = 72000; // Once per hour
export const tpaSystemTickInterval = 20;

// Pre-calculate the sorted list of check names once on module load for efficiency.
const checkNames = Object.keys(checks).sort();

let currentTick = 0;

export async function mainTick() {
    try {
        // The mainTick is only started after initialization, so no need to check the flag.
        // The main processing logic can run directly.
        await processTick();

        // Schedule the next tick.
        system.run(mainTick);

    } catch (e) {
        logError(`Critical unhandled error in mainTick: ${e?.message}`, e);
        try {
            logManager.addLog({
                actionType: 'error.main.tick.unhandled.rejection',
                context: 'Main.TickLoop.TopLevel',
                details: {
                    errorMessage: e?.message,
                    stack: e?.stack,
                },
            }, dependencies);
        } catch (loggingError) {
            logError(`CRITICAL: Failed to write to structured log during top-level tick error: ${loggingError.message}`, loggingError);
        }
        // NOTE: The tick loop is intentionally NOT rescheduled here to prevent runaway error loops.
        // The server admin must investigate the error and restart the server/addon.
    }
}

async function processTick() {
    currentTick++;

    if (config.enableWorldBorderSystem) {
        try {
            worldBorderManager.processWorldBorderResizing(dependencies);
        } catch (e) {
            playerUtils.debugLog(`[TickLoop] Error processing world border resizing: ${e.message}`, 'System', dependencies);
            logManager.addLog({
                actionType: 'errorMainWorldBorderResize',
                context: 'Main.TickLoop.worldBorderResizing',
                details: {
                    errorMessage: e.message,
                    stack: e.stack,
                },
            }, dependencies);
        }
    }

    const onlinePlayers = world.getAllPlayers();
    for (const player of onlinePlayers) {
        // processPlayer already handles invalid players, so we can just call it directly.
        // This ensures every online player is processed every tick, fixing the race condition.
        await processPlayer(player, dependencies, currentTick);
    }

    if (currentTick % periodicDataPersistenceIntervalTicks === 0) {
        // We can reuse the onlinePlayers list from the loop above.
        await handlePeriodicDataPersistence(onlinePlayers, dependencies);
    }

    if (currentTick % stalePurgeCleanupIntervalTicks === 0) {
        await playerDataManager.cleanupStaleScheduledFlagPurges(dependencies);
    }
}

async function processPlayer(player, dependencies, currentTick) {
    if (!player?.isValid()) {
        return;
    }

    let pData;
    try {
        pData = await playerDataManager.ensurePlayerDataInitialized(player, currentTick, dependencies);
    } catch (e) {
        playerUtils.debugLog(`[TickLoop] Error in ensurePlayerDataInitialized for ${player?.name}: ${e.message}`, player?.name, dependencies);
        return;
    }

    if (!pData) {
        return;
    }

    // Reset per-tick state flags at the beginning of the player's tick processing.
    if (pData.isTakingFallDamage) {
        pData.isTakingFallDamage = false;
        pData.isDirtyForSave = true;
    }
    // If the player had a recorded fall distance from a previous tick and is now on the ground,
    // reset the distance. This ensures the value from a fall is available for the entire tick
    // on which the player lands, and is then cleared for the next tick.
    if (pData.fallDistance > 0 && player.isOnGround) {
        pData.fallDistance = 0;
        pData.isDirtyForSave = true;
    }

    playerDataManager.updateTransientPlayerData(player, pData, dependencies);
    playerDataManager.clearExpiredItemUseStates(pData, dependencies);

    const staggerTicks = config.checkStaggerTicks || 1;
    const playerNameHash = pData.playerNameHash ?? 0;

    for (let i = 0; i < checkNames.length; i++) {
        const checkName = checkNames[i];
        // Use the index 'i' directly for staggering, avoiding the expensive indexOf call.
        if ((currentTick + playerNameHash + i) % staggerTicks !== 0) {
            continue;
        }

        const checkFunction = checks[checkName];
        if (typeof checkFunction !== 'function') {
            continue;
        }

        const checkConfig = config.checks[checkName];
        if (checkConfig?.enabled) {
            const lastCheckTick = pData.lastCheckTick?.[checkName] || 0;
            const interval = checkConfig.intervalTicks || 1;
            if (currentTick - lastCheckTick >= interval) {
                pData.lastCheckTick = pData.lastCheckTick || {};
                pData.lastCheckTick[checkName] = currentTick;
                try {
                    await checkFunction(player, pData, dependencies);
                } catch (checkError) {
                    const errorMessage = `[TickLoop] Error during ${checkName} for ${player?.name}: ${checkError?.message ?? 'Unknown error'}`;
                    playerUtils.debugLog(errorMessage, player?.name, dependencies);
                    logManager.addLog({
                        actionType: 'error.main.playerTick.checkFail',
                        context: 'Main.TickLoop.playerChecks',
                        targetName: player?.name || 'UnknownPlayer',
                        details: {
                            check: checkName,
                            message: checkError?.message ?? 'N/A',
                            rawErrorStack: checkError?.stack ?? 'N/A',
                        },
                    }, dependencies);
                }
            }
        }
    }

    if (config.enableWorldBorderSystem) {
        worldBorderManager.enforceWorldBorderForPlayer(player, pData, dependencies);
    }
}

async function handlePeriodicDataPersistence(allPlayers, dependencies) {
    playerUtils.debugLog('Performing periodic data persistence.', 'System', dependencies);
    for (const player of allPlayers) {
        if (!player.isValid()) {
            continue;
        }
        const pData = playerDataManager.getPlayerData(player.id);
        if (pData?.isDirtyForSave) {
            playerDataManager.saveDirtyPlayerData(player, dependencies);
        }
    }
    await logManager.persistLogCacheToDisk(dependencies);
    reportManager.persistReportsToDisk(dependencies);
    tpaManager.persistTpaState(dependencies);
}

export function tpaTick(dependencies) {
    try {
        if (!config.enableTpaSystem) {
            return;
        }

        tpaManager.clearExpiredRequests(dependencies);

        const requestsInWarmup = tpaManager.getRequestsInWarmup();
        for (const req of requestsInWarmup) {
            const requester = world.getPlayers({ name: req.requesterName })[0];
            const target = world.getPlayers({ name: req.targetName })[0];

            if (!requester?.isValid() || !target?.isValid()) {
                const invalidPlayerName = !requester?.isValid() ? req.requesterName : req.targetName;
                const reasonMsgKey = 'tpa.manager.error.teleportWarmupTargetInvalid';
                const reasonLog = `A player (${invalidPlayerName}) involved in TPA request ${req.requestId} went offline during warmup.`;
                tpaManager.cancelTeleport(req.requestId, reasonMsgKey, reasonLog, dependencies);
                continue; // Skip to the next request
            }

            // If the request was cancelled for any reason (e.g., movement), its status will have changed.
            // This check ensures we don't proceed with a cancelled or already processed request.
            if (req.status !== 'pendingTeleportWarmup') {
                continue;
            }

            if (config.tpaCancelOnMoveDuringWarmup) {
                tpaManager.checkPlayerMovementDuringWarmup(req, dependencies);
                // Re-check status, as the above function may have cancelled it.
                if (req.status !== 'pendingTeleportWarmup') {
                    continue;
                }
            }

            if (Date.now() >= (req.warmupExpiryTimestamp || 0)) {
                tpaManager.executeTeleport(req.requestId, dependencies);
            }
        }
    } catch (e) {
        logError(`Unhandled error in tpaTick: ${e?.message}`, e);
        logManager.addLog({
            actionType: 'error.main.tpaTick.unhandled',
            context: 'Main.tpaTick',
            details: {
                errorMessage: e?.message,
                stack: e?.stack,
            },
        }, dependencies);
    }
}
