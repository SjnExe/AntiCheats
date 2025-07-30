import { logError } from '../utils/playerUtils.js';

/** @type {string} */
const logPropertyKey = 'anticheat:actionLogsV1'; // Using _v1 suffix for potential future format changes.

/** @type {number} */
const maxLogEntriesCount = 200; // Guideline: Keep this reasonable to avoid large dynamic property sizes.

/** @type {Array<import('../types.js').LogEntry>} */
let logsInMemory = [];

/** @type {boolean} */
let logsAreDirty = false;

/**
 * Converts a string to camelCase.
 * @param {string} str The string to convert.
 * @returns {string} The camelCased string.
 */
function toCamelCase(str) {
    if (!str) return '';
    return str.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
}

/**
 * @param {import('../types.js').CommandDependencies} dependencies Standard dependencies object.
 */
export function initializeLogCache(dependencies) {
    const { playerUtils, mc: minecraftSystem } = dependencies;
    try {
        const rawLogs = minecraftSystem?.world?.getDynamicProperty(logPropertyKey);
        if (typeof rawLogs === 'string') {
            const parsedLogs = JSON.parse(rawLogs);
            if (Array.isArray(parsedLogs)) {
                logsInMemory = parsedLogs;
                playerUtils?.debugLog(`[LogManager.initializeLogCache] Loaded ${logsInMemory.length} logs.`, null, dependencies);
                return;
            }
        }
        playerUtils?.debugLog('[LogManager.initializeLogCache] No valid logs found or property not set. Initializing empty cache.', null, dependencies);
    } catch (error) {
        console.error(`[LogManager.initializeLogCache] Error reading/parsing logs: ${error.stack || error}`);
        playerUtils?.debugLog(`[LogManager.initializeLogCache] Exception: ${error.message}`, null, dependencies);
    }
    logsInMemory = [];
}

/**
 * @param {import('../types.js').CommandDependencies} dependencies Standard dependencies object.
 * @returns {Promise<boolean>} True on success, false on error.
 */
export async function persistLogCacheToDisk(dependencies) {
    const { playerUtils, mc: minecraftSystem } = dependencies;
    if (!logsAreDirty && minecraftSystem?.world?.getDynamicProperty(logPropertyKey) !== undefined) {
        return true;
    }
    try {
        await minecraftSystem?.world?.setDynamicProperty(logPropertyKey, JSON.stringify(logsInMemory));
        logsAreDirty = false;
        playerUtils?.debugLog(`[LogManager.persistLogCacheToDisk] Persisted ${logsInMemory.length} logs.`, null, dependencies);
        return true;
    } catch (error) {
        logError(`[LogManager.persistLogCacheToDisk] Error saving logs: ${error.stack || error}`, error);
        playerUtils?.debugLog(`[LogManager.persistLogCacheToDisk] Exception: ${error.message}`, null, dependencies);
        return false;
    }
}

/**
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

    const originalActionType = logEntry.actionType;
    const standardizedActionType = toCamelCase(originalActionType);

    if (standardizedActionType !== originalActionType) {
        playerUtils?.debugLog(`[LogManager.addLog] Standardized actionType from '${originalActionType}' to '${standardizedActionType}'.`, null, dependencies);
    }
    logEntry.actionType = standardizedActionType;

    logEntry.timestamp = logEntry.timestamp ?? Date.now();
    logEntry.adminName = logEntry.adminName ?? 'System';

    if (logEntry.adminName === 'System' && !['playerJoin', 'playerLeave', 'chatMessageSent'].includes(logEntry.actionType)) {
        playerUtils?.debugLog(`[LogManager.addLog] Log entry by System: ${logEntry.actionType}`, null, dependencies);
    }

    logsInMemory.unshift(logEntry);

    if (logsInMemory.length > maxLogEntriesCount) {
        logsInMemory.length = maxLogEntriesCount;
    }
    logsAreDirty = true;
}

/**
 * @param {number} [count] The number of most recent logs to retrieve.
 * @returns {Array<import('../types.js').LogEntry>} An array of log objects.
 */
export function getLogs(count) {
    if (typeof count === 'number' && count > 0 && count < logsInMemory.length) {
        return logsInMemory.slice(0, count);
    }
    return [...logsInMemory];
}
