/**
 * @file startupLogger.js
 * @description Provides a dependency-free logger for use during the earliest stages of script initialization.
 *              This logger ensures that critical errors or messages during startup can be recorded
 *              without relying on the main dependency container, which may not be initialized yet.
 */

const logPrefix = '[AntiCheats:Startup]';

/**
 * Logs a standard message to the console.
 * @param {string} message The message to log.
 */
export function log(message) {
    console.log(`${logPrefix} ${message}`);
}

/**
 * Logs an error message to the console.
 * @param {string} message The error message to log.
 * @param {Error} [errorObject] Optional error object to include its stack trace.
 */
export function logError(message, errorObject) {
    console.error(`${logPrefix} [ERROR] ${message}`);
    if (errorObject && errorObject.stack) {
        console.error(errorObject.stack);
    }
}
