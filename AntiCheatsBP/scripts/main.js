/**
 * @file Main entry point for the AntiCheat system.
 * @module AntiCheatsBP/scripts/main
 * Initializes all core modules, subscribes to Minecraft server events,
 * and runs the main system tick loop for processing checks, player data updates,
 * and other periodic tasks.
 */

import * as mc from '@minecraft/server';
import * as mcui from '@minecraft/server-ui';

import * as actionManager from './core/actionManager.js';
import { automodConfig } from './core/automodConfig.js';
import * as chatProcessor from './core/chatProcessor.js';
import { checkActionProfiles } from './core/actionProfiles.js';
import * as checks from './checks/index.js';
import * as commandManager from './core/commandManager.js';
import * as configModule from './config.js';
import * as eventHandlers from './core/eventHandlers.js';
import * as logManager from './core/logManager.js';
import * as playerDataManager from './core/playerDataManager.js';
import * as playerUtils from './utils/playerUtils.js';
import * as rankManager from './core/rankManager.js';
import * as reportManager from './core/reportManager.js';
import * as tpaManager from './core/tpaManager.js';
import * as uiManager from './core/uiManager.js';
import * as worldBorderManager from './utils/worldBorderManager.js';
import * as configValidator from './core/configValidator.js'; // Added for config validation
import { rankDefinitions, defaultChatFormatting, defaultNametagPrefix, defaultPermissionLevel } from './core/ranksConfig.js'; // For ranksConfig validation

let currentTick = 0;
const mainModuleName = 'Main';

// Simple structure for profiling data
const profilingData = {
    tickLoop: { totalTime: 0, count: 0, maxTime: 0, minTime: Infinity, history: [] },
    playerChecks: {}, // Stores data per check type
    eventHandlers: {}, // Stores data per event handler
};
const MAX_PROFILING_HISTORY = 100; // Store last 100 execution times for more detailed analysis if needed
const PROFILING_LOG_INTERVAL_TICKS = 1200; // Log every 60 seconds (1200 ticks)
let lastProfilingLogTick = 0;

/**
 * Logs aggregated profiling data.
 * @param {import('./types.js').Dependencies} dependencies - The standard dependencies object.
 */
function logProfilingData(dependencies) {
    if (!dependencies.config.enablePerformanceProfiling) {
        return;
    }

    const now = Date.now();
    let logOutput = `[PerformanceProfiling] Report @ ${new Date(now).toISOString()} (Tick: ${currentTick})\n`;

    /**
     * Formats performance statistics for a single item into a string.
     * @param {string} name - The name of the profiled item.
     * @param {object} stats - The statistics object for the item.
     * @param {number} stats.count - Number of times the item was executed.
     * @param {number} stats.totalTime - Total execution time in ms.
     * @param {number} stats.minTime - Minimum execution time in ms.
     * @param {number} stats.maxTime - Maximum execution time in ms.
     * @returns {string} A formatted string representing the statistics.
     */
    const formatStats = (name, stats) => {
        if (stats.count === 0) {
            return `  ${name}: No data captured.\n`;
        }
        const avgTime = (stats.totalTime / stats.count).toFixed(3);
        return `  ${name}: Avg: ${avgTime}ms, Min: ${stats.minTime}ms, Max: ${stats.maxTime}ms, Count: ${stats.count}, Total: ${stats.totalTime}ms\n`;
    };

    logOutput += '----- Tick Loop -----\n';
    logOutput += formatStats('Overall Tick', profilingData.tickLoop);

    logOutput += '\n----- Player Checks -----\n';
    for (const checkName in profilingData.playerChecks) {
        logOutput += formatStats(checkName, profilingData.playerChecks[checkName]);
    }

    logOutput += '\n----- Event Handlers -----\n';
    for (const handlerName in profilingData.eventHandlers) {
        logOutput += formatStats(handlerName, profilingData.eventHandlers[handlerName]);
    }

    if (dependencies.playerUtils && typeof dependencies.playerUtils.debugLog === 'function') {
        dependencies.playerUtils.debugLog(logOutput, 'PerformanceProfile', dependencies);
    } else {
        // If debugLog is not available, we might want to output the performance profile to console.warn directly
        // This ensures the profiling data isn't completely lost if debugLog is the issue.
        console.warn("[Main.logProfilingData] playerUtils.debugLog not available. Raw profiling data:\n" + logOutput);
    }

    // Optional: Reset stats after logging to capture fresh data for the next interval
    // This depends on whether cumulative or interval-specific data is more useful.
    // For now, let's keep it cumulative. If resetting:
    // profilingData.tickLoop = { totalTime: 0, count: 0, maxTime: 0, minTime: Infinity, history: [] };
    // profilingData.playerChecks = {};
    // profilingData.eventHandlers = {};
}


/**
 * Assembles and returns the standard dependencies object used throughout the system.
 * This object provides access to configuration, utilities, managers, and Minecraft APIs.
 * @returns {import('./types.js').Dependencies} The standard dependencies object.
 */
function getStandardDependencies() {
    try {
        return {
            config: configModule.editableConfigValues,
            automodConfig,
            checkActionProfiles,
            playerUtils,
            playerDataManager,
            logManager,
            actionManager,
            uiManager,
            reportManager,
            tpaManager,
            checks,
            mc,
            currentTick,
            permissionLevels: rankManager.permissionLevels,
            ActionFormData: mcui.ActionFormData,
            MessageFormData: mcui.MessageFormData,
            ModalFormData: mcui.ModalFormData,
            ItemComponentTypes: mc.ItemComponentTypes,
            chatProcessor,
            getString: playerUtils.getString,
            rankManager: { // Subset for direct use
                getPlayerPermissionLevel: rankManager.getPlayerPermissionLevel,
                updatePlayerNametag: rankManager.updatePlayerNametag,
                getPlayerRankFormattedChatElements: rankManager.getPlayerRankFormattedChatElements,
            },
            worldBorderManager: { // Subset for direct use
                getBorderSettings: worldBorderManager.getBorderSettings,
                saveBorderSettings: worldBorderManager.saveBorderSettings,
                processWorldBorderResizing: worldBorderManager.processWorldBorderResizing,
                enforceWorldBorderForPlayer: worldBorderManager.enforceWorldBorderForPlayer,
                isPlayerOutsideBorder: worldBorderManager.isPlayerOutsideBorder,
            },
            system: mc.system,
            commandManager: { // Subset for direct use
                registerCommand: commandManager.registerCommandInternal,
                unregisterCommand: commandManager.unregisterCommandInternal,
                reloadCommands: commandManager.initializeCommands,
            },
            editableConfig: configModule,
            // Add profiling related data to dependencies
            profilingData,
            MAX_PROFILING_HISTORY,
        };
    } catch (error) {
        console.error(`[${mainModuleName}.getStandardDependencies CRITICAL] Error: ${error.stack || error}`);
        throw error;
    }
}

const maxInitRetries = 3;
const initialRetryDelayTicks = 20;
const PERIODIC_DATA_PERSISTENCE_INTERVAL_TICKS = 600;
const PLAYER_FALL_DAMAGE_VELOCITY_Y_THRESHOLD = -0.0784;
const TPA_SYSTEM_TICK_INTERVAL = 20;

/**
 * Checks if all required Minecraft event APIs are available.
 * @param {import('./types.js').Dependencies} dependencies - The standard dependencies object, primarily for playerUtils.debugLog.
 * @returns {boolean} True if all essential event objects are defined, false otherwise.
 */
function checkEventAPIsReady(dependencies) {
    let overallAllReady = true;
    const errorLogger = console.error;
    const useDebugLog = dependencies?.config?.enableDebugLogging && dependencies?.playerUtils?.debugLog;

    /**
     * Logs a message using either debugLog or console.error.
     * @param {string} msg - The message to log.
     */
    const logger = (msg) => {
        if (useDebugLog) {
            dependencies.playerUtils.debugLog(msg, 'System', dependencies);
        } // Removed else console.error as per original code structure, assuming errorLogger handles it
    };

    logger(`[${mainModuleName}.checkEventAPIsReady] Starting API readiness check...`);

    if (!mc.world) {
        errorLogger(`[${mainModuleName}.checkEventAPIsReady] mc.world: UNDEFINED - CRITICAL`);
        overallAllReady = false;
        return overallAllReady;
    }
    logger(`[${mainModuleName}.checkEventAPIsReady] mc.world: DEFINED`);

    const requiredBeforeEvents = ['chatSend', 'playerLeave', 'playerBreakBlock', 'itemUse', 'playerPlaceBlock'];
    if (!mc.world.beforeEvents) {
        errorLogger(`[${mainModuleName}.checkEventAPIsReady] mc.world.beforeEvents: UNDEFINED - CRITICAL`);
        overallAllReady = false;
        requiredBeforeEvents.forEach(eventName => errorLogger(`[${mainModuleName}.checkEventAPIsReady] mc.world.beforeEvents.${eventName}: UNDEFINED (parent 'beforeEvents' is undefined)`));
    } else {
        logger(`[${mainModuleName}.checkEventAPIsReady] mc.world.beforeEvents: DEFINED`);
        requiredBeforeEvents.forEach(eventName => {
            if (mc.world.beforeEvents[eventName]) {
                logger(`[${mainModuleName}.checkEventAPIsReady] mc.world.beforeEvents.${eventName}: DEFINED (type: ${typeof mc.world.beforeEvents[eventName]})`);
            } else {
                errorLogger(`[${mainModuleName}.checkEventAPIsReady] mc.world.beforeEvents.${eventName}: UNDEFINED - CRITICAL`);
                overallAllReady = false;
            }
        });
    }

    const requiredAfterEvents = ['playerSpawn', 'entityHurt', 'playerBreakBlock', 'playerPlaceBlock', 'playerInventoryItemChange', 'playerDimensionChange', 'entityDie', 'entitySpawn', 'pistonActivate'];
    if (!mc.world.afterEvents) {
        errorLogger(`[${mainModuleName}.checkEventAPIsReady] mc.world.afterEvents: UNDEFINED - CRITICAL`);
        overallAllReady = false;
        requiredAfterEvents.forEach(eventName => errorLogger(`[${mainModuleName}.checkEventAPIsReady] mc.world.afterEvents.${eventName}: UNDEFINED (parent 'afterEvents' is undefined)`));
    } else {
        logger(`[${mainModuleName}.checkEventAPIsReady] mc.world.afterEvents: DEFINED`);
        requiredAfterEvents.forEach(eventName => {
            if (mc.world.afterEvents[eventName]) {
                logger(`[${mainModuleName}.checkEventAPIsReady] mc.world.afterEvents.${eventName}: DEFINED (type: ${typeof mc.world.afterEvents[eventName]})`);
            } else {
                errorLogger(`[${mainModuleName}.checkEventAPIsReady] mc.world.afterEvents.${eventName}: UNDEFINED - CRITICAL`);
                overallAllReady = false;
            }
        });
    }

    if (overallAllReady) {
        logger(`[${mainModuleName}.checkEventAPIsReady] All checked Minecraft event APIs appear to be available.`);
    } else {
        errorLogger(`[${mainModuleName}.checkEventAPIsReady] Not all required Minecraft event APIs are available. See details above.`);
    }
    return overallAllReady;
}

/**
 * Performs the actual initialization of event subscriptions and other modules.
 * This function is called by attemptInitializeSystem once APIs are deemed ready.
 */
function performInitializations() {
    const startupDependencies = getStandardDependencies();
    if (startupDependencies.playerUtils && typeof startupDependencies.playerUtils.debugLog === 'function') {
        startupDependencies.playerUtils.debugLog('Anti-Cheat Script Loaded. Performing initializations...', 'System', startupDependencies);
    } else {
        console.warn(`[${mainModuleName}.performInitializations] playerUtils.debugLog not available at initial log point. This might indicate a loading issue.`);
    }
    // The second debugLog call also needs protection if the first one could fail
    if (startupDependencies.playerUtils && typeof startupDependencies.playerUtils.debugLog === 'function') {
        startupDependencies.playerUtils.debugLog(`[${mainModuleName}.performInitializations] Attempting to subscribe to events...`, 'System', startupDependencies);
    } else {
        // Optionally, log a warning for this too, or assume the first warning is sufficient
        // console.warn(`[${mainModuleName}.performInitializations] playerUtils.debugLog not available for event subscription log.`);
    }

    if (mc.world?.beforeEvents?.chatSend) {
        mc.world.beforeEvents.chatSend.subscribe(async (eventData) => {
            const dependencies = getStandardDependencies();
            if (eventData.message.startsWith(dependencies.config.prefix)) {
                const commandHandlingDependencies = {
                    ...dependencies,
                    commandDefinitionMap: commandManager.commandDefinitionMap,
                    commandExecutionMap: commandManager.commandExecutionMap,
                };
                await commandManager.handleChatCommand(eventData, commandHandlingDependencies);
            } else {
                await eventHandlers.handleBeforeChatSend(eventData, dependencies);
            }
        });
    } else {
        console.warn(`[${mainModuleName}.performInitializations] Skipping subscription for chatSend: mc.world.beforeEvents.chatSend is undefined.`);
    }

    if (mc.world?.afterEvents?.playerSpawn) {
        mc.world.afterEvents.playerSpawn.subscribe((eventData) => {
            eventHandlers.handlePlayerSpawn(eventData, getStandardDependencies());
        });
    } else {
        console.warn(`[${mainModuleName}.performInitializations] Skipping subscription for playerSpawn: mc.world.afterEvents.playerSpawn is undefined.`);
    }

    if (mc.world?.beforeEvents?.playerLeave) {
        mc.world.beforeEvents.playerLeave.subscribe((eventData) => {
            eventHandlers.handlePlayerLeave(eventData, getStandardDependencies());
        });
    } else {
        console.warn(`[${mainModuleName}.performInitializations] Skipping subscription for playerLeave: mc.world.beforeEvents.playerLeave is undefined.`);
    }

    if (mc.world?.afterEvents?.entityHurt) {
        mc.world.afterEvents.entityHurt.subscribe((eventData) => {
            eventHandlers.handleEntityHurt(eventData, getStandardDependencies());
        });
    } else {
        console.warn(`[${mainModuleName}.performInitializations] Skipping subscription for afterEvents.entityHurt: object undefined.`);
    }

    if (mc.world?.beforeEvents?.playerBreakBlock) {
        mc.world.beforeEvents.playerBreakBlock.subscribe(async (eventData) => {
            await eventHandlers.handlePlayerBreakBlockBeforeEvent(eventData, getStandardDependencies());
        });
    } else {
        console.warn(`[${mainModuleName}.performInitializations] Skipping subscription for playerBreakBlock (before): object undefined.`);
    }

    if (mc.world?.afterEvents?.playerBreakBlock) {
        mc.world.afterEvents.playerBreakBlock.subscribe(async (eventData) => {
            await eventHandlers.handlePlayerBreakBlockAfterEvent(eventData, getStandardDependencies());
        });
    } else {
        console.warn(`[${mainModuleName}.performInitializations] Skipping subscription for playerBreakBlock (after): object undefined.`);
    }

    if (mc.world?.beforeEvents?.itemUse) {
        mc.world.beforeEvents.itemUse.subscribe(async (eventData) => {
            await eventHandlers.handleItemUse(eventData, getStandardDependencies());
        });
    } else {
        console.warn(`[${mainModuleName}.performInitializations] Skipping subscription for itemUse (before): object undefined.`);
    }

    if (mc.world?.beforeEvents?.playerPlaceBlock) {
        mc.world.beforeEvents.playerPlaceBlock.subscribe(async (eventData) => {
            await eventHandlers.handlePlayerPlaceBlockBefore(eventData, getStandardDependencies());
        });
    } else {
        console.warn(`[${mainModuleName}.performInitializations] Skipping subscription for playerPlaceBlock (before): object undefined.`);
    }

    if (mc.world?.afterEvents?.playerPlaceBlock) {
        mc.world.afterEvents.playerPlaceBlock.subscribe(async (eventData) => {
            await eventHandlers.handlePlayerPlaceBlockAfterEvent(eventData, getStandardDependencies());
        });
    } else {
        console.warn(`[${mainModuleName}.performInitializations] Skipping subscription for playerPlaceBlock (after): object undefined.`);
    }

    if (mc.world?.afterEvents?.playerInventoryItemChange) {
        mc.world.afterEvents.playerInventoryItemChange.subscribe(async (eventData) => {
            await eventHandlers.handleInventoryItemChange(
                eventData.player,
                eventData.newItemStack,
                eventData.oldItemStack,
                eventData.inventorySlot,
                getStandardDependencies(),
            );
        });
    } else {
        console.warn(`[${mainModuleName}.performInitializations] Skipping subscription for playerInventoryItemChange (after): object undefined.`);
    }

    if (mc.world?.afterEvents?.playerDimensionChange) {
        mc.world.afterEvents.playerDimensionChange.subscribe((eventData) => {
            eventHandlers.handlePlayerDimensionChangeAfterEvent(eventData, getStandardDependencies());
        });
    } else {
        console.warn(`[${mainModuleName}.performInitializations] Skipping subscription for playerDimensionChange (after): object undefined.`);
    }

    if (mc.world?.afterEvents?.entityDie) {
        mc.world.afterEvents.entityDie.subscribe((eventData) => {
            const dependencies = getStandardDependencies();
            if (eventData.deadEntity.typeId === mc.MinecraftEntityTypes.player.id) {
                eventHandlers.handlePlayerDeath(eventData, dependencies);
            }
            if (dependencies.config.enableDeathEffects) {
                eventHandlers.handleEntityDieForDeathEffects(eventData, dependencies);
            }
        });
    } else {
        console.warn(`[${mainModuleName}.performInitializations] Skipping subscription for entityDie (after): object undefined.`);
    }

    if (mc.world?.afterEvents?.entitySpawn) {
        mc.world.afterEvents.entitySpawn.subscribe(async (eventData) => {
            await eventHandlers.handleEntitySpawnEventAntiGrief(eventData, getStandardDependencies());
        });
    } else {
        console.warn(`[${mainModuleName}.performInitializations] Skipping subscription for entitySpawn (after): object undefined.`);
    }

    if (mc.world?.afterEvents?.pistonActivate) {
        mc.world.afterEvents.pistonActivate.subscribe(async (eventData) => {
            await eventHandlers.handlePistonActivateAntiGrief(eventData, getStandardDependencies());
        });
    } else {
        console.warn(`[${mainModuleName}.performInitializations] Skipping subscription for pistonActivate (after): object undefined.`);
    }

    if (startupDependencies.playerUtils && typeof startupDependencies.playerUtils.debugLog === 'function') {
        startupDependencies.playerUtils.debugLog(`[${mainModuleName}.performInitializations] Initializing other modules (commands, logs, ranks, etc.)...`, 'System', startupDependencies);
    } else {
        console.warn(`[${mainModuleName}.performInitializations] playerUtils.debugLog not available before module initialization log.`);
    }
    commandManager.initializeCommands(startupDependencies);
    logManager.initializeLogCache(startupDependencies);
    reportManager.initializeReportCache(startupDependencies);
    rankManager.initializeRanks(startupDependencies);

    if (startupDependencies.config.enableWorldBorderSystem) {
        const knownDims = startupDependencies.config.worldBorderKnownDimensions || ['minecraft:overworld', 'minecraft:the_nether', 'minecraft:the_end'];
        knownDims.forEach(dimId => {
            worldBorderManager.getBorderSettings(dimId, startupDependencies);
        });
        if (startupDependencies.playerUtils && typeof startupDependencies.playerUtils.debugLog === 'function') {
            startupDependencies.playerUtils.debugLog(`[${mainModuleName}.performInitializations] World border settings loaded/initialized for known dimensions.`, 'System', startupDependencies);
        } else {
            console.warn(`[${mainModuleName}.performInitializations] playerUtils.debugLog not available before world border log.`);
        }
    }

    if (startupDependencies.playerUtils && typeof startupDependencies.playerUtils.debugLog === 'function') {
        startupDependencies.playerUtils.debugLog(`[${mainModuleName}.performInitializations] Anti-Cheat Core System Initialized. Event handlers and tick loop are active.`, 'System', startupDependencies);
    } else {
        console.warn(`[${mainModuleName}.performInitializations] playerUtils.debugLog not available before core system initialized log.`);
    }
    if (mc.world && typeof mc.world.sendMessage === 'function') {
        mc.world.sendMessage(startupDependencies.getString('system.core.initialized', { version: configModule.acVersion }));
    }

    // --- Configuration Validation ---
    if (startupDependencies.playerUtils && typeof startupDependencies.playerUtils.debugLog === 'function') {
        startupDependencies.playerUtils.debugLog(`[${mainModuleName}.performInitializations] Performing configuration validation...`, 'System', startupDependencies);
    } else {
        console.warn(`[${mainModuleName}.performInitializations] playerUtils.debugLog not available before config validation log.`);
    }
    const allValidationErrors = [];
    const knownCommands = commandManager.getAllRegisteredCommandNames(); // Get known commands for validation

    // Validate main config (config.js)
    // defaultConfigSettings is the object to validate from config.js
    // TODO: Ensure commandManager.getAllRegisteredCommandNames() is implemented and returns an array of command name strings.
    const mainConfigErrors = configValidator.validateMainConfig(
        configModule.defaultConfigSettings, // Assuming this is the direct object with all settings
        checkActionProfiles,
        knownCommands,
        configModule.commandAliases, // Pass commandAliases separately
    );
    if (mainConfigErrors.length > 0) {
        if (startupDependencies.playerUtils && typeof startupDependencies.playerUtils.debugLog === 'function') {
            startupDependencies.playerUtils.debugLog(`[${mainModuleName}.performInitializations] Main Config (config.js) validation errors found:`, 'SystemCritical', startupDependencies);
        }
        mainConfigErrors.forEach(err => {
            console.error(`[ConfigValidation|config.js] ${err}`);
            if (startupDependencies.playerUtils && typeof startupDependencies.playerUtils.debugLog === 'function') {
                startupDependencies.playerUtils.debugLog(`    - ${err}`, 'SystemError', startupDependencies);
            }
        });
        allValidationErrors.push(...mainConfigErrors.map(e => `[config.js] ${e}`));
    }

    // Validate actionProfiles.js
    const actionProfileErrors = configValidator.validateActionProfiles(checkActionProfiles);
    if (actionProfileErrors.length > 0) {
        if (startupDependencies.playerUtils && typeof startupDependencies.playerUtils.debugLog === 'function') {
            startupDependencies.playerUtils.debugLog(`[${mainModuleName}.performInitializations] Action Profiles (actionProfiles.js) validation errors found:`, 'SystemCritical', startupDependencies);
        }
        actionProfileErrors.forEach(err => {
            console.error(`[ConfigValidation|actionProfiles.js] ${err}`);
            if (startupDependencies.playerUtils && typeof startupDependencies.playerUtils.debugLog === 'function') {
                startupDependencies.playerUtils.debugLog(`    - ${err}`, 'SystemError', startupDependencies);
            }
        });
        allValidationErrors.push(...actionProfileErrors.map(e => `[actionProfiles.js] ${e}`));
    }

    // Validate automodConfig.js
    const autoModErrors = configValidator.validateAutoModConfig(automodConfig, checkActionProfiles);
    if (autoModErrors.length > 0) {
        if (startupDependencies.playerUtils && typeof startupDependencies.playerUtils.debugLog === 'function') {
            startupDependencies.playerUtils.debugLog(`[${mainModuleName}.performInitializations] AutoMod Config (automodConfig.js) validation errors found:`, 'SystemCritical', startupDependencies);
        }
        autoModErrors.forEach(err => {
            console.error(`[ConfigValidation|automodConfig.js] ${err}`);
            if (startupDependencies.playerUtils && typeof startupDependencies.playerUtils.debugLog === 'function') {
                startupDependencies.playerUtils.debugLog(`    - ${err}`, 'SystemError', startupDependencies);
            }
        });
        allValidationErrors.push(...autoModErrors.map(e => `[automodConfig.js] ${e}`));
    }

    // Validate ranksConfig.js
    // We need to pass the actual ranksConfig object, not just the manager
    const ranksConfigForValidation = {
        rankDefinitions, // Imported directly
        defaultChatFormatting, // Imported directly
        defaultNametagPrefix, // Imported directly
        defaultPermissionLevel, // Imported directly
    };
    const ranksConfigErrors = configValidator.validateRanksConfig(
        ranksConfigForValidation,
        startupDependencies.config.ownerPlayerName,
        startupDependencies.config.adminTag,
    );
    if (ranksConfigErrors.length > 0) {
        if (startupDependencies.playerUtils && typeof startupDependencies.playerUtils.debugLog === 'function') {
            startupDependencies.playerUtils.debugLog(`[${mainModuleName}.performInitializations] Ranks Config (ranksConfig.js) validation errors found:`, 'SystemCritical', startupDependencies);
        }
        ranksConfigErrors.forEach(err => {
            console.error(`[ConfigValidation|ranksConfig.js] ${err}`);
            if (startupDependencies.playerUtils && typeof startupDependencies.playerUtils.debugLog === 'function') {
                startupDependencies.playerUtils.debugLog(`    - ${err}`, 'SystemError', startupDependencies);
            }
        });
        allValidationErrors.push(...ranksConfigErrors.map(e => `[ranksConfig.js] ${e}`));
    }

    if (allValidationErrors.length > 0) {
        const summaryMessage = `CRITICAL: AntiCheat configuration validation failed with ${allValidationErrors.length} error(s). System may be unstable or not function correctly. Please check server logs for details.`;
        console.error(`[${mainModuleName}.performInitializations] ${summaryMessage}`);
        // Assuming notifyAdmins also uses debugLog internally or is critical, it might also need guards or careful review if issues persist.
        // For now, focusing on direct debugLog calls.
        startupDependencies.playerUtils.notifyAdmins(summaryMessage, 'SystemCritical', startupDependencies, true); // Force notify even if default is off for this
        // Depending on severity, could throw an error here to halt initialization,
        // or allow it to continue in a potentially degraded state.
        // For now, logging and notifying admins.
    } else {
        if (startupDependencies.playerUtils && typeof startupDependencies.playerUtils.debugLog === 'function') {
            startupDependencies.playerUtils.debugLog(`[${mainModuleName}.performInitializations] All configurations validated successfully.`, 'System', startupDependencies);
        } else {
            console.warn(`[${mainModuleName}.performInitializations] playerUtils.debugLog not available for config success log.`);
        }
    }
    // --- End Configuration Validation ---


    if (startupDependencies.playerUtils && typeof startupDependencies.playerUtils.debugLog === 'function') {
        startupDependencies.playerUtils.debugLog(`[${mainModuleName}.performInitializations] Starting main tick loop...`, 'System', startupDependencies);
    } else {
        console.warn(`[${mainModuleName}.performInitializations] playerUtils.debugLog not available before starting tick loop.`);
    }
    mc.system.runInterval(async () => {
        currentTick++;
        const tickDependencies = getStandardDependencies();

        let tickStartTime;
        if (tickDependencies.config.enablePerformanceProfiling) {
            tickStartTime = Date.now();
        }

        if (tickDependencies.config.enableWorldBorderSystem) {
            try {
                worldBorderManager.processWorldBorderResizing(tickDependencies);
            } catch (e) {
                console.error(`[${mainModuleName}.TickLoop] Error processing world border resizing: ${e.stack || e.message}`);
                if (tickDependencies.playerUtils && typeof tickDependencies.playerUtils.debugLog === 'function') {
                    tickDependencies.playerUtils.debugLog(`[${mainModuleName}.TickLoop] Error processing world border resizing: ${e.message}`, 'System', tickDependencies);
                }
                logManager.addLog({
                    actionType: 'errorMainWorldBorderResize',
                    context: 'Main.TickLoop.worldBorderResizing',
                    details: { errorMessage: e.message, stack: e.stack },
                }, tickDependencies);
            }
        }

        let allPlayers = [];
        try {
            if (mc.world && typeof mc.world.getAllPlayers === 'function') {
                allPlayers = mc.world.getAllPlayers();
            } else {
                if (currentTick === 1 || currentTick % 600 === 0) {
                    console.error(`[${mainModuleName}.TickLoop CRITICAL] mc.world or mc.world.getAllPlayers is not available! Cannot process player checks.`);
                }
            }
        } catch (e) {
            console.error(`[${mainModuleName}.TickLoop] Error calling mc.world.getAllPlayers(): ${e.stack || e}`);
        }

        playerDataManager.cleanupActivePlayerData(allPlayers, tickDependencies);

        for (const player of allPlayers) {
            if (!(player instanceof mc.Player) || !player.isValid()) {
                if (tickDependencies.config.enableDebugLogging) {
                    let playerIdInfo = 'unknown or invalid player object';
                    try {
                        playerIdInfo = player?.id || player?.nameTag || JSON.stringify(player);
                    } catch (_stringifyError) { /* Error suppressed for debug message, default info will be used */ }
                    console.warn(`[${mainModuleName}.TickLoop] Skipping invalid player object in loop: ${playerIdInfo}`);
                }
                continue;
            }

            let pData;
            try {
                pData = await playerDataManager.ensurePlayerDataInitialized(player, currentTick, tickDependencies);
            } catch (e) {
                console.error(`[${mainModuleName}.TickLoop] Error in ensurePlayerDataInitialized for ${player?.nameTag}: ${e.stack || e}`);
                if (tickDependencies.playerUtils && typeof tickDependencies.playerUtils.debugLog === 'function') {
                    tickDependencies.playerUtils.debugLog(`[${mainModuleName}.TickLoop] Error in ensurePlayerDataInitialized for ${player?.nameTag}: ${e.message}`, player?.nameTag, tickDependencies);
                }
                continue;
            }

            if (!pData) {
                if (tickDependencies.playerUtils && typeof tickDependencies.playerUtils.debugLog === 'function') {
                    tickDependencies.playerUtils.debugLog(`CRITICAL: pData not available for ${player.nameTag} in tick loop after ensure. Skipping checks for this player this tick.`, player.nameTag, tickDependencies);
                }
                continue;
            }

            playerDataManager.updateTransientPlayerData(player, pData, tickDependencies);
            playerDataManager.clearExpiredItemUseStates(pData, tickDependencies);

            // let playerChecksStartTime; // Marked as unused by ESLint, prefixing with _
            if (tickDependencies.config.enablePerformanceProfiling) {
                // _playerChecksStartTime = Date.now(); // If needed for overall player check block profiling
            }

            try {
                // Helper function to run and profile a check
            /**
             * Executes a check function and profiles its execution time if performance profiling is enabled.
             * @param {string} checkName - The name of the check for profiling.
             * @param {Function} checkFunction - The check function to execute.
             * @param {...any} args - Arguments to pass to the check function.
             */
                const runProfiledCheck = async (checkName, checkFunction, ...args) => {
                    if (!checkFunction) {
                        return;
                    }

                    if (tickDependencies.config.enablePerformanceProfiling) {
                        const checkStartTime = Date.now();
                        await checkFunction(...args);
                        const checkEndTime = Date.now();
                        const duration = checkEndTime - checkStartTime;

                        profilingData.playerChecks[checkName] = profilingData.playerChecks[checkName] || { totalTime: 0, count: 0, maxTime: 0, minTime: Infinity, history: [] };
                        const stats = profilingData.playerChecks[checkName];
                        stats.totalTime += duration;
                        stats.count++;
                        stats.maxTime = Math.max(stats.maxTime, duration);
                        stats.minTime = Math.min(stats.minTime, duration);
                        stats.history.push(duration);
                        if (stats.history.length > MAX_PROFILING_HISTORY) {
                            stats.history.shift();
                        }
                    } else {
                        await checkFunction(...args);
                    }
                };

                if (tickDependencies.config.enableFlyCheck) {
                    await runProfiledCheck('checkFly', checks.checkFly, player, pData, tickDependencies);
                }
                if (tickDependencies.config.enableSpeedCheck) {
                    await runProfiledCheck('checkSpeed', checks.checkSpeed, player, pData, tickDependencies);
                }
                if (tickDependencies.config.enableNofallCheck) {
                    await runProfiledCheck('checkNoFall', checks.checkNoFall, player, pData, tickDependencies);
                }
                if (tickDependencies.config.enableNoSlowCheck) {
                    await runProfiledCheck('checkNoSlow', checks.checkNoSlow, player, pData, tickDependencies, null);
                }
                if (tickDependencies.config.enableInvalidSprintCheck) {
                    await runProfiledCheck('checkInvalidSprint', checks.checkInvalidSprint, player, pData, tickDependencies);
                }

                if (tickDependencies.config.enableNetherRoofCheck &&
                    (currentTick - (pData.lastCheckNetherRoofTick || 0) >= tickDependencies.config.netherRoofCheckIntervalTicks)) {
                    await runProfiledCheck('checkNetherRoof', checks.checkNetherRoof, player, pData, tickDependencies);
                    pData.lastCheckNetherRoofTick = currentTick;
                }
                if (tickDependencies.config.enableAntiGmcCheck &&
                    (currentTick - (pData.lastCheckAntiGmcTick || 0) >= tickDependencies.config.antiGmcCheckIntervalTicks)) {
                    await runProfiledCheck('checkAntiGmc', checks.checkAntiGmc, player, pData, tickDependencies);
                    pData.lastCheckAntiGmcTick = currentTick;
                }
                if (tickDependencies.config.enableNameSpoofCheck &&
                    (currentTick - (pData.lastCheckNameSpoofTick || 0) >= tickDependencies.config.nameSpoofCheckIntervalTicks)) {
                    await runProfiledCheck('checkNameSpoof', checks.checkNameSpoof, player, pData, tickDependencies);
                    pData.lastCheckNameSpoofTick = currentTick;
                }
                if (tickDependencies.config.enableAutoToolCheck &&
                    (currentTick - (pData.lastCheckAutoToolTick || 0) >= tickDependencies.config.autoToolCheckIntervalTicks)) {
                    await runProfiledCheck('checkAutoTool', checks.checkAutoTool, player, pData, tickDependencies, null);
                    pData.lastCheckAutoToolTick = currentTick;
                }
                if (tickDependencies.config.enableInvalidRenderDistanceCheck &&
                    (currentTick - (pData.lastRenderDistanceCheckTick || 0) >= tickDependencies.config.invalidRenderDistanceCheckIntervalTicks)) {
                    await runProfiledCheck('checkInvalidRenderDistance', checks.checkInvalidRenderDistance, player, pData, tickDependencies);
                    pData.lastRenderDistanceCheckTick = currentTick;
                }
            } catch (checkError) {
                console.error(`[${mainModuleName}.TickLoop] Error during player-specific checks for ${player?.nameTag}: ${checkError.stack || checkError}`);
                if (tickDependencies.playerUtils && typeof tickDependencies.playerUtils.debugLog === 'function') {
                    tickDependencies.playerUtils.debugLog(`[${mainModuleName}.TickLoop] Error during player-specific checks for ${player?.nameTag}: ${checkError.message}`, player?.nameTag, tickDependencies);
                }
                logManager.addLog({
                    actionType: 'error.main.playerTick.checkFail', // Standardized actionType
                    context: 'Main.TickLoop.playerChecks', // Specific context
                    targetName: player?.nameTag || 'UnknownPlayer',
                    details: {
                        errorCode: 'MAIN_PLAYER_TICK_CHECK_FAIL', // Standardized errorCode
                        message: checkError.message,
                        rawErrorStack: checkError.stack,
                        // meta: { checkName: 'UnknownCheckInLoop' } // Example if checkName was known
                    },
                }, tickDependencies);
            }

            if (!player.isOnGround) {
                if ((pData.velocity?.y ?? 0) < PLAYER_FALL_DAMAGE_VELOCITY_Y_THRESHOLD && pData.previousPosition && pData.lastPosition) {
                    const deltaY = pData.previousPosition.y - pData.lastPosition.y;
                    if (deltaY > 0 && deltaY < 100) { // Max fall distance check to prevent overflow with extreme values
                        pData.fallDistance = (pData.fallDistance || 0) + deltaY;
                    }
                }
                pData.consecutiveOffGroundTicks = (pData.consecutiveOffGroundTicks || 0) + 1;
            } else {
                if (!pData.isTakingFallDamage) {
                    pData.fallDistance = 0;
                }
                pData.isTakingFallDamage = false;
                pData.consecutiveOffGroundTicks = 0;
            }

            if (tickDependencies.config.enableWorldBorderSystem) {
                try {
                    worldBorderManager.enforceWorldBorderForPlayer(player, pData, tickDependencies);
                } catch (e) {
                    console.error(`[${mainModuleName}.TickLoop] Error enforcing world border for player ${player.nameTag}: ${e.stack || e.message}`);
                    if (tickDependencies.playerUtils && typeof tickDependencies.playerUtils.debugLog === 'function') {
                        tickDependencies.playerUtils.debugLog(`[${mainModuleName}.TickLoop] Error enforcing world border for ${player.nameTag}: ${e.message}`, player.nameTag, tickDependencies);
                    }
                    logManager.addLog({
                        actionType: 'errorMainWorldBorderEnforce',
                        context: 'Main.TickLoop.worldBorderEnforcement',
                        targetName: player.nameTag,
                        details: { errorMessage: e.message, stack: e.stack },
                    }, tickDependencies);
                }
            }
        }

        if (currentTick % PERIODIC_DATA_PERSISTENCE_INTERVAL_TICKS === 0) {
            if (tickDependencies.playerUtils && typeof tickDependencies.playerUtils.debugLog === 'function') {
                tickDependencies.playerUtils.debugLog(`Performing periodic data persistence. Current Tick: ${currentTick}`, 'System', tickDependencies);
            }
            allPlayers.forEach(async player => {
                if (!player.isValid()) {
                    return;
                }
                const pData = playerDataManager.getPlayerData(player.id);
                if (pData?.isDirtyForSave) {
                    try {
                        await playerDataManager.saveDirtyPlayerData(player, tickDependencies);
                        if (pData.isWatched) {
                            tickDependencies.playerUtils.debugLog(`Periodic save executed for watched player ${player.nameTag}.`, player.nameTag, tickDependencies);
                        }
                    } catch (error) {
                        console.error(`Error during periodic save for ${player.nameTag}: ${error.stack || error.message}`);
                        logManager.addLog({
                            actionType: 'errorMainPeriodicSave',
                            context: 'Main.TickLoop.periodicDataSave',
                            details: { playerName: player.nameTag, errorMessage: error.message, stack: error.stack },
                        }, tickDependencies);
                    }
                }
            });
            logManager.persistLogCacheToDisk(tickDependencies);
            reportManager.persistReportsToDisk(tickDependencies);
        }

        if (tickDependencies.config.enablePerformanceProfiling && tickStartTime) {
            const tickEndTime = Date.now();
            const duration = tickEndTime - tickStartTime;
            const stats = profilingData.tickLoop;
            stats.totalTime += duration;
            stats.count++;
            stats.maxTime = Math.max(stats.maxTime, duration);
            stats.minTime = Math.min(stats.minTime, duration);
            stats.history.push(duration);
            if (stats.history.length > MAX_PROFILING_HISTORY) {
                stats.history.shift();
            }
        }

        // Log profiling data periodically
        if (tickDependencies.config.enablePerformanceProfiling && (currentTick - lastProfilingLogTick >= (tickDependencies.config.logPerformanceProfileIntervalTicks || PROFILING_LOG_INTERVAL_TICKS))) {
            logProfilingData(tickDependencies);
            lastProfilingLogTick = currentTick;
        }
    }, 1);

    startupDependencies.playerUtils.debugLog(`[${mainModuleName}.performInitializations] Starting TPA system tick loop...`, 'System', startupDependencies);
    mc.system.runInterval(() => {
        const tpaIntervalDependencies = getStandardDependencies();
        if (tpaIntervalDependencies.config.enableTpaSystem) {
            tpaManager.clearExpiredRequests(tpaIntervalDependencies);
            const requestsInWarmup = tpaManager.getRequestsInWarmup();
            requestsInWarmup.forEach(request => {
                if (tpaIntervalDependencies.config.tpaCancelOnMoveDuringWarmup) {
                    tpaManager.checkPlayerMovementDuringWarmup(request, tpaIntervalDependencies);
                }
                if (request.status === 'pendingTeleportWarmup' && Date.now() >= (request.warmupExpiryTimestamp || 0)) {
                    tpaManager.executeTeleport(request.requestId, tpaIntervalDependencies);
                }
            });
        }
    }, TPA_SYSTEM_TICK_INTERVAL);
}

// No direct playerUtils.debugLog calls in attemptInitializeSystem, they are inside checkEventAPIsReady
// and performInitializations which are already being handled.

/**
 * Attempts to initialize the system. If critical APIs are not ready, it schedules a retry.
 * @param {number} [retryCount] - Current number of retry attempts.
 */
function attemptInitializeSystem(retryCount = 0) {
    const tempStartupDepsForLog = getStandardDependencies();

    if (checkEventAPIsReady(tempStartupDepsForLog)) {
        performInitializations();
    } else {
        const delay = initialRetryDelayTicks * Math.pow(2, retryCount);
        console.warn(`[${mainModuleName}.attemptInitializeSystem] API not fully ready. Retrying initialization in ${delay / 20} seconds (${delay} ticks). Attempt ${retryCount + 1}/${maxInitRetries}`);

        if (retryCount < maxInitRetries) {
            mc.system.runTimeout(() => attemptInitializeSystem(retryCount + 1), delay);
        } else {
            if (checkEventAPIsReady(tempStartupDepsForLog)) {
                console.warn(`[${mainModuleName}.attemptInitializeSystem] MAX RETRIES REACHED, but APIs appear to be ready now. Proceeding with initialization.`);
                performInitializations();
            } else {
                console.error(`[${mainModuleName}.attemptInitializeSystem CRITICAL] MAX RETRIES REACHED and critical APIs are STILL MISSING. AntiCheat system will NOT initialize.`);
                console.error(`[${mainModuleName}.attemptInitializeSystem CRITICAL] Please check Minecraft version, experimental toggles ('Beta APIs' MUST be enabled), and for conflicting addons or script engine errors in the Content Log.`);
            }
        }
    }
}

mc.system.runTimeout(() => {
    attemptInitializeSystem();
}, initialRetryDelayTicks * 2); // Slightly increased delay to ensure other scripts might load if there are ordering issues.
