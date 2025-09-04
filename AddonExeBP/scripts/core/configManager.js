import { world } from '@minecraft/server';
import { config as defaultConfig } from '../config.js';
import { errorLog } from './errorLogger.js';
import { deepEqual, deepMerge } from './objectUtils.js';

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
    const storageConfig = deepMerge({}, defaultConfig);
    let isFirstInit = false;

    const currentConfigStr = world.getDynamicProperty(currentConfigKey);
    const lastLoadedConfigStr = world.getDynamicProperty(lastLoadedConfigKey);

    if (!currentConfigStr) {
        // First time setup
        isFirstInit = true;
        currentConfig = deepMerge({}, storageConfig);
        lastLoadedConfig = deepMerge({}, storageConfig);
    } else {
        // Subsequent startups
        try {
            currentConfig = JSON.parse(currentConfigStr);
        } catch (e) {
            errorLog('[ConfigManager] Failed to parse current config. Resetting to default.', e);
            currentConfig = deepMerge({}, storageConfig);
        }

        try {
            lastLoadedConfig = JSON.parse(lastLoadedConfigStr);
        } catch (e) {
            errorLog('[ConfigManager] Failed to parse last loaded config. Resetting to default.', e);
            lastLoadedConfig = deepMerge({}, storageConfig);
        }

        // Version check for migration
        if (!deepEqual(lastLoadedConfig.version, storageConfig.version)) {
            errorLog(`[ConfigManager] Version mismatch detected. Migrating config from ${lastLoadedConfig.version?.join('.')} to ${storageConfig.version?.join('.')}.`);
            // Preserve user's settings by merging them on top of the new default config
            currentConfig = deepMerge(storageConfig, currentConfig);
            // Update the last loaded config to the new version
            lastLoadedConfig = deepMerge({}, storageConfig);
        }
    }

    // Final merge to ensure any new properties from the default config are added
    currentConfig = deepMerge(deepMerge({}, storageConfig), currentConfig);

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
