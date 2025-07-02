/**
 * @file Defines the !viewreports command.
 * Allows administrators to view player-submitted reports.
 */
import { permissionLevels } from '../core/rankManager.js';
import * as reportManager from '../core/reportManager.js';
import { formatTimeDifference } from '../utils/playerUtils.js'; // Assuming a utility for time formatting

/** @type {import('../types.js').CommandDefinition} */
export const definition = {
    name: 'viewreports',
    syntax: '!viewreports [report_id|player_name|all] [page_number]',
    description: 'Admin command to view player reports. Use "all" to list recent reports. Supports basic filtering and pagination.',
    permissionLevel: permissionLevels.admin,
    enabled: true,
};

export async function execute(player, args, dependencies) {
    const { config, playerUtils, logManager, getString } = dependencies;
    const adminName = player.nameTag;

    const reportsPerPage = config.reportsViewPerPage ?? 5;
    let pageNumber = 1;
    let filterType = 'all';
    let filterValue = '';

    if (args.length > 0) {
        const firstArgLower = args[0].toLowerCase();
        if (firstArgLower === 'all') {
            filterType = 'all';
            if (args.length > 1 && !isNaN(parseInt(args[1]))) {
                pageNumber = parseInt(args[1]);
            }
        } else if (args[0].includes('-') && args[0].length > 10) {
            filterType = 'id';
            filterValue = args[0];
        } else {
            filterType = 'player';
            filterValue = args[0];
            if (args.length > 1 && !isNaN(parseInt(args[1]))) {
                pageNumber = parseInt(args[1]);
            }
        }
    }
     if (pageNumber < 1) pageNumber = 1;

    const allReports = reportManager.getReports();
    let filteredReports = [];

    if (filterType === 'all') {
        filteredReports = allReports;
    } else if (filterType === 'id') {
        const report = allReports.find(r => r.id === filterValue);
        if (report) {
            filteredReports.push(report);
        } else {
            playerUtils.sendMessage(player, getString('command.viewreports.idNotFound', { reportId: filterValue }));
            return;
        }
    } else if (filterType === 'player') {
        const filterValueLower = filterValue.toLowerCase();
        filteredReports = allReports.filter(r =>
            r.reporterName.toLowerCase().includes(filterValueLower) ||
            r.reportedName.toLowerCase().includes(filterValueLower)
        );
        if (filteredReports.length === 0) {
            playerUtils.sendMessage(player, getString('command.viewreports.playerNoReports', { playerName: filterValue }));
            return;
        }
    }

    if (filteredReports.length === 0 && filterType !== 'id') {
        playerUtils.sendMessage(player, getString('command.viewreports.noReportsMatching'));
        return;
    }

    const totalReports = filteredReports.length;
    const totalPages = Math.ceil(totalReports / reportsPerPage);
    if (pageNumber > totalPages && totalReports > 0) pageNumber = totalPages;
    if (pageNumber < 1 && totalReports > 0) pageNumber = 1;


    const startIndex = (pageNumber - 1) * reportsPerPage;
    const endIndex = startIndex + reportsPerPage;
    const reportsToShow = filteredReports.slice(startIndex, endIndex);

    if (reportsToShow.length === 0 && totalReports > 0) {
         playerUtils.sendMessage(player, getString('command.viewreports.noReportsOnPage', { pageNumber: pageNumber.toString(), totalPages: totalPages.toString() }));
         return;
    }
     if (reportsToShow.length === 0 && totalReports === 0 && filterType !== 'id') { // If truly no reports at all
         playerUtils.sendMessage(player, getString('command.viewreports.noReportsFound'));
         return;
     }

    let messageLines = [];
    if (filterType !== 'all') {
        messageLines.push(getString('command.viewreports.header.filtered', { filterType: filterType, filterValue: filterValue, pageNumber: pageNumber.toString(), totalPages: totalPages.toString(), totalReports: totalReports.toString() }));
    } else {
        messageLines.push(getString('command.viewreports.header.all', { pageNumber: pageNumber.toString(), totalPages: totalPages.toString(), totalReports: totalReports.toString() }));
    }


    reportsToShow.forEach(report => {
        const timeAgo = formatTimeDifference(Date.now() - report.timestamp);
        messageLines.push(getString('command.viewreports.entry.id', { reportId: report.id, timeAgo: timeAgo }));
        messageLines.push(getString('command.viewreports.entry.reporter', { reporterName: report.reporterName }));
        messageLines.push(getString('command.viewreports.entry.reported', { reportedName: report.reportedName }));
        messageLines.push(getString('command.viewreports.entry.reason', { reason: report.reason }));
        messageLines.push(getString('command.viewreports.entry.status', { status: report.status }));
        if (report.assignedAdmin) messageLines.push(getString('command.viewreports.entry.assigned', { assignedAdmin: report.assignedAdmin }));
        if (report.resolutionDetails) messageLines.push(getString('command.viewreports.entry.resolution', { resolutionDetails: report.resolutionDetails }));
        messageLines.push(getString('command.viewreports.entry.separator'));
    });

    if (totalPages > 1 && filterType !== 'id') {
        let nextPageCommand = `${config.prefix}viewreports`;
        if (filterType === 'all') nextPageCommand += ` all`;
        else if (filterType === 'player') nextPageCommand += ` ${filterValue}`;

        if (pageNumber < totalPages) {
             messageLines.push(getString('command.viewreports.footer.nextPage', { nextPageCommand: `${nextPageCommand} ${pageNumber + 1}` }));
        }
        if (pageNumber > 1) {
            messageLines.push(getString('command.viewreports.footer.prevPage', { prevPageCommand: `${nextPageCommand} ${pageNumber - 1}` }));
        }
    }

    playerUtils.sendMessage(player, messageLines.join('\n').trimEnd());

    logManager.addLog({
        actionType: 'commandViewReports',
        adminName: adminName,
        details: `Viewed reports. Filter: ${filterType}, Value: ${filterValue}, Page: ${pageNumber}`,
        context: 'ViewReportsCommand',
    }, dependencies);
}
