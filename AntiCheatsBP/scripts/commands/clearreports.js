/**
 * @file Defines the !clearreports command.
 * Allows administrators to clear player-submitted reports.
 * All actionType strings should be camelCase.
 */
import { clearAllReports, clearReportById, clearReportsForPlayer } from '../core/reportManager.js';

/** @type {import('../types.js').CommandDefinition} */
export const definition = {
    name: 'clearreports',
    syntax: '<report_id|player_name|all>',
    description: 'Admin command to clear player reports. Use "all" to clear all reports (use with caution).',
    aliases: ['cr'],
    permissionLevel: 1, // admin
    enabled: true,
};

/**
 * Executes the !clearreports command.
 * @param {import('@minecraft/server').Player} player - The player issuing the command.
 * @param {string[]} args - Command arguments.
 * @param {import('../types.js').Dependencies} dependencies - Command dependencies.
 * @returns {void}
 */
export function execute(player, args, dependencies) {
    const { config, playerUtils, logManager, getString } = dependencies;
    const adminName = player?.nameTag ?? 'UnknownAdmin';
    const prefix = config?.prefix ?? '!';

    if (args.length < 1) {
        playerUtils?.sendMessage(player, getString('command.clearreports.usage', { prefix, syntax: definition.syntax }));
        playerUtils?.sendMessage(player, getString('command.clearreports.example', { prefix }));
        return;
    }

    const subCommandOrTarget = args[0];

    if (subCommandOrTarget.toLowerCase() === 'all') {
        const clearedCount = clearAllReports(dependencies);
        playerUtils?.sendMessage(player, getString('command.clearreports.allSuccess', { count: clearedCount.toString() }));
        logManager?.addLog({
            actionType: 'reportsClearedAll',
            adminName,
            details: `Cleared ${clearedCount} reports.`,
            context: 'ClearReportsCommand.execute.all',
        }, dependencies);
        playerUtils?.playSoundForEvent(player, 'commandSuccess', dependencies);
    } else if (subCommandOrTarget.includes('-') && subCommandOrTarget.length > 10) {
        const reportId = subCommandOrTarget;
        const success = clearReportById(reportId, dependencies);
        if (success) {
            playerUtils?.sendMessage(player, getString('command.clearreports.idSuccess', { reportId }));
            logManager?.addLog({
                actionType: 'reportClearedById',
                adminName,
                details: `Cleared report ID: ${reportId}.`,
                context: 'ClearReportsCommand.execute.byId',
            }, dependencies);
            playerUtils?.playSoundForEvent(player, 'commandSuccess', dependencies);
        } else {
            playerUtils?.sendMessage(player, getString('command.clearreports.idNotFound', { reportId }));
            playerUtils?.playSoundForEvent(player, 'commandError', dependencies);
        }
    } else {
        const targetPlayerName = subCommandOrTarget;
        const clearedCount = clearReportsForPlayer(targetPlayerName, dependencies);
        if (clearedCount > 0) {
            playerUtils?.sendMessage(player, getString('command.clearreports.playerSuccess', { count: clearedCount.toString(), playerName: targetPlayerName }));
            logManager?.addLog({
                actionType: 'reportsClearedForPlayer',
                adminName,
                targetName: targetPlayerName,
                details: `Cleared ${clearedCount} reports for player.`,
                context: 'ClearReportsCommand.execute.forPlayer',
            }, dependencies);
            playerUtils?.playSoundForEvent(player, 'commandSuccess', dependencies);
        } else {
            playerUtils?.sendMessage(player, getString('command.clearreports.playerNotFound', { playerName: targetPlayerName }));
        }
    }
}
