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
    registerCommandInternal,
    unregisterCommandInternal,
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
 * Assembles and returns a standardized dependency object for use throughout the system.
 * This ensures that all modules have consistent access to core functionalities.
 * @returns {import('./types.js').Dependencies} The assembled dependencies object.
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
            registerCommand: registerCommandInternal,
            unregisterCommand: unregisterCommandInternal,
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
 * Validates that the core dependencies are available and of the correct type.
 * @param {import('./types.js').Dependencies} deps The dependencies object to validate.
 * @param {string} callContext The context from which this function is called.
 * @returns {boolean} True if the dependencies are valid.
 */
function validateDependencies(deps, callContext) {
    const mainContext = `[${mainModuleName}.validateDependencies from ${callContext}]`;
    const errors = [];

    const dependencyChecks = {
        'playerDataManager.ensurePlayerDataInitialized': 'function',
        'playerUtils.debugLog': 'function',
        'playerUtils.getString': 'function',
        'actionManager.executeCheckAction': 'function',
        'system.runInterval': 'function',
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
                if (current === null || typeof current !== 'object' || !current.hasOwnProperty(key)) {
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
 * Performs all initializations for the AntiCheat system.
 */
function performInitializations() {
    const dependencies = getStandardDependencies();
    validateDependencies(dependencies, 'performInitializations - startup');

    dependencies.playerUtils.debugLog('Anti-Cheat Script Loaded. Performing initializations...', 'System', dependencies);

    subscribeToEvents(dependencies);
    initializeModules(dependencies);
    validateConfigurations(dependencies);

    mc.world.sendMessage(dependencies.playerUtils.getString('system.core.initialized', { version: configModule.acVersion }));
    dependencies.playerUtils.debugLog(`[${mainModuleName}] Anti-Cheat Core System Initialized. Tick loop active.`, 'System', dependencies);

    mc.system.runInterval(() => mainTick(dependencies), 1);
    mc.system.runInterval(() => tpaTick(dependencies), TPA_SYSTEM_TICK_INTERVAL);
}
/**
 * Subscribes to all necessary Minecraft server events.
 * @param {import('./types.js').Dependencies} dependencies The dependencies object.
 */
function subscribeToEvents(dependencies) {
    dependencies.playerUtils.debugLog(`[${mainModuleName}] Subscribing to events...`, 'System', dependencies);

    mc.world.beforeEvents.chatSend.subscribe(async (eventData) => {
        if (eventData.message.startsWith(dependencies.config.prefix)) {
            const commandHandlingDependencies = { ...dependencies, commandDefinitionMap, commandExecutionMap };
            await handleChatCommand(eventData, commandHandlingDependencies);
        } else {
            await handleBeforeChatSend(eventData, dependencies);
        }
    });

    const eventSubscriptions = {
        'playerSpawn': handlePlayerSpawn,
        'playerLeave': handlePlayerLeave,
        'entityHurt': handleEntityHurt,
        'playerBreakBlock': handlePlayerBreakBlockBeforeEvent,
        'afterPlayerBreakBlock': handlePlayerBreakBlockAfterEvent,
        'itemUse': handleItemUse,
        'playerPlaceBlock': handlePlayerPlaceBlockBefore,
        'afterPlayerPlaceBlock': handlePlayerPlaceBlockAfterEvent,
        'afterPlayerInventoryItemChange': (eventData) => handleInventoryItemChange(eventData.player, eventData.newItemStack, eventData.oldItemStack, eventData.inventorySlot, dependencies),
        'afterPlayerDimensionChange': handlePlayerDimensionChangeAfterEvent,
        'afterEntityDie': (eventData) => {
            if (eventData.deadEntity.typeId === mc.MinecraftEntityTypes.player.id) {
                handlePlayerDeath(eventData, dependencies);
            }
            if (dependencies.config.enableDeathEffects) {
                handleEntityDieForDeathEffects(eventData, dependencies);
            }
        },
        'afterEntitySpawn': handleEntitySpawnEventAntiGrief,
        'afterPistonActivate': handlePistonActivateAntiGrief,
    };

    for (const eventName in eventSubscriptions) {
        const handler = eventSubscriptions[eventName];
        const eventEmitter = eventName.startsWith('after') ? mc.world.afterEvents : mc.world.beforeEvents;
        const actualEventName = eventName.startsWith('after') ? eventName.substring(5) : eventName;
        eventEmitter[actualEventName].subscribe((eventData) => handler(eventData, dependencies));
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
async function mainTick(dependencies) {
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

    const allPlayers = mc.world.getAllPlayers();
    cleanupActivePlayerData(allPlayers, dependencies);

    for (const player of allPlayers) {
        await processPlayer(player, dependencies);
    }

    if (currentTick % PERIODIC_DATA_PERSISTENCE_INTERVAL_TICKS === 0) {
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
        dependencies.playerUtils.debugLog(`[TickLoop] Error in ensurePlayerDataInitialized for ${player?.nameTag}: ${e.message}`, player?.nameTag, dependencies);
        return;
    }

    if (!pData) {
        return;
    }

    updateTransientPlayerData(player, pData, dependencies);
    clearExpiredItemUseStates(pData, dependencies);

    for (const checkName in checks) {
        const checkFunction = checks[checkName];
        if (typeof checkFunction !== 'function') {
            continue;
        }

        const configKey = `enable${checkName.charAt(0).toUpperCase() + checkName.slice(1)}`;
        if (dependencies.config[configKey]) {
            try {
                await checkFunction(player, pData, dependencies);
            } catch (checkError) {
                const errorMessage = `[TickLoop] Error during ${checkName} for ${player?.nameTag}: ${checkError?.message ?? 'Unknown error'}`;
                dependencies.playerUtils.debugLog(errorMessage, player?.nameTag, dependencies);
                addLog({
                    actionType: 'error.main.playerTick.checkFail',
                    context: 'Main.TickLoop.playerChecks',
                    targetName: player?.nameTag || 'UnknownPlayer',
                    details: {
                        check: checkName,
                        configKey,
                        message: checkError?.message ?? 'N/A',
                        rawErrorStack: checkError?.stack ?? 'N/A',
                    },
                }, dependencies);
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
    dependencies.playerUtils.debugLog(`Performing periodic data persistence.`, 'System', dependencies);
    for (const player of allPlayers) {
        if (!player.isValid()) {
            continue;
        }
        const pData = getPlayerData(player.id);
        if (pData?.isDirtyForSave) {
            await saveDirtyPlayerData(player, dependencies);
        }
    }
    persistLogCacheToDisk(dependencies);
    persistReportsToDisk(dependencies);
}


/**
 * Processes TPA (Teleport Ask) system ticks.
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
 * @param {number} retryCount The current retry count.
 */
function attemptInitializeSystem(retryCount = 0) {
    try {
        if (!mc.world || !mc.world.beforeEvents || !mc.world.afterEvents || !mc.system) {
            throw new Error('Core Minecraft APIs not ready');
        }

        const tempStartupDepsForLog = getStandardDependencies();
        validateDependencies(tempStartupDepsForLog, `attemptInitializeSystem - pre-check - attempt ${retryCount}`);

        console.log(`[${mainModuleName}] APIs ready, initializing...`);
        performInitializations();
    } catch (e) {
        const delay = initialRetryDelayTicks * Math.pow(2, retryCount);
        console.warn(`[${mainModuleName}] Initialization failed. Retrying in ${delay / 20}s. Attempt ${retryCount + 1}/${maxInitRetries}. Error: ${e.message}`);

        if (retryCount < maxInitRetries) {
            mc.system.runTimeout(() => attemptInitializeSystem(retryCount + 1), delay);
        } else {
            console.error(`[${mainModuleName}] CRITICAL: MAX RETRIES REACHED. System will not initialize.`);
        }
    }
}

mc.system.runTimeout(() => attemptInitializeSystem(), initialRetryDelayTicks);
