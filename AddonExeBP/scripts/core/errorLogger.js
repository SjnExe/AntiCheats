/**
 * Logs an error message to the console.
 * This is in a separate file from logger.js to avoid circular dependencies.
 * @param {string} message The message to log.
 * @param {any} [error] Optional error object or additional info.
 */
export function errorLog(message, error) {
    if (error) {
        // eslint-disable-next-line no-console
        console.error(message, error);
    } else {
        // eslint-disable-next-line no-console
        console.error(message);
    }
}
