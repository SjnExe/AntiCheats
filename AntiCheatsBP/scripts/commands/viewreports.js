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
    const { config, playerUtils, logManager } = dependencies;
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
        } else if (args[0].includes('-') && args[0].length > 10) { // TODO: Report ID detection is heuristic. Consider subcommands like `id <id>` for robustness.
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

    const allReports = reportManager.getReports(); // Already sorted newest first
    let filteredReports = [];

    if (filterType === 'all') {
        filteredReports = allReports;
    } else if (filterType === 'id') {
        const report = allReports.find(r => r.id === filterValue);
        if (report) {
            filteredReports.push(report);
        } else {
            playerUtils.sendMessage(player, `§cReport with ID "${filterValue}" not found.`);
            return;
        }
    } else if (filterType === 'player') {
        const filterValueLower = filterValue.toLowerCase();
        filteredReports = allReports.filter(r =>
            r.reporterName.toLowerCase().includes(filterValueLower) ||
            r.reportedName.toLowerCase().includes(filterValueLower)
        );
        if (filteredReports.length === 0) {
            playerUtils.sendMessage(player, `§cNo reports found involving player "${filterValue}".`);
            return;
        }
    }

    if (filteredReports.length === 0 && filterType !== 'id') {
        playerUtils.sendMessage(player, `§eNo reports found matching your criteria.`);
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
         playerUtils.sendMessage(player, `§cNo reports on page ${pageNumber}. Max pages: ${totalPages}.`);
         return;
    }
     if (reportsToShow.length === 0 && totalReports === 0 && filterType !== 'id') {
         playerUtils.sendMessage(player, `§eNo reports found.`);
         return;
     }


    let message = `§2--- Reports (Page ${pageNumber}/${totalPages}, Total: ${totalReports}) ---\n`;
    if (filterType !== 'all') {
        message = `§2--- Reports (Filter: ${filterType === 'id' ? 'ID ' + filterValue : 'Player ' + filterValue}, Page ${pageNumber}/${totalPages}, Total: ${totalReports}) ---\n`;
    }

    reportsToShow.forEach(report => {
        const timeAgo = formatTimeDifference(Date.now() - report.timestamp);
        message += `§eID: §f${report.id} §7(${timeAgo} ago)\n`;
        message += `  §bReporter: §f${report.reporterName}\n`;
        message += `  §cReported: §f${report.reportedName}\n`;
        message += `  §dReason: §f${report.reason}\n`;
        message += `  §7Status: §f${report.status}\n`;
        if (report.assignedAdmin) message += `  §7Assigned: §f${report.assignedAdmin}\n`;
        if (report.resolutionDetails) message += `  §7Resolution: §f${report.resolutionDetails}\n`;
        message += `§7--------------------\n`;
    });

    if (totalPages > 1 && filterType !== 'id') {
        let nextPageSyntax = `${config.prefix}viewreports`;
        if (filterType === 'all') nextPageSyntax += ` all`;
        else if (filterType === 'player') nextPageSyntax += ` ${filterValue}`;

        if (pageNumber < totalPages) {
             message += `§aType "${nextPageSyntax} ${pageNumber + 1}" for the next page.\n`;
        }
        if (pageNumber > 1) {
            message += `§aType "${nextPageSyntax} ${pageNumber - 1}" for the previous page.\n`;
        }
    }

    playerUtils.sendMessage(player, message.trimEnd());

    logManager.addLog({
        actionType: 'commandViewReports',
        adminName: adminName,
        details: `Viewed reports. Filter: ${filterType}, Value: ${filterValue}, Page: ${pageNumber}`,
        context: 'ViewReportsCommand',
    }, dependencies);
}
