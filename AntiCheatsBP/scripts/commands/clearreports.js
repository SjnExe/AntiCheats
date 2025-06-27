/**
 * @file Defines the !clearreports command.
 * Allows administrators to clear player-submitted reports.
 */
import { permissionLevels } from '../core/rankManager.js';
import * as reportManager from '../core/reportManager.js';
// Import ModalFormData if confirmation for "all" is desired
// import { ModalFormData } from '@minecraft/server-ui';

export const definition = {
    name: 'clearreports',
    syntax: '!clearreports <report_id|player_name|all>',
    description: 'Admin command to clear player reports. Use "all" to clear all reports (use with caution).',
    permissionLevel: permissionLevels.admin, // Or higher, e.g., owner for "all"
    enabled: true,
};

export async function execute(player, args, dependencies) {
    const { config, playerUtils, logManager } = dependencies;
    const adminName = player.nameTag;

    if (args.length < 1) {
        playerUtils.sendMessage(player, `§cUsage: ${config.prefix}${definition.syntax}`);
        playerUtils.sendMessage(player, `§cExample: ${config.prefix}clearreports <report_id> OR ${config.prefix}clearreports <player_name> OR ${config.prefix}clearreports all`);
        return;
    }

    const subCommand = args[0].toLowerCase();

    if (subCommand === 'all') {
        // Optional: Add a confirmation step for clearing all reports, as it's destructive.
        // This would typically involve a ModalForm. For simplicity in this pass, direct execution.
        // if (player.permissionLevel < permissionLevels.owner) { // Example: Owner only for "all"
        //    playerUtils.sendMessage(player, "§cYou do not have permission to clear ALL reports.");
        //    return;
        // }

        const clearedCount = reportManager.clearAllReports(dependencies);
        playerUtils.sendMessage(player, `§aSuccessfully cleared all ${clearedCount} reports.`);
        logManager.addLog({
            actionType: 'commandClearAllReports',
            adminName: adminName,
            details: `Cleared ${clearedCount} reports.`,
            context: 'ClearReportsCommand',
        }, dependencies);

    } else if (args[0].includes('-') && args[0].length > 10) { // Heuristic for report ID
        const reportId = args[0];
        const success = reportManager.clearReportById(reportId, dependencies);
        if (success) {
            playerUtils.sendMessage(player, `§aReport with ID "${reportId}" has been cleared.`);
            logManager.addLog({
                actionType: 'commandClearReportById',
                adminName: adminName,
                details: `Cleared report ID: ${reportId}.`,
                context: 'ClearReportsCommand',
            }, dependencies);
        } else {
            playerUtils.sendMessage(player, `§cReport with ID "${reportId}" not found.`);
        }
    } else { // Assume it's a player name
        const targetPlayerName = args[0];
        // Note: clearReportsForPlayer clears reports WHERE player is reporter OR reported.
        // If more specific clearing is needed (only reported, only reporter), reportManager would need more functions.
        const clearedCount = reportManager.clearReportsForPlayer(targetPlayerName, dependencies);
        if (clearedCount > 0) {
            playerUtils.sendMessage(player, `§aCleared ${clearedCount} reports associated with player "${targetPlayerName}".`);
            logManager.addLog({
                actionType: 'commandClearReportsForPlayer',
                adminName: adminName,
                targetName: targetPlayerName,
                details: `Cleared ${clearedCount} reports.`,
                context: 'ClearReportsCommand',
            }, dependencies);
        } else {
            playerUtils.sendMessage(player, `§eNo reports found associated with player "${targetPlayerName}".`);
        }
    }
}
