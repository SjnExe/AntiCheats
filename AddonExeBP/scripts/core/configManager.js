import { world } from '@minecraft/server';
import { config as defaultConfig } from '../config.js';
import { merge, isEqual, set } from 'lodash-es';

let loadedConfig = null;

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
            // Create a deep clone of defaultConfig to avoid modifying it
            const newConfig = merge({}, defaultConfig, savedConfig);

            // Only save back if the merged config is different from the saved one
            if (!isEqual(newConfig, savedConfig)) {
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
        // This case should ideally not be hit if init order is correct
        loadConfig();
    }
    set(loadedConfig, key, value);
    world.setDynamicProperty('addonexe:config', JSON.stringify(loadedConfig));
}
