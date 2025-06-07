/**
 * @file AntiCheatsBP/scripts/core/logManager.js
 * Manages the storage and retrieval of action logs, such as administrative commands (ban, mute, kick)
 * and significant system events. Logs are persisted using world dynamic properties with an
 * in-memory cache for performance.
 * @version 1.0.1
 */
import * as mc from '@minecraft/server';
import * as playerUtils from '../utils/playerUtils.js'; // For debugLog

/**
 * @const {string} logPropertyKeyName - The dynamic property key used for storing action logs.
 */
const logPropertyKeyName = "anticheat:action_logs_v1"; // Changed to camelCase

/**
 * @const {number} maxLogEntriesCount - Maximum number of log entries to keep in memory and persisted storage.
 */
const maxLogEntriesCount = 200; // Changed to camelCase

/**
 * @typedef {object} ActionLogEntry
 * @property {number} timestamp - Unix timestamp (ms) of when the action occurred.
 * @property {string} adminName - Name of the admin or system component that performed the action.
 * @property {string} actionType - Type of action (e.g., 'ban', 'mute', 'kick', 'warn_flag', 'system_message').
 * @property {string} [targetName] - Optional: Name of the target player, if applicable.
 * @property {string} [duration] - Optional: Duration of the ban/mute (e.g., "5m", "perm").
 * @property {string} [reason] - Optional: Reason for the action.
 * @property {string} [details] - Optional: Additional details about the log entry.
 */

/**
 * @type {ActionLogEntry[]}
 * In-memory cache for log entries. Initialized on script load.
 */
let logsInMemory = [];

/**
 * @type {boolean}
 * Flag indicating if the in-memory logs have changed and need to be persisted.
 */
let logsAreDirty = false;

/**
 * Loads logs from the dynamic property into the in-memory cache.
 * Should be called once during script initialization.
 * @returns {void}
 */
function initializeLogCache() {
    try {
        const rawLogs = mc.world.getDynamicProperty(logPropertyKeyName);
        if (typeof rawLogs === 'string') {
            const parsedLogs = JSON.parse(rawLogs);
            if (Array.isArray(parsedLogs)) {
                logsInMemory = parsedLogs;
                playerUtils.debugLog(`LogManager: Successfully loaded ${logsInMemory.length} logs into memory cache.`, "System");
                return;
            }
        }
        playerUtils.debugLog(`LogManager: No valid logs found in dynamic properties, or property not set. Initializing with empty cache.`, "System");
    } catch (error) {
        playerUtils.debugLog(`LogManager: Error reading or parsing logs from dynamic property during initialization: ${error}`, "System");
        console.error(`LogManager: Error initializing log cache: ${error.stack || error}`);
    }
    logsInMemory = []; // Ensure logsInMemory is an array even if loading fails
}

// Initialize the log cache when the script module loads.
// This is a self-invoking pattern. Consider if a more explicit init call from main.js is preferred.
(function() {
    initializeLogCache();
})();


/**
 * Persists the current in-memory log cache to dynamic properties.
 * This is the actual I/O operation.
 * @returns {boolean} True if saving was successful or not needed, false on error.
 */
export function persistLogCacheToDisk() {
    if (!logsAreDirty && mc.world.getDynamicProperty(logPropertyKeyName) !== undefined) {
        // If not dirty and logs already exist on disk (from a previous save or init), no need to save.
        // This check helps avoid unnecessary writes if persistLogCacheToDisk is called frequently
        // without new logs being added.
        // playerUtils.debugLog(`LogManager: persistLogCacheToDisk - No changes to save.`, "System");
        return true;
    }
    try {
        mc.world.setDynamicProperty(logPropertyKeyName, JSON.stringify(logsInMemory));
        logsAreDirty = false; // Reset dirty flag after successful save
        playerUtils.debugLog(`LogManager: Successfully persisted ${logsInMemory.length} logs to dynamic property.`, "System");
        return true;
    } catch (error) {
        playerUtils.debugLog(`LogManager: Error saving logs to dynamic property: ${error}`, "System");
        console.error(`LogManager: Error persisting log cache: ${error.stack || error}`);
        return false;
    }
}

/**
 * Adds a new log entry to the in-memory cache and marks logs as dirty for saving.
 * Manages log rotation to not exceed `maxLogEntriesCount`.
 * @param {ActionLogEntry} logEntry - The log entry to add. Must include timestamp, adminName, and actionType.
 *                                   targetName is highly recommended.
 * @returns {void}
 */
export function addLog(logEntry) {
    if (!logEntry || typeof logEntry.timestamp !== 'number' || !logEntry.adminName || !logEntry.actionType) {
        playerUtils.debugLog("LogManager: Attempted to add invalid log entry. Required fields (timestamp, adminName, actionType) missing.", "System");
        console.warn("LogManager: Invalid log entry object:", JSON.stringify(logEntry));
        return;
    }

    logsInMemory.unshift(logEntry); // Add new log to the beginning (newest first)

    if (logsInMemory.length > maxLogEntriesCount) {
        logsInMemory.length = maxLogEntriesCount; // Truncate array to max size (keeps newest)
    }
    logsAreDirty = true;
    // playerUtils.debugLog(`LogManager: Added log - ${logEntry.actionType} by ${logEntry.adminName} on ${logEntry.targetName || 'N/A'}. Cache size: ${logsInMemory.length}. Dirty: ${logsAreDirty}`, "System");

    // Simple strategy: save immediately after adding a log.
    // For higher frequency logging, a deferred save (e.g., via system.runInterval in main.js) would be better.
    // If this `addLog` is called extremely rapidly, this immediate save could be an issue.
    // For now, keeping it simple. If performance issues arise, make persistLogCacheToDisk explicitly called by main.
    persistLogCacheToDisk();
}

/**
 * Retrieves logs from the in-memory cache. Logs are returned newest first.
 * @param {number} [count] - Optional: The number of latest log entries to retrieve.
 *                           If undefined or invalid, returns all cached logs (up to `maxLogEntriesCount`).
 * @returns {ActionLogEntry[]} An array of log entries.
 */
export function getLogs(count) {
    if (typeof count === 'number' && count > 0 && count < logsInMemory.length) {
        return logsInMemory.slice(0, count);
    }
    return [...logsInMemory]; // Return a copy to prevent external modification of the cache
}

/**
 * Clears all action logs from memory and attempts to clear from persistent storage.
 * Primarily intended for development and testing purposes.
 * @returns {boolean} True if clearing was successful, false otherwise.
 */
export function clearAllLogs_DEV_ONLY() { // Renamed to reflect its purpose
    logsInMemory = [];
    logsAreDirty = true; // Mark as dirty to ensure the empty array is persisted
    playerUtils.debugLog("LogManager: All action logs cleared from memory (DEV_ONLY). Attempting to persist.", "System");
    return persistLogCacheToDisk();
}
