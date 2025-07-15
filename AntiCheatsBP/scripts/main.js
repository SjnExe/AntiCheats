import { system, world } from '@minecraft/server';
import * as mc from '@minecraft/server';
import * as mcui from '@minecraft/server-ui';

import { automodConfig } from './core/automodConfig.js';
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
import { dependencyManager } from './core/dependencyManager.js';

const maxInitRetries = 3;
const initialRetryDelayTicks = 20;
const PERIODIC_DATA_PERSISTENCE_INTERVAL_TICKS = 600;
const TPA_SYSTEM_TICK_INTERVAL = 20;

/**
 * Initializes the AntiCheat system.
 */
function performInitializations() {
    dependencyManager.validateDependencies('performInitializations - startup');
    const dependencies = dependencyManager.getDependencies();

    dependencies.playerUtils.debugLog('Anti-Cheat Script Loaded. Performing initializations...', 'System', dependencies);

    subscribeToEvents(dependencies);
    initializeModules(dependencies);
    validateConfigurations(dependencies);

    world.sendMessage({ translate: 'system.core.initialized', with: { version: configModule.acVersion } });
    dependencies.playerUtils.debugLog(`[Main] Anti-Cheat Core System Initialized. Tick loop active.`, 'System', dependencies);

    system.runInterval(() => mainTick(), 1);
    system.runInterval(() => tpaTick(), TPA_SYSTEM_TICK_INTERVAL);
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
 */
function mainTick() {
    system.runJob(mainTickGenerator());
}

/**
 * Generator function for the main tick loop.
 */
async function* mainTickGenerator() {
    const dependencies = dependencyManager.getDependencies();
    dependencyManager.updateCurrentTick(dependencies.currentTick + 1);

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
        await processPlayer(player, dependencies, dependencies.currentTick);
    }

    if (dependencies.currentTick % PERIODIC_DATA_PERSISTENCE_INTERVAL_TICKS === 0) {
        yield; // Yield before this potentially long-running task
        await handlePeriodicDataPersistence(allPlayers, dependencies);
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

    // Stagger checks across ticks based on player ID to distribute load
    const checkNames = Object.keys(checks);
    const staggerTicks = dependencies.config.checkStaggerTicks || 1;
    const checksPerTick = Math.ceil(checkNames.length / staggerTicks);
    // Use a player-specific value for the offset to ensure distribution
    const playerTickOffset = (currentTick + parseInt(player.id, 10)) % staggerTicks;
    const checksToRun = checkNames.slice(playerTickOffset * checksPerTick, (playerTickOffset + 1) * checksPerTick);

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
 */
function tpaTick() {
    const dependencies = dependencyManager.getDependencies();
    if (dependencies.config.enableTpaSystem) {
        dependencies.tpaManager.clearExpiredRequests(dependencies);
        dependencies.tpaManager.getRequestsInWarmup().forEach(req => {
            if (dependencies.config.tpaCancelOnMoveDuringWarmup) {
                dependencies.tpaManager.checkPlayerMovementDuringWarmup(req, dependencies);
            }
            if (req.status === 'pendingTeleportWarmup' && Date.now() >= (req.warmupExpiryTimestamp || 0)) {
                dependencies.tpaManager.executeTeleport(req.requestId, dependencies);
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

        dependencyManager.validateDependencies(`attemptInitializeSystem - pre-check - attempt ${retryCount}`);

        // console.log(`[Main] APIs ready, initializing...`);
        performInitializations();
    } catch (e) {
        const delay = initialRetryDelayTicks * Math.pow(2, retryCount);
        console.warn(`[Main] Initialization failed. Retrying in ${delay / 20}s. Attempt ${retryCount + 1}/${maxInitRetries}. Error: ${e.message}`);

        if (retryCount < maxInitRetries) {
            system.runTimeout(() => attemptInitializeSystem(retryCount + 1), delay);
        } else {
            console.error(`[Main] CRITICAL: MAX RETRIES REACHED. System will not initialize.`);
        }
    }
}

system.runTimeout(() => attemptInitializeSystem(), initialRetryDelayTicks);
