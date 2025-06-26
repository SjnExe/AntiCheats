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
// Removed unused function generateReportId

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
// Removed unused function addReport
// Removed unused function clearAllReports
// Removed unused function clearReportById
