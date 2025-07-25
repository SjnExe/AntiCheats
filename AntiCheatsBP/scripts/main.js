import { system, world } from '@minecraft/server';

import { automodConfig } from './core/automodConfig.js';
import { checkActionProfiles } from './core/actionProfiles.js';
import * as checks from './checks/index.js'; // Keep as namespace for simplicity
import {
    initializeCommands,
    getAllRegisteredCommandNames,
} from './core/commandManager.js';
import * as configModule from './config.js';
import {
    handlePlayerSpawn,
    handlePlayerLeaveBeforeEvent,
    handleEntityHurt,
    handlePlayerBreakBlockBeforeEvent,
    handlePlayerBreakBlockAfterEvent,
    handleItemUse,
    handlePlayerPlaceBlockBefore,
    handlePlayerPlaceBlockAfterEvent,
    handleInventoryItemChange,
    handlePlayerDimensionChangeAfterEvent,
    handleEntityDieForDeathEffects,
    handleEntitySpawnEventAntiGrief,
    handlePistonActivateAntiGrief,
    handleBeforeChatSend,
    handlePlayerDeath,
} from './core/eventHandlers.js';
import { logError } from './utils/playerUtils.js';
import { initializeLogCache, addLog, persistLogCacheToDisk } from './core/logManager.js';
import {
    ensurePlayerDataInitialized,
    getPlayerData,
    updateTransientPlayerData,
    clearExpiredItemUseStates,
    saveDirtyPlayerData,
    getActivePlayers,
    cleanupStaleScheduledFlagPurges,
} from './core/playerDataManager.js';
import { initializeRanks } from './core/rankManager.js';
import { initializeReportCache, persistReportsToDisk } from './core/reportManager.js';
import { getBorderSettings, processWorldBorderResizing, enforceWorldBorderForPlayer } from './utils/worldBorderManager.js';
import {
    validateMainConfig,
    validateActionProfiles,
    validateAutoModConfig,
    validateRanksConfig,
} from './core/configValidator.js';
import { rankDefinitions, defaultChatFormatting, defaultNametagPrefix, defaultPermissionLevel } from './core/ranksConfig.js';
import { DependencyManager } from './core/dependencyManager.js';

const dependencyManager = new DependencyManager();
const maxInitRetries = 3;
const initialRetryDelayTicks = 20;
const periodicDataPersistenceIntervalTicks = 600;
const stalePurgeCleanupIntervalTicks = 72000; // Once per hour
const tpaSystemTickInterval = 20;

let isProcessingTick = false;

/**
 * Initializes the AntiCheat system.
 */
function performInitializations() {
    const dependencies = dependencyManager.build();
    dependencyManager.validateDependencies('performInitializations - startup');

    dependencies.playerUtils.debugLog('Anti-Cheat Script Loaded. Performing initializations...', 'System', dependencies);

    subscribeToEvents(dependencies);
    initializeModules(dependencies);
    validateConfigurations(dependencies);

    world.sendMessage({ 'translate': 'system.core.initialized', 'with': { 'version': configModule.acVersion } });
    dependencies.playerUtils.debugLog('[Main] Anti-Cheat Core System Initialized. Tick loop active.', 'System', dependencies);

    system.runInterval(() => {
        mainTick().catch(e => {
            logError(`Critical unhandled error in mainTick: ${e?.message}`, e);
            try {
                const depsForError = dependencyManager.getDependenciesUnsafe();
                if (depsForError) {
                    depsForError.logManager.addLog({
                        actionType: 'error.main.tick.unhandled.rejection',
                        context: 'Main.TickLoop.TopLevel',
                        details: { errorMessage: e?.message, stack: e?.stack },
                    }, depsForError);
                }
            } catch (loggingError) {
                logError(`CRITICAL: Failed to write to structured log during top-level tick error: ${loggingError.message}`, loggingError);
            }
        });
    }, 1);
    system.runInterval(() => tpaTick(), tpaSystemTickInterval);
}
/**
 * Subscribes to all necessary server events.
 * @param {import('./types.js').Dependencies} dependencies The dependencies object.
 */
function subscribeToEvents(dependencies) {
    const mainModuleName = 'CoreSystem';
    dependencies.playerUtils.debugLog(`[${mainModuleName}] Subscribing to events...`, 'System', dependencies);

    world.beforeEvents.chatSend.subscribe((eventData) => handleBeforeChatSend(eventData, dependencies));

    const beforeEventSubscriptions = {
        playerBreakBlock: handlePlayerBreakBlockBeforeEvent,
        itemUse: handleItemUse,
        playerPlaceBlock: handlePlayerPlaceBlockBefore,
        playerLeave: handlePlayerLeaveBeforeEvent,
    };

    const afterEventSubscriptions = {
        playerSpawn: handlePlayerSpawn,
        entityHurt: handleEntityHurt,
        playerBreakBlock: handlePlayerBreakBlockAfterEvent,
        playerPlaceBlock: handlePlayerPlaceBlockAfterEvent,
        playerDimensionChange: handlePlayerDimensionChangeAfterEvent,
        entityDie: handleEntityDieForDeathEffects,
        entitySpawn: handleEntitySpawnEventAntiGrief,
        pistonActivate: handlePistonActivateAntiGrief,
        inventoryItemChanged: handleInventoryItemChange,
        playerDeath: handlePlayerDeath,
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
 * @param {import('./types.js').Dependencies} dependencies The dependencies object.
 */
function initializeModules(dependencies) {
    const mainModuleName = 'CoreSystem';
    dependencies.playerUtils.debugLog(`[${mainModuleName}] Initializing modules...`, 'System', dependencies);

    initializeCommands(dependencies);
    initializeLogCache(dependencies);
    initializeReportCache(dependencies);
    initializeRanks(dependencies);

    if (dependencies.config.enableWorldBorderSystem) {
        const knownDims = dependencies.config.worldBorderKnownDimensions || ['minecraft:overworld', 'minecraft:the_nether', 'minecraft:the_end'];
        knownDims.forEach(dimId => getBorderSettings(dimId, dependencies));
        dependencies.playerUtils.debugLog(`[${mainModuleName}] World border settings loaded.`, 'System', dependencies);
    }
}
/**
 * Validates all configurations.
 * @param {import('./types.js').Dependencies} dependencies The dependencies object.
 */
function validateConfigurations(dependencies) {
    const mainModuleName = 'CoreSystem';
    dependencies.playerUtils.debugLog(`[${mainModuleName}] Validating configurations...`, 'System', dependencies);
    const allValidationErrors = [];
    const knownCommands = getAllRegisteredCommandNames();

    const validationTasks = [
        () => validateMainConfig(configModule.defaultConfigSettings, checkActionProfiles, knownCommands, configModule.commandAliases),
        () => validateActionProfiles(checkActionProfiles),
        () => validateAutoModConfig(automodConfig, checkActionProfiles),
        () => validateRanksConfig({ rankDefinitions, defaultChatFormatting, defaultNametagPrefix, defaultPermissionLevel }, dependencies.config.ownerPlayerName, dependencies.config.adminTag),
    ];

    const errorContexts = ['config.js', 'actionProfiles.js', 'automodConfig.js', 'ranksConfig.js'];

    validationTasks.forEach((task, index) => {
        const errors = task();
        if (errors.length > 0) {
            const context = errorContexts[index];
            dependencies.playerUtils.debugLog(`[${mainModuleName}] ${context} validation errors found:`, 'SystemCritical', dependencies);
            errors.forEach(err => dependencies.playerUtils.debugLog(`    - ${err}`, 'SystemError', dependencies));
            allValidationErrors.push(...errors.map(e => `[${context}] ${e}`));
        }
    });

    if (allValidationErrors.length > 0) {
        const summaryMessage = `CRITICAL: AntiCheat configuration validation failed with ${allValidationErrors.length} error(s). Check logs for details.`;
        dependencies.playerUtils.notifyAdmins(summaryMessage, dependencies);
    } else {
        dependencies.playerUtils.debugLog(`[${mainModuleName}] All configurations validated successfully.`, 'System', dependencies);
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
            const depsForError = dependencyManager.getDependenciesUnsafe();
            if (depsForError) {
                addLog({
                    actionType: 'error.main.tick.unhandled',
                    context: 'Main.TickLoop',
                    details: { errorMessage: e?.message, stack: e?.stack },
                }, depsForError);
            } else {
                logError('CRITICAL: Could not get dependencies for structured logging in main tick.');
            }
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
    const dependencies = dependencyManager.getAll();
    dependencies.currentTick++; // Manually increment the tick in the dependencies
    dependencyManager.updateCurrentTick(dependencies.currentTick); // Update the manager

    if (dependencies.config.enableWorldBorderSystem) {
        try {
            processWorldBorderResizing(dependencies);
        } catch (e) {
            dependencies.playerUtils.debugLog(`[TickLoop] Error processing world border resizing: ${e.message}`, 'System', dependencies);
            addLog({ actionType: 'errorMainWorldBorderResize', context: 'Main.TickLoop.worldBorderResizing', details: { errorMessage: e.message, stack: e.stack } }, dependencies);
        }
    }

    const activePlayerData = getActivePlayers();
    for (const pData of activePlayerData) {
        const player = world.getPlayer(pData.playerId);
        if (player) {
            await processPlayer(player, dependencies, dependencies.currentTick);
        }
    }

    if (dependencies.currentTick % periodicDataPersistenceIntervalTicks === 0) {
        const onlinePlayers = world.getAllPlayers();
        await handlePeriodicDataPersistence(onlinePlayers, dependencies);
    }

    if (dependencies.currentTick % stalePurgeCleanupIntervalTicks === 0) {
        await cleanupStaleScheduledFlagPurges(dependencies);
    }
}
/**
 * Processes all checks and updates for a single player.
 * @param {mc.Player} player The player to process.
 * @param {import('./types.js').Dependencies} dependencies The dependencies object.
 */
async function processPlayer(player, dependencies, currentTick) {
    if (!player?.isValid()) {
        return;
    }

    let pData;
    try {
        pData = await ensurePlayerDataInitialized(player, currentTick, dependencies);
    } catch (e) {
        dependencies.playerUtils.debugLog(`[TickLoop] Error in ensurePlayerDataInitialized for ${player?.name}: ${e.message}`, player?.name, dependencies);
        return;
    }

    if (!pData) {
        return;
    }

    updateTransientPlayerData(player, pData, dependencies);
    clearExpiredItemUseStates(pData, dependencies);

    const checkNames = Object.keys(checks).sort();
    const staggerTicks = dependencies.config.checkStaggerTicks || 1;

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

        const checkConfig = dependencies.config.checks[checkName];
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
                    dependencies.playerUtils.debugLog(errorMessage, player?.name, dependencies);
                    addLog({
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

    if (dependencies.config.enableWorldBorderSystem) {
        enforceWorldBorderForPlayer(player, pData, dependencies);
    }
}

/**
 * Handles the periodic saving of data to disk.
 * @param {mc.Player[]} allPlayers
 * @param {import('./types.js').Dependencies} dependencies
 */
async function handlePeriodicDataPersistence(allPlayers, dependencies) {
    dependencies.playerUtils.debugLog('Performing periodic data persistence.', 'System', dependencies);
    for (const player of allPlayers) {
        if (!player.isValid()) {
            continue;
        }
        const pData = getPlayerData(player.id);
        if (pData?.isDirtyForSave) {
            await saveDirtyPlayerData(player, dependencies);
        }
    }
    await persistLogCacheToDisk(dependencies);
    persistReportsToDisk(dependencies);
}


/**
 * Processes TPA system ticks.
 */
function tpaTick() {
    try {
        const dependencies = dependencyManager.getAll();
        if (!dependencies.config.enableTpaSystem) {
            return;
        }

        dependencies.tpaManager.clearExpiredRequests(dependencies);

        dependencies.tpaManager.getRequestsInWarmup().forEach(req => {
            const requester = world.getPlayer(req.requesterName);
            const target = world.getPlayer(req.targetName);

            if (!requester?.isValid() || !target?.isValid()) {
                const invalidPlayerName = !requester?.isValid() ? req.requesterName : req.targetName;
                const reasonMsgKey = 'tpa.manager.error.teleportWarmupTargetInvalid';
                const reasonLog = `A player (${invalidPlayerName}) involved in TPA request ${req.requestId} went offline during warmup.`;
                dependencies.tpaManager.cancelTeleport(req.requestId, reasonMsgKey, reasonLog, dependencies);
                return;
            }

            if (req.status !== 'pendingTeleportWarmup') {
                return;
            }

            if (dependencies.config.tpaCancelOnMoveDuringWarmup) {
                dependencies.tpaManager.checkPlayerMovementDuringWarmup(req, dependencies);
                // checkPlayerMovementDuringWarmup might cancel the request, so we check status again.
                if (req.status !== 'pendingTeleportWarmup') {
                    return;
                }
            }

            if (Date.now() >= (req.warmupExpiryTimestamp || 0)) {
                dependencies.tpaManager.executeTeleport(req.requestId, dependencies);
            }
        });
    } catch (e) {
        logError(`Unhandled error in tpaTick: ${e?.message}`, e);
        const depsForError = dependencyManager.getDependenciesUnsafe();
        if (depsForError) {
            addLog({
                actionType: 'error.main.tpaTick.unhandled',
                context: 'Main.tpaTick',
                details: { errorMessage: e?.message, stack: e?.stack },
            }, depsForError);
        }
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

        dependencyManager.validateDependencies(`attemptInitializeSystem - pre-check - attempt ${retryCount}`);
        performInitializations();
    } catch (e) {
        const delay = initialRetryDelayTicks;
        const isFinalAttempt = retryCount >= maxInitRetries;
        const errorMessage = `Initialization failed on attempt ${retryCount + 1}. ${isFinalAttempt ? 'FINAL ATTEMT FAILED.' : `Retrying in ${delay / 20}s.`} Error: ${e.message}`;

        logError(errorMessage, e);

        try {
            const dependencies = dependencyManager.getDependenciesUnsafe();
            if (dependencies) {
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
                addLog(logEntry, dependencies);

                if (isFinalAttempt) {
                    const criticalErrorMsg = `[Main] CRITICAL: MAX RETRIES REACHED. System will not initialize. Last error: ${e.message}`;
                    dependencies.playerUtils.notifyAdmins(criticalErrorMsg, dependencies);
                }
            } else {
                logError('CRITICAL: Could not get dependencies for structured logging during initialization.');
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
