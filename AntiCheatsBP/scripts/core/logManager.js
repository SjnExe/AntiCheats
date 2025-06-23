/**
 * Manages the storage and retrieval of action logs, such as administrative commands (ban, mute, kick)
 * and significant system events. Logs are persisted using world dynamic properties with an
 * in-memory cache for performance.
 */
import * as mc from '@minecraft/server';

// The dynamic property key used for storing action logs.
const logPropertyKeyName = "anticheat:action_logs_v1";
// Maximum number of log entries to keep in memory and persisted storage.
const maxLogEntriesCount = 200;

// In-memory cache for log entries. Initialized on script load.
let logsInMemory = [];
// Flag indicating if the in-memory logs have changed and need to be persisted.
let logsAreDirty = false;

/**
 * Loads logs from the dynamic property into the in-memory cache.
 * Must be called once during script initialization.
 */
export function initializeLogCache(dependencies) {
    const { playerUtils } = dependencies;
    try {
        const rawLogs = mc.world.getDynamicProperty(logPropertyKeyName);
        if (typeof rawLogs === 'string') {
            const parsedLogs = JSON.parse(rawLogs);
            if (Array.isArray(parsedLogs)) {
                logsInMemory = parsedLogs;
                playerUtils.debugLog(`LogManager: Successfully loaded ${logsInMemory.length} logs into memory cache.`, "System", dependencies);
                return;
            }
        }
        playerUtils.debugLog(`LogManager: No valid logs found in dynamic properties, or property not set. Initializing with empty cache.`, "System", dependencies);
    } catch (error) {
        playerUtils.debugLog(`LogManager: Error reading or parsing logs from dynamic property during initialization: ${error}`, "System", dependencies);
        console.error(`LogManager: Error initializing log cache: ${error.stack || error}`);
    }
    logsInMemory = [];
}
/**
 * Persists the current in-memory log cache to dynamic properties if `logsAreDirty` is true,
 * or if the dynamic property doesn't exist yet.
 */
export function persistLogCacheToDisk(dependencies) {
    const { playerUtils } = dependencies;
    if (!logsAreDirty && mc.world.getDynamicProperty(logPropertyKeyName) !== undefined) {
        return true;
    }
    try {
        mc.world.setDynamicProperty(logPropertyKeyName, JSON.stringify(logsInMemory));
        logsAreDirty = false;
        playerUtils.debugLog(`LogManager: Successfully persisted ${logsInMemory.length} logs to dynamic property.`, "System", dependencies); // Corrected order
        return true;
    } catch (error) {
        playerUtils.debugLog(`LogManager: Error saving logs to dynamic property: ${error}`, "System", dependencies); // Corrected order
        console.error(`LogManager: Error persisting log cache: ${error.stack || error}`);
        return false;
    }
}

/**
 * Adds a new log entry to the in-memory cache and marks logs as dirty.
 * Manages log rotation.
 */
export function addLog(logEntry, dependencies) {
    const { playerUtils } = dependencies;
    if (!logEntry || typeof logEntry.timestamp !== 'number' || !logEntry.adminName || !logEntry.actionType) {
        playerUtils.debugLog("LogManager: Attempted to add invalid log entry. Required fields missing.", "System", dependencies);
        console.warn("LogManager: Invalid log entry object:", JSON.stringify(logEntry));
        return;
    }
    logsInMemory.unshift(logEntry);
    if (logsInMemory.length > maxLogEntriesCount) {
        logsInMemory.length = maxLogEntriesCount;
    }
    logsAreDirty = true;
}

/**
 * Retrieves logs from the in-memory cache (newest first).
 */
export function getLogs(count) {
    if (typeof count === 'number' && count > 0 && count < logsInMemory.length) {
        return logsInMemory.slice(0, count);
    }
    return [...logsInMemory];
}

/**
 * Clears all action logs from memory and attempts to clear from persistent storage.
 * DEV_ONLY.
 */
export function clearAllLogs_DEV_ONLY(dependencies) {
    const { playerUtils } = dependencies;
    logsInMemory = [];
    logsAreDirty = true;
    playerUtils.debugLog("LogManager: All action logs cleared from memory (DEV_ONLY). Attempting to persist.", "System", dependencies);
    return persistLogCacheToDisk(dependencies);
}
