/**
 * @file AntiCheatsBP/scripts/core/reportManager.js
 * Manages player-submitted reports. Reports are stored in a world dynamic property
 * with an in-memory cache for performance. This includes adding reports, retrieving them,
 * and clearing reports.
 */
import * as mc from '@minecraft/server'; // Use mc alias

/**
 * @const {string} reportsPropertyKeyName - The dynamic property key used for storing player reports.
 */
const reportsPropertyKeyName = 'anticheat:reports_v1';

/**
 * @typedef {import('../types.js').ReportEntry} ReportEntry
 * @typedef {import('../types.js').CommandDependencies} Dependencies - Corrected typedef name
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
 * Generates a unique ID for a new report.
 * Uses a combination of timestamp and a short random string to minimize collisions.
 * @returns {string} A unique report ID.
 */
function generateReportId() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;
}

/**
 * Loads reports from the dynamic property into the in-memory cache.
 * Must be called once during script initialization from a context that can provide dependencies.
 * @param {Dependencies} dependencies - The standard dependencies object.
 */
export function initializeReportCache(dependencies) {
    const { playerUtils, mc: minecraftSystem } = dependencies; // Use mc from dependencies
    try {
        const rawReports = minecraftSystem.world.getDynamicProperty(reportsPropertyKeyName);
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
    reportsInMemory = []; // Ensure it's an empty array if loading fails
}

/**
 * Persists the current in-memory report cache to dynamic properties if changes have been made.
 * @param {Dependencies} dependencies - The standard dependencies object.
 * @returns {boolean} True if saving was successful or not needed, false on error.
 */
export function persistReportsToDisk(dependencies) {
    const { playerUtils, mc: minecraftSystem } = dependencies; // Use mc from dependencies
    if (!reportsAreDirty && minecraftSystem.world.getDynamicProperty(reportsPropertyKeyName) !== undefined) {
        return true; // No changes and already exists, no need to save
    }
    try {
        minecraftSystem.world.setDynamicProperty(reportsPropertyKeyName, JSON.stringify(reportsInMemory));
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
 * Retrieves reports from the in-memory cache.
 * @returns {ReportEntry[]} An array of report objects (a copy of the cache, sorted newest first).
 */
export function getReports() {
    // Return a shallow copy, sorted by timestamp descending (newest first)
    return [...reportsInMemory].sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * Adds a new report to the system.
 * @param {import('@minecraft/server').Player} reporterPlayer - The player making the report.
 * @param {string} reportedPlayerName - The name of the player being reported.
 * @param {string} reason - The reason for the report.
 * @param {Dependencies} dependencies - Standard dependencies object.
 * @returns {ReportEntry | null} The created report entry, or null if failed.
 */
export function addReport(reporterPlayer, reportedPlayerName, reason, dependencies) {
    const { playerUtils, logManager, config, mc: minecraftSystem } = dependencies; // Use mc from dependencies

    // Attempt to find the reported player if they are online
    const targetPlayer = playerUtils.findPlayerByNameTag(reportedPlayerName, minecraftSystem.world.getAllPlayers());

    const newReport = {
        id: generateReportId(),
        timestamp: Date.now(),
        reporterId: reporterPlayer.id,
        reporterName: reporterPlayer.nameTag,
        reportedId: targetPlayer ? targetPlayer.id : 'offline_or_unknown', // Store ID if found
        reportedName: reportedPlayerName, // Always store the name as reported
        reason: reason,
        status: 'open', // Default status
        assignedAdmin: '', // Not assigned initially
        resolutionDetails: '', // Empty initially
        lastUpdatedTimestamp: Date.now(),
    };

    reportsInMemory.unshift(newReport); // Add to the beginning for chronological order
    reportsAreDirty = true;
    persistReportsToDisk(dependencies); // Persist immediately or on next interval

    playerUtils.debugLog(`[ReportManager] Added new report ${newReport.id} by ${reporterPlayer.nameTag} against ${reportedPlayerName}.`, reporterPlayer.nameTag, dependencies);
    logManager.addLog({
        actionType: 'reportAdded',
        reporterName: reporterPlayer.nameTag,
        reportedName: reportedPlayerName,
        details: `Reason: ${reason}. Report ID: ${newReport.id}`,
        context: 'ReportManager', // Consistent context
    }, dependencies);

    // Notify admins about the new report
    const adminNotification = `§e[Report] §b${reporterPlayer.nameTag} §7reported §b${reportedPlayerName}§7. Reason: §f${reason} §7(ID: ${newReport.id})`;
    playerUtils.notifyAdmins(adminNotification, dependencies, null, null, `${config.prefix}viewreports ${newReport.id}`); // Suggest command to view

    return newReport;
}

/**
 * Clears all reports from the system.
 * @param {Dependencies} dependencies - Standard dependencies object.
 * @returns {number} The number of reports cleared.
 */
export function clearAllReports(dependencies) {
    const { playerUtils, logManager } = dependencies;
    const count = reportsInMemory.length;
    reportsInMemory = [];
    reportsAreDirty = true;
    persistReportsToDisk(dependencies); // Persist change

    playerUtils.debugLog(`[ReportManager] Cleared all ${count} reports.`, 'System', dependencies);
    logManager.addLog({
        actionType: 'allReportsCleared',
        details: `Cleared ${count} reports.`,
        context: 'ReportManager', // Consistent context
    }, dependencies);
    return count;
}

/**
 * Clears a specific report by its ID.
 * @param {string} reportId - The ID of the report to clear.
 * @param {Dependencies} dependencies - Standard dependencies object.
 * @returns {boolean} True if the report was found and cleared, false otherwise.
 */
export function clearReportById(reportId, dependencies) {
    const { playerUtils, logManager } = dependencies;
    const initialLength = reportsInMemory.length;
    reportsInMemory = reportsInMemory.filter(report => report.id !== reportId);

    if (reportsInMemory.length < initialLength) {
        reportsAreDirty = true;
        persistReportsToDisk(dependencies); // Persist change
        playerUtils.debugLog(`[ReportManager] Cleared report with ID: ${reportId}.`, 'System', dependencies);
        logManager.addLog({
            actionType: 'reportClearedById',
            details: `Cleared report ID: ${reportId}.`,
            context: 'ReportManager', // Consistent context
        }, dependencies);
        return true;
    }
    return false; // Report not found
}

/**
 * Clears all reports associated with a specific player (either as reporter or reported).
 * This is a simplified version; more specific versions could be added.
 * @param {string} playerNameOrId - The nameTag or ID of the player whose reports to clear.
 * @param {Dependencies} dependencies - Standard dependencies object.
 * @returns {number} The number of reports cleared.
 */
export function clearReportsForPlayer(playerNameOrId, dependencies) {
    const { playerUtils, logManager, mc: minecraftSystem } = dependencies; // Use mc from dependencies
    const initialLength = reportsInMemory.length;

    // Attempt to resolve to player ID if a nameTag is given and player is online
    let playerIdToClear = playerNameOrId; // Assume it's an ID initially
    const targetOnlinePlayer = playerUtils.findPlayerByNameTag(playerNameOrId, minecraftSystem.world.getAllPlayers());
    if (targetOnlinePlayer) {
        playerIdToClear = targetOnlinePlayer.id; // Use ID if player is online
    }

    // Filter out reports where the player is either the reporter or the reported party
    reportsInMemory = reportsInMemory.filter(report =>
        report.reporterName !== playerNameOrId && // Check against nameTag
        report.reportedName !== playerNameOrId && // Check against nameTag
        report.reporterId !== playerIdToClear &&   // Check against ID
        report.reportedId !== playerIdToClear    // Check against ID
    );

    const clearedCount = initialLength - reportsInMemory.length;
    if (clearedCount > 0) {
        reportsAreDirty = true;
        persistReportsToDisk(dependencies); // Persist change
        playerUtils.debugLog(`[ReportManager] Cleared ${clearedCount} reports associated with player: ${playerNameOrId}.`, 'System', dependencies);
        logManager.addLog({
            actionType: 'reportsClearedForPlayer',
            targetName: playerNameOrId, // Log with the name/ID used for clearing
            details: `Cleared ${clearedCount} reports.`,
            context: 'ReportManager', // Consistent context
        }, dependencies);
    }
    return clearedCount;
}
