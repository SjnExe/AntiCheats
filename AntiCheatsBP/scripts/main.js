// A simple, early-stage error handler to catch issues during the initial script load phase.
// This is crucial for diagnosing problems that prevent the main error handling mechanisms from starting.
try {
    // Top-level error boundary for the entire script initialization.
    // If this fails, it indicates a severe issue, likely with module resolution or a syntax error in a critical file.
    system.events.beforeWatchdogTerminate.subscribe(data => {
        // This event fires just before the script watchdog terminates the script due to a long-running operation.
        // It's a last-chance effort to log what was happening.
        console.warn(`[AntiCheat] Watchdog termination imminent. Reason: ${data.cancelationReason}`);
        // In a real-world scenario, you might try to log this to an external service if possible.
    });
} catch (e) {
    // This catch block will only execute if there's an error subscribing to the watchdog event itself,
    // which would be highly unusual but is included for completeness.
    console.error(`[AntiCheat] CRITICAL: Failed to subscribe to watchdog event: ${e}`);
}


import {
    system,
    world,
} from '@minecraft/server';

import {
    logError,
} from './utils/playerUtils.js';
import * as eventHandlers from './core/eventHandlers.js';
import * as dependencies from './core/dependencyManager.js';

const {
    config,
    automodConfig,
    checkActionProfiles,
    checks,
    commandManager,
    configModule,
    playerDataManager,
    logManager,
    reportManager,
    worldBorderManager,
    configValidator,
    playerUtils,
    rankManager,
    tpaManager,
} = dependencies;

const maxInitRetries = 3;
const initialRetryDelayTicks = 20;
const periodicDataPersistenceIntervalTicks = 600;
const stalePurgeCleanupIntervalTicks = 72000; // Once per hour
const tpaSystemTickInterval = 20;

let currentTick = 0;
let isProcessingTick = false;

/**
 * Initializes the AntiCheat system.
 */
function performInitializations() {
    playerUtils.debugLog('Anti-Cheat Script Loaded. Performing initializations...', 'System', dependencies);

    try {
        subscribeToEvents();
    } catch (e) {
        logError('CRITICAL: Failed to subscribe to events during initialization.', e);
        // We throw here because a failure to subscribe to events is catastrophic.
        // The main initialization loop will catch this and attempt a retry.
        throw new Error(`Event subscription failed: ${e.message}`);
    }

    try {
        initializeModules();
    } catch (e) {
        logError('CRITICAL: Failed to initialize core modules.', e);
        throw new Error(`Module initialization failed: ${e.message}`);
    }

    try {
        validateConfigurations();
    } catch (e) {
        logError('CRITICAL: An unexpected error occurred during configuration validation.', e);
        // This is a severe error, but we might not need to halt everything.
        // The validation function itself is expected to notify admins of specific issues.
        // We'll log it and continue, but this indicates a deeper problem.
        playerUtils.notifyAdmins('A critical, unexpected error occurred during config validation. Check server logs.', dependencies);
    }


    world.sendMessage({
        'translate': 'system.core.initialized',
        'with': {
            'version': configModule.acVersion,
        },
    });
    playerUtils.debugLog('[Main] Anti-Cheat Core System Initialized. Tick loop active.', 'System', dependencies);

    system.runInterval(async () => {
        try {
            await mainTick();
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
    });


    system.runInterval(() => tpaTick(dependencies), tpaSystemTickInterval);
}
/**
 * Subscribes to all necessary server events.
 */
function subscribeToEvents() {
    const mainModuleName = 'CoreSystem';
    playerUtils.debugLog(`[${mainModuleName}] Subscribing to events...`, 'System', dependencies);

    const beforeEventSubscriptions = {
        chatSend: eventHandlers.handleBeforeChatSend,
        playerBreakBlock: eventHandlers.handlePlayerBreakBlockBeforeEvent,
        itemUse: eventHandlers.handleItemUse,
        playerPlaceBlock: eventHandlers.handlePlayerPlaceBlockBefore,
        playerLeave: eventHandlers.handlePlayerLeaveBeforeEvent,
    };

    const afterEventSubscriptions = {
        playerSpawn: eventHandlers.handlePlayerSpawn,
        entityHurt: eventHandlers.handleEntityHurt,
        playerBreakBlock: eventHandlers.handlePlayerBreakBlockAfterEvent,
        playerPlaceBlock: eventHandlers.handlePlayerPlaceBlockAfterEvent,
        playerDimensionChange: eventHandlers.handlePlayerDimensionChangeAfterEvent,
        entityDie: eventHandlers.handleEntityDieForDeathEffects,
        entitySpawn: eventHandlers.handleEntitySpawnEventAntiGrief,
        pistonActivate: eventHandlers.handlePistonActivateAntiGrief,
        inventoryItemChanged: eventHandlers.handleInventoryItemChange,
        playerDeath: eventHandlers.handlePlayerDeath,
    };

    for (const eventName in beforeEventSubscriptions) {
        world.beforeEvents[eventName].subscribe((eventData) => beforeEventSubscriptions[eventName](eventData, dependencies));
    }

    for (const eventName in afterEventSubscriptions) {
        world.afterEvents[eventName].subscribe((eventData) => afterEventSubscriptions[eventName](eventData, dependencies));
    }
}
/**
 * Initializes all core modules.
 */
function initializeModules() {
    const mainModuleName = 'CoreSystem';
    playerUtils.debugLog(`[${mainModuleName}] Initializing modules...`, 'System', dependencies);

    commandManager.reloadCommands(dependencies);
    logManager.initializeLogCache(dependencies);
    reportManager.initializeReportCache(dependencies);
    rankManager.initializeRanks(dependencies);

    if (config.enableWorldBorderSystem) {
        const knownDims = config.worldBorderKnownDimensions || ['minecraft:overworld', 'minecraft:the_nether', 'minecraft:the_end'];
        knownDims.forEach(dimId => worldBorderManager.getBorderSettings(dimId, dependencies));
        playerUtils.debugLog(`[${mainModuleName}] World border settings loaded.`, 'System', dependencies);
    }
}
/**
 * Validates all configurations.
 */
function validateConfigurations() {
    const mainModuleName = 'CoreSystem';
    playerUtils.debugLog(`[${mainModuleName}] Validating configurations...`, 'System', dependencies);
    const allValidationErrors = [];
    const knownCommands = commandManager.getAllRegisteredCommandNames();

    const {
        rankDefinitions,
        defaultChatFormatting,
        defaultNametagPrefix,
        defaultPermissionLevel,
    } = rankManager;
    const validationTasks = [
        () => configValidator.validateMainConfig(configModule.defaultConfigSettings, checkActionProfiles, knownCommands, configModule.commandAliases),
        () => configValidator.validateActionProfiles(checkActionProfiles),
        () => configValidator.validateAutoModConfig(automodConfig, checkActionProfiles),
        () => configValidator.validateRanksConfig({
            rankDefinitions,
            defaultChatFormatting,
            defaultNametagPrefix,
            defaultPermissionLevel,
        }, config.ownerPlayerName, config.adminTag),
    ];

    const errorContexts = ['config.js', 'actionProfiles.js', 'automodConfig.js', 'ranksConfig.js'];

    validationTasks.forEach((task, index) => {
        const errors = task();
        if (errors.length > 0) {
            const context = errorContexts[index];
            playerUtils.debugLog(`[${mainModuleName}] ${context} validation errors found:`, 'SystemCritical', dependencies);
            errors.forEach(err => playerUtils.debugLog(`    - ${err}`, 'SystemError', dependencies));
            allValidationErrors.push(...errors.map(e => `[${context}] ${e}`));
        }
    });

    if (allValidationErrors.length > 0) {
        const summaryMessage = `CRITICAL: AntiCheat configuration validation failed with ${allValidationErrors.length} error(s).`;
        playerUtils.notifyAdmins(summaryMessage, dependencies);

        // To avoid chat spam, we'll send a limited number of detailed errors to admins in-game.
        const detailedErrorsToSend = allValidationErrors.slice(0, 5);
        const detailedMessage = '§cConfiguration Errors:§r\n' + detailedErrorsToSend.join('\n');
        playerUtils.notifyAdmins(detailedMessage, dependencies);

        if (allValidationErrors.length > 5) {
            playerUtils.notifyAdmins(`...and ${allValidationErrors.length - 5} more errors. Please check server logs for the full list.`, dependencies);
        }

    } else {
        playerUtils.debugLog(`[${mainModuleName}] All configurations validated successfully.`, 'System', dependencies);
    }
}
/**
 * Processes all tasks for a single system tick.
 */
async function mainTick() {
    if (isProcessingTick) {
        return;
    }

    isProcessingTick = true;
    try {
        await processTick();
    } catch (e) {
        logError(`Unhandled error in main tick processing: ${e?.message}`, e);

        try {
            logManager.addLog({
                actionType: 'error.main.tick.unhandled',
                context: 'Main.TickLoop',
                details: {
                    errorMessage: e?.message,
                    stack: e?.stack,
                },
            }, dependencies);
        } catch (loggingError) {
            logError(`CRITICAL: Failed to write to structured log during main tick error: ${loggingError.message}`, loggingError);
        }
    } finally {
        isProcessingTick = false;
    }
}

/**
 * Processes a single tick of the main loop.
 */
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

    const activePlayerData = playerDataManager.getActivePlayers();
    for (const pData of activePlayerData) {
        const player = world.getPlayer(pData.playerId);
        if (player) {
            await processPlayer(player, dependencies, currentTick);
        }
    }

    if (currentTick % periodicDataPersistenceIntervalTicks === 0) {
        const onlinePlayers = world.getAllPlayers();
        await handlePeriodicDataPersistence(onlinePlayers, dependencies);
    }

    if (currentTick % stalePurgeCleanupIntervalTicks === 0) {
        await playerDataManager.cleanupStaleScheduledFlagPurges(dependencies);
    }
}
/**
 * Processes all checks and updates for a single player.
 * @param {mc.Player} player The player to process.
 * @param {import('./types.js').Dependencies} dependencies The dependencies object.
 * @param {number} currentTick The current tick number.
 */
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

    playerDataManager.updateTransientPlayerData(player, pData, dependencies);
    playerDataManager.clearExpiredItemUseStates(pData, dependencies);

    const checkNames = Object.keys(checks).sort();
    const staggerTicks = config.checkStaggerTicks || 1;

    const playerNameHash = Array.from(player.name).reduce((hash, char) => (hash << 5) - hash + char.charCodeAt(0), 0);

    for (const checkName of checkNames) {
        const checkIndex = checkNames.indexOf(checkName);
        if ((currentTick + playerNameHash + checkIndex) % staggerTicks !== 0) {
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


/**
 * Handles the periodic saving of data to disk.
 * @param {mc.Player[]} allPlayers
 * @param {import('./types.js').Dependencies} dependencies
 */
async function handlePeriodicDataPersistence(allPlayers, dependencies) {
    playerUtils.debugLog('Performing periodic data persistence.', 'System', dependencies);
    for (const player of allPlayers) {
        if (!player.isValid()) {
            continue;
        }
        const pData = playerDataManager.getPlayerData(player.id);
        if (pData?.isDirtyForSave) {
            await playerDataManager.saveDirtyPlayerData(player, dependencies);
        }
    }
    await logManager.persistLogCacheToDisk(dependencies);
    reportManager.persistReportsToDisk(dependencies);
}


/**
 * Processes TPA system ticks.
 * @param {import('./types.js').Dependencies} dependencies The dependencies object.
 */
function tpaTick(dependencies) {
    try {
        if (!config.enableTpaSystem) {
            return;
        }

        tpaManager.clearExpiredRequests(dependencies);

        tpaManager.getRequestsInWarmup().forEach(req => {
            const requester = world.getPlayer(req.requesterName);
            const target = world.getPlayer(req.targetName);

            if (!requester?.isValid() || !target?.isValid()) {
                const invalidPlayerName = !requester?.isValid() ? req.requesterName : req.targetName;
                const reasonMsgKey = 'tpa.manager.error.teleportWarmupTargetInvalid';
                const reasonLog = `A player (${invalidPlayerName}) involved in TPA request ${req.requestId} went offline during warmup.`;
                tpaManager.cancelTeleport(req.requestId, reasonMsgKey, reasonLog, dependencies);
                return;
            }

            if (req.status !== 'pendingTeleportWarmup') {
                return;
            }

            if (config.tpaCancelOnMoveDuringWarmup) {
                tpaManager.checkPlayerMovementDuringWarmup(req, dependencies);
                // checkPlayerMovementDuringWarmup might cancel the request, so we check status again.
                if (req.status !== 'pendingTeleportWarmup') {
                    return;
                }
            }

            if (Date.now() >= (req.warmupExpiryTimestamp || 0)) {
                tpaManager.executeTeleport(req.requestId, dependencies);
            }
        });
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


/**
 * Attempts to initialize the system, with a retry mechanism.
 * @param {number} [retryCount=0] The current retry count.
 */
function attemptInitializeSystem(retryCount = 0) {
    try {
        if (!world || !world.beforeEvents || !world.afterEvents || !system) {
            throw new Error('Core Minecraft APIs not ready');
        }

        performInitializations();
    } catch (e) {
        const delay = initialRetryDelayTicks;
        const isFinalAttempt = retryCount >= maxInitRetries;
        const errorMessage = `Initialization failed on attempt ${retryCount + 1}. ${isFinalAttempt ? 'FINAL ATTEMT FAILED.' : `Retrying in ${delay / 20}s.`} Error: ${e.message}`;

        logError(errorMessage, e);

        try {
            const logEntry = {
                actionType: isFinalAttempt ? 'error.main.initialization.critical' : 'error.main.initialization.retry',
                context: 'Main.attemptInitializeSystem',
                details: {
                    message: e.message,
                    stack: e.stack,
                    retryCount: retryCount + 1,
                    maxRetries: maxInitRetries,
                },
            };
            logManager.addLog(logEntry, dependencies);

            if (isFinalAttempt) {
                const criticalErrorMsg = `[Main] CRITICAL: MAX RETRIES REACHED. System will not initialize. Last error: ${e.message}`;
                playerUtils.notifyAdmins(criticalErrorMsg, dependencies);
            }
        } catch (loggingError) {
            logError(`CRITICAL: Failed to write to structured log during initialization error: ${loggingError.message}`, loggingError);
        }

        if (!isFinalAttempt) {
            system.runTimeout(() => attemptInitializeSystem(retryCount + 1), delay);
        }
    }
}

let isInitialized = false;

/**
 * Main entry point for initializing the AntiCheat system.
 * This function is designed to be called once.
 */
function initializeAntiCheat() {
    if (isInitialized) {
        return;
    }
    try {
        attemptInitializeSystem();
        isInitialized = true;
    } catch (e) {
        logError(`CRITICAL: Unhandled error during initialization: ${e?.message}`, e);
    }
}

initializeAntiCheat();
