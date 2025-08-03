import { system, world } from '@minecraft/server';
import * as eventHandlers from './eventHandlers.js';
import * as dependencies from './dependencyManager.js';
import { logError, playerUtils } from '../modules/utils/playerUtils.js';
import { migrateConfig } from './configMigration.js';
import { mainTick, tpaTick, tpaSystemTickInterval } from '../main.js';

const {
    config,
    automodConfig,
    checkActionProfiles,
    commandManager,
    acVersion,
    logManager,
    reportManager,
    rankManager,
    worldBorderManager,
    configValidator,
    tpaManager,
} = dependencies;

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

function initializeModules() {
    const mainModuleName = 'CoreSystem';
    playerUtils.debugLog(`[${mainModuleName}] Initializing modules...`, 'System', dependencies);

    commandManager.reloadCommands(dependencies);
    logManager.initializeLogCache(dependencies);
    reportManager.initializeReportCache(dependencies);
    rankManager.initializeRanks(dependencies);
    tpaManager.loadTpaState(dependencies);

    if (config.enableWorldBorderSystem) {
        const knownDims = config.worldBorderKnownDimensions || ['minecraft:overworld', 'minecraft:the_nether', 'minecraft:the_end'];
        knownDims.forEach(dimId => worldBorderManager.getBorderSettings(dimId, dependencies));
        playerUtils.debugLog(`[${mainModuleName}] World border settings loaded.`, 'System', dependencies);
    }
}

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
        () => configValidator.validateMainConfig(config.defaultConfigSettings, checkActionProfiles, knownCommands, config.commandAliases),
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

function performInitializations() {
    playerUtils.debugLog('Anti-Cheat Script Initializing via function...', 'System', dependencies);

    try {
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
        logError('CRITICAL: Failed to subscribe to events during initialization.', e);
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
        playerUtils.notifyAdmins('A critical, unexpected error occurred during config validation. Check server logs.', dependencies);
    }

    world.setDynamicProperty('ac:initialized', true);

    // Start the TPA system tick loop now that the system is initialized.
    // The tpaTick function will reschedule itself in a stable, non-overlapping loop.
    tpaTick();

    world.sendMessage({
        'translate': 'system.core.initialized',
        'with': {
            'version': acVersion,
        },
    });
    playerUtils.debugLog('[Main] Anti-Cheat Core System Initialized. Tick loop will now be active.', 'System', dependencies);
    system.run(mainTick);
}

system.afterEvents.scriptEventReceive.subscribe((event) => {
    if (event.id === 'ac:init') {
        const player = event.sourceEntity;
        if (!player || !player.hasTag(config.adminTag)) {
            logError('ac:init script event received from a non-admin or non-player source.');
            return;
        }

        if (world.getDynamicProperty('ac:initialized')) {
            player.sendMessage('§cAntiCheat is already initialized.');
            return;
        }

        performInitializations();
        player.sendMessage('§aAntiCheat initialized successfully.');
    }
}, { namespaces: ['ac'] });
