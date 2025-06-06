import * as mc from '@minecraft/server';
import { permissionLevels } from './rankManager.js';
import { getPlayerPermissionLevel } from '../utils/playerUtils.js';
import { addMute, removeMute, isMuted } from '../core/playerDataManager.js';
import { addLog } from './logManager.js';
import * as reportManager from './reportManager.js';
import { ActionFormData, MessageFormData, ModalFormData } from '@minecraft/server-ui';
import { ItemComponentTypes } from '@minecraft/server';

const allCommands = [
    { name: "help", syntax: "!help", description: "Shows available commands.", permissionLevel: permissionLevels.NORMAL },
    { name: "myflags", syntax: "!myflags", description: "Shows your own current flag status.", permissionLevel: permissionLevels.NORMAL },
    { name: "uinfo", syntax: "!uinfo", description: "Shows your anti-cheat stats, server rules, and help links in a UI.", permissionLevel: permissionLevels.NORMAL },
    {
        name: "report",
        syntax: "!report <playername> <reason...>",
        description: "Reports a player for admin review. Reason is required.",
        permissionLevel: permissionLevels.NORMAL
    },
    { name: "version", syntax: "!version", description: "Displays addon version.", permissionLevel: permissionLevels.ADMIN },
    { name: "watch", syntax: "!watch <player>", description: "Toggles debug watch for a player.", permissionLevel: permissionLevels.ADMIN },
    { name: "inspect", syntax: "!inspect <player>", description: "Shows player's AC data.", permissionLevel: permissionLevels.ADMIN },
    { name: "warnings", syntax: "!warnings <player>", description: "Shows a detailed list of warnings/flags for a player.", permissionLevel: permissionLevels.ADMIN },
    {
        name: "viewreports", // ADDED for !viewreports
        syntax: "!viewreports [playername|clearall|clear <id>]",
        description: "Views and manages player reports.",
        permissionLevel: permissionLevels.ADMIN
    },
    { name: "invsee", syntax: "!invsee <player>", description: "Displays a read-only view of a player's inventory.", permissionLevel: permissionLevels.ADMIN },
    { name: "resetflags", syntax: "!resetflags <player>", description: "Resets player's flags.", permissionLevel: permissionLevels.ADMIN },
    { name: "clearwarnings", syntax: "!clearwarnings <player>", description: "Clears all warnings/flags for a player (similar to !resetflags).", permissionLevel: permissionLevels.ADMIN },
    { name: "kick", syntax: "!kick <player> [reason]", description: "Kicks a player from the server.", permissionLevel: permissionLevels.ADMIN },
    { name: "clearchat", syntax: "!clearchat", description: "Clears the chat for all players.", permissionLevel: permissionLevels.ADMIN },
    { name: "vanish", syntax: "!vanish [on|off]", description: "Toggles admin visibility. Makes you invisible and hides your nametag.", permissionLevel: permissionLevels.ADMIN },
    { name: "freeze", syntax: "!freeze <player> [on|off]", description: "Freezes or unfreezes a player, preventing movement.", permissionLevel: permissionLevels.ADMIN },
    { name: "mute", syntax: "!mute <player> [duration] [reason]", description: "Mutes a player for a specified duration (e.g., 5m, 1h, 1d, perm).", permissionLevel: permissionLevels.ADMIN },
    { name: "unmute", syntax: "!unmute <player>", description: "Unmutes a player.", permissionLevel: permissionLevels.ADMIN },
    { name: "ban", syntax: "!ban <player> [duration] [reason]", description: "Bans a player for a specified duration (e.g., 7d, 2h, perm).", permissionLevel: permissionLevels.ADMIN },
    { name: "unban", syntax: "!unban <player>", description: "Unbans a player.", permissionLevel: permissionLevels.ADMIN },
    { name: "panel", syntax: "!panel", description: "Opens the AntiCheat Admin Panel UI.", permissionLevel: permissionLevels.ADMIN },
    { name: "notify", syntax: "!notify <on|off|status>", description: "Toggles or checks your AntiCheat system notifications.", permissionLevel: permissionLevels.ADMIN },
    { name: "xraynotify", syntax: "!xraynotify <on|off|status>", description: "Manage X-Ray notifications.", permissionLevel: permissionLevels.ADMIN },
    { name: "testnotify", syntax: "!testnotify", description: "Sends a test admin notification.", permissionLevel: permissionLevels.OWNER },
    {
        name: "tp",
        syntax: "!tp <target_player | x> [destination_player | y] [z] [dimension]",
        description: "Teleports a player. Examples: !tp <player_to_move> <destination_player> OR !tp <player_to_move> <x> <y> <z> [dimension] OR !tp <x> <y> <z> [dimension] (teleports yourself). Dimensions: overworld, nether, end.",
        permissionLevel: permissionLevels.ADMIN
    },
    { name: "gmc", syntax: "!gmc [player]", description: "Sets Creative mode for self or [player].", permissionLevel: permissionLevels.ADMIN },
    { name: "gms", syntax: "!gms [player]", description: "Sets Survival mode for self or [player].", permissionLevel: permissionLevels.ADMIN },
    { name: "gma", syntax: "!gma [player]", description: "Sets Adventure mode for self or [player].", permissionLevel: permissionLevels.ADMIN },
    { name: "gmsp", syntax: "!gmsp [player]", description: "Sets Spectator mode for self or [player].", permissionLevel: permissionLevels.ADMIN },
    { name: "copyinv", syntax: "!copyinv <playername>", description: "Copies another player's inventory to your own (overwrites your current inventory).", permissionLevel: permissionLevels.ADMIN }
];

// Helper function to find a player by name (case-insensitive)
function findPlayer(playerName, playerUtils) {
    if (!playerName || typeof playerName !== 'string') return null;
    const nameToFind = playerName.toLowerCase();
    for (const p of mc.world.getAllPlayers()) {
        if (p.nameTag.toLowerCase() === nameToFind) {
            return p;
        }
    }
    return null;
}

// Helper function to parse dimension string
function parseDimension(dimStr, playerUtils) {
    if (!dimStr || typeof dimStr !== 'string') return null;
    switch (dimStr.toLowerCase()) {
        case "overworld": return mc.world.overworld;
        case "nether": return mc.world.nether;
        case "end": return mc.world.theEnd;
        default:
            return null;
    }
}

// Helper function to handle gamemode changes
async function setPlayerGameMode(adminPlayer, targetPlayerName, gameMode, gameModeName, config, playerUtils, addLogFunc) {
    let targetPlayer = adminPlayer;
    if (targetPlayerName) {
        targetPlayer = findPlayer(targetPlayerName, playerUtils);
        if (!targetPlayer) {
            adminPlayer.sendMessage(`§cPlayer "${targetPlayerName}" not found.`);
            return;
        }
    }
    try {
        if (typeof targetPlayer.getGameMode === 'function' && targetPlayer.getGameMode() === gameMode) {
             adminPlayer.sendMessage(`§7${targetPlayer.nameTag} is already in ${gameModeName} mode.`);
             return;
        }
        await targetPlayer.setGameMode(gameMode);
        const messageToAdmin = `§aSet ${gameModeName} mode for ${targetPlayer.nameTag}.`;
        adminPlayer.sendMessage(messageToAdmin);
        if (adminPlayer.id !== targetPlayer.id) {
            targetPlayer.sendMessage(`§7Your game mode has been changed to ${gameModeName} by ${adminPlayer.nameTag}.`);
        }
        addLogFunc({
            timestamp: Date.now(),
            adminName: adminPlayer.nameTag,
            actionType: `gamemode_change_${gameModeName.toLowerCase().replace(/\s+/g, '_')}`,
            targetName: targetPlayer.nameTag,
            details: `Changed to ${gameModeName}`
        });
        playerUtils.debugLog(`Admin ${adminPlayer.nameTag} set ${gameModeName} mode for ${targetPlayer.nameTag}.`, adminPlayer.nameTag);
    } catch (e) {
        adminPlayer.sendMessage(`§cFailed to set ${gameModeName} mode for ${targetPlayer.nameTag}: ${e.message}`);
        playerUtils.debugLog(`Error setting ${gameModeName} for ${targetPlayer.nameTag} by ${adminPlayer.nameTag}: ${e}`, adminPlayer.nameTag);
    }
}

function parseDuration(durationString) {
    if (!durationString) return null;
    durationString = durationString.toLowerCase();
    if (durationString === "perm" || durationString === "permanent") return Infinity;
    const regex = /^(\d+)([smhd])$/;
    const match = durationString.match(regex);
    if (match) {
        const value = parseInt(match[1]);
        const unit = match[2];
        switch (unit) {
            case 's': return value * 1000;
            case 'm': return value * 60 * 1000;
            case 'h': return value * 60 * 60 * 1000;
            case 'd': return value * 24 * 60 * 60 * 1000;
        }
    } else if (/^\d+$/.test(durationString)) {
        const value = parseInt(durationString);
        if (!isNaN(value)) return value * 60 * 1000; // Default to minutes if only number
    }
    return null;
}

// --- User Info Panel (!uinfo) Helper Functions ---

async function showMyStatsUI(player, playerDataManager, config, playerUtils) {
    const pData = playerDataManager.getPlayerData(player.id);
    let statsOutput = `§e--- Your Anti-Cheat Stats ---\n`;
    if (pData && pData.flags) {
        statsOutput += `§fTotal Flags: §c${pData.flags.totalFlags}\n`;
        statsOutput += `§fLast Flag Type: §7${pData.lastFlagType || "None"}\n\n`;
        statsOutput += `§eBreakdown by Type:\n`;
        let specificFlagsFound = false;
        for (const key in pData.flags) {
            if (key !== "totalFlags" && typeof pData.flags[key] === 'object' && pData.flags[key] !== null && pData.flags[key].count > 0) {
                const flagDetail = pData.flags[key];
                const lastTime = flagDetail.lastDetectionTime ? new Date(flagDetail.lastDetectionTime).toLocaleString() : 'N/A';
                statsOutput += `  §f- ${key}: §c${flagDetail.count} §7(Last: ${lastTime})\n`;
                specificFlagsFound = true;
            }
        }
        if (!specificFlagsFound) {
            statsOutput += `  §7No specific flags recorded with counts > 0.\n`;
        }
    } else {
        statsOutput += "§7No flag data found for you or your data is still loading.\n";
    }

    const form = new MessageFormData();
    form.title("My Anti-Cheat Stats");
    form.body(statsOutput);
    form.button1("Close");
    await form.show(player).catch(e => playerUtils.debugLog(`Error showing MyStatsUI for ${player.nameTag}: ${e}`, player.nameTag));
}

async function showServerRulesUI(player, config, playerUtils) {
    let rulesOutput = "§e--- Server Rules ---\n";
    if (config.serverRules && config.serverRules.length > 0) {
        rulesOutput += config.serverRules.join("\n");
    } else {
        rulesOutput += "§7No server rules are currently configured.\n§7Please ask an administrator for details.";
    }

    const form = new MessageFormData();
    form.title("Server Rules");
    form.body(rulesOutput);
    form.button1("Close");
    await form.show(player).catch(e => playerUtils.debugLog(`Error showing ServerRulesUI for ${player.nameTag}: ${e}`, player.nameTag));
}

async function showHelpLinksUI(player, config, playerUtils) {
    let linksOutput = "§e--- Helpful Links ---\n";
    if (config.helpLinks && config.helpLinks.length > 0) {
        config.helpLinks.forEach(link => {
            linksOutput += `§f${link.title}: §9§n${link.url}§r\n`;
        });
    } else {
        linksOutput += "§7No helpful links are currently configured.";
    }

    const form = new MessageFormData();
    form.title("Helpful Links");
    form.body(linksOutput);
    form.button1("Close");
    await form.show(player).catch(e => playerUtils.debugLog(`Error showing HelpLinksUI for ${player.nameTag}: ${e}`, player.nameTag));
}

async function showGeneralTipsUI(player, config, playerUtils) {
    let tipsOutput = "§e--- General Tips & Info ---\n";
    if (config.generalHelpMessages && config.generalHelpMessages.length > 0) {
        tipsOutput += config.generalHelpMessages.join("\n");
    } else {
        tipsOutput += "§7No general tips are currently configured.";
    }

    const form = new MessageFormData();
    form.title("General Tips");
    form.body(tipsOutput);
    form.button1("Close");
    await form.show(player).catch(e => playerUtils.debugLog(`Error showing GeneralTipsUI for ${player.nameTag}: ${e}`, player.nameTag));
}

async function showUserInfoPanel(player, playerDataManager, config, playerUtils) {
    const panel = new ActionFormData();
    panel.title("Your Info & Server Help");
    panel.body(`Welcome, ${player.nameTag}! Select an option below:`);

    panel.button("My Anti-Cheat Stats", "textures/ui/WarningGlyph");
    panel.button("Server Rules", "textures/ui/book_glyph_color");
    panel.button("Helpful Links", "textures/ui/icon_link");
    panel.button("General Tips", "textures/ui/lightbulb_idea_color");

    const response = await panel.show(player).catch(e => {
        playerUtils.debugLog(`Error showing UserInfoPanel for ${player.nameTag}: ${e}`, player.nameTag);
        return { canceled: true, error: true };
    });

    if (response.canceled) {
        playerUtils.debugLog(`User ${player.nameTag} cancelled UserInfoPanel. Reason: ${response.cancelationReason}`, player.nameTag);
        return;
    }

    switch (response.selection) {
        case 0:
            await showMyStatsUI(player, playerDataManager, config, playerUtils);
            break;
        case 1:
            await showServerRulesUI(player, config, playerUtils);
            break;
        case 2:
            await showHelpLinksUI(player, config, playerUtils);
            break;
        case 3:
            await showGeneralTipsUI(player, config, playerUtils);
            break;
        default:
            playerUtils.debugLog(`Unexpected selection in UserInfoPanel for ${player.nameTag}: ${response.selection}`, player.nameTag);
    }
}
// --- END User Info Panel (!uinfo) Helper Functions ---

// --- Report Viewing UI Helper --- ADDED
async function showReportDetailsUI(player, report, playerUtils, config) { // config might be needed for prefix or other settings in future
    const detailForm = new MessageFormData();
    detailForm.title(`Report ID: ${report.id.substring(0, 8)}`); // Shorten ID for title
    let body = `§eTimestamp:§r ${new Date(report.timestamp).toLocaleString()}\n`;
    body += `§eReporter:§r ${report.reporterName} (ID: ${report.reporterId})\n`;
    body += `§eReported:§r ${report.reportedName} (ID: ${report.reportedId})\n`;
    body += `§eReason:§r\n${report.reason}`;
    detailForm.body(body);
    detailForm.button1("Close");
    // Consider adding delete functionality via a different command or a more complex form flow.
    // detailForm.button2("Delete this report");

    await detailForm.show(player).catch(e => playerUtils.debugLog(`Error showing report detail form for ${player.nameTag}: ${e}`, player.nameTag));
}

export async function handleChatCommand(eventData, playerDataManager, uiManager, config, playerUtils) {
    const player = eventData.sender;
    const message = eventData.message;
    const args = message.substring(config.prefix.length).trim().split(/\s+/);
    let command = args.shift()?.toLowerCase();

    const senderPDataForLog = playerDataManager.getPlayerData(player.id);
    playerUtils.debugLog(`Player ${player.nameTag} issued command: ${command || ''} with args: ${args.join(', ')}`, senderPDataForLog?.isWatched ? player.nameTag : null);

    if (command && config.commandAliases && config.commandAliases[command]) {
        const resolvedCommand = config.commandAliases[command];
        playerUtils.debugLog(`Command alias '${command}' resolved to '${resolvedCommand}'.`, player.nameTag);
        command = resolvedCommand;
    }

    const userPermissionLevel = getPlayerPermissionLevel(player);

    if (command === "help") {
        eventData.cancel = true;
        if (args[0]) {
            const specificCommandName = args[0].toLowerCase();
            let foundCmdDef = null;
            for (const cmdDef of allCommands) {
                if (cmdDef.name === specificCommandName) {
                    foundCmdDef = cmdDef;
                    break;
                }
                if (config.commandAliases) {
                    const aliasTarget = config.commandAliases[specificCommandName];
                    if (aliasTarget === cmdDef.name) {
                        foundCmdDef = cmdDef;
                        break;
                    }
                }
            }
            if (foundCmdDef) {
                if (userPermissionLevel <= foundCmdDef.permissionLevel) {
                    const syntaxArgs = foundCmdDef.syntax.substring(foundCmdDef.syntax.indexOf(' ') + 1);
                    player.sendMessage(
                        `§a--- Help for: ${config.prefix}${foundCmdDef.name} ---\n` +
                        `§eSyntax: ${config.prefix}${foundCmdDef.name} ${syntaxArgs}\n` +
                        `§7Description: ${foundCmdDef.description}\n` +
                        `§bPermission Level Required: ${Object.keys(permissionLevels).find(key => permissionLevels[key] === foundCmdDef.permissionLevel) || "Unknown"} (Value: ${foundCmdDef.permissionLevel})`
                    );
                } else {
                    player.sendMessage(`§cCommand '${specificCommandName}' not found or you do not have permission to view its help. Try ${config.prefix}help for a list of your commands.`);
                }
            } else {
                player.sendMessage(`§cCommand '${specificCommandName}' not found. Try ${config.prefix}help for a list of available commands.`);
            }
        } else {
            let helpOutput = ["§aAvailable commands (for your permission level):"];
            allCommands.forEach(cmdDef => {
                if (userPermissionLevel <= cmdDef.permissionLevel) {
                    const syntaxArgs = cmdDef.syntax.substring(cmdDef.syntax.indexOf(' ') + 1);
                    helpOutput.push(`§e${config.prefix}${cmdDef.name} ${syntaxArgs}§7 - ${cmdDef.description}`);
                }
            });
            player.sendMessage(helpOutput.join('\n'));
        }
        return;
    } else if (command === "myflags") {
        eventData.cancel = true;
        const pDataSelf = playerDataManager.getPlayerData(player.id);
        if (pDataSelf && pDataSelf.flags) {
            player.sendMessage(`Your current flags: Total=${pDataSelf.flags.totalFlags}. Last type: ${pDataSelf.lastFlagType || "None"}`);
            for (const key in pDataSelf.flags) {
                if (key !== "totalFlags" && typeof pDataSelf.flags[key] === 'object' && pDataSelf.flags[key] !== null) {
                    player.sendMessage(` - ${key}: ${pDataSelf.flags[key].count} (Last: ${pDataSelf.flags[key].lastDetectionTime ? new Date(pDataSelf.flags[key].lastDetectionTime).toLocaleTimeString() : 'N/A'})`);
                }
            }
        } else {
            player.sendMessage("No flag data found for you.");
        }
        return;
    }

    const cmdDef = allCommands.find(c => c.name === command);
    if (cmdDef) {
        if (userPermissionLevel > cmdDef.permissionLevel) {
            playerUtils.warnPlayer(player, "You do not have permission to use this command.");
            eventData.cancel = true;
            return;
        }
    } else if (command) {
        player.sendMessage(`§cUnknown command: ${config.prefix}${command}§r. Type ${config.prefix}help.`);
        eventData.cancel = true;
        return;
    } else {
        player.sendMessage(`§cPlease enter a command after the prefix. Type ${config.prefix}help.`);
        eventData.cancel = true;
        return;
    }

    eventData.cancel = true;

    switch (command) {
        case "version":
             player.sendMessage(`§aAntiCheats Addon version: ${config.acVersion}`);
             break;
        // ... other admin commands
        case "kick":
            if (args.length < 1) {
                player.sendMessage(`§cUsage: ${config.prefix}kick <playername> [reason]`); return;
            }
            const targetPlayerNameKick = args[0];
            const reasonKick = args.slice(1).join(" ") || "Kicked by an administrator.";
            let foundPlayerKick = findPlayer(targetPlayerNameKick, playerUtils);
            if (foundPlayerKick) {
                if (foundPlayerKick.id === player.id) { player.sendMessage("§cYou cannot kick yourself."); return; }
                try {
                    foundPlayerKick.kick(reasonKick);
                    player.sendMessage(`§aPlayer ${foundPlayerKick.nameTag} has been kicked. Reason: ${reasonKick}`);
                    playerUtils.notifyAdmins(`Player ${foundPlayerKick.nameTag} was kicked by ${player.nameTag}. Reason: ${reasonKick}`, player, null);
                    addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'kick', targetName: foundPlayerKick.nameTag, reason: reasonKick });
                } catch (e) { player.sendMessage(`§cError kicking player ${targetPlayerNameKick}: ${e}`); playerUtils.debugLog(`Error kicking player ${targetPlayerNameKick}: ${e}`); }
            } else { player.sendMessage(`§cPlayer ${targetPlayerNameKick} not found.`); }
            break;
        // ... other admin commands like mute, ban, freeze, etc.
        case "uinfo":
            addLog({ timestamp: Date.now(), playerName: player.nameTag, actionType: 'command_uinfo', details: 'Player used !uinfo command' });
            showUserInfoPanel(player, playerDataManager, config, playerUtils);
            break;
        case "report":
            if (args.length < 2) {
                player.sendMessage(`§cUsage: ${config.prefix}report <playername> <reason...>`);
                return;
            }
            const targetPlayerNameReport = args[0];
            const reasonReport = args.slice(1).join(" ");
            const reportedPlayerTarget = findPlayer(targetPlayerNameReport, playerUtils);

            if (!reportedPlayerTarget) {
                player.sendMessage(`§cPlayer "${targetPlayerNameReport}" not found.`);
                return;
            }

            if (reportedPlayerTarget.id === player.id) {
                player.sendMessage("§cYou cannot report yourself.");
                return;
            }

            const newReportObject = reportManager.addReport(player, reportedPlayerTarget, reasonReport);

            if (newReportObject) {
                player.sendMessage(`§aReport against ${reportedPlayerTarget.nameTag} for "${reasonReport}" submitted with ID ${newReportObject.id}. Thank you.`);
                playerUtils.notifyAdmins(`§eNew report by ${player.nameTag} against ${reportedPlayerTarget.nameTag} (ID: ${newReportObject.id}). Reason: ${reasonReport}§r`, player, null);

                addLog({
                    timestamp: Date.now(),
                    playerName: player.nameTag,
                    actionType: 'command_report',
                    targetName: reportedPlayerTarget.nameTag,
                    details: `Reported for: ${reasonReport}. Report ID: ${newReportObject.id}`
                });
            } else {
                player.sendMessage("§cThere was an error submitting your report. Please try again later.");
            }
            break;
        case "viewreports": // ADDED
            const subCmdView = args[0] ? args[0].toLowerCase() : null;
            const paramView = args.length > 1 ? args.slice(1).join(" ") : null;

            if (subCmdView === "clearall") {
                const confirmClearAllForm = new ModalFormData();
                confirmClearAllForm.title("§cConfirm Clear All Reports");
                confirmClearAllForm.body("Are you sure you want to delete ALL reports? This action cannot be undone.");
                confirmClearAllForm.toggle("Yes, delete all reports", false);

                confirmClearAllForm.show(player).then(response => {
                    if (response.canceled) {
                        player.sendMessage("§7Report clearing cancelled.");
                        return;
                    }
                    if (response.formValues[0]) {
                        reportManager.clearAllReports();
                        player.sendMessage("§aAll player reports have been cleared.");
                        addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'command_viewreports_clearall', details: 'All reports cleared' });
                        playerUtils.notifyAdmins(`§6${player.nameTag} cleared all player reports.`, player, null); // Added null for pData arg
                    } else {
                        player.sendMessage("§7Report clearing cancelled as confirmation was not given.");
                    }
                }).catch(e => playerUtils.debugLog(`Error showing clearall confirmation form for ${player.nameTag}: ${e}`, player.nameTag));

            } else if (subCmdView === "clear" && paramView) {
                const reportIdToClear = paramView;
                const cleared = reportManager.clearReportById(reportIdToClear);
                if (cleared) {
                    player.sendMessage(`§aReport with ID "${reportIdToClear}" has been cleared.`);
                    addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'command_viewreports_clearid', targetName: reportIdToClear, details: `Cleared report ID ${reportIdToClear}` });
                    playerUtils.notifyAdmins(`§6${player.nameTag} cleared report ID ${reportIdToClear}.`, player, null); // Added null for pData arg
                } else {
                    player.sendMessage(`§cReport with ID "${reportIdToClear}" not found or could not be cleared.`);
                }

            } else {
                let reportsToShow = reportManager.getReports().sort((a, b) => b.timestamp - a.timestamp);
                let uiTitle = "Player Reports";

                if (subCmdView && subCmdView !== "clear") {
                    const filterName = subCmdView; // Keep case for includes if names are case-sensitive in some contexts
                    reportsToShow = reportsToShow.filter(r =>
                        r.reportedName.toLowerCase().includes(filterName.toLowerCase()) ||
                        r.reporterName.toLowerCase().includes(filterName.toLowerCase())
                    );
                    uiTitle = `Reports involving "${filterName}"`;
                    if (reportsToShow.length === 0) {
                         player.sendMessage(`§7No reports found involving "${filterName}". Showing all reports instead.`);
                         reportsToShow = reportManager.getReports().sort((a, b) => b.timestamp - a.timestamp);
                         uiTitle = "Player Reports (filter yielded no results)";
                    }
                }

                if (reportsToShow.length === 0) {
                    player.sendMessage("§7No reports found.");
                    return;
                }

                const listReportsForm = new ActionFormData();
                listReportsForm.title(`${uiTitle} (${reportsToShow.length})`);
                listReportsForm.body("Select a report to view details. Max 50 shown.");

                const displayLimit = 50;
                const reportsForUI = reportsToShow.slice(0, displayLimit);

                for (const report of reportsForUI) {
                    listReportsForm.button(`ID: ${report.id.substring(0,5)}... - ${report.reportedName}\n§7By: ${report.reporterName} @ ${new Date(report.timestamp).toLocaleDateString()}`);
                }

                listReportsForm.show(player).then(response => {
                    if (response.canceled) return;
                    const selectedReport = reportsForUI[response.selection];
                    if (selectedReport) {
                        showReportDetailsUI(player, selectedReport, playerUtils, config);
                    }
                }).catch(e => playerUtils.debugLog(`Error showing report list form for ${player.nameTag}: ${e}`, player.nameTag));

                addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'command_viewreports_list', details: `Viewed reports. Filter: ${subCmdView || 'None'}. Count: ${reportsToShow.length}` });
            }
            break;
        // ... other cases like version, watch, inspect, etc.
        default:
            player.sendMessage(`§cUnexpected error processing command: ${config.prefix}${command}§r. Type ${config.prefix}help.`);
    }
}
