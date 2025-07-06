/**
 * @file Defines the !clearreports command.
 * Allows administrators to clear player-submitted reports.
 * All actionType strings should be camelCase.
 */
import { permissionLevels } from '../core/rankManager.js';
// Import reportManager methods directly if they are all used, or import * as reportManager
import { clearAllReports, clearReportById, clearReportsForPlayer } from '../core/reportManager.js';

/** @type {import('../types.js').CommandDefinition} */
export const definition = {
    name: 'clearreports',
    syntax: '<report_id|player_name|all>', // Prefix handled by commandManager
    description: 'Admin command to clear player reports. Use "all" to clear all reports (use with caution).',
    permissionLevel: permissionLevels.admin,
    enabled: true,
};

/**
 * Executes the !clearreports command.
 * @param {import('@minecraft/server').Player} player - The player issuing the command.
 * @param {string[]} args - Command arguments.
 * @param {import('../types.js').Dependencies} dependencies - Command dependencies.
 * @returns {Promise<void>}
 */
export async function execute(player, args, dependencies) {
    const { config, playerUtils, logManager, getString } = dependencies;
    const adminName = player?.nameTag ?? 'UnknownAdmin';
    const prefix = config?.prefix ?? '!';

    if (args.length < 1) {
        playerUtils?.sendMessage(player, getString('command.clearreports.usage', { prefix: prefix, syntax: definition.syntax }));
        playerUtils?.sendMessage(player, getString('command.clearreports.example', { prefix: prefix }));
        return;
    }

    const subCommandOrTarget = args[0]; // Keep original case for IDs, lowercase for 'all'

    if (subCommandOrTarget.toLowerCase() === 'all') {
        // Assuming reportManager functions are synchronous or don't need await for this command's flow.
        // If they become async, ensure to await them.
        const clearedCount = clearAllReports(dependencies);
        playerUtils?.sendMessage(player, getString('command.clearreports.allSuccess', { count: clearedCount.toString() }));
        logManager?.addLog({
            actionType: 'reportsClearedAll', // Standardized camelCase
            adminName: adminName,
            details: `Cleared ${clearedCount} reports.`,
            context: 'ClearReportsCommand.execute.all', // More specific context
        }, dependencies);
        playerUtils?.playSoundForEvent(player, "commandSuccess", dependencies);
    } else if (subCommandOrTarget.includes('-') && subCommandOrTarget.length > 10) { // Heuristic for a report ID (e.g., timestamp-random)
        const reportId = subCommandOrTarget; // Use original case for ID
        const success = clearReportById(reportId, dependencies);
        if (success) {
            playerUtils?.sendMessage(player, getString('command.clearreports.idSuccess', { reportId: reportId }));
            logManager?.addLog({
                actionType: 'reportClearedById', // Standardized camelCase
                adminName: adminName,
                details: `Cleared report ID: ${reportId}.`,
                context: 'ClearReportsCommand.execute.byId',
            }, dependencies);
            playerUtils?.playSoundForEvent(player, "commandSuccess", dependencies);
        } else {
            playerUtils?.sendMessage(player, getString('command.clearreports.idNotFound', { reportId: reportId }));
            playerUtils?.playSoundForEvent(player, "commandError", dependencies);
        }
    } else {
        // Assumed to be a player name if not 'all' and not matching ID heuristic
        const targetPlayerName = subCommandOrTarget;
        const clearedCount = clearReportsForPlayer(targetPlayerName, dependencies);
        if (clearedCount > 0) {
            playerUtils?.sendMessage(player, getString('command.clearreports.playerSuccess', { count: clearedCount.toString(), playerName: targetPlayerName }));
            logManager?.addLog({
                actionType: 'reportsClearedForPlayer', // Standardized camelCase
                adminName: adminName,
                targetName: targetPlayerName, // Log the target player name
                details: `Cleared ${clearedCount} reports for player.`,
                context: 'ClearReportsCommand.execute.forPlayer',
            }, dependencies);
            playerUtils?.playSoundForEvent(player, "commandSuccess", dependencies);
        } else {
            playerUtils?.sendMessage(player, getString('command.clearreports.playerNotFound', { playerName: targetPlayerName }));
            // No specific error sound here, as it's a "not found" rather than command execution failure
        }
    }
}
