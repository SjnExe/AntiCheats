/**
 * @typedef {object} Report
 * @property {string} id - A unique ID for the report.
 * @property {string} reporterId - The ID of the player who made the report.
 * @property {string} reporterName - The name of the player who made the report.
 * @property {string} reportedPlayerId - The ID of the player who was reported.
 * @property {string} reportedPlayerName - The name of the player who was reported.
 * @property {string} reason - The reason for the report.
 * @property {string} status - The status of the report ('open', 'assigned', 'resolved').
 * @property {string|null} assignedAdminId - The ID of the admin assigned to the report.
 * @property {number} timestamp - The timestamp when the report was created.
 */

/**
 * @type {Report[]}
 */
const reports = [];

/**
 * Creates a new report and adds it to the list.
 * @param {import('@minecraft/server').Player} reporter The player making the report.
 * @param {import('@minecraft/server').Player} reportedPlayer The player being reported.
 * @param {string} reason The reason for the report.
 */
export function createReport(reporter, reportedPlayer, reason) {
    const report = {
        id: Math.random().toString(36).substring(2, 9),
        reporterId: reporter.id,
        reporterName: reporter.name,
        reportedPlayerId: reportedPlayer.id,
        reportedPlayerName: reportedPlayer.name,
        reason: reason,
        status: 'open',
        assignedAdminId: null,
        timestamp: Date.now()
    };
    reports.push(report);
}

/**
 * Gets all active reports.
 * @returns {Report[]} A copy of the reports array.
 */
export function getAllReports() {
    return [...reports];
}

/**
 * Assigns a report to an admin.
 * @param {string} reportId The ID of the report to assign.
 * @param {string} adminId The ID of the admin to assign the report to.
 */
export function assignReport(reportId, adminId) {
    const report = reports.find(r => r.id === reportId);
    if (report) {
        report.status = 'assigned';
        report.assignedAdminId = adminId;
    }
}

/**
 * Marks a report as resolved.
 * @param {string} reportId The ID of the report to resolve.
 */
export function resolveReport(reportId) {
    const report = reports.find(r => r.id === reportId);
    if (report) {
        report.status = 'resolved';
    }
}

/**
 * Clears a report from the list.
 * @param {string} reportId The ID of the report to clear.
 */
export function clearReport(reportId) {
    const index = reports.findIndex(r => r.id === reportId);
    if (index !== -1) {
        reports.splice(index, 1);
    }
}

/**
 * Clears all reports from the list.
 */
export function clearAllReports() {
    reports.length = 0;
}
