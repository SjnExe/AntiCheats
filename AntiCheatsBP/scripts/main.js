import { system, world } from '@minecraft/server';
import * as mc from '@minecraft/server';
import * as mcui from '@minecraft/server-ui';

import { executeCheckAction } from './core/actionManager.js';
import { automodConfig } from './core/automodConfig.js';
import { processChatMessage } from './core/chatProcessor.js';
import { checkActionProfiles } from './core/actionProfiles.js';
import * as checks from './checks/index.js'; // Keep as namespace for simplicity
import {
    initializeCommands,
    handleChatCommand,
    getAllRegisteredCommandNames,
    commandDefinitionMap,
    commandExecutionMap,
} from './core/commandManager.js';
import * as configModule from './config.js';
import {
    handlePlayerSpawn,
    handlePlayerLeave,
    handleEntityHurt,
    handlePlayerBreakBlockBeforeEvent,
    handlePlayerBreakBlockAfterEvent,
    handleItemUse,
    handlePlayerPlaceBlockBefore,
    handlePlayerPlaceBlockAfterEvent,
    handleInventoryItemChange,
    handlePlayerDimensionChangeAfterEvent,
    handlePlayerDeath,
    handleEntityDieForDeathEffects,
    handleEntitySpawnEventAntiGrief,
    handlePistonActivateAntiGrief,
    handleBeforeChatSend,
} from './core/eventHandlers.js';
import { initializeLogCache, addLog, persistLogCacheToDisk } from './core/logManager.js';
import {
    ensurePlayerDataInitialized,
    getPlayerData,
    cleanupActivePlayerData,
    updateTransientPlayerData,
    clearExpiredItemUseStates,
    saveDirtyPlayerData,
} from './core/playerDataManager.js';
import { debugLog, getString, notifyAdmins, playSoundForEvent, isAdmin, formatSessionDuration } from './utils/playerUtils.js';
import {
    initializeRanks,
    getPlayerPermissionLevel,
    updatePlayerNametag,
    getPlayerRankFormattedChatElements,
    permissionLevels,
} from './core/rankManager.js';
import { initializeReportCache, persistReportsToDisk } from './core/reportManager.js';
import { clearExpiredRequests, getRequestsInWarmup, checkPlayerMovementDuringWarmup, executeTeleport } from './core/tpaManager.js';
import * as uiManager from './core/uiManager.js'; // Keep as namespace, UI calls are diverse
import {
    getBorderSettings,
    saveBorderSettings,
    processWorldBorderResizing,
    enforceWorldBorderForPlayer,
    isPlayerOutsideBorder,
} from './utils/worldBorderManager.js';
import {
    validateMainConfig,
    validateActionProfiles,
    validateAutoModConfig,
    validateRanksConfig,
} from './core/configValidator.js';
import { rankDefinitions, defaultChatFormatting, defaultNametagPrefix, defaultPermissionLevel } from './core/ranksConfig.js';

let currentTick = 0;
const mainModuleName = 'Main';

const profilingData = {
    tickLoop: { totalTime: 0, count: 0, maxTime: 0, minTime: Infinity, history: [] },
    playerChecks: {},
    eventHandlers: {},
};
const MAX_PROFILING_HISTORY = 100;


/**
 * Assembles and returns the standardized dependency object.
 * @returns {import('./types.js').Dependencies} The dependencies object.
 */
function getStandardDependencies() {
    try {
        const playerDataManager = {
            ensurePlayerDataInitialized,
            getPlayerData,
            cleanupActivePlayerData,
            updateTransientPlayerData,
            clearExpiredItemUseStates,
            saveDirtyPlayerData,
        };

        const worldBorderManager = {
            getBorderSettings,
            saveBorderSettings,
            processWorldBorderResizing,
            enforceWorldBorderForPlayer,
            isPlayerOutsideBorder,
        };

        const commandManager = {
            reloadCommands: initializeCommands,
        };

        const playerUtils = {
            debugLog,
            getString,
            notifyAdmins,
            playSoundForEvent,
            isAdmin,
            formatSessionDuration,
        };

        const rankManager = {
            getPlayerPermissionLevel,
            updatePlayerNametag,
            getPlayerRankFormattedChatElements,
        };

        const configValidator = {
            validateMainConfig,
            validateActionProfiles,
            validateAutoModConfig,
            validateRanksConfig,
        };

        return {
            config: configModule.editableConfigValues,
            automodConfig,
            checkActionProfiles,
            mc,
            currentTick,
            playerDataManager,
            worldBorderManager,
            actionManager: { executeCheckAction },
            logManager: { addLog, persistLogCacheToDisk },
            reportManager: { persistReportsToDisk },
            tpaManager: { clearExpiredRequests, getRequestsInWarmup, checkPlayerMovementDuringWarmup, executeTeleport },
            commandManager,
            playerUtils,
            rankManager,
            permissionLevels,
            checks,
            configValidator,
            uiManager,
            ActionFormData: mcui.ActionFormData,
            MessageFormData: mcui.MessageFormData,
            ModalFormData: mcui.ModalFormData,
            system: mc.system,
            ItemComponentTypes: mc.ItemComponentTypes,
            chatProcessor: { processChatMessage },
            editableConfig: configModule,
            profilingData,
            MAX_PROFILING_HISTORY,
        };
    } catch (error) {
        console.error(`[${mainModuleName}.getStandardDependencies CRITICAL] Error during initial assembly: ${error.stack || error}`);
        throw error;
    }
}


/**
 * Validates the core dependencies object.
 * @param {import('./types.js').Dependencies} deps The dependencies object.
 * @param {string} callContext The context of the call.
 * @returns {boolean} True if dependencies are valid.
 */
function validateDependencies(deps, callContext) {
    const mainContext = `[${mainModuleName}.validateDependencies from ${callContext}]`;
    const errors = [];

    const dependencyChecks = {
        'playerDataManager.ensurePlayerDataInitialized': 'function',
        'playerUtils.debugLog': 'function',
        'playerUtils.getString': 'function',
        'actionManager.executeCheckAction': 'function',
        'configValidator.validateMainConfig': 'function',
        'chatProcessor.processChatMessage': 'function',
        'checks': 'object',
    };

    if (!deps) {
        errors.push('CRITICAL: Dependencies object itself is null or undefined.');
    } else {
        for (const keyPath in dependencyChecks) {
            const expectedType = dependencyChecks[keyPath];
            const keys = keyPath.split('.');
            let current = deps;
            let path = '';
            for (const key of keys) {
                path = path ? `${path}.${key}` : key;
                if (current === null || typeof current !== 'object' || !Object.prototype.hasOwnProperty.call(current, key)) {
                    errors.push(`CRITICAL: deps.${path} is missing.`);
                    current = undefined;
                    break;
                }
                current = current[key];
            }

            if (current !== undefined && typeof current !== expectedType) {
                errors.push(`CRITICAL: deps.${keyPath} is NOT a ${expectedType}.`);
            }
        }
    }

    if (errors.length > 0) {
        const fullErrorMessage = `${mainContext} Dependency validation failed:\n${errors.map(e => `  - ${e}`).join('\n')}`;
        console.error('!!!! CRITICAL DEPENDENCY VALIDATION FAILURE !!!!');
        console.error(fullErrorMessage);
        throw new Error(fullErrorMessage);
    }

    return true;
}

const maxInitRetries = 3;
const initialRetryDelayTicks = 20;
const PERIODIC_DATA_PERSISTENCE_INTERVAL_TICKS = 600;
const TPA_SYSTEM_TICK_INTERVAL = 20;

/**
 * Initializes the AntiCheat system.
 */
function performInitializations() {
    const dependencies = getStandardDependencies();
    validateDependencies(dependencies, 'performInitializations - startup');

    dependencies.playerUtils.debugLog('Anti-Cheat Script Loaded. Performing initializations...', 'System', dependencies);

    subscribeToEvents(dependencies);
    initializeModules(dependencies);
    validateConfigurations(dependencies);

    world.sendMessage({ translate: 'system.core.initialized', with: { version: configModule.acVersion } });
    dependencies.playerUtils.debugLog(`[${mainModuleName}] Anti-Cheat Core System Initialized. Tick loop active.`, 'System', dependencies);

    system.runInterval(() => mainTick(dependencies), 1);
    system.runInterval(() => tpaTick(dependencies), TPA_SYSTEM_TICK_INTERVAL);
}
/**
 * Subscribes to all necessary server events.
 * @param {import('./types.js').Dependencies} dependencies The dependencies object.
 */
function subscribeToEvents(dependencies) {
    dependencies.playerUtils.debugLog(`[${mainModuleName}] Subscribing to events...`, 'System', dependencies);

    world.beforeEvents.chatSend.subscribe(async (eventData) => {
        if (eventData.message.startsWith(dependencies.config.prefix)) {
            const commandHandlingDependencies = { ...dependencies, commandDefinitionMap, commandExecutionMap };
            await handleChatCommand(eventData, commandHandlingDependencies);
        } else {
            await handleBeforeChatSend(eventData, dependencies);
        }
    });

    const beforeEventSubscriptions = {
        'playerBreakBlock': handlePlayerBreakBlockBeforeEvent,
        'itemUse': handleItemUse,
        'playerPlaceBlock': handlePlayerPlaceBlockBefore,
    };

    const afterEventSubscriptions = {
        'playerSpawn': handlePlayerSpawn,
        'playerLeave': handlePlayerLeave,
        'entityHurt': handleEntityHurt,
        'playerBreakBlock': handlePlayerBreakBlockAfterEvent,
        'playerPlaceBlock': handlePlayerPlaceBlockAfterEvent,
        'playerDimensionChange': handlePlayerDimensionChangeAfterEvent,
        'entityDie': (eventData) => {
            if (eventData.deadEntity.typeId === 'minecraft:player') {
                handlePlayerDeath(eventData, dependencies);
            }
            if (dependencies.config.enableDeathEffects) {
                handleEntityDieForDeathEffects(eventData, dependencies);
            }
        },
        'entitySpawn': handleEntitySpawnEventAntiGrief,
        'pistonActivate': handlePistonActivateAntiGrief,
        'playerInventorySlotChange': (eventData) => handleInventoryItemChange(eventData.player, eventData.itemStack, eventData.previousItemStack, eventData.slot, dependencies),
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
        dependencies.playerUtils.notifyAdmins(summaryMessage, 'SystemCritical', dependencies, true);
    } else {
        dependencies.playerUtils.debugLog(`[${mainModuleName}] All configurations validated successfully.`, 'System', dependencies);
    }
}
/**
 * Processes all tasks for a single system tick.
 * @param {import('./types.js').Dependencies} dependencies The dependencies object.
 */
function mainTick(dependencies) {
    system.runJob(mainTickGenerator(dependencies));
}

/**
 * Generator function for the main tick loop.
 * @param {import('./types.js').Dependencies} dependencies
 */
async function* mainTickGenerator(dependencies) {
    currentTick++;
    dependencies.currentTick = currentTick;

    if (dependencies.config.enableWorldBorderSystem) {
        try {
            processWorldBorderResizing(dependencies);
        } catch (e) {
            dependencies.playerUtils.debugLog(`[TickLoop] Error processing world border resizing: ${e.message}`, 'System', dependencies);
            addLog({ actionType: 'errorMainWorldBorderResize', context: 'Main.TickLoop.worldBorderResizing', details: { errorMessage: e.message, stack: e.stack } }, dependencies);
        }
    }

    const allPlayers = world.getAllPlayers();
    cleanupActivePlayerData(allPlayers, dependencies);

    for (const player of allPlayers) {
        yield; // Yield to the next iteration of the generator
        await processPlayer(player, dependencies);
    }

    if (currentTick % PERIODIC_DATA_PERSISTENCE_INTERVAL_TICKS === 0) {
        yield; // Yield before this potentially long-running task
        await handlePeriodicDataPersistence(allPlayers, dependencies);
    }
}
/**
 * Processes all checks and updates for a single player.
 * @param {mc.Player} player The player to process.
 * @param {import('./types.js').Dependencies} dependencies The dependencies object.
 */
async function processPlayer(player, dependencies) {
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

    // Stagger checks across ticks
    const checkNames = Object.keys(checks);
    const checksPerTick = Math.ceil(checkNames.length / (dependencies.config.checkStaggerTicks || 1));
    const tickOffset = currentTick % (dependencies.config.checkStaggerTicks || 1);
    const checksToRun = checkNames.slice(tickOffset * checksPerTick, (tickOffset + 1) * checksPerTick);

    for (const checkName of checksToRun) {
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
 * @param {import('./types.js').Dependencies} dependencies The dependencies object.
 */
function tpaTick(dependencies) {
    if (dependencies.config.enableTpaSystem) {
        clearExpiredRequests(dependencies);
        getRequestsInWarmup().forEach(req => {
            if (dependencies.config.tpaCancelOnMoveDuringWarmup) {
                checkPlayerMovementDuringWarmup(req, dependencies);
            }
            if (req.status === 'pendingTeleportWarmup' && Date.now() >= (req.warmupExpiryTimestamp || 0)) {
                executeTeleport(req.requestId, dependencies);
            }
        });
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

        const tempStartupDepsForLog = getStandardDependencies();
        validateDependencies(tempStartupDepsForLog, `attemptInitializeSystem - pre-check - attempt ${retryCount}`);

        // console.log(`[${mainModuleName}] APIs ready, initializing...`);
        performInitializations();
    } catch (e) {
        const delay = initialRetryDelayTicks * Math.pow(2, retryCount);
        console.warn(`[${mainModuleName}] Initialization failed. Retrying in ${delay / 20}s. Attempt ${retryCount + 1}/${maxInitRetries}. Error: ${e.message}`);

        if (retryCount < maxInitRetries) {
            system.runTimeout(() => attemptInitializeSystem(retryCount + 1), delay);
        } else {
            console.error(`[${mainModuleName}] CRITICAL: MAX RETRIES REACHED. System will not initialize.`);
        }
    }
}

system.runTimeout(() => attemptInitializeSystem(), initialRetryDelayTicks);
