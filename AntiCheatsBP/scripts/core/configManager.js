import { world } from '@minecraft/server';
import { config as defaultConfig } from '../config.js';

let loadedConfig = null;

/**
 * Loads the addon's configuration from world dynamic properties.
 * It merges the saved config with the default config to handle new additions.
 */
export function loadConfig() {
    console.log('[ConfigManager] Loading configuration...');
    const configStr = world.getDynamicProperty('anticheats:config');

    if (configStr === undefined) {
        world.setDynamicProperty('anticheats:config', JSON.stringify(defaultConfig));
        loadedConfig = defaultConfig;
        console.log('[ConfigManager] No existing config found. Created a new one.');
    } else {
        try {
            const savedConfig = JSON.parse(configStr);
            // Merge default config with saved to ensure new properties are added
            loadedConfig = { ...defaultConfig, ...savedConfig };
            // Save the potentially updated config back to the world
            world.setDynamicProperty('anticheats:config', JSON.stringify(loadedConfig));
            console.log('[ConfigManager] Existing config loaded and merged.');
        } catch (error) {
            console.error('[ConfigManager] Failed to parse saved config. Loading default config instead.', error);
            loadedConfig = defaultConfig;
        }
    }
}

/**
 * Gets the currently loaded configuration.
 * @returns {object} The loaded configuration object.
 */
export function getConfig() {
    if (!loadedConfig) {
        console.warn('[ConfigManager] Config accessed before it was loaded. Loading now...');
        loadConfig();
    }
    return loadedConfig;
}
