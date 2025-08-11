import { logError } from '../modules/utils/playerUtils.js';

/** @type {string} */
const reportsPropertyKey = 'anticheat:reportsV1';

// Constants for ID generation
const alphanumericRadix = 36;
const randomIdComponentLength = 5; // Results in a 5-character random string part

/**
 * @typedef {import('../types.js').ReportEntry} ReportEntry
 * @typedef {import('../types.js').CommandDependencies} CommandDependencies
 */

/** @type {ReportEntry[]} */
let reportsInMemory = [];

/** @type {boolean} */
let reportsAreDirty = false;

/**
 * @returns {string} A unique report ID.
 */
function generateReportId() {
    return `${Date.now().toString(alphanumericRadix)}-${Math.random().toString(alphanumericRadix).substring(2, 2 + randomIdComponentLength)}`;
}

/**
 * @param {CommandDependencies} dependencies Standard dependencies object.
 */
export function initializeReports(dependencies) {
    const { playerUtils, mc: minecraftSystem } = dependencies;
    try {
        const rawReports = minecraftSystem?.world?.getDynamicProperty(reportsPropertyKey);
        if (typeof rawReports === 'string') {
            const parsedReports = JSON.parse(rawReports);
            if (Array.isArray(parsedReports)) {
                reportsInMemory = parsedReports; // Assume stored order is acceptable (e.g., oldest first)
                playerUtils?.debugLog(`[ReportManager.initializeReports] Loaded ${reportsInMemory.length} reports.`, 'System', dependencies);
                return;
            }
        }
        playerUtils?.debugLog(`[ReportManager.initializeReports] No valid reports at '${reportsPropertyKey}'. Initializing empty cache.`, 'System', dependencies);
    } catch (error) {
        logError(`[ReportManager.initializeReports] Error loading reports: ${error.stack || error}`, error);
        playerUtils?.debugLog(`[ReportManager.initializeReports] Exception: ${error.message}`, 'System', dependencies);
    }
    reportsInMemory = []; // Ensure it's an array on failure or no data
}

/**
 * @param {CommandDependencies} dependencies Standard dependencies object.
 * @returns {boolean} True on success, false on error.
 */
export function persistReportsToDisk(dependencies) {
    const { playerUtils, mc: minecraftSystem } = dependencies;
    if (!reportsAreDirty && minecraftSystem?.world?.getDynamicProperty(reportsPropertyKey) !== undefined) {
        return true;
    }
    try {
        minecraftSystem?.world?.setDynamicProperty(reportsPropertyKey, JSON.stringify(reportsInMemory));
        reportsAreDirty = false;
        playerUtils?.debugLog(`[ReportManager.persistReportsToDisk] Persisted ${reportsInMemory.length} reports.`, 'System', dependencies);
        return true;
    } catch (error) {
        logError(`[ReportManager.persistReportsToDisk] Error saving reports: ${error.stack || error}`, error);
        playerUtils?.debugLog(`[ReportManager.persistReportsToDisk] Exception: ${error.message}`, 'System', dependencies);
        return false;
    }
}

/**
 * @returns {ReportEntry[]} An array of report objects, sorted by timestamp descending.
 */
export function getReports() {
    return [...reportsInMemory].sort((a, b) => b.timestamp - a.timestamp); // Newest first
}

/**
 * @returns {ReportEntry[]} An array of open report objects, sorted by timestamp descending.
 */
export function getOpenReports() {
    return getReports().filter(report => report.status === 'open');
}

/**
 * @param {string} reportId The ID of the report to retrieve.
 * @returns {ReportEntry|undefined} The report entry, or undefined if not found.
 */
export function getReportById(reportId) {
    return reportsInMemory.find(report => report.id === reportId);
}

/**
 * @param {string} reportId The ID of the report to assign.
 * @param {string} adminName The name of the admin to assign the report to.
 * @returns {boolean} True if the report was assigned, false otherwise.
 */
export function assignReport(reportId, adminName) {
    const report = getReportById(reportId);
    if (report) {
        report.assignedAdmin = adminName;
        report.status = 'assigned';
        report.lastUpdatedTimestamp = Date.now();
        reportsAreDirty = true;
        return true;
    }
    return false;
}

/**
 * @param {string} reportId The ID of the report to resolve.
 * @param {string} adminName The name of the admin resolving the report.
 * @param {string} resolutionNotes Notes on how the report was resolved.
 * @returns {boolean} True if the report was resolved, false otherwise.
 */
export function resolveReport(reportId, adminName, resolutionNotes) {
    const report = getReportById(reportId);
    if (report) {
        report.status = 'resolved';
        report.assignedAdmin = adminName;
        report.resolutionDetails = resolutionNotes;
        report.lastUpdatedTimestamp = Date.now();
        reportsAreDirty = true;
        return true;
    }
    return false;
}

/**
 * @param {import('@minecraft/server').Player} reporterPlayer The player making the report.
 * @param {string} reportedPlayerName The name of the player being reported.
 * @param {string} reason The reason for the report.
 * @param {CommandDependencies} dependencies Standard dependencies object.
 * @returns {ReportEntry|null} The created report entry, or null on failure.
 */
export function addReport(reporterPlayer, reportedPlayerName, reason, dependencies) {
    const { playerUtils, logManager, getString } = dependencies; // Removed config, mc: minecraftSystem. Added getString (used later)

    if (!reporterPlayer?.isValid() || !reportedPlayerName || !reason) {
        playerUtils?.debugLog('[ReportManager.addReport] Invalid arguments for adding report.', reporterPlayer?.nameTag, dependencies);
        return null;
    }

    const targetPlayer = playerUtils?.findPlayer(reportedPlayerName); // Use general findPlayer

    const newReport = {
        id: generateReportId(),
        timestamp: Date.now(),
        reporterId: reporterPlayer.id,
        reporterName: reporterPlayer.nameTag,
        reportedId: targetPlayer?.id ?? 'offlineOrUnknown', // Store ID if found, else placeholder
        reportedName: reportedPlayerName, // Always store the name as provided by reporter
        reason,
        status: 'open', // Default status, camelCase
        assignedAdmin: '',
        resolutionDetails: '',
        lastUpdatedTimestamp: Date.now(),
    };

    reportsInMemory.unshift(newReport); // Add to beginning (newest first in memory for quick access)
    reportsAreDirty = true;
    // Consider if persistReportsToDisk should be called here or batched. For now, assuming immediate for critical data.
    persistReportsToDisk(dependencies);

    playerUtils?.debugLog(`[ReportManager.addReport] Added report ${newReport.id} by ${reporterPlayer.nameTag} against ${reportedPlayerName}.`, reporterPlayer.nameTag, dependencies);
    logManager?.addLog({
        actionType: 'reportAdded', // camelCase
        reporterName: reporterPlayer.nameTag,
        reportedName: reportedPlayerName,
        details: `Reason: ${reason}. Report ID: ${newReport.id}`,
        context: 'ReportManager.addReport',
    }, dependencies);

    // Message without local prefix, relying on global prefix from notifyAdmins
    const adminNotification = getString('report.notify.newReport', { reporterName: reporterPlayer.nameTag, reportedName: reportedPlayerName, reason, reportId: newReport.id });
    // The last parameter for notifyAdmins in the original code was a command string.
    // This seems like a specific feature for this notification. Assuming it's meant to be part of the message or handled differently.
    // For now, just passing the core message. If a clickable command is needed, UI elements are better.

    // Configurable notification for new reports
    // Default to true if dependencies.config.notifications is undefined or the specific key is undefined
    const shouldNotify = dependencies.config.notifications ? dependencies.config.notifications.notifyOnNewPlayerReport !== false : true;
    if (shouldNotify) {
        playerUtils?.notifyAdmins(adminNotification, dependencies, null, null);
    }

    return newReport;
}

/**
 * @param {CommandDependencies} dependencies Standard dependencies object.
 * @returns {number} The number of reports cleared.
 */
export function clearAllReports(dependencies) {
    const { playerUtils, logManager } = dependencies;
    const count = reportsInMemory.length;
    reportsInMemory = [];
    reportsAreDirty = true;
    persistReportsToDisk(dependencies);

    playerUtils?.debugLog(`[ReportManager.clearAllReports] Cleared all ${count} reports.`, 'System', dependencies);
    logManager?.addLog({
        actionType: 'allReportsCleared', // camelCase
        details: `Cleared ${count} reports.`,
        context: 'ReportManager.clearAllReports',
    }, dependencies);
    return count;
}

/**
 * @param {string} reportId The ID of the report to clear.
 * @param {CommandDependencies} dependencies Standard dependencies object.
 * @returns {boolean} True if the report was cleared, false otherwise.
 */
export function clearReportById(reportId, dependencies) {
    const { playerUtils, logManager } = dependencies;
    const initialLength = reportsInMemory.length;
    reportsInMemory = reportsInMemory.filter(report => report.id !== reportId);

    if (reportsInMemory.length < initialLength) {
        reportsAreDirty = true;
        persistReportsToDisk(dependencies);
        playerUtils?.debugLog(`[ReportManager.clearReportById] Cleared report ID: ${reportId}.`, 'System', dependencies);
        logManager?.addLog({
            actionType: 'reportClearedById', // camelCase
            details: `Cleared report ID: ${reportId}.`,
            context: 'ReportManager.clearReportById',
        }, dependencies);
        return true;
    }
    return false; // Report not found
}

/**
 * @param {string} playerNameOrId The nameTag or ID of the player.
 * @param {CommandDependencies} dependencies Standard dependencies object.
 * @returns {number} The number of reports cleared.
 */
export function clearReportsForPlayer(playerNameOrId, dependencies) {
    const { playerUtils, logManager } = dependencies; // Removed mc: minecraftSystem
    const initialLength = reportsInMemory.length;
    const lowerPlayerNameOrId = playerNameOrId.toLowerCase(); // For case-insensitive name matching

    // Try to get ID if a nameTag is provided and player is online for more accurate ID matching.
    let resolvedPlayerId = playerNameOrId; // Assume it might be an ID
    const targetOnlinePlayer = playerUtils?.findPlayer(playerNameOrId); // General find player
    if (targetOnlinePlayer) {
        resolvedPlayerId = targetOnlinePlayer.id;
    }

    reportsInMemory = reportsInMemory.filter(report =>
        report.reporterName.toLowerCase() !== lowerPlayerNameOrId &&
        report.reportedName.toLowerCase() !== lowerPlayerNameOrId &&
        report.reporterId !== resolvedPlayerId && // Check against resolved ID
        report.reportedId !== resolvedPlayerId,    // Check against resolved ID
    );

    const clearedCount = initialLength - reportsInMemory.length;
    if (clearedCount > 0) {
        reportsAreDirty = true;
        persistReportsToDisk(dependencies);
        playerUtils?.debugLog(`[ReportManager.clearReportsForPlayer] Cleared ${clearedCount} reports for: ${playerNameOrId}.`, 'System', dependencies);
        logManager?.addLog({
            actionType: 'reportsClearedForPlayer', // camelCase
            targetName: playerNameOrId,
            details: `Cleared ${clearedCount} reports.`,
            context: 'ReportManager.clearReportsForPlayer',
        }, dependencies);
    }
    return clearedCount;
}
