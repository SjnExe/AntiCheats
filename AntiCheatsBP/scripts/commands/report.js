/**
 * @file Defines the !report command.
 * Allows players to report other players for rule violations.
 */
import { permissionLevels } from '../core/rankManager.js';
import * as reportManager from '../core/reportManager.js';

export const definition = {
    name: 'report',
    syntax: '!report <playername> <reason...>',
    description: 'Reports a player for rule violations. Provide a clear reason.',
    permissionLevel: permissionLevels.member, // Or a higher level if desired
    enabled: true,
};

export async function execute(player, args, dependencies) {
    const { config, playerUtils, logManager } = dependencies;
    const reporterPlayer = player;

    if (args.length < 2) {
        playerUtils.sendMessage(reporterPlayer, `§cUsage: ${config.prefix}${definition.syntax}`);
        return;
    }

    const reportedPlayerName = args[0];
    const reason = args.slice(1).join(' ');

    if (reportedPlayerName.toLowerCase() === reporterPlayer.nameTag.toLowerCase()) {
        playerUtils.sendMessage(reporterPlayer, `§cYou cannot report yourself.`);
        return;
    }

    if (reason.length < 10) {
        playerUtils.sendMessage(reporterPlayer, `§cPlease provide a more detailed reason (at least 10 characters).`);
        return;
    }
    if (reason.length > 256) {
        playerUtils.sendMessage(reporterPlayer, `§cYour report reason is too long (max 256 characters).`);
        return;
    }


    const newReport = reportManager.addReport(reporterPlayer, reportedPlayerName, reason, dependencies);

    if (newReport) {
        playerUtils.sendMessage(reporterPlayer, `§aReport submitted successfully against "${reportedPlayerName}". Report ID: ${newReport.id}. Thank you.`);
        logManager.addLog({
            actionType: 'commandReportExecuted',
            adminName: reporterPlayer.nameTag, // Using adminName field for reporter
            targetName: reportedPlayerName,
            details: `Report submitted. Reason: ${reason}. Report ID: ${newReport.id}`,
            context: 'ReportCommand',
        }, dependencies);
    } else {
        playerUtils.sendMessage(reporterPlayer, `§cCould not submit your report at this time. Please try again later.`);
    }
}
