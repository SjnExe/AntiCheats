import { logError } from './modules/utils/playerUtils.js';
import { Player } from '@minecraft/server';

const periodicDataPersistenceIntervalTicks = 600;
const stalePurgeCleanupIntervalTicks = 72000; // Once per hour
export const tpaSystemTickInterval = 20;

export async function mainTick(dependencies, tickEvent) {
    const { logManager, system, mc } = dependencies;

    // Guard clause to prevent the tick loop from running before the addon is initialized.
    if (!mc.world.getDynamicProperty('ac:initialized')) {
        return;
    }

    const currentTick = tickEvent?.currentTick ?? system.currentTick;
    try {
        await processTick(dependencies, currentTick);
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
    }
}

async function processTick(dependencies, currentTick) {
    const { config, worldBorderManager, playerDataManager, playerUtils, logManager, mc } = dependencies;

    if (config.enableWorldBorderSystem) {
        try {
            worldBorderManager.processWorldBorderResizing(dependencies);
        } catch (e) {
            playerUtils.debugLog(`[TickLoop] Error processing world border resizing: ${e.message}`, 'System', dependencies);
            logManager.addLog({
                actionType: 'error.main.worldBorderResize',
                context: 'Main.TickLoop.worldBorderResizing',
                details: {
                    errorMessage: e.message,
                    stack: e.stack,
                },
            }, dependencies);
        }
    }

    const allEntities = mc.world.getPlayers();
    const playerProcessingPromises = [];

    for (const entity of allEntities) {
        if (entity instanceof Player) {
            playerProcessingPromises.push(processPlayer(entity, dependencies, currentTick));
        }
    }

    await Promise.all(playerProcessingPromises);

    if (currentTick % periodicDataPersistenceIntervalTicks === 0) {
        // We need to filter again here to pass only players to the persistence function
        const onlinePlayers = allEntities.filter(e => e instanceof Player);
        await handlePeriodicDataPersistence(onlinePlayers, dependencies);
    }

    if (currentTick % stalePurgeCleanupIntervalTicks === 0) {
        await playerDataManager.cleanupStaleScheduledFlagPurges(dependencies);
    }
}

async function processPlayer(player, dependencies, currentTick) {
    const { config, checks, playerDataManager, playerUtils, logManager, worldBorderManager } = dependencies;

    // The check for player validity is now handled in processTick before this function is called.
    if (!player.isValid()) {
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

    if (pData.isTakingFallDamage) {
        pData.isTakingFallDamage = false;
        pData.isDirtyForSave = true;
    }
    if (pData.fallDistance > 0 && player.isOnGround) {
        pData.fallDistance = 0;
        pData.isDirtyForSave = true;
    }

    playerDataManager.updateTransientPlayerData(player, pData, dependencies);
    playerDataManager.clearExpiredItemUseStates(pData, dependencies);

    const staggerTicks = config.checkStaggerTicks || 1;
    const playerNameHash = pData.playerNameHash ?? 0;
    const checkNames = Object.keys(checks).sort();

    for (let i = 0; i < checkNames.length; i++) {
        const checkName = checkNames[i];
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
    const { playerUtils, playerDataManager, logManager, reportManager, tpaManager } = dependencies;
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
    const { config, tpaManager, logManager, mc } = dependencies;
    try {
        if (!config.enableTpaSystem) {
            return;
        }

        tpaManager.clearExpiredRequests(dependencies);

        const requestsInWarmup = tpaManager.getRequestsInWarmup();
        if (requestsInWarmup.length > 0) {
            const onlinePlayers = mc.world.getAllPlayers();
            const playerMap = new Map(onlinePlayers.map(p => [p.name, p]));

            for (const req of requestsInWarmup) {
                const requester = playerMap.get(req.requesterName);
                const target = playerMap.get(req.targetName);

                if (!requester?.isValid() || !target?.isValid()) {
                    const invalidPlayerName = !requester?.isValid() ? req.requesterName : req.targetName;
                    const reasonMsgKey = 'tpa.manager.error.teleportWarmupTargetInvalid';
                    const reasonLog = `A player (${invalidPlayerName}) involved in TPA request ${req.requestId} went offline during warmup.`;
                    tpaManager.cancelTeleport(req.requestId, reasonMsgKey, reasonLog, dependencies);
                    continue;
                }

                if (req.status !== 'pendingTeleportWarmup') {
                    continue;
                }

                if (config.tpaCancelOnMoveDuringWarmup) {
                    tpaManager.checkPlayerMovementDuringWarmup(req, dependencies);
                    if (req.status !== 'pendingTeleportWarmup') {
                        continue;
                    }
                }

                if (Date.now() >= (req.warmupExpiryTimestamp || 0)) {
                    tpaManager.executeTeleport(req.requestId, dependencies);
                }
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
