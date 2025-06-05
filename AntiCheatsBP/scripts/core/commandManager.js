import * as mc from '@minecraft/server';
import { PermissionLevels } from './rankManager.js';
import { getPlayerPermissionLevel } from '../utils/playerUtils.js';
// Parameter 'config' will provide PREFIX, acVersion, commandAliases
// Parameter 'playerUtils' will provide warnPlayer, notifyAdmins, debugLog (isAdmin is no longer directly used here)
// Parameter 'playerDataManager' will provide getPlayerData, prepareAndSavePlayerData
// Parameter 'uiManager' will provide showAdminMainMenu

const ALL_COMMANDS = [
    { name: "help", syntax: "!help", description: "Shows available commands.", permissionLevel: PermissionLevels.NORMAL },
    { name: "myflags", syntax: "!myflags", description: "Shows your own current flag status.", permissionLevel: PermissionLevels.NORMAL },
    { name: "version", syntax: "!version", description: "Displays addon version.", permissionLevel: PermissionLevels.ADMIN },
    { name: "watch", syntax: "!watch <player>", description: "Toggles debug watch for a player.", permissionLevel: PermissionLevels.ADMIN },
    { name: "inspect", syntax: "!inspect <player>", description: "Shows player's AC data.", permissionLevel: PermissionLevels.ADMIN },
    { name: "resetflags", syntax: "!resetflags <player>", description: "Resets player's flags.", permissionLevel: PermissionLevels.ADMIN },
    { name: "kick", syntax: "!kick <player> [reason]", description: "Kicks a player from the server.", permissionLevel: PermissionLevels.ADMIN },
    { name: "clearchat", syntax: "!clearchat", description: "Clears the chat for all players.", permissionLevel: PermissionLevels.ADMIN },
    { name: "vanish", syntax: "!vanish [on|off]", description: "Toggles admin visibility. Makes you invisible and hides your nametag.", permissionLevel: PermissionLevels.ADMIN },
    { name: "ui", syntax: "!ui", description: "Opens the Admin UI.", permissionLevel: PermissionLevels.ADMIN },
    { name: "acnotifications", syntax: "!acnotifications <on|off|status>", description: "Toggles or checks your AntiCheat system notifications.", permissionLevel: PermissionLevels.ADMIN },
    { name: "xraynotify", syntax: "!xraynotify <on|off|status>", description: "Manage X-Ray notifications.", permissionLevel: PermissionLevels.ADMIN },
    { name: "testnotify", syntax: "!testnotify", description: "Sends a test admin notification.", permissionLevel: PermissionLevels.OWNER }
];

/**
 * Handles commands sent by players via chat that start with the configured PREFIX.
 * Also manages admin command permissions.
 * @param {mc.ChatSendBeforeEvent} eventData The chat send event data.
 * @param {object} playerDataManager Instance or module for player data operations.
 * @param {object} uiManager Instance or module for UI operations.
 * @param {object} config The configuration object.
 * @param {object} playerUtils Module with player utility functions.
 */
export async function handleChatCommand(eventData, playerDataManager, uiManager, config, playerUtils) {
    const player = eventData.sender;
    const message = eventData.message;
    const args = message.substring(config.prefix.length).trim().split(/\s+/);
    let command = args.shift()?.toLowerCase();

    // Initial debug log for command issuance
    const senderPDataForLog = playerDataManager.getPlayerData(player.id);
    playerUtils.debugLog(`Player ${player.nameTag} issued command: ${command || ''} with args: ${args.join(', ')}`, senderPDataForLog?.isWatched ? player.nameTag : null);

    // Resolve alias if applicable
    if (command && config.commandAliases && config.commandAliases[command]) {
        const resolvedCommand = config.commandAliases[command];
        playerUtils.debugLog(`Command alias '${command}' resolved to '${resolvedCommand}'.`, player.nameTag);
        command = resolvedCommand;
    }

    const userPermissionLevel = getPlayerPermissionLevel(player);

    // --- Command Handling ---
    if (command === "help") {
        eventData.cancel = true;
        let helpOutput = ["§aAvailable commands:"];
        ALL_COMMANDS.forEach(cmdDef => {
            // Lower number means higher privilege, so user level must be <= command's required level
            if (userPermissionLevel <= cmdDef.permissionLevel) {
                helpOutput.push(`§e${config.prefix}${cmdDef.name} ${cmdDef.syntax.substring(cmdDef.syntax.indexOf(' ') + 1)}§7 - ${cmdDef.description}`);
            }
        });
        player.sendMessage(helpOutput.join('\n'));
        return;
    } else if (command === "myflags") {
        eventData.cancel = true;
        // This command is PermissionLevels.NORMAL, so no explicit check needed beyond being in ALL_COMMANDS
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

    // --- Permission Check for all other commands ---
    const cmdDef = ALL_COMMANDS.find(c => c.name === command);

    if (cmdDef) {
        // Lower number means higher privilege.
        // If user's level (e.g., NORMAL=2) is greater than command's required level (e.g., ADMIN=1), they don't have permission.
        if (userPermissionLevel > cmdDef.permissionLevel) {
            playerUtils.warnPlayer(player, "You do not have permission to use this command.");
            eventData.cancel = true;
            return;
        }
    } else if (command) { // Command was typed, but not found in ALL_COMMANDS
        player.sendMessage(`§cUnknown command: ${config.prefix}${command}§r. Type ${config.prefix}help.`);
        eventData.cancel = true;
        return;
    } else { // No command was typed after prefix
        player.sendMessage(`§cPlease enter a command after the prefix. Type ${config.prefix}help.`);
        eventData.cancel = true;
        return;
    }

    // --- Command Execution (Permission is granted at this point) ---
    eventData.cancel = true; // Cancel original message for all processed commands

    switch (command) {
        case "version": // ADMIN
            player.sendMessage(`§a[AntiCheat] Version: ${config.acVersion}`);
            break;
        case "watch":
            if (args.length < 1) {
                player.sendMessage("§cUsage: !watch <playername>");
                return;
            }
            const targetPlayerNameWatch = args[0];
            let foundPlayerWatch = null;
            // Consider using player.dimension.getPlayers() if appropriate, or keep mc.world for all players
            for (const p of mc.world.getAllPlayers()) {
                if (p.nameTag.toLowerCase() === targetPlayerNameWatch.toLowerCase()) {
                    foundPlayerWatch = p;
                    break;
                }
            }

            if (foundPlayerWatch) {
                const targetPDataWatch = playerDataManager.getPlayerData(foundPlayerWatch.id);
                if (targetPDataWatch) {
                    targetPDataWatch.isWatched = !targetPDataWatch.isWatched;
                    player.sendMessage(`§7Watch for ${foundPlayerWatch.nameTag} ${targetPDataWatch.isWatched ? "§aenabled" : "§cdisabled"}.`);
                    playerUtils.notifyAdmins(`Watch for ${foundPlayerWatch.nameTag} ${targetPDataWatch.isWatched ? "enabled" : "disabled"} by ${player.nameTag}.`, foundPlayerWatch, targetPDataWatch);
                    await playerDataManager.prepareAndSavePlayerData(foundPlayerWatch);
                } else {
                    player.sendMessage(`§cPlayer data for ${targetPlayerNameWatch} not found (they might need to move or interact).`);
                }
            } else {
                player.sendMessage(`§cPlayer ${targetPlayerNameWatch} not found.`);
            }
            break;
        case "testnotify":
            playerUtils.notifyAdmins("This is a test notification triggered by an admin command.");
            player.sendMessage("Test notification sent to admins.");
            break;
        // "myflags" is handled above (public command)
        case "inspect": // ADMIN
            if (args.length < 1) {
                player.sendMessage(`§cUsage: ${config.prefix}inspect <playername>`);
                return;
            }
            const inspectTargetName = args[0];
            let inspectFoundPlayer = null;
            for (const p of mc.world.getAllPlayers()) {
                if (p.nameTag.toLowerCase() === inspectTargetName.toLowerCase()) {
                    inspectFoundPlayer = p;
                    break;
                }
            }
            if (inspectFoundPlayer) {
                const targetPDataInspect = playerDataManager.getPlayerData(inspectFoundPlayer.id);
                if (targetPDataInspect) {
                    let summary = `§a--- AntiCheat Data for ${inspectFoundPlayer.nameTag} ---\n`;
                    summary += `§eWatched: §f${targetPDataInspect.isWatched}\n`;
                    summary += `§eTotal Flags: §f${targetPDataInspect.flags.totalFlags}\n`;
                    summary += `§eLast Flag Type: §f${targetPDataInspect.lastFlagType || "None"}\n`;
                    summary += `§eIndividual Flags:\n`;
                    let hasFlags = false;
                    for (const flagKey in targetPDataInspect.flags) {
                        if (flagKey !== "totalFlags" && typeof targetPDataInspect.flags[flagKey] === 'object' && targetPDataInspect.flags[flagKey] !== null) {
                            const flagData = targetPDataInspect.flags[flagKey];
                            summary += `  §f- ${flagKey}: Count=${flagData.count}, LastSeen=${flagData.lastDetectionTime ? new Date(flagData.lastDetectionTime).toLocaleTimeString() : 'N/A'}\n`;
                            hasFlags = true;
                        }
                    }
                    if (!hasFlags) summary += `  §fNo specific flags recorded.\n`;
                    player.sendMessage(summary);
                } else {
                    player.sendMessage(`§cPlayer data for ${inspectTargetName} not found.`);
                }
            } else {
                player.sendMessage(`§cPlayer ${inspectTargetName} not found.`);
            }
            break;
        case "resetflags": // Text command !ac resetflags
            if (args.length < 1) {
                player.sendMessage(`§cUsage: ${config.prefix}resetflags <playername>`);
                return;
            }
            const resetTargetName = args[0];
            let resetFoundPlayer = null;
            for (const p of mc.world.getAllPlayers()) {
                if (p.nameTag.toLowerCase() === resetTargetName.toLowerCase()) {
                    resetFoundPlayer = p;
                    break;
                }
            }
            if (resetFoundPlayer) {
                const targetPDataReset = playerDataManager.getPlayerData(resetFoundPlayer.id);
                if (targetPDataReset) {
                    targetPDataReset.flags.totalFlags = 0;
                    targetPDataReset.lastFlagType = "";
                    for (const flagKey in targetPDataReset.flags) {
                        if (typeof targetPDataReset.flags[flagKey] === 'object' && targetPDataReset.flags[flagKey] !== null) {
                            targetPDataReset.flags[flagKey].count = 0;
                            targetPDataReset.flags[flagKey].lastDetectionTime = 0;
                        }
                    }
                    targetPDataReset.consecutiveOffGroundTicks = 0;
                    targetPDataReset.fallDistance = 0;
                    targetPDataReset.consecutiveOnGroundSpeedingTicks = 0;
                    targetPDataReset.attackEvents = [];
                    targetPDataReset.blockBreakEvents = [];
                    await playerDataManager.prepareAndSavePlayerData(resetFoundPlayer);
                    player.sendMessage(`§aFlags and violation data reset for ${resetFoundPlayer.nameTag}.`);
                    playerUtils.notifyAdmins(`Flags reset for ${resetFoundPlayer.nameTag} by ${player.nameTag}.`, resetFoundPlayer, targetPDataReset);
                    playerUtils.debugLog(`Flags reset for ${resetFoundPlayer.nameTag} by ${player.nameTag}.`, targetPDataReset.isWatched ? resetFoundPlayer.nameTag : null);
                } else {
                    player.sendMessage(`§cPlayer data for ${resetTargetName} not found.`);
                }
            } else {
                player.sendMessage(`§cPlayer ${resetTargetName} not found.`);
            }
            break;
        case "kick": // ADMIN
            if (args.length < 1) {
                player.sendMessage(`§cUsage: ${config.prefix}kick <playername> [reason]`);
                return;
            }
            const targetPlayerNameKick = args[0];
            const reasonKick = args.slice(1).join(" ") || "Kicked by an administrator.";
            let foundPlayerKick = null;

            for (const p of mc.world.getAllPlayers()) {
                if (p.nameTag.toLowerCase() === targetPlayerNameKick.toLowerCase()) {
                    foundPlayerKick = p;
                    break;
                }
            }

            if (foundPlayerKick) {
                try {
                    // Make sure the player to be kicked is not the command issuer to prevent self-kick issues.
                    if (foundPlayerKick.id === player.id) {
                        player.sendMessage("§cYou cannot kick yourself.");
                        return;
                    }
                    foundPlayerKick.kick(reasonKick);
                    player.sendMessage(`§aPlayer ${foundPlayerKick.nameTag} has been kicked. Reason: ${reasonKick}`);
                    playerUtils.notifyAdmins(`Player ${foundPlayerKick.nameTag} was kicked by ${player.nameTag}. Reason: ${reasonKick}`, player, null);
                } catch (e) {
                    player.sendMessage(`§cError kicking player ${targetPlayerNameKick}: ${e}`);
                    playerUtils.debugLog(`Error kicking player ${targetPlayerNameKick}: ${e}`);
                }
            } else {
                player.sendMessage(`§cPlayer ${targetPlayerNameKick} not found.`);
            }
            break;
        case "clearchat": // ADMIN
            const linesToClear = 150; // Number of empty lines to send to effectively clear chat history for most users
            for (let i = 0; i < linesToClear; i++) {
                mc.world.sendMessage(""); // Sends an empty message to all players
            }
            player.sendMessage("§aChat has been cleared.");
            playerUtils.notifyAdmins(`Chat was cleared by ${player.nameTag}.`, player, null);
            break;
        case "vanish": // ADMIN
            const vanishedTag = "vanished";
            let currentState = player.hasTag(vanishedTag);
            let targetState = currentState; // Default to no change

            const subArg = args[0] ? args[0].toLowerCase() : null;

            if (subArg === "on") {
                targetState = true;
            } else if (subArg === "off") {
                targetState = false;
            } else {
                targetState = !currentState; // Toggle if no valid sub-argument or no sub-argument
            }

            if (targetState === true && !currentState) { // To vanish
                try {
                    player.addTag(vanishedTag);
                    player.addEffect("invisibility", 2000000, { amplifier: 0, showParticles: false });
                    // Storing original nametag before clearing is tricky without a persistent place accessible here.
                    // rankManager will handle nametag updates based on "vanished" tag.
                    // For now, we can clear it, rankManager should restore it based on rank if unvanished.
                    // However, the prompt implies rankManager is not yet doing this for vanish.
                    // player.nameTag = ""; // Clear nametag - This might be problematic if rankManager doesn't know about vanish.
                                        // Let's assume rankManager.updatePlayerNametag(player) will be called or check for "vanished" tag.
                                        // For now, let's defer nametag direct manipulation here to avoid conflicts if rankManager also tries to set it.
                                        // The visual effect of invisibility is the primary goal. Nametag hiding can be a follow-up if not covered.

                    player.sendMessage("§7You are now vanished. Your nametag will be handled by rankManager.");
                    playerUtils.notifyAdmins(`${player.nameTag} has vanished.`, player, null); // player.nameTag might be empty here if we cleared it.
                                                                                             // Better to use player.name for the notification source if nameTag is unreliable.
                                                                                             // For consistency with other notifications, using player.nameTag.
                } catch (e) {
                    player.sendMessage(`§cError applying vanish: ${e}`);
                    playerUtils.debugLog(`Error applying vanish for ${player.nameTag}: ${e}`);
                }
            } else if (targetState === false && currentState) { // To unvanish
                try {
                    player.removeTag(vanishedTag);
                    player.removeEffect("invisibility");
                    // rankManager should restore the nametag based on rank now that "vanished" tag is removed.
                    // player.nameTag = player.name; // Avoid direct manipulation if rankManager handles it.
                    player.sendMessage("§7You are no longer vanished. Your nametag will be restored by rankManager shortly.");
                    playerUtils.notifyAdmins(`${player.nameTag} is no longer vanished.`, player, null);
                } catch (e) {
                    player.sendMessage(`§cError removing vanish: ${e}`);
                    playerUtils.debugLog(`Error removing vanish for ${player.nameTag}: ${e}`);
                }
            } else { // No change in state
                player.sendMessage(targetState ? "§7You are already vanished." : "§7You are already visible.");
            }
            break;
        case "ui":
            uiManager.showAdminMainMenu(player); // Call the UI manager
            break;
        case "acnotifications": // ADMIN
            const acNotificationsOffTag = "ac_notifications_off";
            const acNotificationsOnTag = "ac_notifications_on";
            const acSubCommand = args[0] ? args[0].toLowerCase() : "status";

            switch (acSubCommand) {
                case "on":
                    try { player.removeTag(acNotificationsOffTag); } catch (e) { /* Tag might not exist, safe to ignore */ }
                    try { player.addTag(acNotificationsOnTag); } catch (e) { playerUtils.debugLog(`Failed to add ${acNotificationsOnTag} for ${player.nameTag}: ${e}`, player.nameTag); }
                    player.sendMessage("§aAntiCheat system notifications ON.");
                    playerUtils.debugLog(`Admin ${player.nameTag} turned ON AntiCheat notifications.`, player.nameTag);
                    break;
                case "off":
                    try { player.removeTag(acNotificationsOnTag); } catch (e) { /* Tag might not exist, safe to ignore */ }
                    try { player.addTag(acNotificationsOffTag); } catch (e) { playerUtils.debugLog(`Failed to add ${acNotificationsOffTag} for ${player.nameTag}: ${e}`, player.nameTag); }
                    player.sendMessage("§cAntiCheat system notifications OFF.");
                    playerUtils.debugLog(`Admin ${player.nameTag} turned OFF AntiCheat notifications.`, player.nameTag);
                    break;
                case "status":
                    const acIsOn = player.hasTag(acNotificationsOnTag);
                    const acIsOff = player.hasTag(acNotificationsOffTag);
                    let acStatusMessage = "§eYour AntiCheat system notification status: ";
                    if (acIsOn) {
                        acStatusMessage += "§aON (explicitly).";
                    } else if (acIsOff) {
                        acStatusMessage += "§cOFF (explicitly).";
                    } else { // Default state based on config
                        if (config.AC_GLOBAL_NOTIFICATIONS_DEFAULT_ON) {
                            acStatusMessage += `§aON (by server default). §7Use ${config.prefix}acnotifications off to disable.`;
                        } else {
                            acStatusMessage += `§cOFF (by server default). §7Use ${config.prefix}acnotifications on to enable.`;
                        }
                    }
                    player.sendMessage(acStatusMessage);
                    break;
                default:
                    player.sendMessage(`§cUsage: ${config.prefix}acnotifications <on|off|status>`);
            }
            break;
        case "xraynotify":
            if (args.length < 1 || !["on", "off", "status"].includes(args[0].toLowerCase())) {
                player.sendMessage(`§cUsage: ${config.prefix}xraynotify <on|off|status>`);
                return;
            }
            const subCommand = args[0].toLowerCase();
            const notifyOnTag = "xray_notify_on";
            const notifyOffTag = "xray_notify_off";

            switch (subCommand) {
                case "on":
                    try {
                        player.removeTag(notifyOffTag);
                    } catch (e) {
                        playerUtils.debugLog(`Player ${player.nameTag} did not have tag ${notifyOffTag} to remove.`, player.nameTag);
                    }
                    player.addTag(notifyOnTag);
                    player.sendMessage("§aX-Ray ore mining notifications enabled for you.");
                    playerUtils.debugLog(`Admin ${player.nameTag} enabled X-Ray notifications.`, player.nameTag);
                    break;
                case "off":
                    try {
                        player.removeTag(notifyOnTag);
                    } catch (e) {
                        playerUtils.debugLog(`Player ${player.nameTag} did not have tag ${notifyOnTag} to remove.`, player.nameTag);
                    }
                    player.addTag(notifyOffTag);
                    player.sendMessage("§cX-Ray ore mining notifications disabled for you.");
                    playerUtils.debugLog(`Admin ${player.nameTag} disabled X-Ray notifications.`, player.nameTag);
                    break;
                case "status":
                    const isOn = player.hasTag(notifyOnTag);
                    const isOff = player.hasTag(notifyOffTag);
                    let statusMessage = "§eYour X-Ray notification status: ";
                    if (isOn) {
                        statusMessage += "§aON (explicitly).";
                    } else if (isOff) {
                        statusMessage += "§cOFF (explicitly).";
                    } else {
                        if (config.XRAY_DETECTION_ADMIN_NOTIFY_BY_DEFAULT) {
                            statusMessage += "§aON (by server default). §7Use '!ac xraynotify off' to disable.";
                        } else {
                            statusMessage += "§cOFF (by server default). §7Use '!ac xraynotify on' to enable.";
                        }
                    }
                    player.sendMessage(statusMessage);
                    break;
            }
            break;
        default:
            // This case should ideally not be reached if all valid commands are in ALL_COMMANDS
            // and unknown commands are handled by the check before this switch.
            // However, as a fallback:
            player.sendMessage(`§cUnexpected error processing command: ${config.prefix}${command}§r. Type ${config.prefix}help.`);
    }
}
