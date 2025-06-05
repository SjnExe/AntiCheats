import * as mc from '@minecraft/server';
import { permissionLevels } from './rankManager.js';
import { getPlayerPermissionLevel } from '../utils/playerUtils.js';
import { addMute, removeMute, isMuted } from '../core/playerDataManager.js';
import { addLog } from './logManager.js';
// Parameter 'config' will provide PREFIX, acVersion, commandAliases
// Parameter 'playerUtils' will provide warnPlayer, notifyAdmins, debugLog (isAdmin is no longer directly used here)
// Parameter 'playerDataManager' will provide getPlayerData, prepareAndSavePlayerData, addMute, removeMute, isMuted, addBan, removeBan etc.
// Parameter 'uiManager' will provide showAdminMainMenu

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
    { name: "testnotify", syntax: "!testnotify", description: "Sends a test admin notification.", permissionLevel: permissionLevels.OWNER }
];

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
        if (!isNaN(value)) return value * 60 * 1000;
    }
    return null;
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
        // ... (help command logic as before)
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
        // ... (cases for version, watch, testnotify, inspect, warnings, invsee, clearwarnings, resetflags as before)
        case "kick":
            if (args.length < 1) {
                player.sendMessage(`§cUsage: ${config.prefix}kick <playername> [reason]`); return;
            }
            const targetPlayerNameKick = args[0];
            const reasonKick = args.slice(1).join(" ") || "Kicked by an administrator.";
            let foundPlayerKick = null;
            for (const p of mc.world.getAllPlayers()) { if (p.nameTag.toLowerCase() === targetPlayerNameKick.toLowerCase()) { foundPlayerKick = p; break; }}
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
            let foundPlayerMute = null;
            for (const p of mc.world.getAllPlayers()) { if (p.nameTag.toLowerCase() === targetPlayerNameMute.toLowerCase()) { foundPlayerMute = p; break; }}
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
                    playerUtils.debugLog(`Player ${foundPlayerMute.nameTag} muted by ${player.nameTag} ${durationText}. Reason: ${reasonMute}`, player.nameTag);
                } else { player.sendMessage(`§cFailed to apply mute for ${foundPlayerMute.nameTag}. Check logs.`); }
            } catch (e) { player.sendMessage(`§cAn unexpected error occurred while trying to mute ${foundPlayerMute.nameTag}: ${e}`); playerUtils.debugLog(`Unexpected error during mute command for ${foundPlayerMute.nameTag} by ${player.nameTag}: ${e}`, player.nameTag); }
            break;
        case "unmute":
            if (args.length < 1) { player.sendMessage(`§cUsage: ${config.prefix}unmute <playername>`); return; }
            const targetPlayerNameUnmute = args[0];
            let foundPlayerUnmute = null;
            for (const p of mc.world.getAllPlayers()) { if (p.nameTag.toLowerCase() === targetPlayerNameUnmute.toLowerCase()) { foundPlayerUnmute = p; break; }}
            if (!foundPlayerUnmute) { player.sendMessage(`§cPlayer ${targetPlayerNameUnmute} not found.`); return; }
            try {
                if (!playerDataManager.isMuted(foundPlayerUnmute)) { player.sendMessage(`§7Player ${foundPlayerUnmute.nameTag} is not currently muted.`); return; }
                const unmuted = playerDataManager.removeMute(foundPlayerUnmute);
                if (unmuted) {
                    try { foundPlayerUnmute.onScreenDisplay.setActionBar("§aYou have been unmuted."); } catch (e) { playerUtils.debugLog(`Failed to set action bar for unmuted player ${foundPlayerUnmute.nameTag}: ${e}`, player.nameTag); }
                    player.sendMessage(`§aPlayer ${foundPlayerUnmute.nameTag} has been unmuted.`);
                    playerUtils.notifyAdmins(`Player ${foundPlayerUnmute.nameTag} was unmuted by ${player.nameTag}.`, player, null);
                    addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'unmute', targetName: foundPlayerUnmute.nameTag });
                    playerUtils.debugLog(`Player ${foundPlayerUnmute.nameTag} unmuted by ${player.nameTag}.`, player.nameTag);
                } else { player.sendMessage(`§cFailed to unmute player ${foundPlayerUnmute.nameTag}. They might not have been muted or an error occurred.`); }
            } catch (e) { player.sendMessage(`§cAn unexpected error occurred while trying to unmute ${foundPlayerUnmute.nameTag}: ${e}`); playerUtils.debugLog(`Unexpected error during unmute command for ${foundPlayerUnmute.nameTag} by ${player.nameTag}: ${e}`, player.nameTag); }
            break;
        case "ban":
            if (args.length < 1) { player.sendMessage(`§cUsage: ${config.prefix}ban <playername> [duration] [reason]`); return; }
            const targetPlayerNameBan = args[0];
            const durationStringBan = args[1] || "perm";
            const reasonBan = args.slice(2).join(" ") || "Banned by an administrator.";
            let foundPlayerBan = null;
            for (const p of mc.world.getAllPlayers()) { if (p.nameTag.toLowerCase() === targetPlayerNameBan.toLowerCase()) { foundPlayerBan = p; break; }}
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
            let foundPlayerUnban = null;
            for (const p of mc.world.getAllPlayers()) { if (p.nameTag.toLowerCase() === targetPlayerNameUnban.toLowerCase()) { foundPlayerUnban = p; break; }}
            if (foundPlayerUnban) {
                const successUnbanOnline = playerDataManager.removeBan(foundPlayerUnban);
                if (successUnbanOnline) {
                    playerUtils.notifyAdmins(`Player ${foundPlayerUnban.nameTag} was unbanned by ${player.nameTag}.`, player, null);
                    addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'unban', targetName: foundPlayerUnban.nameTag });
                    player.sendMessage(`§aPlayer ${foundPlayerUnban.nameTag} has been unbanned. They can rejoin if they were kicked.`);
                } else { player.sendMessage(`§cPlayer ${foundPlayerUnban.nameTag} is not currently banned or could not be unbanned.`); }
            } else { player.sendMessage(`§cPlayer ${targetPlayerNameUnban} not found online. Offline unbanning is not yet fully supported by this command directly.`); playerUtils.debugLog(`Unban attempt for offline player ${targetPlayerNameUnban} by ${player.nameTag}. Offline modification needed.`, player.nameTag); }
            break;
        // ... (other cases like freeze, clearchat, vanish, panel, notify, xraynotify as before)
        case "freeze":
            const frozenTag = "frozen"; const effectDuration = 2000000;
            if (args.length < 1) { player.sendMessage(`§cUsage: ${config.prefix}freeze <playername> [on|off]`); return; }
            const targetPlayerNameFreeze = args[0]; const subCommandFreeze = args[1] ? args[1].toLowerCase() : null;
            let foundPlayerFreeze = null;
            for (const p of mc.world.getAllPlayers()) { if (p.nameTag.toLowerCase() === targetPlayerNameFreeze.toLowerCase()) { foundPlayerFreeze = p; break; }}
            if (!foundPlayerFreeze) { player.sendMessage(`§cPlayer ${targetPlayerNameFreeze} not found.`); return; }
            if (foundPlayerFreeze.id === player.id) { player.sendMessage("§cYou cannot freeze yourself."); return; }
            let currentFreezeState = foundPlayerFreeze.hasTag(frozenTag); let targetFreezeState;
            if (subCommandFreeze === "on") targetFreezeState = true; else if (subCommandFreeze === "off") targetFreezeState = false; else targetFreezeState = !currentFreezeState;
            if (targetFreezeState === true && !currentFreezeState) {
                try { foundPlayerFreeze.addTag(frozenTag); foundPlayerFreeze.addEffect("slowness", effectDuration, { amplifier: 255, showParticles: false }); foundPlayerFreeze.sendMessage("§cYou have been frozen by an administrator!"); player.sendMessage(`§aPlayer ${foundPlayerFreeze.nameTag} is now frozen.`); playerUtils.notifyAdmins(`Player ${foundPlayerFreeze.nameTag} was frozen by ${player.nameTag}.`, player, null); } catch (e) { player.sendMessage(`§cError freezing ${foundPlayerFreeze.nameTag}: ${e}`); playerUtils.debugLog(`Error freezing ${foundPlayerFreeze.nameTag} by ${player.nameTag}: ${e}`);}
            } else if (targetFreezeState === false && currentFreezeState) {
                try { foundPlayerFreeze.removeTag(frozenTag); foundPlayerFreeze.removeEffect("slowness"); foundPlayerFreeze.sendMessage("§aYou have been unfrozen."); player.sendMessage(`§aPlayer ${foundPlayerFreeze.nameTag} is no longer frozen.`); playerUtils.notifyAdmins(`Player ${foundPlayerFreeze.nameTag} was unfrozen by ${player.nameTag}.`, player, null); } catch (e) { player.sendMessage(`§cError unfreezing ${foundPlayerFreeze.nameTag}: ${e}`); playerUtils.debugLog(`Error unfreezing ${foundPlayerFreeze.nameTag} by ${player.nameTag}: ${e}`);}
            } else { player.sendMessage(targetFreezeState ? `§7Player ${foundPlayerFreeze.nameTag} is already frozen.` : `§7Player ${foundPlayerFreeze.nameTag} is already unfrozen.`);}
            break;
        case "clearchat":
            const linesToClear = 150;
            for (let i = 0; i < linesToClear; i++) { mc.world.sendMessage(""); }
            player.sendMessage("§aChat has been cleared."); playerUtils.notifyAdmins(`Chat was cleared by ${player.nameTag}.`, player, null);
            break;
        case "vanish":
            const vanishedTag = "vanished"; let currentStateVanish = player.hasTag(vanishedTag); let targetStateVanish = currentStateVanish;
            const subArgVanish = args[0] ? args[0].toLowerCase() : null;
            if (subArgVanish === "on") targetStateVanish = true; else if (subArgVanish === "off") targetStateVanish = false; else targetStateVanish = !currentStateVanish;
            if (targetStateVanish === true && !currentStateVanish) {
                try { player.addTag(vanishedTag); player.addEffect("invisibility", 2000000, { amplifier: 0, showParticles: false }); player.sendMessage("§7You are now vanished. Your nametag will be handled by rankManager."); playerUtils.notifyAdmins(`${player.nameTag} has vanished.`, player, null); } catch (e) { player.sendMessage(`§cError applying vanish: ${e}`); playerUtils.debugLog(`Error applying vanish for ${player.nameTag}: ${e}`); }
            } else if (targetStateVanish === false && currentStateVanish) {
                try { player.removeTag(vanishedTag); player.removeEffect("invisibility"); player.sendMessage("§7You are no longer vanished. Your nametag will be restored by rankManager shortly."); playerUtils.notifyAdmins(`${player.nameTag} is no longer vanished.`, player, null); } catch (e) { player.sendMessage(`§cError removing vanish: ${e}`); playerUtils.debugLog(`Error removing vanish for ${player.nameTag}: ${e}`); }
            } else { player.sendMessage(targetStateVanish ? "§7You are already vanished." : "§7You are already visible."); }
            break;
        case "panel":
            uiManager.showAdminPanelMain(player, playerDataManager, config); // Pass config
            break;
        case "notify":
            const acNotificationsOffTag = "ac_notifications_off"; const acNotificationsOnTag = "ac_notifications_on";
            const acSubCommand = args[0] ? args[0].toLowerCase() : "status";
            switch (acSubCommand) {
                case "on": try { player.removeTag(acNotificationsOffTag); } catch (e) {} try { player.addTag(acNotificationsOnTag); } catch (e) { playerUtils.debugLog(`Failed to add ${acNotificationsOnTag} for ${player.nameTag}: ${e}`, player.nameTag); } player.sendMessage("§aAntiCheat system notifications ON."); playerUtils.debugLog(`Admin ${player.nameTag} turned ON AntiCheat notifications.`, player.nameTag); break;
                case "off": try { player.removeTag(acNotificationsOnTag); } catch (e) {} try { player.addTag(acNotificationsOffTag); } catch (e) { playerUtils.debugLog(`Failed to add ${acNotificationsOffTag} for ${player.nameTag}: ${e}`, player.nameTag); } player.sendMessage("§cAntiCheat system notifications OFF."); playerUtils.debugLog(`Admin ${player.nameTag} turned OFF AntiCheat notifications.`, player.nameTag); break;
                case "status": const acIsOn = player.hasTag(acNotificationsOnTag); const acIsOff = player.hasTag(acNotificationsOffTag); let acStatusMessage = "§eYour AntiCheat system notification status: "; if (acIsOn) acStatusMessage += "§aON (explicitly)."; else if (acIsOff) acStatusMessage += "§cOFF (explicitly)."; else { if (config.acGlobalNotificationsDefaultOn) acStatusMessage += `§aON (by server default). §7Use ${config.prefix}notify off to disable.`; else acStatusMessage += `§cOFF (by server default). §7Use ${config.prefix}notify on to enable.`;} player.sendMessage(acStatusMessage); break;
                default: player.sendMessage(`§cUsage: ${config.prefix}notify <on|off|status>`);
            }
            break;
        case "xraynotify":
            if (args.length < 1 || !["on", "off", "status"].includes(args[0].toLowerCase())) { player.sendMessage(`§cUsage: ${config.prefix}xraynotify <on|off|status>`); return; }
            const subCommandXN = args[0].toLowerCase(); const notifyOnTagXN = "xray_notify_on"; const notifyOffTagXN = "xray_notify_off";
            switch (subCommandXN) {
                case "on": try { player.removeTag(notifyOffTagXN); } catch (e) {} player.addTag(notifyOnTagXN); player.sendMessage("§aX-Ray ore mining notifications enabled for you."); playerUtils.debugLog(`Admin ${player.nameTag} enabled X-Ray notifications.`, player.nameTag); break;
                case "off": try { player.removeTag(notifyOnTagXN); } catch (e) {} player.addTag(notifyOffTagXN); player.sendMessage("§cX-Ray ore mining notifications disabled for you."); playerUtils.debugLog(`Admin ${player.nameTag} disabled X-Ray notifications.`, player.nameTag); break;
                case "status": const isOnXN = player.hasTag(notifyOnTagXN); const isOffXN = player.hasTag(notifyOffTagXN); let statusMessageXN = "§eYour X-Ray notification status: "; if (isOnXN) statusMessageXN += "§aON (explicitly)."; else if (isOffXN) statusMessageXN += "§cOFF (explicitly)."; else { if (config.xrayDetectionAdminNotifyByDefault) statusMessageXN += "§aON (by server default). §7Use '!ac xraynotify off' to disable."; else statusMessageXN += "§cOFF (by server default). §7Use '!ac xraynotify on' to enable.";} player.sendMessage(statusMessageXN); break;
            }
            break;
        default:
            player.sendMessage(`§cUnexpected error processing command: ${config.prefix}${command}§r. Type ${config.prefix}help.`);
    }
}
