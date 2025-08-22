import { getConfig } from './configManager.js';

/**
 * Logs a message to the console only if debug logging is enabled in the config.
 * @param {string} message The message to log.
 */
export function debugLog(message) {
    const config = getConfig();
    if (config.debug) {
        console.log(message);
    }
}
