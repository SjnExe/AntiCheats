/**
 * @file Defines the !viewreports command.
 * Allows administrators to view player-submitted reports.
 */
import * as reportManager from '../core/reportManager.js';

// Default configuration values
const defaultReportsViewPerPage = 5;

/** @type {import('../types.js').CommandDefinition} */
export const definition = {
    name: 'viewreports',
    syntax: '[playerName|reportId|page <number>]',
    description: 'Views player reports. Can filter by player/ID or view paginated list.',
    permissionLevel: 1, // admin
    enabled: true,
};

/**
 * Formats a single report entry for display.
 * @param {import('../types.js').ReportEntry} report - The report entry.
 * @param {import('../types.js').Dependencies} dependencies - For getString.
 * @returns {string} Formatted string for one report.
 */
function formatReportEntry(report, dependencies) {
    const { getString, playerUtils } = dependencies;
    const timeAgo = playerUtils?.formatTimeAgo(report.timestamp) ?? getString('common.value.unknown');

    let entry = `${getString('command.viewreports.entry.id', { reportId: report.id, timeAgo }) }\n`;
    entry += `${getString('command.viewreports.entry.reporter', { reporterName: report.reporterName }) }\n`;
    entry += `${getString('command.viewreports.entry.reported', { reportedName: report.reportedName }) }\n`;
    entry += `${getString('command.viewreports.entry.reason', { reason: report.reason }) }\n`;
    entry += `${getString('command.viewreports.entry.status', { status: report.status }) }\n`;
    if (report.assignedAdmin) {
        entry += `${getString('command.viewreports.entry.assigned', { assignedAdmin: report.assignedAdmin }) }\n`;
    }
    if (report.resolutionDetails) {
        entry += `${getString('command.viewreports.entry.resolution', { resolutionDetails: report.resolutionDetails }) }\n`;
    }
    entry += getString('command.viewreports.entry.separator');
    return entry;
}

/**
 * Executes the !viewreports command.
 * @param {import('@minecraft/server').Player} player - The player issuing the command.
 * @param {string[]} args - Command arguments.
 * @param {import('../types.js').Dependencies} dependencies - Command dependencies.
 * @returns {void}
 */
export function execute(player, args, dependencies) {
    const { config, playerUtils, logManager, getString } = dependencies;
    const adminName = player?.nameTag ?? 'UnknownAdmin';
    const prefix = config?.prefix ?? '!';
    const reportsPerPage = config?.reportsViewPerPage ?? defaultReportsViewPerPage;

    let reportsToShow = reportManager.getReports();
    let pageNumber = 1;
    let totalPages = Math.max(1, Math.ceil(reportsToShow.length / reportsPerPage));
    let filterType = 'All';
    let filterValue = '';

    if (args.length > 0) {
        const firstArgLower = args[0].toLowerCase();
        if (firstArgLower === 'page' && args[1] && !isNaN(parseInt(args[1], 10))) {
            pageNumber = Math.max(1, parseInt(args[1], 10));
            filterType = 'All (Paginated)';
        } else if (args[0].includes('-') && args[0].length > 10) {
            const reportId = args[0];
            reportsToShow = reportsToShow.filter(r => r.id === reportId);
            filterType = 'Report ID';
            filterValue = reportId;
            totalPages = Math.max(1, Math.ceil(reportsToShow.length / reportsPerPage));
        } else {
            const targetPlayerName = args[0];
            reportsToShow = reportsToShow.filter(r =>
                r.reporterName.toLowerCase().includes(targetPlayerName.toLowerCase()) ||
                r.reportedName.toLowerCase().includes(targetPlayerName.toLowerCase()),
            );
            filterType = 'Player Name';
            filterValue = targetPlayerName;
            totalPages = Math.max(1, Math.ceil(reportsToShow.length / reportsPerPage));
        }
    }
    if (pageNumber > totalPages) {
        pageNumber = totalPages;
    }


    if (reportsToShow.length === 0) {
        player.sendMessage(getString('command.viewreports.noReportsMatching'));
        return;
    }

    const startIndex = (pageNumber - 1) * reportsPerPage;
    const endIndex = startIndex + reportsPerPage;
    const paginatedReports = reportsToShow.slice(startIndex, endIndex);

    if (paginatedReports.length === 0 && pageNumber > 1) {
        player.sendMessage(getString('command.viewreports.noReportsOnPage', { pageNumber: pageNumber.toString(), totalPages: totalPages.toString() }));
        return;
    } if (paginatedReports.length === 0) {
        player.sendMessage(getString('command.viewreports.noReportsFound'));
        return;
    }

    let message = filterValue ?
        getString('command.viewreports.header.filtered', { filterType, filterValue, pageNumber: pageNumber.toString(), totalPages: totalPages.toString(), totalReports: reportsToShow.length.toString() }) :
        getString('command.viewreports.header.all', { pageNumber: pageNumber.toString(), totalPages: totalPages.toString(), totalReports: reportsToShow.length.toString() });
    message += '\n';

    paginatedReports.forEach(report => {
        message += `${formatReportEntry(report, dependencies) }\n`;
    });

    if (totalPages > pageNumber) {
        message += `${getString('command.viewreports.footer.nextPage', { nextPageCommand: `${prefix}viewreports page ${pageNumber + 1}${filterValue ? ` ${ filterValue}` : ''}` }) }\n`;
    }
    if (pageNumber > 1) {
        message += `${getString('command.viewreports.footer.prevPage', { prevPageCommand: `${prefix}viewreports page ${pageNumber - 1}${filterValue ? ` ${ filterValue}` : ''}` }) }\n`;
    }

    player.sendMessage(message.trim());
    playerUtils?.playSoundForEvent(player, 'commandSuccess', dependencies);

    logManager?.addLog({
        adminName,
        actionType: 'reportsViewed',
        details: `Viewed reports. Filter: ${filterType}='${filterValue}', Page: ${pageNumber}/${totalPages}.`,
        context: 'ViewReportsCommand.execute',
    }, dependencies);
}
