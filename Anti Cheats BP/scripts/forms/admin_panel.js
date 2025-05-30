import { ActionFormData, MessageFormData } from '@minecraft/server-ui'; 
import { world } from '@minecraft/server'; // Removed Player import
import { 
    settingSelector, 
    playerSelectionForm, 
    unbanForm, 
    banLogForm 
} from '../ac_ui_components.js'; // Corrected import path

/**
 * Displays the full details of a single player report.
 * @param {Player} player The player viewing the report details.
 * @param {object} reportObject The full report object to display.
 * @param {Function} breadcrumbFunction The function to call to go back to the previous list view (e.g., showReportListViewer).
 */
async function showReportDetails(player, reportObject, breadcrumbFunction) {
    const form = new MessageFormData();
    form.title(`Report ID: ${reportObject.reportId.substring(0, 8)}...`);

    let body = `§lTimestamp:§r ${new Date(reportObject.timestamp).toLocaleString()}\n`;
    body += `§lReporter:§r ${reportObject.reporterName} (ID: ${reportObject.reporterId})\n`;
    body += `§lReported Player:§r ${reportObject.reportedPlayerName}\n`;
    if (reportObject.reportedPlayerId) {
        body += `§lReported Player ID:§r ${reportObject.reportedPlayerId}\n`;
    }
    body += `§lReason:§r\n${reportObject.reason}\n\n`;
    body += `§lStatus:§r ${reportObject.status}\n`;
    if (reportObject.location) {
        body += `§lLocation:§r X: ${reportObject.location.x}, Y: ${reportObject.location.y}, Z: ${reportObject.location.z} (Dim: ${reportObject.dimension})\n`;
    }

    form.body(body);
    form.body(body);

    if (player.isOwner()) {
        form.button1("§cDelete This Report"); // Button 1 for Owner
        form.button2("Back to Report List");  // Button 2 for Owner
    } else {
        form.button1("Back to Report List"); // Button 1 for Non-Owner
        form.button2("Close");               // Button 2 for Non-Owner
    }

    try {
        const response = await form.show(player);

        if (response.canceled) {
            // Optional: log cancellation if needed
            // console.warn(`[AdminPanel][showReportDetails] Form cancelled by ${player.name}.`);
            return;
        }

        if (player.isOwner()) {
            if (response.selection === 0) { // Owner selected "Delete This Report"
                const confirmForm = new MessageFormData();
                confirmForm.title("Confirm Deletion");
                confirmForm.body(`Are you sure you want to delete report ID: ${reportObject.reportId.substring(0,8)}...? This cannot be undone.`);
                confirmForm.button1("§cConfirm Delete");
                confirmForm.button2("Cancel");

                const confirmResponse = await confirmForm.show(player);
                if (confirmResponse.canceled || confirmResponse.selection === 1) { // Cancelled or selected "Cancel"
                    breadcrumbFunction(player); // Go back to the list view
                    return;
                }

                if (confirmResponse.selection === 0) { // Confirmed deletion
                    let reportsArray = [];
                    try {
                        const reportsJson = world.getDynamicProperty("ac:playerReports");
                        if (typeof reportsJson === 'string' && reportsJson.length > 0) {
                            reportsArray = JSON.parse(reportsJson);
                            if (!Array.isArray(reportsArray)) reportsArray = [];
                        }
                    } catch (e) {
                        console.warn(`[AdminPanel][showReportDetails] Error parsing reports for deletion: ${e}`);
                        player.sendMessage("§cError processing reports. Deletion failed.");
                        breadcrumbFunction(player);
                        return;
                    }

                    const initialCount = reportsArray.length;
                    reportsArray = reportsArray.filter(report => report.reportId !== reportObject.reportId);

                    if (reportsArray.length < initialCount) {
                        world.setDynamicProperty("ac:playerReports", JSON.stringify(reportsArray));
                        player.sendMessage(`§aReport ID: ${reportObject.reportId.substring(0,8)}... deleted successfully.`);
                    } else {
                        player.sendMessage(`§cReport ID: ${reportObject.reportId.substring(0,8)}... not found for deletion. It might have been already deleted.`);
                    }
                    breadcrumbFunction(player); // Refresh the list view
                }
            } else if (response.selection === 1) { // Owner selected "Back to Report List"
                breadcrumbFunction(player);
            }
        } else { // Not an owner
            if (response.selection === 0) { // Non-owner selected "Back to Report List"
                breadcrumbFunction(player);
            }
            // If selection is 1 ("Close" for non-owner) or cancelled, do nothing, form closes.
        }
    } catch (e) {
        console.warn(`[AdminPanel][showReportDetails] Error for ${player.name}: ${e} ${e.stack}`);
        player.sendMessage("§cAn error occurred while displaying report details.");
        // Attempt to go back to the list view even on error to prevent getting stuck
        try {
            breadcrumbFunction(player);
        } catch (navError) {
            console.warn(`[AdminPanel][showReportDetails] Error navigating back after another error: ${navError}`);
        }
    }
}

/**
 * Displays a list of player reports.
 * @param {Player} player The player viewing the reports.
 */
async function showReportListViewer(player) {
    const form = new ActionFormData();
    form.title("View Player Reports");

    let reportsArray = [];
    try {
        const reportsJson = world.getDynamicProperty("ac:playerReports");
        if (typeof reportsJson === 'string' && reportsJson.length > 0) {
            reportsArray = JSON.parse(reportsJson);
            if (!Array.isArray(reportsArray)) reportsArray = [];
        }
    } catch (e) {
        console.warn(`[AdminPanel][showReportListViewer] Error parsing reports: ${e}`);
        reportsArray = []; // Default to empty on error
    }

    if (reportsArray.length === 0) {
        const msgForm = new MessageFormData();
        msgForm.title("No Reports");
        msgForm.body("There are currently no player reports found.");
        msgForm.button1("Back to Admin Panel");
        msgForm.button2("Close"); // Dummy
        msgForm.show(player).then(response => {
            if (response.selection === 0) {
                showAdminPanel(player);
            }
        });
        return;
    }

    // Display newest reports first
    const displayReports = [...reportsArray].reverse(); 
    const reportSelectionMap = []; // To map button index to full report object

    form.body(`Found ${displayReports.length} reports. Select a report to view details.`);
    displayReports.forEach((report, index) => {
        // Shorten reason for button text if too long
        const reasonPreview = report.reason.length > 30 ? report.reason.substring(0, 27) + "..." : report.reason;
        form.button(`Reported: ${report.reportedPlayerName}\nBy: ${report.reporterName} - ${reasonPreview}`);
        reportSelectionMap[index] = report;
    });

    form.button("§cBack to Admin Panel");

    try {
        const response = await form.show(player);
        if (response.canceled) return;

        if (response.selection < reportSelectionMap.length) { // A report was selected
            const selectedReport = reportSelectionMap[response.selection];
            showReportDetails(player, selectedReport, showReportListViewer);
        } else { // "Back to Admin Panel" was selected
            showAdminPanel(player);
        }
    } catch (e) {
        console.warn(`[AdminPanel][showReportListViewer] Error for ${player.name}: ${e} ${e.stack}`);
        player.sendMessage("§cAn error occurred while displaying reports.");
    }
}

/**
 * Displays the main admin panel to a player.
 *
 * @export
 * @async
 * @function showAdminPanel
 * @param {Player} player The player to show the admin panel to.
 * @returns {Promise<void>} A promise that resolves when the form handling is complete.
 */
export async function showAdminPanel(player) {
    const form = new ActionFormData();
    form.title("Admin Panel");

    const buttons = [
        { text: "Settings", action: () => settingSelector(player, showAdminPanel) },
        { text: "Player Actions", action: () => playerSelectionForm(player, "action", showAdminPanel) },
        { text: "Quick Ban Player", action: () => playerSelectionForm(player, "ban", showAdminPanel) },
        { text: "Unban Player", action: () => unbanForm(player, showAdminPanel) },
        { text: "Ban Logs", action: () => banLogForm(player, showAdminPanel) },
        { text: "View Submitted Reports", action: () => showReportListViewer(player, showAdminPanel) },
        { text: "§cClose", action: () => {} } 
    ];

    buttons.forEach(button => form.button(button.text));

    try {
        const response = await form.show(player);

        if (response.canceled) {
            // Optional: log cancellation if needed
            // console.warn(`[AdminPanel] Form cancelled by ${player.name}. Reason: ${response.cancelationReason}`);
            return;
        }

        if (response.selection !== undefined && buttons[response.selection]) {
            // Execute the action associated with the button
            buttons[response.selection].action();
            
            // If the selected button was not "Close", and you want to re-show the admin panel after an action:
            // This might be desired for some actions but not others. For now, most actions are placeholders.
            // if (buttons[response.selection].text !== "§cClose") {
            //     showAdminPanel(player); // Re-open the panel, or navigate elsewhere
            // }
        }
    } catch (e) {
        console.warn(`[AdminPanel] Error for ${player.name}: ${e} ${e.stack}`);
        if (player && typeof player.sendMessage === 'function') {
            player.sendMessage("§cAn error occurred while trying to display the Admin Panel.");
        }
    }
}
