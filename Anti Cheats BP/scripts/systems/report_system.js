import { world } from '@minecraft/server'; // Removed Player import
// import * as config from '../config.js'; // If maxReports becomes configurable
// import { sendMessageToAdmins } from '../assets/util.js'; // If a utility function is preferred for admin notifications

/**
 * Submits a new player report and stores it in world dynamic properties.
 * Notifies admins about the new report.
 *
 * @export
 * @async
 * @function submitReport
 * @param {Player} reporterPlayer - The player object of who is submitting the report.
 * @param {string} reportedPlayerNameStr - The name of the player being reported.
 * @param {string} reasonStr - The reason for the report.
 * @returns {Promise<boolean>} True if the report was submitted and saved successfully, false otherwise.
 */
export async function submitReport(reporterPlayer, reportedPlayerNameStr, reasonStr) {
    try {
        // Fetch Existing Reports
        let reportsArray = [];
        const reportsJson = world.getDynamicProperty("ac:playerReports");
        if (typeof reportsJson === 'string' && reportsJson.length > 0) {
            try {
                reportsArray = JSON.parse(reportsJson);
                if (!Array.isArray(reportsArray)) {
                    console.warn("[ReportSystem] 'ac:playerReports' dynamic property was not a valid array. Initializing as empty.");
                    reportsArray = [];
                }
            } catch (e) {
                console.warn(`[ReportSystem] Failed to parse 'ac:playerReports' JSON: ${e}. Initializing as empty array.`);
                reportsArray = [];
            }
        }

        // Create New Report Object
        const reportId = Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
        const newReport = {
            reportId: reportId,
            timestamp: Date.now(),
            reporterName: reporterPlayer.name,
            reporterId: reporterPlayer.id,
            reportedPlayerName: reportedPlayerNameStr,
            // reportedPlayerId: null, // Could try to find online player ID if needed
            reason: reasonStr,
            status: "new",
            dimension: reporterPlayer.dimension.id,
            location: {
                x: Math.floor(reporterPlayer.location.x),
                y: Math.floor(reporterPlayer.location.y),
                z: Math.floor(reporterPlayer.location.z)
            }
        };

        // Add to Array & Handle Rotation
        // const maxReports = config.default.max_player_reports || 200; // Example if configurable
        const maxReports = 200; 
        while (reportsArray.length >= maxReports) {
            reportsArray.shift(); // Remove the oldest report
        }
        reportsArray.push(newReport);

        // Save Reports
        world.setDynamicProperty("ac:playerReports", JSON.stringify(reportsArray));

        // Admin Notification
        const adminMessage = `§7[Report] New report by ${reporterPlayer.name} against ${reportedPlayerNameStr}. Reason: ${reasonStr.substring(0, 100)}${reasonStr.length > 100 ? '...' : ''}`;
        // If sendMessageToAdmins utility exists and is imported:
        // sendMessageToAdmins(adminMessage, false); // false if it means don't exclude reporter if they are admin
        // Otherwise, manual iteration:
        for (const p of world.getAllPlayers()) {
            if (p.hasAdmin()) { // Assuming player.hasAdmin() is defined (from previous tasks)
                p.sendMessage(adminMessage);
            }
        }
        
        return true;
    } catch (error) {
        console.error(`[ReportSystem] Failed to submit report: ${error} ${error.stack}`);
        return false;
    }
}
