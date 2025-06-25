/**
 * @file AntiCheatsBP/scripts/core/reportManager.js
 * Manages player-submitted reports. Reports are stored in a world dynamic property
 * with an in-memory cache for performance. This includes adding reports, retrieving them,
 * and clearing reports.
 * @version 1.0.2
 */
import { world } from '@minecraft/server';
/**
 * @const {string} reportsPropertyKeyName - The dynamic property key used for storing player reports.
 */
const reportsPropertyKeyName = 'anticheat:reports_v1';
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
 * Must be called once during script initialization from a context that can provide dependencies.
 * @param {object} dependencies - The standard dependencies object.
 * @returns {void}
 */
export function initializeReportCache(dependencies) {
    const { playerUtils } = dependencies;
    try {
        const rawReports = world.getDynamicProperty(reportsPropertyKeyName);
        if (typeof rawReports === 'string') {
            const parsedReports = JSON.parse(rawReports);
            if (Array.isArray(parsedReports)) {
                reportsInMemory = parsedReports;
                playerUtils.debugLog(`[ReportManager] Successfully loaded ${reportsInMemory.length} reports into memory cache.`, 'System', dependencies);
                return;
            }
        }
        playerUtils.debugLog(`[ReportManager] No valid reports found for key '${reportsPropertyKeyName}'. Initializing empty cache.`, 'System', dependencies);
    } catch (error) {
        console.error(`[ReportManager] Error reading/parsing reports during initialization: ${error.stack || error}`);
        playerUtils.debugLog(`[ReportManager] Error reading/parsing reports during initialization: ${error.message}`, 'System', dependencies);
    }
    reportsInMemory = [];
}
/**
 * Persists the current in-memory report cache to dynamic properties if changes have been made.
 * @param {object} dependencies - The standard dependencies object.
 * @returns {boolean} True if saving was successful or not needed, false on error.
 */
export function persistReportsToDisk(dependencies) {
    const { playerUtils } = dependencies;
    if (!reportsAreDirty && world.getDynamicProperty(reportsPropertyKeyName) !== undefined) {
        return true;
    }
    try {
        world.setDynamicProperty(reportsPropertyKeyName, JSON.stringify(reportsInMemory));
        reportsAreDirty = false;
        playerUtils.debugLog(`[ReportManager] Persisted ${reportsInMemory.length} reports to dynamic property.`, 'System', dependencies);
        return true;
    } catch (error) {
        console.error(`[ReportManager] Error saving reports to dynamic property: ${error.stack || error}`);
        playerUtils.debugLog(`[ReportManager] Error saving reports to dynamic property: ${error.message}`, 'System', dependencies);
        return false;
    }
}
/**
 * Retrieves reports from the in-memory cache. Reports are stored newest first if added via `addReport`.
 * @returns {ReportEntry[]} An array of report objects (a copy of the cache).
 */
export function getReports() {
    return [...reportsInMemory];
}
/**
 * Adds a new player report to the in-memory cache and marks reports as dirty for saving.
 * Manages report limits by removing the oldest if `maxReportsCount` is exceeded.
 * New reports are added to the beginning of the array (newest first).
 * @param {import('@minecraft/server').Player} reporterPlayer - The player making the report.
 * @param {import('@minecraft/server').Player} reportedPlayer - The player being reported.
 * @param {string} reason - The reason for the report.
 * @param {object} dependencies - The standard dependencies object.
 * @returns {ReportEntry | null} The newly created report object, or null if arguments are invalid.
 */
export function addReport(reporterPlayer, reportedPlayer, reason, dependencies) {
    const { playerUtils, config } = dependencies;
    const currentMaxReportsCount = config.maxReportsCount !== undefined ? config.maxReportsCount : 100;

    if (!reporterPlayer?.id || !reporterPlayer?.nameTag ||
        !reportedPlayer?.id || !reportedPlayer?.nameTag || !reason) {
        playerUtils.debugLog('[ReportManager] addReport called with invalid arguments (player objects or reason missing/invalid).', 'System', dependencies);
        return null;
    }

    const newReport = {
        id: generateReportId(),
        timestamp: Date.now(),
        reporterId: reporterPlayer.id,
        reporterName: reporterPlayer.nameTag,
        reportedId: reportedPlayer.id,
        reportedName: reportedPlayer.nameTag,
        reason: reason.trim()
    };

    reportsInMemory.unshift(newReport);

    if (reportsInMemory.length > currentMaxReportsCount) {
        reportsInMemory.length = currentMaxReportsCount;
    }

    reportsAreDirty = true;
    playerUtils.debugLog(`[ReportManager] Added report by ${newReport.reporterName} against ${newReport.reportedName}. Cache: ${reportsInMemory.length}`, newReport.reporterName, dependencies);

    return newReport;
}
/**
 * Clears all stored player reports from memory and persists the empty list.
 * @param {object} dependencies - The standard dependencies object.
 * @returns {boolean} True if clearing and persisting was successful.
 */
export function clearAllReports(dependencies) {
    const { playerUtils } = dependencies;
    reportsInMemory = [];
    reportsAreDirty = true;
    playerUtils.debugLog('[ReportManager] All reports cleared from memory. Attempting to persist change.', 'System', dependencies);
    return persistReportsToDisk(dependencies);
}
/**
 * Clears a specific report from storage by its ID.
 * Operates on the in-memory cache and then persists changes.
 * @param {string} reportId - The ID of the report to clear.
 * @param {object} dependencies - The standard dependencies object.
 * @returns {boolean} True if a report was found and cleared (and persisted), false otherwise.
 */
export function clearReportById(reportId, dependencies) {
    const { playerUtils } = dependencies;
    const initialCount = reportsInMemory.length;
    reportsInMemory = reportsInMemory.filter(report => report.id !== reportId);

    if (reportsInMemory.length < initialCount) {
        reportsAreDirty = true;
        playerUtils.debugLog(`[ReportManager] Cleared report ID: ${reportId} from memory. Attempting to persist.`, "System", dependencies);
        return persistReportsToDisk(dependencies);
    }
    playerUtils.debugLog(`[ReportManager] Report ID: ${reportId} not found for clearing.`, "System", dependencies);
    return false;
}
