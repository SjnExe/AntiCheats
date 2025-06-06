import { world } from '@minecraft/server';

const reportsPropertyId = "anticheat:reports";
const maxReports = 100;

/**
 * Generates a somewhat unique report ID combining timestamp and random characters.
 * @returns {string} A unique report ID.
 */
// Function to generate a somewhat unique report ID
function generateReportId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
}

/**
 * Retrieves all stored reports from the world's dynamic properties.
 * @returns {Array<object>} An array of report objects, or an empty array if none exist or an error occurs.
 */
// Function to get all reports
export function getReports() {
    try {
        const reportsJson = world.getDynamicProperty(reportsPropertyId);
        if (reportsJson && typeof reportsJson === 'string') {
            return JSON.parse(reportsJson);
        }
        return []; // Return empty array if no reports or invalid format
    } catch (error) {
        console.warn(`[ReportManager] Error parsing reports from dynamic property: ${error}`);
        return [];
    }
}

/**
 * Saves an array of report objects to the world's dynamic properties.
 * @param {Array<object>} reportsArray - The array of report objects to save.
 * @returns {void}
 */
// Function to save all reports
function saveReports(reportsArray) {
    try {
        const reportsJson = JSON.stringify(reportsArray);
        world.setDynamicProperty(reportsPropertyId, reportsJson);
    } catch (error) {
        console.error(`[ReportManager] Error saving reports to dynamic property: ${error}`);
    }
}

/**
 * Adds a new player report to the storage.
 * Manages report limits by removing the oldest if `maxReports` is exceeded.
 * @param {import('@minecraft/server').Player} reporterPlayer - The player making the report.
 * @param {import('@minecraft/server').Player} reportedPlayer - The player being reported.
 * @param {string} reason - The reason for the report.
 * @returns {object | null} The newly created report object, or null if arguments are invalid.
 */
// Function to add a new report
export function addReport(reporterPlayer, reportedPlayer, reason) {
    if (!reporterPlayer || !reportedPlayer || !reason) {
        console.warn("[ReportManager] addReport called with invalid arguments.");
        return null;
    }

    const newReport = {
        id: generateReportId(),
        timestamp: Date.now(),
        reporterId: reporterPlayer.id,
        reporterName: reporterPlayer.nameTag,
        reportedId: reportedPlayer.id,
        reportedName: reportedPlayer.nameTag,
        reason: reason
    };

    let reports = getReports();
    reports.push(newReport);

    if (reports.length > maxReports) {
        reports.shift(); // Remove the oldest report
    }

    saveReports(reports);
    return newReport;
}

/**
 * Clears all stored player reports.
 * @returns {boolean} Always returns true.
 */
// Function to clear all reports (will be used by !viewreports)
export function clearAllReports() {
    saveReports([]);
    console.log("[ReportManager] All reports cleared.");
    return true;
}

/**
 * Clears a specific report from storage by its ID.
 * @param {string} reportId - The ID of the report to clear.
 * @returns {boolean} True if a report was found and cleared, false otherwise.
 */
// Function to clear a specific report by ID (will be used by !viewreports)
export function clearReportById(reportId) {
    let reports = getReports();
    const initialCount = reports.length;
    reports = reports.filter(report => report.id !== reportId);

    if (reports.length < initialCount) {
        saveReports(reports);
        console.log(`[ReportManager] Cleared report with ID: ${reportId}`);
        return true;
    }
    console.log(`[ReportManager] Report with ID: ${reportId} not found for clearing.`);
    return false;
}
