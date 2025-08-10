import { world } from '@minecraft/server';
import { logError } from './modules/utils/playerUtils.js';

const periodicDataPersistenceIntervalTicks = 600;
const stalePurgeCleanupIntervalTicks = 72000; // Once per hour
export const tpaSystemTickInterval = 20;

let currentTick = 0;

/**
 * @param {import('./types.js').Dependencies} dependencies
 */
export async function mainTick(dependencies) {
    const { logManager } = dependencies;
    try {
        await processTick(dependencies);
    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        const errorStack = e instanceof Error ? e.stack : undefined;
        logError(`Critical unhandled error in mainTick: ${errorMessage}`, e);
        try {
            logManager.addLog({
                actionType: 'error.main.tick.unhandled.rejection',
                context: 'Main.TickLoop.TopLevel',
                details: {
                    errorMessage: errorMessage,
                    stack: errorStack,
                },
            }, dependencies);
        } catch (loggingError) {
            const loggingErrorMessage = loggingError instanceof Error ? loggingError.message : String(loggingError);
            logError(`CRITICAL: Failed to write to structured log during top-level tick error: ${loggingErrorMessage}`, loggingError);
        }
    }
}

/**
 * @param {import('./types.js').Dependencies} dependencies
 */
async function processTick(dependencies) {
    const { config, worldBorderManager, playerDataManager, playerUtils, logManager } = dependencies;
    currentTick++;

    if (config.enableWorldBorderSystem) {
        try {
            worldBorderManager.processWorldBorderResizing(dependencies);
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : String(e);
            const errorStack = e instanceof Error ? e.stack : undefined;
            playerUtils.debugLog(`[TickLoop] Error processing world border resizing: ${errorMessage}`, 'System', dependencies);
            logManager.addLog({
                actionType: 'error.main.worldBorderResize',
                context: 'Main.TickLoop.worldBorderResizing',
                details: {
                    errorMessage: errorMessage,
                    stack: errorStack,
                },
            }, dependencies);
        }
    }

    const onlinePlayers = world.getAllPlayers();
    const playerProcessingPromises = onlinePlayers.map(player => processPlayer(player, dependencies, currentTick));
    await Promise.all(playerProcessingPromises);

    if (currentTick % periodicDataPersistenceIntervalTicks === 0) {
        await handlePeriodicDataPersistence(onlinePlayers, dependencies);
    }

    if (currentTick % stalePurgeCleanupIntervalTicks === 0) {
        await playerDataManager.cleanupStaleScheduledFlagPurges(dependencies);
    }
}

/**
 * @param {import('@minecraft/server').Player} player
 * @param {import('./types.js').Dependencies} dependencies
 * @param {number} currentTick
 */
async function processPlayer(player, dependencies, currentTick) {
    const { config, checks, playerDataManager, playerUtils, logManager, worldBorderManager } = dependencies;

    if (!player?.isValid()) {
        return;
    }

    let pData;
    try {
        pData = await playerDataManager.ensurePlayerDataInitialized(player, currentTick, dependencies);
    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        playerUtils.debugLog(`[TickLoop] Error in ensurePlayerDataInitialized for ${player?.name}: ${errorMessage}`, player?.name, dependencies);
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
                    const errorMessage = checkError instanceof Error ? checkError.message : String(checkError);
                    const errorStack = checkError instanceof Error ? checkError.stack : undefined;
                    const logMessage = `[TickLoop] Error during ${checkName} for ${player?.name}: ${errorMessage}`;
                    playerUtils.debugLog(logMessage, player?.name, dependencies);
                    logManager.addLog({
                        actionType: 'error.main.playerTick.checkFail',
                        context: 'Main.TickLoop.playerChecks',
                        targetName: player?.name || 'UnknownPlayer',
                        details: {
                            check: checkName,
                            message: errorMessage,
                            rawErrorStack: errorStack,
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

/**
 * @param {import('@minecraft/server').Player[]} allPlayers
 * @param {import('./types.js').Dependencies} dependencies
 */
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

/**
 * @param {import('./types.js').Dependencies} dependencies
 */
export function tpaTick(dependencies) {
    const { config, tpaManager, logManager } = dependencies;
    try {
        if (!config.enableTpaSystem) {
            return;
        }

        tpaManager.clearExpiredRequests(dependencies);

        const requestsInWarmup = tpaManager.getRequestsInWarmup();
        if (requestsInWarmup.length > 0) {
            const onlinePlayers = world.getAllPlayers();
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
        const errorMessage = e instanceof Error ? e.message : String(e);
        const errorStack = e instanceof Error ? e.stack : undefined;
        logError(`Unhandled error in tpaTick: ${errorMessage}`, e);
        logManager.addLog({
            actionType: 'error.main.tpaTick.unhandled',
            context: 'Main.tpaTick',
            details: {
                errorMessage: errorMessage,
                stack: errorStack,
            },
        }, dependencies);
    }
}
