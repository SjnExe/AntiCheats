/**
 * @file Manages the storage and retrieval of action logs, such as administrative commands (ban, mute, kick)
 * @module AntiCheatsBP/scripts/core/logManager
 * and significant system events. Logs are persisted using world dynamic properties with an
 * in-memory cache for performance. All `actionType` strings should be `camelCase`.
 */

/** @type {string} The dynamic property key used for storing action logs. */
const logPropertyKeyName = 'anticheat:action_logs_v1'; // Using _v1 suffix for potential future format changes.

/** @type {number} Maximum number of log entries to keep in memory and persisted storage. */
const maxLogEntriesCount = 200; // Guideline: Keep this reasonable to avoid large dynamic property sizes.

/** @type {Array<import('../types.js').LogEntry>} In-memory cache for log entries. Initialized on script load. */
let logsInMemory = [];

/** @type {boolean} Flag indicating if the in-memory logs have changed and need to be persisted. */
let logsAreDirty = false;

/**
 * Loads logs from the dynamic property into the in-memory cache.
 * Must be called once during script initialization.
 * @param {import('../types.js').CommandDependencies} dependencies - Standard dependencies object.
 */
export function initializeLogCache(dependencies) {
    const { playerUtils, mc: minecraftSystem } = dependencies; // mc provided via dependencies
    try {
        const rawLogs = minecraftSystem?.world?.getDynamicProperty(logPropertyKeyName);
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
 * Persists the current in-memory log cache to dynamic properties if `logsAreDirty` is true,
 * or if the dynamic property doesn't exist yet (first save).
 * @param {import('../types.js').CommandDependencies} dependencies - Standard dependencies object.
 * @returns {boolean} True if successful or not needed, false on error.
 */
export function persistLogCacheToDisk(dependencies) {
    const { playerUtils, mc: minecraftSystem } = dependencies;
    // Only persist if dirty OR if the property doesn't exist (initial save of potentially empty logs)
    if (!logsAreDirty && minecraftSystem?.world?.getDynamicProperty(logPropertyKeyName) !== undefined) {
        return true;
    }
    try {
        minecraftSystem?.world?.setDynamicProperty(logPropertyKeyName, JSON.stringify(logsInMemory));
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
 * Adds a new log entry to the in-memory cache and marks logs as dirty.
 * Manages log rotation to stay within `maxLogEntriesCount`.
 * Ensures `actionType` uses `camelCase`.
 * Standard for Error Log Entries:
 * When logging errors (e.g., actionType starts with 'error.' or is 'system_error'), the `details` object
 * within the `LogEntry` should follow this structure for consistency and better analysis:
 * ```
 * details: {
 * errorCode: string,    // REQUIRED: A unique, short, UPPER_SNAKE_CASE string code (e.g., 'PDM_DP_DATA_PARSE_FAIL', 'CMD_EXEC_FAIL').
 * message: string,      // REQUIRED: The primary error message (usually error.message).
 * rawErrorStack?: string, // OPTIONAL (but recommended): The full stack trace (error.stack).
 * meta?: object          // OPTIONAL: An object for any other context-specific key-value pairs relevant to this specific error.
 * }
 * ```
 * The `actionType` for errors should also follow a pattern like `error.<module>.<optional_sub_context>` (e.g., `error.pdm.dp`, `error.cmd.exec`).
 * The main `LogEntry.context` string should still provide the specific function/module path where the error originated.
 * @param {import('../types.js').LogEntry} logEntry - The log entry object. Must contain `actionType`. `timestamp` and `adminName` default if not provided.
 * @param {import('../types.js').CommandDependencies} dependencies - Standard dependencies object.
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
    const standardizedActionType = originalActionType
        .replace(/([-_][a-z0-9])/ig, ($1) => $1.toUpperCase().replace('-', '').replace('_', '')) // Convert snake_case and kebab-case parts
        .replace(/^[A-Z]/, (match) => match.toLowerCase()); // Ensure first letter is lowercase

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
 * Retrieves logs from the in-memory cache.
 * @param {number} [count] - Optional. The number of most recent logs to retrieve. If not provided or invalid, all logs are returned.
 * @returns {Array<import('../types.js').LogEntry>} An array of log objects (a copy of the cache or a slice of it).
 */
export function getLogs(count) {
    // Ensure count is a positive number if provided
    if (typeof count === 'number' && count > 0 && count < logsInMemory.length) {
        return logsInMemory.slice(0, count); // Return a copy of the slice
    }
    return [...logsInMemory]; // Return a copy of the full array
}
