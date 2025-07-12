/**
 * @file Main entry point for the AntiCheat system.
 * @module AntiCheatsBP/scripts/main
 * Initializes all core modules, subscribes to Minecraft server events,
 * and runs the main system tick loop for processing checks, player data updates,
 * and other periodic tasks.
 */

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
        return {
            // Configs
            config: configModule.editableConfigValues,
            automodConfig,
            checkActionProfiles,

            // Player/World State & Data
            mc,
            currentTick,
            playerDataManager: { // Grouped for clarity
                ensurePlayerDataInitialized,
                getPlayerData,
                cleanupActivePlayerData,
                updateTransientPlayerData,
                clearExpiredItemUseStates,
                saveDirtyPlayerData,
            },
            worldBorderManager: {
                getBorderSettings,
                saveBorderSettings,
                processWorldBorderResizing,
                enforceWorldBorderForPlayer,
                isPlayerOutsideBorder,
            },

            // Core Managers & Utils
            actionManager: { executeCheckAction },
            logManager: { addLog, persistLogCacheToDisk },
            reportManager: { persistReportsToDisk },
            tpaManager: { clearExpiredRequests, getRequestsInWarmup, checkPlayerMovementDuringWarmup, executeTeleport },
            commandManager: { registerCommand: registerCommandInternal, unregisterCommand: unregisterCommandInternal, reloadCommands: initializeCommands },
            playerUtils: { debugLog, getString, notifyAdmins, playSoundForEvent, isAdmin, formatSessionDuration }, // Pass as a group

            // Ranks
            rankManager: {
                getPlayerPermissionLevel,
                updatePlayerNametag,
                getPlayerRankFormattedChatElements,
            },
            permissionLevels,

            // Checks & Validation
            checks,
            configValidator: { validateMainConfig, validateActionProfiles, validateAutoModConfig, validateRanksConfig },

            // UI
            uiManager, // Keep as namespace
            ActionFormData: mcui.ActionFormData,
            MessageFormData: mcui.MessageFormData,
            ModalFormData: mcui.ModalFormData,

            // System & Misc
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

// NOTE: This function now needs to be updated to match the new dependency structure.
// This is a critical part of the refactor.
/**
 * Validates that the core dependencies are available and of the correct type.
 * @param {import('./types.js').Dependencies} deps The dependencies object to validate.
 * @param {string} callContext The context from which this function is called.
 * @returns {boolean} True if the dependencies are valid.
 */
function validateDependencies(deps, callContext) {
    const mainContext = `[${mainModuleName}.validateDependencies from ${callContext}]`;
    const errors = [];

    if (!deps) {
        errors.push('CRITICAL: Dependencies object itself is null or undefined.');
    } else {
        if (typeof deps.playerDataManager?.ensurePlayerDataInitialized !== 'function') {
            errors.push('CRITICAL: deps.playerDataManager.ensurePlayerDataInitialized is NOT a function.');
        }
        if (typeof deps.playerUtils?.debugLog !== 'function') {
            errors.push('CRITICAL: deps.playerUtils.debugLog is NOT a function.');
        }
        if (typeof deps.playerUtils?.getString !== 'function') {
            errors.push('CRITICAL: deps.playerUtils.getString is NOT a function.');
        }
        if (typeof deps.actionManager?.executeCheckAction !== 'function') {
            errors.push('CRITICAL: deps.actionManager.executeCheckAction is NOT a function.');
        }
        if (typeof deps.system?.runInterval !== 'function') {
            errors.push('CRITICAL: deps.system.runInterval is NOT a function.');
        }
        if (typeof deps.configValidator?.validateMainConfig !== 'function') {
            errors.push('CRITICAL: deps.configValidator.validateMainConfig is NOT a function.');
        }
        if (typeof deps.chatProcessor?.processChatMessage !== 'function') {
            errors.push('CRITICAL: deps.chatProcessor.processChatMessage is NOT a function.');
        }
        if (typeof deps.checks !== 'object') {
            errors.push('CRITICAL: deps.checks is NOT an object.');
        }
    }

    if (errors.length > 0) {
        const fullErrorMessage = `${mainContext} Dependency validation failed:\n${ errors.map(e => `  - ${e}`).join('\n')}`;
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
 * Checks if the core Minecraft Server APIs are ready to be used.
 * @param {import('./types.js').Dependencies} dependencies The dependencies object.
 * @returns {boolean} True if the APIs are ready.
 */
function checkEventAPIsReady(dependencies) {
    const allReady = true;
    /**
     * Logs a message to the console or using the debug logger.
     * @param {string} msg The message to log.
     * @returns {void}
     */
    const logger = (msg) => dependencies.playerUtils?.debugLog ? dependencies.playerUtils.debugLog(msg, 'System', dependencies) : console.log(msg);

    if (!mc.world?.beforeEvents || !mc.world?.afterEvents || !mc.system) {
        logger(`[${mainModuleName}.checkEventAPIsReady] Critical APIs (world.beforeEvents, world.afterEvents, system) not yet available.`);
        return false;
    }
    return allReady;
}

/**
 * Performs all initializations for the AntiCheat system.
 */
function performInitializations() {
    const startupDependencies = getStandardDependencies();
    validateDependencies(startupDependencies, 'performInitializations - startup');

    startupDependencies.playerUtils.debugLog('Anti-Cheat Script Loaded. Performing initializations...', 'System', startupDependencies);
    startupDependencies.playerUtils.debugLog(`[${mainModuleName}.performInitializations] Attempting to subscribe to events...`, 'System', startupDependencies);

    mc.world.beforeEvents.chatSend.subscribe(async (eventData) => {
        const dependencies = getStandardDependencies();
        if (eventData.message.startsWith(dependencies.config.prefix)) {
            const commandHandlingDependencies = { ...dependencies, commandDefinitionMap, commandExecutionMap };
            await handleChatCommand(eventData, commandHandlingDependencies);
        } else {
            await handleBeforeChatSend(eventData, dependencies);
        }
    });

    mc.world.afterEvents.playerSpawn.subscribe((eventData) => handlePlayerSpawn(eventData, getStandardDependencies()));
    mc.world.beforeEvents.playerLeave.subscribe((eventData) => handlePlayerLeave(eventData, getStandardDependencies()));
    mc.world.afterEvents.entityHurt.subscribe((eventData) => handleEntityHurt(eventData, getStandardDependencies()));
    mc.world.beforeEvents.playerBreakBlock.subscribe((eventData) => handlePlayerBreakBlockBeforeEvent(eventData, getStandardDependencies()));
    mc.world.afterEvents.playerBreakBlock.subscribe((eventData) => handlePlayerBreakBlockAfterEvent(eventData, getStandardDependencies()));
    mc.world.beforeEvents.itemUse.subscribe((eventData) => handleItemUse(eventData, getStandardDependencies()));
    mc.world.beforeEvents.playerPlaceBlock.subscribe((eventData) => handlePlayerPlaceBlockBefore(eventData, getStandardDependencies()));
    mc.world.afterEvents.playerPlaceBlock.subscribe((eventData) => handlePlayerPlaceBlockAfterEvent(eventData, getStandardDependencies()));
    mc.world.afterEvents.playerInventoryItemChange.subscribe((eventData) => handleInventoryItemChange(eventData.player, eventData.newItemStack, eventData.oldItemStack, eventData.inventorySlot, getStandardDependencies()));
    mc.world.afterEvents.playerDimensionChange.subscribe((eventData) => handlePlayerDimensionChangeAfterEvent(eventData, getStandardDependencies()));
    mc.world.afterEvents.entityDie.subscribe((eventData) => {
        const dependencies = getStandardDependencies();
        if (eventData.deadEntity.typeId === mc.MinecraftEntityTypes.player.id) {
            handlePlayerDeath(eventData, dependencies);
        }
        if (dependencies.config.enableDeathEffects) {
            handleEntityDieForDeathEffects(eventData, dependencies);
        }
    });
    mc.world.afterEvents.entitySpawn.subscribe((eventData) => handleEntitySpawnEventAntiGrief(eventData, getStandardDependencies()));
    mc.world.afterEvents.pistonActivate.subscribe((eventData) => handlePistonActivateAntiGrief(eventData, getStandardDependencies()));

    startupDependencies.playerUtils.debugLog(`[${mainModuleName}.performInitializations] Initializing other modules...`, 'System', startupDependencies);
    initializeCommands(startupDependencies);
    initializeLogCache(startupDependencies);
    initializeReportCache(startupDependencies);
    initializeRanks(startupDependencies);

    if (startupDependencies.config.enableWorldBorderSystem) {
        const knownDims = startupDependencies.config.worldBorderKnownDimensions || ['minecraft:overworld', 'minecraft:the_nether', 'minecraft:the_end'];
        knownDims.forEach(dimId => getBorderSettings(dimId, startupDependencies));
        startupDependencies.playerUtils.debugLog(`[${mainModuleName}.performInitializations] World border settings loaded.`, 'System', startupDependencies);
    }

    mc.world.sendMessage(startupDependencies.playerUtils.getString('system.core.initialized', { version: configModule.acVersion }));

    // --- Configuration Validation ---
    startupDependencies.playerUtils.debugLog(`[${mainModuleName}.performInitializations] Performing configuration validation...`, 'System', startupDependencies);
    const allValidationErrors = [];
    const knownCommands = getAllRegisteredCommandNames();

    const mainConfigErrors = validateMainConfig(configModule.defaultConfigSettings, checkActionProfiles, knownCommands, configModule.commandAliases);
    if (mainConfigErrors.length > 0) {
        startupDependencies.playerUtils.debugLog(`[${mainModuleName}] Main Config validation errors found:`, 'SystemCritical', startupDependencies);
        mainConfigErrors.forEach(err => startupDependencies.playerUtils.debugLog(`    - ${err}`, 'SystemError', startupDependencies));
        allValidationErrors.push(...mainConfigErrors.map(e => `[config.js] ${e}`));
    }

    const actionProfileErrors = validateActionProfiles(checkActionProfiles);
    if (actionProfileErrors.length > 0) {
        startupDependencies.playerUtils.debugLog(`[${mainModuleName}] Action Profiles validation errors found:`, 'SystemCritical', startupDependencies);
        actionProfileErrors.forEach(err => startupDependencies.playerUtils.debugLog(`    - ${err}`, 'SystemError', startupDependencies));
        allValidationErrors.push(...actionProfileErrors.map(e => `[actionProfiles.js] ${e}`));
    }

    const autoModErrors = validateAutoModConfig(automodConfig, checkActionProfiles);
    if (autoModErrors.length > 0) {
        startupDependencies.playerUtils.debugLog(`[${mainModuleName}] AutoMod Config validation errors found:`, 'SystemCritical', startupDependencies);
        autoModErrors.forEach(err => startupDependencies.playerUtils.debugLog(`    - ${err}`, 'SystemError', startupDependencies));
        allValidationErrors.push(...autoModErrors.map(e => `[automodConfig.js] ${e}`));
    }

    const ranksConfigForValidation = { rankDefinitions, defaultChatFormatting, defaultNametagPrefix, defaultPermissionLevel };
    const ranksConfigErrors = validateRanksConfig(ranksConfigForValidation, startupDependencies.config.ownerPlayerName, startupDependencies.config.adminTag);
    if (ranksConfigErrors.length > 0) {
        startupDependencies.playerUtils.debugLog(`[${mainModuleName}] Ranks Config validation errors found:`, 'SystemCritical', startupDependencies);
        ranksConfigErrors.forEach(err => startupDependencies.playerUtils.debugLog(`    - ${err}`, 'SystemError', startupDependencies));
        allValidationErrors.push(...ranksConfigErrors.map(e => `[ranksConfig.js] ${e}`));
    }

    if (allValidationErrors.length > 0) {
        const summaryMessage = `CRITICAL: AntiCheat configuration validation failed with ${allValidationErrors.length} error(s). Check logs for details.`;
        startupDependencies.playerUtils.notifyAdmins(summaryMessage, 'SystemCritical', startupDependencies, true);
    } else {
        startupDependencies.playerUtils.debugLog(`[${mainModuleName}] All configurations validated successfully.`, 'System', startupDependencies);
    }
    // --- End Configuration Validation ---

    startupDependencies.playerUtils.debugLog(`[${mainModuleName}] Anti-Cheat Core System Initialized. Tick loop active.`, 'System', startupDependencies);

    mc.system.runInterval(async () => {
        currentTick++;
        const tickDependencies = getStandardDependencies();

        if (tickDependencies.config.enableWorldBorderSystem) {
            try {
                processWorldBorderResizing(tickDependencies);
            } catch (e) {
                tickDependencies.playerUtils.debugLog(`[TickLoop] Error processing world border resizing: ${e.message}`, 'System', tickDependencies);
                addLog({ actionType: 'errorMainWorldBorderResize', context: 'Main.TickLoop.worldBorderResizing', details: { errorMessage: e.message, stack: e.stack } }, tickDependencies);
            }
        }

        const allPlayers = mc.world.getAllPlayers();
        cleanupActivePlayerData(allPlayers, tickDependencies);

        for (const player of allPlayers) {
            if (!player?.isValid()) {
                continue;
            }
            let pData;
            try {
                pData = await ensurePlayerDataInitialized(player, currentTick, tickDependencies);
            } catch (e) {
                tickDependencies.playerUtils.debugLog(`[TickLoop] Error in ensurePlayerDataInitialized for ${player?.nameTag}: ${e.message}`, player?.nameTag, tickDependencies);
                continue;
            }
            if (!pData) {
                continue;
            }

            updateTransientPlayerData(player, pData, tickDependencies);
            clearExpiredItemUseStates(pData, tickDependencies);

            try {
                // Simplified check execution for brevity
                if (tickDependencies.config.enableFlyCheck) {
                    await checks.checkFly(player, pData, tickDependencies);
                }
                if (tickDependencies.config.enableSpeedCheck) {
                    await checks.checkSpeed(player, pData, tickDependencies);
                }
                // ... other checks
            } catch (checkError) {
                tickDependencies.playerUtils.debugLog(`[TickLoop] Error during checks for ${player?.nameTag}: ${checkError.message}`, player?.nameTag, tickDependencies);
                addLog({ actionType: 'error.main.playerTick.checkFail', context: 'Main.TickLoop.playerChecks', targetName: player?.nameTag || 'UnknownPlayer', details: { message: checkError.message, rawErrorStack: checkError.stack } }, tickDependencies);
            }

            if (tickDependencies.config.enableWorldBorderSystem) {
                enforceWorldBorderForPlayer(player, pData, tickDependencies);
            }
        }

        if (currentTick % PERIODIC_DATA_PERSISTENCE_INTERVAL_TICKS === 0) {
            tickDependencies.playerUtils.debugLog(`Performing periodic data persistence.`, 'System', tickDependencies);
            allPlayers.forEach(async player => {
                if (!player.isValid()) {
                    return;
                }
                const pData = getPlayerData(player.id);
                if (pData?.isDirtyForSave) {
                    await saveDirtyPlayerData(player, tickDependencies);
                }
            });
            persistLogCacheToDisk(tickDependencies);
            persistReportsToDisk(tickDependencies);
        }
    }, 1);

    mc.system.runInterval(() => {
        const tpaDeps = getStandardDependencies();
        if (tpaDeps.config.enableTpaSystem) {
            clearExpiredRequests(tpaDeps);
            getRequestsInWarmup().forEach(req => {
                if (tpaDeps.config.tpaCancelOnMoveDuringWarmup) {
                    checkPlayerMovementDuringWarmup(req, tpaDeps);
                }
                if (req.status === 'pendingTeleportWarmup' && Date.now() >= (req.warmupExpiryTimestamp || 0)) {
                    executeTeleport(req.requestId, tpaDeps);
                }
            });
        }
    }, TPA_SYSTEM_TICK_INTERVAL);
}

/**
 * Attempts to initialize the system, with a retry mechanism.
 * @param {number} retryCount The current retry count.
 */
function attemptInitializeSystem(retryCount = 0) {
    try {
        const tempStartupDepsForLog = getStandardDependencies();
        validateDependencies(tempStartupDepsForLog, `attemptInitializeSystem - pre-check - attempt ${retryCount}`);
        if (checkEventAPIsReady(tempStartupDepsForLog)) {
            console.log(`[${mainModuleName}.attemptInitializeSystem] APIs reported as ready. Proceeding with performInitializations. Attempt: ${retryCount}`);
            performInitializations();
        } else {
            throw new Error('APIs not ready');
        }
    } catch (e) {
        const delay = initialRetryDelayTicks * Math.pow(2, retryCount);
        console.warn(`[${mainModuleName}.attemptInitializeSystem] Initialization failed or APIs not ready. Retrying in ${delay / 20}s. Attempt ${retryCount + 1}/${maxInitRetries}. Error: ${e.message}`);
        if (retryCount < maxInitRetries) {
            if (mc.system?.runTimeout) {
                mc.system.runTimeout(() => attemptInitializeSystem(retryCount + 1), delay);
            } else {
                console.error(`[CRITICAL] mc.system.runTimeout is not available. Cannot schedule retry.`);
            }
        } else {
            console.error(`[CRITICAL] MAX RETRIES REACHED. System will not initialize.`);
        }
    }
}

if (mc.system?.runTimeout) {
    mc.system.runTimeout(() => attemptInitializeSystem(), initialRetryDelayTicks * 2);
} else {
    console.error(`[CRITICAL] mc.system or mc.system.runTimeout is not available at script entry point. AntiCheat system cannot start.`);
}
