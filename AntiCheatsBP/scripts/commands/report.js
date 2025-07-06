/**
 * @file Defines the !report command.
 * Allows players to report other players for rule violations.
 */
import * as reportManager from '../core/reportManager.js';

/** @type {import('../types.js').CommandDefinition} */
export const definition = {
    name: 'report',
    syntax: '!report <playername> <reason...>',
    description: 'Reports a player for rule violations. Provide a clear reason.',
     permissionLevel: 1024, // member
    enabled: true,
};

export async function execute(player, args, dependencies) {
    const { config, playerUtils, logManager, getString } = dependencies;
    const reporterPlayer = player;

    if (args.length < 2) {
        playerUtils.sendMessage(reporterPlayer, getString('command.report.usage', { prefix: config.prefix, syntax: definition.syntax }));
        return;
    }

    const reportedPlayerName = args[0];
    const reason = args.slice(1).join(' ');

    if (reportedPlayerName.toLowerCase() === reporterPlayer.nameTag.toLowerCase()) {
        playerUtils.sendMessage(reporterPlayer, getString('command.report.cannotSelf'));
        return;
    }

    if (reason.length < 10) {
        playerUtils.sendMessage(reporterPlayer, getString('command.report.reasonTooShort'));
        return;
    }
    if (reason.length > 256) {
        playerUtils.sendMessage(reporterPlayer, getString('command.report.reasonTooLong'));
        return;
    }


    const newReport = reportManager.addReport(reporterPlayer, reportedPlayerName, reason, dependencies);

    if (newReport) {
        playerUtils.sendMessage(reporterPlayer, getString('command.report.success', { reportedPlayerName: reportedPlayerName, reportId: newReport.id }));
        logManager.addLog({
            actionType: 'commandReportExecuted',
            adminName: reporterPlayer.nameTag,
            targetName: reportedPlayerName,
            details: `Report submitted. Reason: ${reason}. Report ID: ${newReport.id}`,
            context: 'ReportCommand',
        }, dependencies);
    } else {
        playerUtils.sendMessage(reporterPlayer, getString('command.report.failure'));
    }
}
