/**
 * @file Manages the addon's initialization process, including event subscriptions,
 *       module setup, configuration validation, and the startup command.
 */

import * as mc from '@minecraft/server';
import * as eventHandlers from './eventHandlers.js';
import { dependencies, initializeCoreDependencies } from './dependencies.js';
import { migrateConfig } from './configMigration.js';
import { mainTick, tpaTick, tpaSystemTickInterval } from '../main.js';

const { playerUtils, config, logManager } = dependencies;

function subscribeToEvents() {
    playerUtils.debugLog('[CoreSystem] Subscribing to events...', 'System', dependencies);

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
        playerEffectAdded: eventHandlers.handlePlayerEffectAdded,
        playerEffectRemoved: eventHandlers.handlePlayerEffectRemoved,
    };

    for (const eventName in beforeEventSubscriptions) {
        try {
            if (mc.world.beforeEvents[eventName]) {
                mc.world.beforeEvents[eventName].subscribe((eventData) => {
                    try {
                        beforeEventSubscriptions[eventName](eventData, dependencies);
                    } catch (e) {
                        playerUtils.logError(`Unhandled error in beforeEvent:${eventName}: ${e?.message}`, e);
                    }
                });
            } else {
                // This case is for when the event literally doesn't exist on the object, which is rare.
                // The more common case is that it exists but isn't available, which is caught below.
                playerUtils.debugLog(`[CoreSystem] Subscription skipped for beforeEvent '${eventName}' as it does not exist.`, 'System', dependencies);
            }
        } catch (e) {
            playerUtils.logError(`[CoreSystem] Could not subscribe to beforeEvent '${eventName}'. It may be a beta feature that is not enabled in this world.`);
        }
    }

    for (const eventName in afterEventSubscriptions) {
        try {
            if (mc.world.afterEvents[eventName]) {
                mc.world.afterEvents[eventName].subscribe((eventData) => {
                    try {
                        afterEventSubscriptions[eventName](eventData, dependencies);
                    } catch (e) {
                        playerUtils.logError(`Unhandled error in afterEvent:${eventName}: ${e?.message}`, e);
                    }
                });
            } else {
                playerUtils.debugLog(`[CoreSystem] Subscription skipped for afterEvent '${eventName}' as it does not exist.`, 'System', dependencies);
            }
        } catch (e) {
            playerUtils.logError(`[CoreSystem] Could not subscribe to afterEvent '${eventName}'. It may be a beta feature that is not enabled in this world.`);
        }
    }
}

function validateConfigurations() {
    const { configValidator, commandManager, rankManager, automodConfig, checkActionProfiles } = dependencies;
    playerUtils.debugLog('[CoreSystem] Validating configurations...', 'System', dependencies);
    const allValidationErrors = [];
    const knownCommands = commandManager.getAllRegisteredCommandNames();

    const validationTasks = [
        () => configValidator.validateMainConfig(config.defaultConfigSettings, checkActionProfiles, knownCommands, config.commandAliases),
        () => configValidator.validateActionProfiles(checkActionProfiles),
        () => configValidator.validateAutoModConfig(automodConfig, checkActionProfiles),
        () => configValidator.validateRanksConfig(rankManager.ranks, config.ownerPlayerName, config.adminTag),
    ];

    const errorContexts = ['config.js', 'actionProfiles.js', 'automodConfig.js', 'ranksConfig.js'];

    validationTasks.forEach((task, index) => {
        const errors = task();
        if (errors.length > 0) {
            const context = errorContexts[index];
            playerUtils.debugLog(`[CoreSystem] ${context} validation errors found:`, 'SystemCritical', dependencies);
            errors.forEach(err => playerUtils.debugLog(`    - ${err}`, 'SystemError', dependencies));
            allValidationErrors.push(...errors.map(e => `[${context}] ${e}`));
        }
    });

    if (allValidationErrors.length > 0) {
        const summaryMessage = `CRITICAL: AntiCheat configuration validation failed with ${allValidationErrors.length} error(s).`;
        playerUtils.notifyAdmins(summaryMessage, dependencies);

        const detailedErrorsToSend = allValidationErrors.slice(0, 5);
        const detailedMessage = '§cConfiguration Errors:§r\n' + detailedErrorsToSend.join('\n');
        playerUtils.notifyAdmins(detailedMessage, dependencies);

        if (allValidationErrors.length > 5) {
            playerUtils.notifyAdmins(`...and ${allValidationErrors.length - 5} more errors. Please check server logs for the full list.`, dependencies);
        }

    } else {
        playerUtils.debugLog('[CoreSystem] All configurations validated successfully.', 'System', dependencies);
    }
}

function performInitializations() {
    playerUtils.debugLog('Anti-Cheat Script Initializing via function...', 'System', dependencies);

    try {
        // Initialize all modules through the new dependency container
        initializeCoreDependencies();

        const storedConfigVersion = mc.world.getDynamicProperty('configVersion');
        const codeConfigVersion = config.configVersion;

        if (storedConfigVersion === undefined) {
            mc.world.setDynamicProperty('configVersion', codeConfigVersion);
            mc.world.setDynamicProperty('config', JSON.stringify(config));
        } else if (storedConfigVersion < codeConfigVersion) {
            const storedConfig = JSON.parse(mc.world.getDynamicProperty('config'));
            const migratedConfig = migrateConfig(storedConfig, storedConfigVersion, codeConfigVersion);
            mc.world.setDynamicProperty('config', JSON.stringify(migratedConfig));
            mc.world.setDynamicProperty('configVersion', codeConfigVersion);
            playerUtils.notifyAdmins(`§aAntiCheat config migrated from v${storedConfigVersion} to v${codeConfigVersion}.`, dependencies);
        }

        subscribeToEvents();

    } catch (e) {
        logManager.addLog({
            actionType: 'error.init.eventSubscription',
            context: 'initializationManager.performInitializations',
            details: {
                errorCode: 'INIT_EVENT_SUB_FAIL',
                message: 'CRITICAL: Failed to subscribe to events during initialization.',
                rawErrorStack: e.stack,
            },
        }, dependencies);
        throw new Error(`Event subscription failed: ${e.message}`);
    }

    try {
        validateConfigurations();
    } catch (e) {
        logManager.addLog({
            actionType: 'error.init.configValidation',
            context: 'initializationManager.performInitializations',
            details: {
                errorCode: 'INIT_CONFIG_VALIDATION_FAIL',
                message: 'CRITICAL: An unexpected error occurred during configuration validation.',
                rawErrorStack: e.stack,
            },
        }, dependencies);
        playerUtils.notifyAdmins('A critical, unexpected error occurred during config validation. Check server logs.', dependencies);
    }

    mc.world.setDynamicProperty('ac:initialized', true);

    const initMessage = playerUtils.getString('system.core.initialized', { version: dependencies.acVersion });
    mc.world.sendMessage(initMessage);
    playerUtils.debugLog('[Main] Anti-Cheat Core System Initialized. Starting tick loops.', 'System', dependencies);
    // The main tick loop is now driven by functions/tick.json, which calls the scriptevent below.
    // mc.system.runInterval(() => mainTick(dependencies), 1);
    if (config.enableTpaSystem) {
        mc.system.runInterval(() => tpaTick(dependencies), tpaSystemTickInterval);
    }
}

mc.system.afterEvents.scriptEventReceive.subscribe((event) => {
    const { id, sourceEntity } = event;

    if (id === 'ac:main_tick') {
        // This is our main tick loop, triggered by the scriptevent in functions/main.mcfunction
        mainTick(dependencies, { currentTick: mc.system.currentTick });
        return;
    }

    if (id === 'ac:init') {
        const player = sourceEntity;

        // User requested to remove the admin check for initialization.
        // We still check if the source is a player to prevent command block execution without context.
        if (!player) {
            playerUtils.logError('ac:init script event received from a non-player source.');
            return;
        }

        if (mc.world.getDynamicProperty('ac:initialized')) {
            player.sendMessage(playerUtils.getString('system.core.alreadyInitialized', { dependencies }));
            return;
        }

        try {
            performInitializations();
            player.sendMessage(playerUtils.getString('system.core.initializedSuccess', { dependencies }));
        } catch (e) {
            player.sendMessage(`§cERROR: AntiCheat initialization failed. Check server logs. ${e.message}`);
            playerUtils.logError(`Initialization failed after /function ac command: ${e.message}`, e);
        }
    }
}, { namespaces: ['ac'] });
