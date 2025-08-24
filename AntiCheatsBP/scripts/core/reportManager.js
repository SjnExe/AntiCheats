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

// More functions for managing reports will be added here later (e.g., assign, resolve, clear).
