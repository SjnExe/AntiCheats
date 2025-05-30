import { getPlayerByName, sendMessageToAllAdmins } from '../../assets/util.js';
import { logDebug } from '../../assets/logger.js'; // Moved logDebug to logger
import {newCommand} from '../handle.js';
// import * as config from "../../config.js"; // Removed unused import
// import { world } from '@minecraft/server'; // Removed unused import

newCommand({
    name: "report",
    description: "<player> <reason> Report a player privately to online admins",
    adminOnly: false,
    /**
     * Executes the report command.
     * Allows a player to report another player to online admins with a specified reason.
     * Handles player names that may be enclosed in quotes.
     *
     * @param {object} data - The data object provided by the command handler.
     * @param {Minecraft.Player} data.player - The player who executed the command (the reporter).
     * @param {string[]} data.args - The command arguments.
     *                               - `args[1]` can be the start of a quoted player name or an unquoted player name.
     *                               - Subsequent arguments form the reason for the report.
     * @returns {void} Sends messages to the reporter and calls `reportPlayerInternal` for further processing.
     */
    run: (data) => {
        try {
            const {args, player} = data;

            // Check if there are enough arguments
            if (args.length < 2) {
                player.sendMessage("§6[§eAnti Cheats§6]§f Usage: !report <player name> <reason>"); // SafeGuard -> Anti Cheats
                return;
            }

            let playerNameArg, reasonArg;

            if (args[1].startsWith('"') || args[1].startsWith('@"')) {
                let closingQuoteIndex = -1;
                for (let i = 1; i < args.length; i++) {
                    if (args[i].endsWith('"')) {
                        closingQuoteIndex = i;
                        break;
                    }
                }
                if (closingQuoteIndex === -1) {
                    player.sendMessage("§6[§eAnti Cheats§6]§f Invalid format! Closing quotation mark missing for player name."); // SafeGuard -> Anti Cheats
                    return;
                }
                playerNameArg = args.slice(1, closingQuoteIndex + 1).join(" ").replace(/["@]/g, "");
                reasonArg = args.slice(closingQuoteIndex + 1).join(" ") ?? "No reason provided";
            } else {
                playerNameArg = args[1].replace(/["@]/g, "");
                reasonArg = args.slice(2).join(" ") ?? "No reason provided";
            }
            
            const reportedPlayer = getPlayerByName(playerNameArg); // Already wrapped

            if (!reportedPlayer) {
                player.sendMessage(`§6[§eAnti Cheats§6]§f Player §e${playerNameArg}§f was not found`); // SafeGuard -> Anti Cheats
                return;
            }
            
            reportPlayerInternal(player, reportedPlayer, reasonArg);

        } catch (e) {
            logDebug("[Anti Cheats ERROR][report]", e, e.stack); // SafeGuard -> Anti Cheats
            if (data && data.player) {
                try {
                    data.player.sendMessage("§cAn error occurred while trying to process your report. Please check the console.");
                } catch (sendError) {
                    logDebug("[Anti Cheats ERROR][report] Failed to send error message to command executor:", sendError, sendError.stack); // SafeGuard -> Anti Cheats
                }
            }
        }
    }
});

/**
 * Internal function to handle the logic of reporting a player.
 * It checks for self-reporting, reporting admins, duplicate reports from the same player,
 * records the report, and notifies admins.
 *
 * @param {Minecraft.Player} player - The player who is making the report (reporter).
 * @param {Minecraft.Player} reportedPlayer - The player being reported.
 * @param {string} reason - The reason for the report.
 * @returns {void} Sends various feedback messages to the reporter and notifications to admins.
 *                 Modifies the "safeguard:reports" dynamic property of the reported player.
 */
export function reportPlayerInternal(player, reportedPlayer, reason) {
    try {
        if (reportedPlayer.name === player.name) {
            player.sendMessage(`§6[§eAnti Cheats§6]§f Cannot execute this command on yourself!`); // SafeGuard -> Anti Cheats
            return;
        }
        
        let reportedPlayerReportsProperty = reportedPlayer.getDynamicProperty("safeguard:reports"); // API Call
        if(reportedPlayerReportsProperty === undefined){
            reportedPlayer.setDynamicProperty("safeguard:reports",""); // API Call
            reportedPlayerReportsProperty = reportedPlayer.getDynamicProperty("safeguard:reports"); // API Call
        }  

        const tempProperty = (reportedPlayerReportsProperty || "").split(","); // Ensure it's a string before split
        
        if(player.hasAdmin()){ // Already wrapped
            logDebug(tempProperty);
            player.sendMessage(`§6[§eAnti Cheats§6]§f This player has been reported §e${tempProperty.filter(Boolean).length}§r times.`); // SafeGuard -> Anti Cheats // Filter Boolean to count actual reports
            return;
        }

        if(tempProperty.includes(player.id)) {
            player.sendMessage(`§6[§eAnti Cheats§6]§f You have already reported this player!`); // SafeGuard -> Anti Cheats
            return;
        }
        if(reportedPlayer.name === player.name) { // Redundant check, but safe
            player.sendMessage(`§6[§eAnti Cheats§6]§f You cannot report yourself!`); // SafeGuard -> Anti Cheats
            return;
        }
        if(reportedPlayer.hasAdmin()){ // Already wrapped
            player.sendMessage(`§6[§eAnti Cheats§6]§f You cannot report admins.`); // SafeGuard -> Anti Cheats
            return;
        }
        
        tempProperty.push(player.id);
        reportedPlayer.setDynamicProperty("safeguard:reports",tempProperty.filter(Boolean).toString()); // API Call, filter Boolean to prevent empty strings if initial property was empty
        
        player.sendMessage(`§6[§eAnti Cheats§6]§f Sent your report to all online admins!`); // SafeGuard -> Anti Cheats // API Call

        sendMessageToAllAdmins("notify.report", { reporterName: player.name, reportedName: reportedPlayer.name, reason: reason });
    } catch (e) {
        logDebug("[Anti Cheats ERROR][reportPlayerInternal]", e, e.stack); // SafeGuard -> Anti Cheats
        if (player) { // player is the one who executed the command
            try {
                player.sendMessage("§cAn error occurred while processing the report details. Please check the console.");
            } catch (sendError) {
                logDebug("[Anti Cheats ERROR][reportPlayerInternal] Failed to send error message to player:", sendError, sendError.stack); // SafeGuard -> Anti Cheats
            }
        }
    }
}