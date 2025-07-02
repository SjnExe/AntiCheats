/**
 * @file Manages the storage and retrieval of action logs, such as administrative commands (ban, mute, kick)
 * and significant system events. Logs are persisted using world dynamic properties with an
 * in-memory cache for performance.
 */
import * as mc from '@minecraft/server';

/**
 * The dynamic property key used for storing action logs.
 * @type {string}
 */
const logPropertyKeyName = 'anticheat:action_logs_v1';

/**
 * Maximum number of log entries to keep in memory and persisted storage.
 * @type {number}
 */
const maxLogEntriesCount = 200;

/**
 * In-memory cache for log entries. Initialized on script load.
 * @type {Array<import('../types.js').LogEntry>}
 */
let logsInMemory = [];

/**
 * Flag indicating if the in-memory logs have changed and need to be persisted.
 * @type {boolean}
 */
let logsAreDirty = false;

/**
 * Loads logs from the dynamic property into the in-memory cache.
 * Must be called once during script initialization.
 * @param {import('../types.js').CommandDependencies} dependencies - Standard dependencies object.
 */
export function initializeLogCache(dependencies) {
    const { playerUtils, mc: minecraftSystem } = dependencies; // Added mc for world access
    try {
        const rawLogs = minecraftSystem.world.getDynamicProperty(logPropertyKeyName);
        if (typeof rawLogs === 'string') {
            const parsedLogs = JSON.parse(rawLogs);
            if (Array.isArray(parsedLogs)) {
                logsInMemory = parsedLogs;
                playerUtils.debugLog(`LogManager: Successfully loaded ${logsInMemory.length} logs into memory cache.`, 'System', dependencies);
                return;
            }
        }
        playerUtils.debugLog('LogManager: No valid logs found in dynamic properties, or property not set. Initializing with empty cache.', 'System', dependencies);
    } catch (error) {
        playerUtils.debugLog(`LogManager: Error reading or parsing logs from dynamic property during initialization: ${error.message}`, 'System', dependencies);
        console.error(`LogManager: Error initializing log cache: ${error.stack || error}`);
    }
    logsInMemory = []; // Ensure it's an empty array if loading fails
}

/**
 * Persists the current in-memory log cache to dynamic properties if `logsAreDirty` is true,
 * or if the dynamic property doesn't exist yet (first save).
 * @param {import('../types.js').CommandDependencies} dependencies - Standard dependencies object.
 * @returns {boolean} True if successful or not needed, false on error.
 */
export function persistLogCacheToDisk(dependencies) {
    const { playerUtils, mc: minecraftSystem } = dependencies; // Added mc for world access
    if (!logsAreDirty && minecraftSystem.world.getDynamicProperty(logPropertyKeyName) !== undefined) {
        return true; // No changes and already exists, no need to save
    }
    try {
        minecraftSystem.world.setDynamicProperty(logPropertyKeyName, JSON.stringify(logsInMemory));
        logsAreDirty = false;
        playerUtils.debugLog(`LogManager: Successfully persisted ${logsInMemory.length} logs to dynamic property.`, 'System', dependencies);
        return true;
    } catch (error) {
        playerUtils.debugLog(`LogManager: Error saving logs to dynamic property: ${error.message}`, 'System', dependencies);
        console.error(`LogManager: Error persisting log cache: ${error.stack || error}`);
        return false;
    }
}

/**
 * Adds a new log entry to the in-memory cache and marks logs as dirty.
 * Manages log rotation to stay within `maxLogEntriesCount`.
 * Ensures `actionType` uses `camelCase`.
 * @param {import('../types.js').LogEntry} logEntry - The log entry object. Must contain at least `actionType`. `timestamp` and `adminName` will be defaulted if not provided.
 * @param {import('../types.js').CommandDependencies} dependencies - Standard dependencies object.
 */
export function addLog(logEntry, dependencies) {
    const { playerUtils } = dependencies;

    if (!logEntry || typeof logEntry.actionType !== 'string' || logEntry.actionType.trim() === '') {
        playerUtils.debugLog('LogManager: Attempted to add invalid log entry. Missing or invalid actionType.', 'System', dependencies);
        console.warn('LogManager: Invalid log entry object (missing or invalid actionType):', JSON.stringify(logEntry));
        return;
    }

    // Ensure actionType is camelCase (basic check, assumes it's mostly correct)
    if (logEntry.actionType.includes('_') || logEntry.actionType.includes('-') || /[A-Z]/.test(logEntry.actionType[0])) {
        // Attempt a simple conversion if it looks like snake_case or kebab-case, or starts with uppercase
        // This is a heuristic and might not cover all non-camelCase scenarios perfectly.
        // A more robust solution would involve a library or more complex regex if diverse inputs are expected.
        const originalActionType = logEntry.actionType;
        logEntry.actionType = logEntry.actionType
            .replace(/([-_][a-z])/ig, ($1) => $1.toUpperCase().replace('-', '').replace('_', ''))
            .replace(/^[A-Z]/, (match) => match.toLowerCase());

        if (originalActionType !== logEntry.actionType) {
            playerUtils.debugLog(`LogManager: Converted actionType from '${originalActionType}' to '${logEntry.actionType}' for consistency.`, 'System', dependencies);
        }
    }


    if (typeof logEntry.timestamp !== 'number') {
        logEntry.timestamp = Date.now();
    }

    if (!logEntry.adminName) { // Default adminName if not provided
        logEntry.adminName = 'System';
        playerUtils.debugLog(`LogManager: logEntry missing adminName, defaulted to 'System'. Entry actionType: ${logEntry.actionType}`, 'System', dependencies);
    }

    logsInMemory.unshift(logEntry); // Add to the beginning for chronological order (newest first)
    if (logsInMemory.length > maxLogEntriesCount) {
        logsInMemory.length = maxLogEntriesCount; // Trim oldest entries
    }
    logsAreDirty = true;
}

/**
 * Retrieves logs from the in-memory cache.
 * @param {number} [count] - Optional. The number of most recent logs to retrieve. If not provided, all logs are returned.
 * @returns {Array<import('../types.js').LogEntry>} An array of log objects (a copy of the cache or a slice of it).
 */
export function getLogs(count) {
    if (typeof count === 'number' && count > 0 && count < logsInMemory.length) {
        return logsInMemory.slice(0, count); // Return a copy of the specified number of recent logs
    }
    return [...logsInMemory]; // Return a shallow copy of all logs
}
