/**
 * @file Manages the storage and retrieval of action logs.
 * @module AntiCheatsBP/scripts/core/logManager
 */

/** @type {string} The dynamic property key used for storing action logs. */
const logPropertyKey = 'anticheat:action_logs_v1'; // Using _v1 suffix for potential future format changes.

/** @type {number} Maximum number of log entries to keep in memory and persisted storage. */
const maxLogEntriesCount = 200; // Guideline: Keep this reasonable to avoid large dynamic property sizes.

/** @type {Array<import('../types.js').LogEntry>} In-memory cache for log entries. Initialized on script load. */
let logsInMemory = [];

/** @type {boolean} Flag indicating if the in-memory logs have changed and need to be persisted. */
let logsAreDirty = false;

/**
 * Loads logs from dynamic properties into the cache.
 * @param {import('../types.js').CommandDependencies} dependencies Standard dependencies object.
 */
export function initializeLogCache(dependencies) {
    const { playerUtils, mc: minecraftSystem } = dependencies; // mc provided via dependencies
    try {
        const rawLogs = minecraftSystem?.world?.getDynamicProperty(logPropertyKey);
        if (typeof rawLogs === 'string') {
            const parsedLogs = JSON.parse(rawLogs);
            if (Array.isArray(parsedLogs)) {
                logsInMemory = parsedLogs; // Assume logs are stored with newest first if that's the convention.
                playerUtils?.debugLog(`[LogManager.initializeLogCache] Loaded ${logsInMemory.length} logs.`, null, dependencies);
                return;
            }
        }
        playerUtils?.debugLog('[LogManager.initializeLogCache] No valid logs found or property not set. Initializing empty cache.', null, dependencies);
    } catch (error) {
        console.error(`[LogManager.initializeLogCache] Error reading/parsing logs: ${error.stack || error}`);
        playerUtils?.debugLog(`[LogManager.initializeLogCache] Exception: ${error.message}`, null, dependencies);
    }
    logsInMemory = []; // Ensure it's always an array.
}

/**
 * Persists the log cache to dynamic properties if dirty.
 * @param {import('../types.js').CommandDependencies} dependencies Standard dependencies object.
 * @returns {Promise<boolean>} True on success, false on error.
 */
export async function persistLogCacheToDisk(dependencies) {
    const { playerUtils, mc: minecraftSystem } = dependencies;
    // Only persist if dirty OR if the property doesn't exist (initial save of potentially empty logs)
    if (!logsAreDirty && minecraftSystem?.world?.getDynamicProperty(logPropertyKey) !== undefined) {
        return true;
    }
    try {
        await minecraftSystem?.world?.setDynamicProperty(logPropertyKey, JSON.stringify(logsInMemory));
        logsAreDirty = false; // Reset dirty flag after successful persistence
        playerUtils?.debugLog(`[LogManager.persistLogCacheToDisk] Persisted ${logsInMemory.length} logs.`, null, dependencies);
        return true;
    } catch (error) {
        console.error(`[LogManager.persistLogCacheToDisk] Error saving logs: ${error.stack || error}`);
        playerUtils?.debugLog(`[LogManager.persistLogCacheToDisk] Exception: ${error.message}`, null, dependencies);
        return false;
    }
}

/**
 * Adds a new log entry to the cache and handles log rotation.
 * @param {import('../types.js').LogEntry} logEntry The log entry object.
 * @param {import('../types.js').CommandDependencies} dependencies Standard dependencies object.
 */
export function addLog(logEntry, dependencies) {
    const { playerUtils } = dependencies;

    if (!logEntry?.actionType || typeof logEntry.actionType !== 'string' || logEntry.actionType.trim() === '') {
        console.warn('[LogManager.addLog] Invalid log entry: Missing or invalid actionType.', JSON.stringify(logEntry));
        playerUtils?.debugLog('[LogManager.addLog] Attempted to add invalid log entry (missing/invalid actionType).', null, dependencies);
        return;
    }

    // Enforce camelCase for actionType as per guidelines
    const originalActionType = logEntry.actionType;
    const standardizedActionType = originalActionType;

    if (standardizedActionType !== originalActionType) {
        playerUtils?.debugLog(`[LogManager.addLog] Standardized actionType from '${originalActionType}' to '${standardizedActionType}'.`, null, dependencies);
    }
    logEntry.actionType = standardizedActionType;

    // Default timestamp and adminName if not provided
    logEntry.timestamp = logEntry.timestamp ?? Date.now();
    logEntry.adminName = logEntry.adminName ?? 'System'; // Default to 'System'

    // Avoid debug log spam for very common system events unless explicitly watched or for specific debug needs.
    // Example: if (logEntry.adminName === 'System' && !['playerJoin', 'playerLeave', 'chatMessageSent'].includes(logEntry.actionType)) {
    //     playerUtils?.debugLog(`[LogManager.addLog] Log entry by System: ${logEntry.actionType}`, null, dependencies);
    // }

    logsInMemory.unshift(logEntry); // Add to the beginning (newest first)

    // Trim logs if over maxLogEntriesCount
    if (logsInMemory.length > maxLogEntriesCount) {
        logsInMemory.length = maxLogEntriesCount; // Efficiently truncates the array
    }
    logsAreDirty = true;
}

/**
 * Retrieves logs from the cache.
 * @param {number} [count] The number of most recent logs to retrieve.
 * @returns {Array<import('../types.js').LogEntry>} An array of log objects.
 */
export function getLogs(count) {
    // Ensure count is a positive number if provided
    if (typeof count === 'number' && count > 0 && count < logsInMemory.length) {
        return logsInMemory.slice(0, count); // Return a copy of the slice
    }
    return [...logsInMemory]; // Return a copy of the full array
}
