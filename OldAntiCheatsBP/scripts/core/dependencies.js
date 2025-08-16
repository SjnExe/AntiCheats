/**
 * @file dependencies.js
 * @description Initializes and provides a centralized container for all major modules (dependencies)
 *              used throughout the addon. This pattern avoids circular dependencies by ensuring
 *              that modules are imported and instantiated in a single, controlled location.
 *              The resulting container object is then passed to other modules that need access
 *              to these shared services.
 */

import * as mc from '@minecraft/server';
import * as mcui from '@minecraft/server-ui';

// Configuration
import { config, updateConfigValue, acVersion, editableConfigValues } from '../config.js';
import { checkActionProfiles } from './actionProfiles.js';
import { automodConfig } from './automodConfig.js';
import { rankDefinitions as ranks } from './ranksConfig.js';
import { kits } from './kits.js';

// Core Managers
import * as actionManager from './actionManager.js';
import * as automodManager from './automodManager.js';
import * as chatProcessor from './chatProcessor.js';
import * as commandManager from './commandManager.js';
import * as configValidator from './configValidator.js';
import * as economyManager from './economyManager.js';
import * as homesManager from './homesManager.js';
import * as kitsManager from './kitsManager.js';
import * as logManager from './logManager.js';
import * as offlineBanList from './offlineBanList.js';
import * as playerDataManager from './playerDataManager.js';
import * as rankManager from './rankManager.js';
import * as reportManager from './reportManager.js';
import * as tpaManager from './tpaManager.js';
import * as uiManager from './uiManager.js';

// Utilities & Modules
import * as playerUtils from '../modules/utils/playerUtils.js';
import * as worldBorderManager from '../modules/utils/worldBorderManager.js';
import * as checks from '../modules/detections/index.js';

/**
 * A container for all initialized modules and services.
 * @type {import('../types.js').CommandDependencies}
 */
export const dependencies = {
    // Minecraft APIs
    mc,
    mcui,
    system: mc.system,

    // Configuration
    config,
    updateConfigValue,
    acVersion,
    editableConfigValues,
    checkActionProfiles,
    automodConfig,
    ranks,
    kits,

    // Core Managers
    actionManager,
    automodManager,
    chatProcessor,
    commandManager,
    configValidator,
    economyManager,
    homesManager,
    kitsManager,
    logManager,
    offlineBanList,
    playerDataManager,
    rankManager,
    reportManager,
    tpaManager,
    uiManager,

    // Utilities & Modules
    playerUtils,
    worldBorderManager,
    checks,

    // Initialization flag
    isInitialized: false,
};

/**
 * Initializes all core modules that require setup after the world is loaded.
 * This function should only be called once.
 */
export function initializeCoreDependencies() {
    if (dependencies.isInitialized) {
        playerUtils.log('Core dependencies are already initialized.');
        return;
    }

    // Pass the dependency container to modules that need it for internal setup.
    // This is a key part of the dependency injection pattern.
    commandManager.initializeCommands(dependencies);
    rankManager.initializeRanks(dependencies);
    logManager.initializeLogs(dependencies);
    reportManager.initializeReports(dependencies);
    tpaManager.initializeTpa(dependencies);
    // offlineBanList does not have an initializer, it's a static array.
    playerDataManager.initializePlayerDataManager(dependencies);
    // configValidator does not have an initializer, it contains only pure functions.

    playerUtils.log('Core dependencies initialized successfully.');
    dependencies.isInitialized = true;
}
