import { world } from '@minecraft/server';
import { config as defaultConfig } from '../config.js';
import { errorLog } from './errorLogger.js';
import { deepEqual, deepMerge, setValueByPath, reconcileConfig } from './objectUtils.js';

const currentConfigKey = 'exe:config:current';
const lastLoadedConfigKey = 'exe:config:lastLoaded';

let currentConfig = null;
let lastLoadedConfig = null;

/**
 * Loads the addon's configurations from world dynamic properties.
 * This should only be called once at startup from main.js.
 * @returns {boolean} True if this is the first time the addon is being initialized.
 */
export function loadConfig() {
    const newDefaultConfig = deepMerge({}, defaultConfig);
    let isFirstInit = false;
    let userSavedConfig = null;
    let oldDefaultConfig = null;

    const userSavedConfigStr = world.getDynamicProperty(currentConfigKey);
    const oldDefaultConfigStr = world.getDynamicProperty(lastLoadedConfigKey);

    if (!userSavedConfigStr) {
        // First time setup. The user has no saved config.
        isFirstInit = true;
        currentConfig = deepMerge({}, newDefaultConfig);
        errorLog('[ConfigManager] No saved config found. Initializing with default values.');
    } else {
        // Subsequent startup. The user has a saved config.
        try {
            userSavedConfig = JSON.parse(userSavedConfigStr);
        } catch (e) {
            errorLog('[ConfigManager] Failed to parse user-saved config. It will be reset.', e);
            userSavedConfig = deepMerge({}, newDefaultConfig); // Fallback on error
        }

        try {
            // The 'last loaded' config represents the default config from the previous run.
            oldDefaultConfig = JSON.parse(oldDefaultConfigStr);
        } catch {
            errorLog('[ConfigManager] Could not parse last loaded config. Assuming full migration.');
            // If we can't parse the old defaults, we can't compare.
            // A safe fallback is to treat it like a first-time setup for the user's values.
            oldDefaultConfig = deepMerge({}, newDefaultConfig);
        }

        // Perform the reconciliation based on the new logic.
        currentConfig = reconcileConfig(newDefaultConfig, oldDefaultConfig, userSavedConfig);
    }

    // After reconciliation, the 'last loaded' config must be updated to the new default structure
    // for the *next* startup's comparison.
    lastLoadedConfig = deepMerge({}, newDefaultConfig);

    saveCurrentConfig();
    saveLastLoadedConfig();

    return isFirstInit;
}

/**
 * Gets the currently active configuration.
 * @returns {object} The loaded configuration object.
 */
export function getConfig() {
    return currentConfig || defaultConfig;
}

/**
 * Saves the current config to its dynamic property.
 */
function saveCurrentConfig() {
    try {
        world.setDynamicProperty(currentConfigKey, JSON.stringify(currentConfig));
    } catch (e) {
        errorLog('[ConfigManager] Failed to save current config.', e);
    }
}

/**
 * Saves the last loaded config to its dynamic property.
 */
function saveLastLoadedConfig() {
    try {
        world.setDynamicProperty(lastLoadedConfigKey, JSON.stringify(lastLoadedConfig));
    } catch (e) {
        errorLog('[ConfigManager] Failed to save last loaded config.', e);
    }
}

/**
 * Updates a specific key in the configuration and saves it.
 * @param {string} key The configuration key to update.
 * @param {*} value The new value for the key.
 */
export function updateConfig(key, value) {
    if (!currentConfig) {
        loadConfig();
    }
    currentConfig[key] = value;
    saveCurrentConfig();
}

/**
 * Reloads the configuration based on the user's specified logic.
 */
export function reloadConfig() {
    const storageConfig = deepMerge({}, defaultConfig); // Fresh deep copy from the file

    for (const key in storageConfig) {
        // The owner and version should always be taken from the file, so we skip them in the loop.
        if (key === 'ownerPlayerNames' || key === 'version') {
            continue;
        }

        if (!deepEqual(lastLoadedConfig[key], storageConfig[key])) {
            currentConfig[key] = deepMerge({}, storageConfig[key]);
        }
    }

    // Always update owner and version from the file
    currentConfig.ownerPlayerNames = storageConfig.ownerPlayerNames;
    currentConfig.version = storageConfig.version;

    lastLoadedConfig = deepMerge({}, storageConfig);

    saveCurrentConfig();
    saveLastLoadedConfig();
}

/**
 * Updates multiple keys in the configuration using path notation and saves once.
 * @param {Object.<string, any>} updates An object where keys are dot-notation paths and values are the new values.
 */
export function updateMultipleConfig(updates) {
    if (!currentConfig) {
        loadConfig();
    }
    for (const path in updates) {
        setValueByPath(currentConfig, path, updates[path]);
    }
    saveCurrentConfig();
}
