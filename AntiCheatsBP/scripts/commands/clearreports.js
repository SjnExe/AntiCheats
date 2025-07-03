/**
 * @file Defines the !clearreports command.
 * Allows administrators to clear player-submitted reports.
 * All actionType strings should be camelCase.
 */
import { permissionLevels } from '../core/rankManager.js';
import * as reportManager from '../core/reportManager.js'; // Assuming reportManager methods are synchronous or this command doesn't need to await them.

/** @type {import('../types.js').CommandDefinition} */
export const definition = {
    name: 'clearreports', // Already camelCase
    syntax: '!clearreports <report_id|player_name|all>',
    description: 'Admin command to clear player reports. Use "all" to clear all reports (use with caution).',
    permissionLevel: permissionLevels.admin, // Assuming permissionLevels is correctly populated
    enabled: true,
};

/**
 * Executes the !clearreports command.
 * @param {import('@minecraft/server').Player} player - The player issuing the command.
 * @param {string[]} args - Command arguments.
 * @param {import('../types.js').CommandDependencies} dependencies - Command dependencies.
 * @returns {Promise<void>}
 */
export async function execute(player, args, dependencies) {
    const { config, playerUtils, logManager, getString } = dependencies;
    const adminName = player?.nameTag ?? 'UnknownAdmin';

    if (args.length < 1) {
        playerUtils?.sendMessage(player, getString('command.clearreports.usage', { prefix: config?.prefix, syntax: definition.syntax }));
        playerUtils?.sendMessage(player, getString('command.clearreports.example', { prefix: config?.prefix }));
        return;
    }

    const subCommandOrTarget = args[0].toLowerCase(); // Use lowerCase for 'all' comparison

    if (subCommandOrTarget === 'all') {
        const clearedCount = reportManager.clearAllReports(dependencies); // Assuming synchronous
        playerUtils?.sendMessage(player, getString('command.clearreports.allSuccess', { count: clearedCount.toString() }));
        logManager?.addLog({
            actionType: 'reportsClearedAll', // Changed to camelCase
            adminName: adminName,
            details: `Cleared ${clearedCount} reports.`,
            context: 'ClearReportsCommand.execute',
        }, dependencies);
    } else if (args[0].includes('-') && args[0].length > 10) { // Heuristic for report ID
        const reportId = args[0]; // Keep original case for ID
        const success = reportManager.clearReportById(reportId, dependencies); // Assuming synchronous
        if (success) {
            playerUtils?.sendMessage(player, getString('command.clearreports.idSuccess', { reportId: reportId }));
            logManager?.addLog({
                actionType: 'reportClearedById', // Changed to camelCase
                adminName: adminName,
                details: `Cleared report ID: ${reportId}.`,
                context: 'ClearReportsCommand.execute',
            }, dependencies);
        } else {
            playerUtils?.sendMessage(player, getString('command.clearreports.idNotFound', { reportId: reportId }));
        }
    } else {
        // Assumed to be a player name if not 'all' and not matching ID heuristic
        const targetPlayerName = args[0];
        const clearedCount = reportManager.clearReportsForPlayer(targetPlayerName, dependencies); // Assuming synchronous
        if (clearedCount > 0) {
            playerUtils?.sendMessage(player, getString('command.clearreports.playerSuccess', { count: clearedCount.toString(), playerName: targetPlayerName }));
            logManager?.addLog({
                actionType: 'reportsClearedForPlayer', // Changed to camelCase
                adminName: adminName,
                targetName: targetPlayerName,
                details: `Cleared ${clearedCount} reports for player.`,
                context: 'ClearReportsCommand.execute',
            }, dependencies);
        } else {
            playerUtils?.sendMessage(player, getString('command.clearreports.playerNotFound', { playerName: targetPlayerName }));
        }
    }
}
