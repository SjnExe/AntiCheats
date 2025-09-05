import { world } from '@minecraft/server';
import { config as defaultConfig } from '../config.js';
import { errorLog } from './errorLogger.js';
import { deepEqual, deepMerge, setValueByPath } from './objectUtils.js';

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

    const savedConfigStr = world.getDynamicProperty(currentConfigKey);
    const lastVersionConfigStr = world.getDynamicProperty(lastLoadedConfigKey);

    if (!savedConfigStr) {
        // This is the first time the addon is being run, or storage was lost.
        isFirstInit = true;
        currentConfig = deepMerge({}, newDefaultConfig);
        lastLoadedConfig = deepMerge({}, newDefaultConfig);
        errorLog('[ConfigManager] No saved config found. Initializing with default values.');
    } else {
        // A saved config exists, load it.
        try {
            currentConfig = JSON.parse(savedConfigStr);
        } catch (e) {
            errorLog('[ConfigManager] Failed to parse saved config. Resetting to default.', e);
            currentConfig = deepMerge({}, newDefaultConfig); // Fallback on parse error
        }

        // Check for version mismatch to log migration
        try {
            const lastVersion = JSON.parse(lastVersionConfigStr)?.version;
            if (!deepEqual(lastVersion, newDefaultConfig.version)) {
                errorLog(`[ConfigManager] Version mismatch detected. Migrating config from ${lastVersion?.join('.')} to ${newDefaultConfig.version?.join('.')}.`);
            }
        } catch {
            // This can happen if lastLoadedConfig is missing or corrupt, not a critical error.
            errorLog('[ConfigManager] Could not determine last loaded config version. Assuming migration is needed.');
        }
    }

    // The single, definitive merge operation.
    // This handles both initial setup and migration. It ensures user settings are preserved
    // over new defaults, while new properties from the default config are added.
    currentConfig = deepMerge(newDefaultConfig, currentConfig);

    // After merging, the 'last loaded' config should be updated to match the new default structure
    // for the next time a version check is needed.
    lastLoadedConfig = deepMerge({}, defaultConfig);

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
