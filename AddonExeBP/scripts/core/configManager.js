import { world } from '@minecraft/server';
import { config as defaultConfig } from '../config.js';
import { errorLog } from './errorLogger.js';
import { deepEqual, deepMerge } from './utils.js';

const currentConfigKey = 'addonexe:config:current';
const lastLoadedConfigKey = 'addonexe:config:lastLoaded';

let currentConfig = null;
let lastLoadedConfig = null;

/**
 * Loads the addon's configurations from world dynamic properties.
 * This should only be called once at startup from main.js.
 */
export function loadConfig() {
    // Load current config
    const currentConfigStr = world.getDynamicProperty(currentConfigKey);
    if (currentConfigStr) {
        try {
            currentConfig = JSON.parse(currentConfigStr);
        } catch (e) {
            errorLog('[ConfigManager] Failed to parse current config from world property. Initializing from default.', e);
            currentConfig = { ...defaultConfig };
        }
    } else {
        currentConfig = { ...defaultConfig };
    }

    // Load last loaded config
    const lastLoadedConfigStr = world.getDynamicProperty(lastLoadedConfigKey);
    if (lastLoadedConfigStr) {
        try {
            lastLoadedConfig = JSON.parse(lastLoadedConfigStr);
        } catch (e) {
            errorLog('[ConfigManager] Failed to parse last loaded config from world property. Initializing from default.', e);
            lastLoadedConfig = { ...defaultConfig };
        }
    } else {
        lastLoadedConfig = { ...defaultConfig };
    }

    // Deep merge with default config to ensure new properties from updates are included
    currentConfig = deepMerge({ ...defaultConfig }, currentConfig);
    lastLoadedConfig = deepMerge({ ...defaultConfig }, lastLoadedConfig);


    // Save back to ensure they are persisted for the first time
    saveCurrentConfig();
    saveLastLoadedConfig();
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
    const storageConfig = { ...defaultConfig }; // Fresh copy from the file

    for (const key in storageConfig) {
        if (!deepEqual(lastLoadedConfig[key], storageConfig[key])) {
            currentConfig[key] = storageConfig[key];
        }
    }

    lastLoadedConfig = { ...storageConfig };

    saveCurrentConfig();
    saveLastLoadedConfig();
}
