import { world } from '@minecraft/server';
import { config as defaultConfig } from '../config.js';

let loadedConfig = null;

/**
 * Loads the addon's configuration from world dynamic properties.
 * It merges the saved config with the default config to handle new additions.
 * This should only be called once at startup from main.js.
 */
export function loadConfig() {
    const configStr = world.getDynamicProperty('anticheats:config');

    if (configStr === undefined) {
        world.setDynamicProperty('anticheats:config', JSON.stringify(defaultConfig));
        loadedConfig = defaultConfig;
    } else {
        try {
            const savedConfig = JSON.parse(configStr);
            // Merge default config with saved to ensure new properties are added
            loadedConfig = { ...defaultConfig, ...savedConfig };
            // Save the potentially updated config back to the world
            world.setDynamicProperty('anticheats:config', JSON.stringify(loadedConfig));
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
 * @param {string} key The configuration key to update.
 * @param {*} value The new value for the key.
 */
export function updateConfig(key, value) {
    if (!loadedConfig) {
        // This case should ideally not be hit if init order is correct
        loadConfig();
    }
    loadedConfig[key] = value;
    world.setDynamicProperty('anticheats:config', JSON.stringify(loadedConfig));
}
