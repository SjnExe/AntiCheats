import * as mc from '@minecraft/server';
import * as playerUtils from '../utils/playerUtils.js'; // For debugLog

const logDynamicPropertyKey = "anticheat:action_logs_v1";
const maxLogEntries = 200; // Max number of log entries to keep

/**
 * @typedef {object} ActionLogEntry
 * @property {number} timestamp - Unix timestamp (ms) of when the action occurred.
 * @property {string} adminName - Name of the admin who performed the action.
 * @property {'ban' | 'mute' | 'kick' | 'unban' | 'unmute'} actionType - Type of action.
 * @property {string} targetName - Name of the target player.
 * @property {string} [duration] - Optional: Duration of the ban/mute (e.g., "5m", "perm").
 * @property {string} [reason] - Optional: Reason for the action.
 */

/**
 * Retrieves current logs from dynamic properties.
 * @returns {ActionLogEntry[]} An array of log entries, or an empty array if none found/error.
 */
function getCurrentLogs() {
    try {
        const rawLogs = mc.world.getDynamicProperty(logDynamicPropertyKey);
        if (typeof rawLogs === 'string') {
            const parsedLogs = JSON.parse(rawLogs);
            if (Array.isArray(parsedLogs)) {
                return parsedLogs;
            }
        }
    } catch (error) {
        playerUtils.debugLog(`LogManager: Error reading logs: ${error}`, "System");
    }
    return [];
}

/**
 * Saves logs to dynamic properties.
 * @param {ActionLogEntry[]} logs - The array of log entries to save.
 */
function saveLogs(logs) {
    try {
        mc.world.setDynamicProperty(logDynamicPropertyKey, JSON.stringify(logs));
    } catch (error) {
        playerUtils.debugLog(`LogManager: Error saving logs: ${error}`, "System");
    }
}

/**
 * Adds a new log entry. Handles log rotation.
 * @param {ActionLogEntry} logEntry - The log entry to add.
 */
export function addLog(logEntry) {
    if (!logEntry || typeof logEntry.timestamp !== 'number' || !logEntry.adminName || !logEntry.actionType || !logEntry.targetName) {
        playerUtils.debugLog("LogManager: Attempted to add invalid log entry. Required fields missing.", "System");
        console.warn("LogManager: Invalid log entry object:", JSON.stringify(logEntry)); // More detailed console log
        return;
    }
    let logs = getCurrentLogs();
    logs.unshift(logEntry); // Add new log to the beginning for easy "latest" retrieval

    if (logs.length > maxLogEntries) {
        logs = logs.slice(0, maxLogEntries); // Keep only the newest N entries
    }
    saveLogs(logs);
    playerUtils.debugLog(`LogManager: Added log - ${logEntry.actionType} by ${logEntry.adminName} on ${logEntry.targetName}. Total logs: ${logs.length}`, "System");
}

/**
 * Retrieves logs, optionally the latest N entries.
 * Logs are returned newest first.
 * @param {number} [count] - Optional number of latest log entries to retrieve. If undefined, returns all (up to maxLogEntries).
 * @returns {ActionLogEntry[]} An array of log entries.
 */
export function getLogs(count) {
    const logs = getCurrentLogs(); // Already newest first due to unshift in addLog
    if (typeof count === 'number' && count > 0 && count < logs.length) {
        return logs.slice(0, count);
    }
    return logs;
}

/**
 * Clears all action logs. (Primarily for testing/dev purposes)
 * @returns {boolean} True if successful, false otherwise.
 */
export function clearAllLogs_DEV_ONLY() {
    try {
        mc.world.setDynamicProperty(logDynamicPropertyKey, JSON.stringify([]));
        playerUtils.debugLog("LogManager: All action logs cleared (DEV_ONLY).", "System");
        return true;
    } catch (error) {
        playerUtils.debugLog(`LogManager: Error clearing logs (DEV_ONLY): ${error}`, "System");
        return false;
    }
}
