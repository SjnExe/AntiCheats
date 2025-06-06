import * as mc from '@minecraft/server';
import { permissionLevels } from './rankManager.js';
import { getPlayerPermissionLevel } from '../utils/playerUtils.js';
import { addMute, removeMute, isMuted } from '../core/playerDataManager.js'; // Assuming these are still relevant and correctly pathed
import { addLog } from './logManager.js';
import { ActionFormData, MessageFormData, ModalFormData } from '@minecraft/server-ui'; // MODIFIED: Added ActionFormData
import { ItemComponentTypes } from '@minecraft/server';

// Parameter 'config' will provide PREFIX, acVersion, commandAliases, serverRules, generalHelpMessages, helpLinks
// Parameter 'playerUtils' will provide warnPlayer, notifyAdmins, debugLog
// Parameter 'playerDataManager' will provide getPlayerData, prepareAndSavePlayerData, etc.
// Parameter 'uiManager' will provide showAdminMainMenu (though not used in !uinfo directly)

const allCommands = [
    { name: "help", syntax: "!help", description: "Shows available commands.", permissionLevel: permissionLevels.NORMAL },
    { name: "myflags", syntax: "!myflags", description: "Shows your own current flag status.", permissionLevel: permissionLevels.NORMAL },
    { name: "version", syntax: "!version", description: "Displays addon version.", permissionLevel: permissionLevels.ADMIN },
    { name: "watch", syntax: "!watch <player>", description: "Toggles debug watch for a player.", permissionLevel: permissionLevels.ADMIN },
    { name: "inspect", syntax: "!inspect <player>", description: "Shows player's AC data.", permissionLevel: permissionLevels.ADMIN },
    { name: "warnings", syntax: "!warnings <player>", description: "Shows a detailed list of warnings/flags for a player.", permissionLevel: permissionLevels.ADMIN },
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
    { name: "copyinv", syntax: "!copyinv <playername>", description: "Copies another player's inventory to your own (overwrites your current inventory).", permissionLevel: permissionLevels.ADMIN },
    { // ADDED for !uinfo
        name: "uinfo",
        syntax: "!uinfo",
        description: "Shows your anti-cheat stats, server rules, and help links in a UI.",
        permissionLevel: permissionLevels.NORMAL
    }
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

// --- User Info Panel (!uinfo) Helper Functions --- ADDED SECTION ---

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
        // Cases for admin commands like version, watch, inspect, etc.
        case "version":
             player.sendMessage(`§aAntiCheats Addon version: ${config.acVersion}`);
             break;
        case "watch":
            // ... existing watch logic
            break;
        case "inspect":
            // ... existing inspect logic
            break;
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
        case "mute":
            if (args.length < 1) { player.sendMessage(`§cUsage: ${config.prefix}mute <playername> [duration] [reason]`); return; }
            const targetPlayerNameMute = args[0];
            const durationStringMute = args[1] || "1h";
            const reasonMute = args.slice(2).join(" ") || "Muted by an administrator.";
            let foundPlayerMute = findPlayer(targetPlayerNameMute, playerUtils);
            if (!foundPlayerMute) { player.sendMessage(`§cPlayer ${targetPlayerNameMute} not found.`); return; }
            if (foundPlayerMute.id === player.id) { player.sendMessage("§cYou cannot mute yourself."); return; }
            const durationMsMute = parseDuration(durationStringMute);
            if (durationMsMute === null || (durationMsMute <= 0 && durationMsMute !== Infinity)) { player.sendMessage("§cInvalid duration format. Use formats like 5m, 2h, 1d, or perm. Default is 1h if unspecified."); return; }
            try {
                const muteAdded = playerDataManager.addMute(foundPlayerMute, durationMsMute, reasonMute);
                if (muteAdded) {
                    const durationText = durationMsMute === Infinity ? "permanently (this session)" : `for ${durationStringMute}`;
                    try { foundPlayerMute.onScreenDisplay.setActionBar(`§cYou have been muted ${durationText}. Reason: ${reasonMute}`); } catch (e) { playerUtils.debugLog(`Failed to set action bar for muted player ${foundPlayerMute.nameTag}: ${e}`, player.nameTag); }
                    player.sendMessage(`§aPlayer ${foundPlayerMute.nameTag} has been muted ${durationText}. Reason: ${reasonMute}`);
                    playerUtils.notifyAdmins(`Player ${foundPlayerMute.nameTag} was muted ${durationText} by ${player.nameTag}. Reason: ${reasonMute}`, player, null);
                    addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'mute', targetName: foundPlayerMute.nameTag, duration: durationStringMute, reason: reasonMute });
                } else { player.sendMessage(`§cFailed to apply mute for ${foundPlayerMute.nameTag}. Check logs.`); }
            } catch (e) { player.sendMessage(`§cAn unexpected error occurred while trying to mute ${foundPlayerMute.nameTag}: ${e}`); playerUtils.debugLog(`Unexpected error during mute command for ${foundPlayerMute.nameTag} by ${player.nameTag}: ${e}`, player.nameTag); }
            break;
        case "unmute":
            if (args.length < 1) { player.sendMessage(`§cUsage: ${config.prefix}unmute <playername>`); return; }
            const targetPlayerNameUnmute = args[0];
            let foundPlayerUnmute = findPlayer(targetPlayerNameUnmute, playerUtils);
            if (!foundPlayerUnmute) { player.sendMessage(`§cPlayer ${targetPlayerNameUnmute} not found.`); return; }
            try {
                if (!playerDataManager.isMuted(foundPlayerUnmute)) { player.sendMessage(`§7Player ${foundPlayerUnmute.nameTag} is not currently muted.`); return; }
                const unmuted = playerDataManager.removeMute(foundPlayerUnmute);
                if (unmuted) {
                    try { foundPlayerUnmute.onScreenDisplay.setActionBar("§aYou have been unmuted."); } catch (e) { playerUtils.debugLog(`Failed to set action bar for unmuted player ${foundPlayerUnmute.nameTag}: ${e}`, player.nameTag); }
                    player.sendMessage(`§aPlayer ${foundPlayerUnmute.nameTag} has been unmuted.`);
                    playerUtils.notifyAdmins(`Player ${foundPlayerUnmute.nameTag} was unmuted by ${player.nameTag}.`, player, null);
                    addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'unmute', targetName: foundPlayerUnmute.nameTag });
                } else { player.sendMessage(`§cFailed to unmute player ${foundPlayerUnmute.nameTag}. They might not have been muted or an error occurred.`); }
            } catch (e) { player.sendMessage(`§cAn unexpected error occurred while trying to unmute ${foundPlayerUnmute.nameTag}: ${e}`); playerUtils.debugLog(`Unexpected error during unmute command for ${foundPlayerUnmute.nameTag} by ${player.nameTag}: ${e}`, player.nameTag); }
            break;
        case "ban":
            if (args.length < 1) { player.sendMessage(`§cUsage: ${config.prefix}ban <playername> [duration] [reason]`); return; }
            const targetPlayerNameBan = args[0];
            const durationStringBan = args[1] || "perm";
            const reasonBan = args.slice(2).join(" ") || "Banned by an administrator.";
            let foundPlayerBan = findPlayer(targetPlayerNameBan, playerUtils);
            if (!foundPlayerBan) { player.sendMessage(`§cPlayer ${targetPlayerNameBan} not found.`); return; }
            if (foundPlayerBan.id === player.id) { player.sendMessage("§cYou cannot ban yourself."); return; }
            const durationMsBan = parseDuration(durationStringBan);
            if (durationMsBan === null || (durationMsBan <= 0 && durationMsBan !== Infinity)) { player.sendMessage("§cInvalid duration format. Use formats like 7d, 2h30m, 5s, or perm. Default is perm if unspecified."); return; }
            const successBan = playerDataManager.addBan(foundPlayerBan, durationMsBan, reasonBan);
            if (successBan) {
                let kickMessage = `You are banned from this server.\nReason: ${reasonBan}\n`;
                if (durationMsBan === Infinity) { kickMessage += "This ban is permanent."; } else { const unbanTime = Date.now() + durationMsBan; kickMessage += `Expires: ${new Date(unbanTime).toLocaleString()}`; }
                try { foundPlayerBan.kick(kickMessage); } catch (e) { playerUtils.debugLog(`Attempted to kick banned player ${foundPlayerBan.nameTag} but they might have already disconnected: ${e}`, player.nameTag); }
                playerUtils.notifyAdmins(`Player ${foundPlayerBan.nameTag} was banned by ${player.nameTag}. Duration: ${durationStringBan}. Reason: ${reasonBan}`, player, null);
                addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'ban', targetName: foundPlayerBan.nameTag, duration: durationStringBan, reason: reasonBan });
                player.sendMessage(`§aSuccessfully banned ${foundPlayerBan.nameTag}. Duration: ${durationStringBan}. Reason: ${reasonBan}`);
            } else { player.sendMessage(`§cFailed to ban ${foundPlayerBan.nameTag}. Check server logs.`); }
            break;
        case "unban":
            if (args.length < 1) { player.sendMessage(`§cUsage: ${config.prefix}unban <playername>`); return; }
            const targetPlayerNameUnban = args[0];
            let foundPlayerUnban = findPlayer(targetPlayerNameUnban, playerUtils);
            if (foundPlayerUnban) {
                const successUnbanOnline = playerDataManager.removeBan(foundPlayerUnban);
                if (successUnbanOnline) {
                    playerUtils.notifyAdmins(`Player ${foundPlayerUnban.nameTag} was unbanned by ${player.nameTag}.`, player, null);
                    addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'unban', targetName: foundPlayerUnban.nameTag });
                    player.sendMessage(`§aPlayer ${foundPlayerUnban.nameTag} has been unbanned. They can rejoin if they were kicked.`);
                } else { player.sendMessage(`§cPlayer ${foundPlayerUnban.nameTag} is not currently banned or could not be unbanned.`); }
            } else { player.sendMessage(`§cPlayer ${targetPlayerNameUnban} not found online. Offline unbanning is not yet fully supported by this command directly.`); }
            break;
        case "freeze":
            const frozenTag = "frozen"; const effectDuration = 2000000;
            if (args.length < 1) { player.sendMessage(`§cUsage: ${config.prefix}freeze <playername> [on|off]`); return; }
            const targetPlayerNameFreeze = args[0]; const subCommandFreeze = args[1] ? args[1].toLowerCase() : null;
            let foundPlayerFreeze = findPlayer(targetPlayerNameFreeze, playerUtils);
            if (!foundPlayerFreeze) { player.sendMessage(`§cPlayer ${targetPlayerNameFreeze} not found.`); return; }
            if (foundPlayerFreeze.id === player.id) { player.sendMessage("§cYou cannot freeze yourself."); return; }
            let currentFreezeState = foundPlayerFreeze.hasTag(frozenTag); let targetFreezeState;
            if (subCommandFreeze === "on") targetFreezeState = true; else if (subCommandFreeze === "off") targetFreezeState = false; else targetFreezeState = !currentFreezeState;
            if (targetFreezeState === true && !currentFreezeState) {
                try {
                    foundPlayerFreeze.addTag(frozenTag);
                    foundPlayerFreeze.addEffect("slowness", effectDuration, { amplifier: 255, showParticles: false });
                    foundPlayerFreeze.sendMessage("§cYou have been frozen by an administrator!");
                    player.sendMessage(`§aPlayer ${foundPlayerFreeze.nameTag} is now frozen.`);
                    playerUtils.notifyAdmins(`Player ${foundPlayerFreeze.nameTag} was frozen by ${player.nameTag}.`, player, null);
                    addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'freeze', targetName: foundPlayerFreeze.nameTag, details: 'Player frozen' });
                } catch (e) { player.sendMessage(`§cError freezing ${foundPlayerFreeze.nameTag}: ${e}`);}
            } else if (targetFreezeState === false && currentFreezeState) {
                try {
                    foundPlayerFreeze.removeTag(frozenTag);
                    foundPlayerFreeze.removeEffect("slowness");
                    foundPlayerFreeze.sendMessage("§aYou have been unfrozen.");
                    player.sendMessage(`§aPlayer ${foundPlayerFreeze.nameTag} is no longer frozen.`);
                    playerUtils.notifyAdmins(`Player ${foundPlayerFreeze.nameTag} was unfrozen by ${player.nameTag}.`, player, null);
                    addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'unfreeze', targetName: foundPlayerFreeze.nameTag, details: 'Player unfrozen' });
                } catch (e) { player.sendMessage(`§cError unfreezing ${foundPlayerFreeze.nameTag}: ${e}`);}
            } else { player.sendMessage(targetFreezeState ? `§7Player ${foundPlayerFreeze.nameTag} is already frozen.` : `§7Player ${foundPlayerFreeze.nameTag} is already unfrozen.`);}
            break;
        case "clearchat":
            const linesToClear = 150;
            for (let i = 0; i < linesToClear; i++) { mc.world.sendMessage(""); }
            player.sendMessage("§aChat has been cleared.");
            playerUtils.notifyAdmins(`Chat was cleared by ${player.nameTag}.`, player, null);
            addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'clear_chat', targetName: 'N/A', details: `Chat cleared by ${player.nameTag}` });
            break;
        case "vanish":
            // ... existing vanish logic
            break;
        case "panel":
            uiManager.showAdminPanelMain(player, playerDataManager, config);
            break;
        case "notify":
            // ... existing notify logic
            break;
        case "xraynotify":
            // ... existing xraynotify logic
            break;
        case "testnotify":
            // ... existing testnotify logic
            break;
        case "tp":
            // ... existing tp logic
            break;
        case "gmc":
            await setPlayerGameMode(player, args[0], mc.GameMode.creative, "Creative", config, playerUtils, addLog);
            break;
        case "gms":
            await setPlayerGameMode(player, args[0], mc.GameMode.survival, "Survival", config, playerUtils, addLog);
            break;
        case "gma":
            await setPlayerGameMode(player, args[0], mc.GameMode.adventure, "Adventure", config, playerUtils, addLog);
            break;
        case "gmsp":
            await setPlayerGameMode(player, args[0], mc.GameMode.spectator, "Spectator", config, playerUtils, addLog);
            break;
        case "copyinv":
            // ... existing copyinv logic
            break;
        case "invsee":
            // ... existing invsee logic
            break;
        case "warnings":
            // ... existing warnings logic
            break;
        case "resetflags":
            // ... existing resetflags logic
            break;
        case "clearwarnings":
            // ... existing clearwarnings logic
            break;
        case "uinfo": // ADDED
            addLog({ timestamp: Date.now(), playerName: player.nameTag, actionType: 'command_uinfo', details: 'Player used !uinfo command' });
            showUserInfoPanel(player, playerDataManager, config, playerUtils);
            break;
        default:
            player.sendMessage(`§cUnexpected error processing command: ${config.prefix}${command}§r. Type ${config.prefix}help.`);
    }
}
