import * as mc from '@minecraft/server';
// Parameter 'config' will provide PREFIX, AC_VERSION
// Parameter 'playerUtils' will provide isAdmin, warnPlayer, notifyAdmins, debugLog
// Parameter 'playerDataManager' will provide getPlayerData, prepareAndSavePlayerData
// Parameter 'uiManager' will provide showAdminMainMenu

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

    // playerData map is now managed by playerDataManager
    // The debugLog for command issuance might need pDataManager.getPlayerData if it needs isWatched status
    const senderPDataForLog = playerDataManager.getPlayerData(player.id);
    playerUtils.debugLog(`Player ${player.nameTag} issued command: ${message.substring(config.prefix.length).trim().split(/\s+/)[0] || ''} with args: ${message.substring(config.prefix.length).trim().split(/\s+/).slice(1).join(', ')}`, senderPDataForLog?.isWatched ? player.nameTag : null);

    if (!playerUtils.isAdmin(player)) {
        playerUtils.warnPlayer(player, "You do not have permission to use Anti-Cheat commands.");
        return;
    }

    eventData.cancel = true; // Command processed, cancel original message
    const args = message.substring(config.prefix.length).trim().split(/\s+/);
    let command = args.shift()?.toLowerCase();

    if (command && config.commandAliases && config.commandAliases[command]) {
        const resolvedCommand = config.commandAliases[command];
        playerUtils.debugLog(`Command alias '${command}' resolved to '${resolvedCommand}'.`, player.nameTag);
        command = resolvedCommand;
    }

    switch (command) {
        case "version":
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
        case "myflags":
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
            break;
        case "inspect": // Text command !ac inspect
            if (args.length < 1) {
                player.sendMessage("§cUsage: !inspect <playername>");
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
                player.sendMessage("§cUsage: !resetflags <playername>");
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
        case "ui":
            uiManager.showAdminMainMenu(player); // Call the UI manager
            break;
        case "xraynotify":
            if (args.length < 1 || !["on", "off", "status"].includes(args[0].toLowerCase())) {
                player.sendMessage("§cUsage: !xraynotify <on|off|status>");
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
            player.sendMessage(`§cUnknown command: ${command}§r`);
    }
}
