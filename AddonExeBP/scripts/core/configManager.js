import { world } from '@minecraft/server';
import { config as defaultConfig } from '../config.js';

let loadedConfig = null;

// --- Helper functions to replace lodash ---

function isObject(item) {
    return (item && typeof item === 'object' && !Array.isArray(item));
}

/**
 * Merges new default properties into a saved configuration object without overwriting existing values.
 * @param {object} defaults The default configuration object.
 * @param {object} saved The saved configuration object.
 * @returns {object} The merged configuration object.
 */
function deepMerge(defaults, saved) {
    const merged = { ...saved };
    for (const key in defaults) {
        if (isObject(defaults[key])) {
            if (!(key in saved) || !isObject(saved[key])) {
                merged[key] = defaults[key];
            } else {
                merged[key] = deepMerge(defaults[key], saved[key]);
            }
        } else if (!(key in saved)) {
            merged[key] = defaults[key];
        }
    }
    return merged;
}

/**
 * Performs a deep comparison between two objects to see if they are equal.
 * @param {*} obj1 The first object.
 * @param {*} obj2 The second object.
 * @returns {boolean} True if the objects are equal.
 */
function deepEqual(obj1, obj2) {
    if (obj1 === obj2) return true;

    if (!isObject(obj1) || !isObject(obj2) || obj1 === null || obj2 === null) {
        return false;
    }

    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);

    if (keys1.length !== keys2.length) return false;

    for (const key of keys1) {
        if (!keys2.includes(key) || !deepEqual(obj1[key], obj2[key])) {
            return false;
        }
    }
    return true;
}

/**
 * Sets a value on a nested object using a dot-notation path.
 * @param {object} obj The object to modify.
 * @param {string} path The dot-notation path.
 * @param {*} value The value to set.
 * @returns {object} The modified object.
 */
function deepSet(obj, path, value) {
    const keys = Array.isArray(path) ? path : path.split('.');
    let current = obj;
    for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        if (!isObject(current[key])) {
            current[key] = {};
        }
        current = current[key];
    }
    current[keys[keys.length - 1]] = value;
    return obj;
}


/**
 * Loads the addon's configuration from world dynamic properties.
 * It merges the saved config with the default config to handle new additions.
 * This should only be called once at startup from main.js.
 */
export function loadConfig() {
    const configStr = world.getDynamicProperty('addonexe:config');

    if (configStr === undefined) {
        world.setDynamicProperty('addonexe:config', JSON.stringify(defaultConfig));
        loadedConfig = defaultConfig;
    } else {
        try {
            const savedConfig = JSON.parse(configStr);
            const newConfig = deepMerge(defaultConfig, savedConfig);

            if (!deepEqual(newConfig, savedConfig)) {
                world.setDynamicProperty('addonexe:config', JSON.stringify(newConfig));
            }
            loadedConfig = newConfig;
        } catch (error) {
            console.error('[ConfigManager] Failed to parse saved config. Loading default config instead.', error);
            loadedConfig = defaultConfig;
        }
    }
}

/**
 * Gets the currently loaded configuration.
 * Assumes that loadConfig() has already been called.
 * @returns {object} The loaded configuration object.
 */
export function getConfig() {
    return loadedConfig || defaultConfig;
}

/**
 * Updates a specific key in the configuration and saves it.
 * Supports nested keys using dot notation (e.g., "tpa.enabled").
 * @param {string} key The configuration key to update.
 * @param {*} value The new value for the key.
 */
export function updateConfig(key, value) {
    if (!loadedConfig) {
        loadConfig();
    }
    deepSet(loadedConfig, key, value);
    world.setDynamicProperty('addonexe:config', JSON.stringify(loadedConfig));
}
