/**
 * @file Manages the addon's initialization process, including event subscriptions,
 *       module setup, configuration validation, and the startup command.
 */

import { system, world } from '@minecraft/server';
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
        system.beforeEvents[eventName].subscribe((eventData) => {
            try {
                beforeEventSubscriptions[eventName](eventData, dependencies);
            } catch (e) {
                playerUtils.logError(`Unhandled error in beforeEvent:${eventName}: ${e?.message}`, e);
            }
        });
    }

    for (const eventName in afterEventSubscriptions) {
        system.afterEvents[eventName].subscribe((eventData) => {
            try {
                afterEventSubscriptions[eventName](eventData, dependencies);
            } catch (e) {
                playerUtils.logError(`Unhandled error in afterEvent:${eventName}: ${e?.message}`, e);
            }
        });
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

        const storedConfigVersion = world.getDynamicProperty('configVersion');
        const codeConfigVersion = config.configVersion;

        if (storedConfigVersion === undefined) {
            world.setDynamicProperty('configVersion', codeConfigVersion);
            world.setDynamicProperty('config', JSON.stringify(config));
        } else if (storedConfigVersion < codeConfigVersion) {
            const storedConfig = JSON.parse(world.getDynamicProperty('config'));
            const migratedConfig = migrateConfig(storedConfig, storedConfigVersion, codeConfigVersion);
            world.setDynamicProperty('config', JSON.stringify(migratedConfig));
            world.setDynamicProperty('configVersion', codeConfigVersion);
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

    world.setDynamicProperty('ac:initialized', true);

    world.sendMessage({
        'translate': 'system.core.initialized',
        'with': {
            'version': dependencies.acVersion,
        },
    });
    playerUtils.debugLog('[Main] Anti-Cheat Core System Initialized. Starting tick loops.', 'System', dependencies);
    system.runInterval(() => mainTick(dependencies), 1);
    if (config.enableTpaSystem) {
        system.runInterval(() => tpaTick(dependencies), tpaSystemTickInterval);
    }
}

system.afterEvents.scriptEventReceive.subscribe((event) => {
    if (event.id === 'ac:init') {
        const { sourceEntity: player } = event;

        if (!player || !player.hasTag(config.adminTag)) {
            playerUtils.logError('ac:init script event received from a non-admin or non-player source.');
            return;
        }

        if (world.getDynamicProperty('ac:initialized')) {
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
