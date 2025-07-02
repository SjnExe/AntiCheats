/**
 * @file Defines the !clearreports command.
 * Allows administrators to clear player-submitted reports.
 */
import { permissionLevels } from '../core/rankManager.js';
import * as reportManager from '../core/reportManager.js';

/** @type {import('../types.js').CommandDefinition} */
export const definition = {
    name: 'clearreports',
    syntax: '!clearreports <report_id|player_name|all>',
    description: 'Admin command to clear player reports. Use "all" to clear all reports (use with caution).',
    permissionLevel: permissionLevels.admin,
    enabled: true,
};

export async function execute(player, args, dependencies) {
    const { config, playerUtils, logManager, getString } = dependencies;
    const adminName = player.nameTag;

    if (args.length < 1) {
        playerUtils.sendMessage(player, getString('command.clearreports.usage', { prefix: config.prefix, syntax: definition.syntax }));
        playerUtils.sendMessage(player, getString('command.clearreports.example', { prefix: config.prefix }));
        return;
    }

    const subCommand = args[0].toLowerCase();

    if (subCommand === 'all') {
        const clearedCount = reportManager.clearAllReports(dependencies);
        playerUtils.sendMessage(player, getString('command.clearreports.allSuccess', { count: clearedCount.toString() }));
        logManager.addLog({
            actionType: 'commandClearAllReports',
            adminName: adminName,
            details: `Cleared ${clearedCount} reports.`,
            context: 'ClearReportsCommand',
        }, dependencies);
    } else if (args[0].includes('-') && args[0].length > 10) { // TODO: Report ID detection is heuristic. Consider subcommands like `id <id>` for robustness.
        const reportId = args[0];
        const success = reportManager.clearReportById(reportId, dependencies);
        if (success) {
            playerUtils.sendMessage(player, getString('command.clearreports.idSuccess', { reportId: reportId }));
            logManager.addLog({
                actionType: 'commandClearReportById',
                adminName: adminName,
                details: `Cleared report ID: ${reportId}.`,
                context: 'ClearReportsCommand',
            }, dependencies);
        } else {
            playerUtils.sendMessage(player, getString('command.clearreports.idNotFound', { reportId: reportId }));
        }
    } else {
        const targetPlayerName = args[0];
        const clearedCount = reportManager.clearReportsForPlayer(targetPlayerName, dependencies);
        if (clearedCount > 0) {
            playerUtils.sendMessage(player, getString('command.clearreports.playerSuccess', { count: clearedCount.toString(), playerName: targetPlayerName }));
            logManager.addLog({
                actionType: 'commandClearReportsForPlayer',
                adminName: adminName,
                targetName: targetPlayerName,
                details: `Cleared ${clearedCount} reports.`,
                context: 'ClearReportsCommand',
            }, dependencies);
        } else {
            playerUtils.sendMessage(player, getString('command.clearreports.playerNotFound', { playerName: targetPlayerName }));
        }
    }
}
