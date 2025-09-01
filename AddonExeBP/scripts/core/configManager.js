import { world } from '@minecraft/server';
import { config as defaultConfig } from '../config.js';

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
            // Merge default config with saved to ensure new properties are added
            loadedConfig = { ...defaultConfig, ...savedConfig };
            // Save the potentially updated config back to the world
            world.setDynamicProperty('addonexe:config', JSON.stringify(loadedConfig));
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
    world.setDynamicProperty('addonexe:config', JSON.stringify(loadedConfig));
}

/**
 * Reloads the configuration, ensuring ownerPlayerNames is updated from the config file
 * as it was read on server startup.
 */
export function forceReloadOwnerNameFromFile() {
    const configStr = world.getDynamicProperty('addonexe:config');
    let savedConfig = {};

    if (configStr !== undefined) {
        try {
            savedConfig = JSON.parse(configStr);
        } catch (error) {
            console.error('[ConfigManager] Failed to parse saved config during reload. Using default config as base.', error);
            savedConfig = defaultConfig;
        }
    } else {
        savedConfig = defaultConfig;
    }

    // Merge defaults with saved, then explicitly set owner names from the file's startup state
    loadedConfig = { ...defaultConfig, ...savedConfig };
    loadedConfig.ownerPlayerNames = defaultConfig.ownerPlayerNames;

    // Save the reloaded and corrected config back to the world
    world.setDynamicProperty('addonexe:config', JSON.stringify(loadedConfig));
}
