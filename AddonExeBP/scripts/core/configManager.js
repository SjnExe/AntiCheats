import { config } from '../config.js';

let currentConfig = { ...config };

/**
 * Gets the current configuration object.
 * @returns {typeof config}
 */
export function getConfig() {
    return currentConfig;
}

/**
 * (For future use) Loads or reloads the configuration.
 * In this simple implementation, it just resets to the default imported config.
 */
export function loadConfig() {
    currentConfig = { ...config };
}
