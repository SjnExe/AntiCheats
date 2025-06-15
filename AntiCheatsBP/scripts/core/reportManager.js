/**
 * @file AntiCheatsBP/scripts/core/reportManager.js
 * Manages player-submitted reports. Reports are stored in a world dynamic property
 * with an in-memory cache for performance. This includes adding reports, retrieving them,
 * and clearing reports.
 * @version 1.0.1
 */
import { world } from '@minecraft/server';
import { debugLog } from '../utils/playerUtils.js';

/**
 * @const {string} reportsPropertyKeyName - The dynamic property key used for storing player reports.
 */
const reportsPropertyKeyName = "anticheat:reports_v1";

/**
 * @const {number} maxReportsCount - Maximum number of report entries to keep in memory and persisted storage.
 */
const maxReportsCount = 100;

/**
 * @typedef {object} ReportEntry
 * @property {string} id - Unique ID for the report.
 * @property {number} timestamp - Unix timestamp (ms) of when the report was created.
 * @property {string} reporterId - ID of the player who made the report.
 * @property {string} reporterName - NameTag of the player who made the report.
 * @property {string} reportedId - ID of the player who was reported.
 * @property {string} reportedName - NameTag of the player who was reported.
 * @property {string} reason - The reason provided for the report.
 */

/**
 * @type {ReportEntry[]}
 * In-memory cache for report entries. Initialized on script load.
 */
let reportsInMemory = [];

/**
 * @type {boolean}
 * Flag indicating if the in-memory reports have changed and need to be persisted.
 */
let reportsAreDirty = false;

/**
 * Generates a somewhat unique report ID combining timestamp and random characters.
 * @returns {string} A unique report ID.
 */
function generateReportId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
}

/**
 * Loads reports from the dynamic property into the in-memory cache.
 * Should be called once during script initialization.
 * @returns {void}
 */
function initializeReportCache() {
    try {
        const rawReports = world.getDynamicProperty(reportsPropertyKeyName);
        if (typeof rawReports === 'string') {
            const parsedReports = JSON.parse(rawReports);
            if (Array.isArray(parsedReports)) {
                reportsInMemory = parsedReports;
                // Ensure reports are sorted newest first if not already (optional, depends on how they were saved)
                // For now, assume they are saved in desired order or rely on addReport's unshift.
                debugLog(`ReportManager: Successfully loaded ${reportsInMemory.length} reports into memory cache.`, "System");
                return;
            }
        }
        debugLog(`ReportManager: No valid reports found for key '${reportsPropertyKeyName}'. Initializing empty cache.`, "System");
    } catch (error) {
        debugLog(`ReportManager: Error reading/parsing reports during initialization: ${error.stack || error}`, "System");
    }
    reportsInMemory = []; // Ensure reportsInMemory is an array
}

// Initialize the report cache when the script module loads.
(function() {
    initializeReportCache();
})();

/**
 * Persists the current in-memory report cache to dynamic properties if changes have been made.
 * @returns {boolean} True if saving was successful or not needed, false on error.
 */
export function persistReportsToDisk() {
    if (!reportsAreDirty && world.getDynamicProperty(reportsPropertyKeyName) !== undefined) {
        return true;
    }
    try {
        world.setDynamicProperty(reportsPropertyKeyName, JSON.stringify(reportsInMemory));
        reportsAreDirty = false; // Reset dirty flag after successful save
        debugLog(`ReportManager: Persisted ${reportsInMemory.length} reports to dynamic property.`, "System");
        return true;
    } catch (error) {
        debugLog(`ReportManager: Error saving reports to dynamic property: ${error.stack || error}`, "System");
        return false;
    }
}

/**
 * Retrieves reports from the in-memory cache. Reports are stored newest first if added via `addReport`.
 * @returns {ReportEntry[]} An array of report objects (a copy of the cache).
 */
export function getReports() {
    // Return a copy to prevent external modification of the cache
    return [...reportsInMemory];
}

/**
 * Adds a new player report to the in-memory cache and marks reports as dirty for saving.
 * Manages report limits by removing the oldest if `maxReportsCount` is exceeded.
 * New reports are added to the beginning of the array (newest first).
 * @param {import('@minecraft/server').Player} reporterPlayer - The player making the report.
 * @param {import('@minecraft/server').Player} reportedPlayer - The player being reported.
 * @param {string} reason - The reason for the report.
 * @returns {ReportEntry | null} The newly created report object, or null if arguments are invalid.
 */
export function addReport(reporterPlayer, reportedPlayer, reason) {
    if (!reporterPlayer?.id || !reporterPlayer?.nameTag ||
        !reportedPlayer?.id || !reportedPlayer?.nameTag || !reason) {
        debugLog("ReportManager: addReport called with invalid arguments (player objects or reason missing/invalid).", "System");
        return null;
    }

    const newReport = {
        id: generateReportId(),
        timestamp: Date.now(),
        reporterId: reporterPlayer.id,
        reporterName: reporterPlayer.nameTag,
        reportedId: reportedPlayer.id,
        reportedName: reportedPlayer.nameTag,
        reason: reason.trim() // Trim reason
    };

    reportsInMemory.unshift(newReport); // Add new report to the beginning (newest first)

    if (reportsInMemory.length > maxReportsCount) {
        reportsInMemory.length = maxReportsCount; // Truncate to keep only newest N entries
    }

    reportsAreDirty = true;
    debugLog(`ReportManager: Added report by ${newReport.reporterName} against ${newReport.reportedName}. Cache: ${reportsInMemory.length}`, newReport.reporterName);

    // Note: `addReport` only marks reports as dirty. Actual persistence to disk
    // should be managed externally by calling `persistReportsToDisk` periodically
    // or during specific game events.
    return newReport;
}

/**
 * Clears all stored player reports from memory and persists the empty list.
 * @returns {boolean} True if clearing and persisting was successful.
 */
export function clearAllReports() {
    reportsInMemory = [];
    reportsAreDirty = true;
    debugLog("ReportManager: All reports cleared from memory. Attempting to persist change.", "System");
    return persistReportsToDisk();
}

/**
 * Clears a specific report from storage by its ID.
 * Operates on the in-memory cache and then persists changes.
 * @param {string} reportId - The ID of the report to clear.
 * @returns {boolean} True if a report was found and cleared (and persisted), false otherwise.
 */
export function clearReportById(reportId) {
    const initialCount = reportsInMemory.length;
    reportsInMemory = reportsInMemory.filter(report => report.id !== reportId);

    if (reportsInMemory.length < initialCount) {
        reportsAreDirty = true;
        debugLog(`ReportManager: Cleared report ID: ${reportId} from memory. Attempting to persist.`, "System");
        return persistReportsToDisk();
    }
    debugLog(`ReportManager: Report ID: ${reportId} not found for clearing.`, "System");
    return false;
}
