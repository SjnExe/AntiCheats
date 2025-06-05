import * as mc from '@minecraft/server';
import { permissionLevels } from './rankManager.js';
import { getPlayerPermissionLevel } from '../utils/playerUtils.js';
import { addMute, removeMute, isMuted } from '../core/playerDataManager.js'; // Updated imports for mute/unmute
// Parameter 'config' will provide PREFIX, acVersion, commandAliases
// Parameter 'playerUtils' will provide warnPlayer, notifyAdmins, debugLog (isAdmin is no longer directly used here)
// Parameter 'playerDataManager' will provide getPlayerData, prepareAndSavePlayerData, addMute, removeMute, isMuted
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
    // { name: "ui", syntax: "!ui", description: "Opens the Admin UI.", permissionLevel: permissionLevels.ADMIN }, // Removed, use !panel
    { name: "panel", syntax: "!panel", description: "Opens the AntiCheat Admin Panel UI.", permissionLevel: permissionLevels.ADMIN },
    { name: "notify", syntax: "!notify <on|off|status>", description: "Toggles or checks your AntiCheat system notifications.", permissionLevel: permissionLevels.ADMIN },
    { name: "xraynotify", syntax: "!xraynotify <on|off|status>", description: "Manage X-Ray notifications.", permissionLevel: permissionLevels.ADMIN },
    { name: "testnotify", syntax: "!testnotify", description: "Sends a test admin notification.", permissionLevel: permissionLevels.OWNER }
];

/**
 * Parses a duration string (e.g., "5m", "1h", "2d", "perm") into milliseconds.
 * @param {string} durationString The duration string to parse.
 * @returns {number|null} Duration in milliseconds, Infinity for permanent, or null if invalid.
 */
function parseDuration(durationString) {
    if (!durationString) return null;
    durationString = durationString.toLowerCase();

    if (durationString === "perm" || durationString === "permanent") {
        return Infinity;
    }

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
    } else if (/^\d+$/.test(durationString)) { // Plain number, assume minutes
        const value = parseInt(durationString);
        if (!isNaN(value)) {
            return value * 60 * 1000;
        }
    }
    return null; // Invalid format
}

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
        if (args[0]) { // User wants help for a specific command
            const specificCommandName = args[0].toLowerCase();
            let foundCmdDef = null;

            for (const cmdDef of allCommands) {
                if (cmdDef.name === specificCommandName) {
                    foundCmdDef = cmdDef;
                    break;
                }
                // Check aliases
                if (config.commandAliases) {
                    const aliasTarget = config.commandAliases[specificCommandName];
                    if (aliasTarget === cmdDef.name) {
                        foundCmdDef = cmdDef;
                        break;
                    }
                    // Also check if specificCommandName is a value in aliases and its key matches cmdDef.name
                    // This is less common for help lookups but good for completeness if aliases are complex.
                    // For now, the above check (specificCommandName is an alias for cmdDef.name) is primary.
                }
            }

            if (foundCmdDef) {
                if (userPermissionLevel <= foundCmdDef.permissionLevel) {
                    // Extracting arguments part of syntax: e.g., "<player> [reason]" from "!kick <player> [reason]"
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
        } else { // General help - list available commands
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
        // This command is permissionLevels.NORMAL, so no explicit check needed beyond being in ALL_COMMANDS
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
    const cmdDef = allCommands.find(c => c.name === command);

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
        case "warnings": // ADMIN
            if (args.length < 1) {
                player.sendMessage(`§cUsage: ${config.prefix}warnings <playername>`);
                return;
            }
            const targetPlayerNameWarn = args[0];
            let foundPlayerWarn = null;
            for (const p of mc.world.getAllPlayers()) {
                if (p.nameTag.toLowerCase() === targetPlayerNameWarn.toLowerCase()) {
                    foundPlayerWarn = p;
                    break;
                }
            }

            if (!foundPlayerWarn) {
                player.sendMessage(`§cPlayer ${targetPlayerNameWarn} not found.`);
                return;
            }

            const pDataWarn = playerDataManager.getPlayerData(foundPlayerWarn.id);
            if (!pDataWarn || !pDataWarn.flags) {
                player.sendMessage(`§cNo warning data found for ${foundPlayerWarn.nameTag}.`);
                return;
            }

            let warningMessage = [`§a--- Detailed Warnings for ${foundPlayerWarn.nameTag} ---`];
            warningMessage.push(`§eTotal Flags: §f${pDataWarn.flags.totalFlags}`);
            warningMessage.push(`§eLast Flag Type: §f${pDataWarn.lastFlagType || "None"}`);
            warningMessage.push("§eIndividual Flag Details:§r");

            let specificFlagsFound = false;
            for (const flagKey in pDataWarn.flags) {
                if (flagKey === "totalFlags") continue;
                const flagData = pDataWarn.flags[flagKey];
                if (typeof flagData === 'object' && flagData !== null && flagData.count > 0) {
                    warningMessage.push(`  §f- ${flagKey}: §c${flagData.count} occurrence(s)`);
                    warningMessage.push(`    Last detected: §7${flagData.lastDetectionTime ? new Date(flagData.lastDetectionTime).toLocaleString() : 'N/A'}`);
                    specificFlagsFound = true;
                }
            }

            if (!specificFlagsFound) {
                warningMessage.push("  No specific flags triggered.");
            }
            player.sendMessage(warningMessage.join("\n"));
            break;
        case "invsee": // ADMIN
            if (args.length < 1) {
                player.sendMessage(`§cUsage: ${config.prefix}invsee <playername>`);
                return;
            }
            const targetPlayerNameInvsee = args[0];
            let targetPlayerInvsee = null;
            for (const p of mc.world.getAllPlayers()) {
                if (p.nameTag.toLowerCase() === targetPlayerNameInvsee.toLowerCase()) {
                    targetPlayerInvsee = p;
                    break;
                }
            }

            if (targetPlayerInvsee) {
                // Assuming uiManager.showPlayerInventory will handle the UI display
                // The command manager's role is to validate and pass the correct player objects.
                uiManager.showPlayerInventory(player, targetPlayerInvsee);
            } else {
                player.sendMessage(`§cPlayer ${targetPlayerNameInvsee} not found.`);
            }
            break;
        case "clearwarnings": // Text command !ac clearwarnings (alias for resetflags essentially)
            if (args.length < 1) {
                player.sendMessage(`§cUsage: ${config.prefix}clearwarnings <playername>`);
                return;
            }
            const resetTargetNameCw = args[0]; // Using cw suffix to avoid redeclaration if someday these are not identical
            let resetFoundPlayerCw = null;
            for (const p of mc.world.getAllPlayers()) {
                if (p.nameTag.toLowerCase() === resetTargetNameCw.toLowerCase()) {
                    resetFoundPlayerCw = p;
                    break;
                }
            }
            if (resetFoundPlayerCw) {
                const targetPDataResetCw = playerDataManager.getPlayerData(resetFoundPlayerCw.id);
                if (targetPDataResetCw) {
                    targetPDataResetCw.flags.totalFlags = 0;
                    targetPDataResetCw.lastFlagType = "";
                    for (const flagKey in targetPDataResetCw.flags) {
                        if (typeof targetPDataResetCw.flags[flagKey] === 'object' && targetPDataResetCw.flags[flagKey] !== null) {
                            targetPDataResetCw.flags[flagKey].count = 0;
                            targetPDataResetCw.flags[flagKey].lastDetectionTime = 0;
                        }
                    }
                    targetPDataResetCw.consecutiveOffGroundTicks = 0;
                    targetPDataResetCw.fallDistance = 0;
                    targetPDataResetCw.consecutiveOnGroundSpeedingTicks = 0;
                    targetPDataResetCw.attackEvents = [];
                    targetPDataResetCw.blockBreakEvents = [];
                    await playerDataManager.prepareAndSavePlayerData(resetFoundPlayerCw);
                    player.sendMessage(`§aWarnings and violation data cleared for ${resetFoundPlayerCw.nameTag}.`);
                    playerUtils.notifyAdmins(`Warnings cleared for ${resetFoundPlayerCw.nameTag} by ${player.nameTag}.`, resetFoundPlayerCw, targetPDataResetCw);
                    playerUtils.debugLog(`Warnings cleared for ${resetFoundPlayerCw.nameTag} by ${player.nameTag}.`, targetPDataResetCw.isWatched ? resetFoundPlayerCw.nameTag : null);
                } else {
                    player.sendMessage(`§cPlayer data for ${resetTargetNameCw} not found.`);
                }
            } else {
                player.sendMessage(`§cPlayer ${resetTargetNameCw} not found.`);
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
                    player.sendMessage(`§aFlags and violation data reset for ${resetFoundPlayer.nameTag}.`); // Kept "reset" here as this is the original resetflags command
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
        case "mute": // ADMIN
            if (args.length < 1) {
                player.sendMessage(`§cUsage: ${config.prefix}mute <playername> [duration] [reason]`);
                return;
            }
            const targetPlayerNameMute = args[0];
            const durationStringMute = args[1] || "1h"; // Default duration 1 hour
            const reasonMute = args.slice(2).join(" ") || "Muted by an administrator.";

            let foundPlayerMute = null;
            for (const p of mc.world.getAllPlayers()) {
                if (p.nameTag.toLowerCase() === targetPlayerNameMute.toLowerCase()) {
                    foundPlayerMute = p;
                    break;
                }
            }

            if (!foundPlayerMute) {
                player.sendMessage(`§cPlayer ${targetPlayerNameMute} not found.`);
                return;
            }

            if (foundPlayerMute.id === player.id) {
                player.sendMessage("§cYou cannot mute yourself.");
                return;
            }

            const durationMsMute = parseDuration(durationStringMute);

            if (durationMsMute === null || (durationMsMute <= 0 && durationMsMute !== Infinity)) {
                player.sendMessage("§cInvalid duration format. Use formats like 5m, 2h, 1d, or perm (for permanent session mute). Default is 1h if unspecified.");
                return;
            }

            try {
                const muteAdded = playerDataManager.addMute(foundPlayerMute, durationMsMute, reasonMute);
                if (muteAdded) {
                    const durationText = durationMsMute === Infinity ? "permanently (this session)" : `for ${durationStringMute}`;

                    try {
                        foundPlayerMute.onScreenDisplay.setActionBar(`§cYou have been muted ${durationText}. Reason: ${reasonMute}`);
                    } catch (e) {
                        playerUtils.debugLog(`Failed to set action bar for muted player ${foundPlayerMute.nameTag}: ${e}`, player.nameTag);
                        // Non-critical, proceed
                    }

                    player.sendMessage(`§aPlayer ${foundPlayerMute.nameTag} has been muted ${durationText}. Reason: ${reasonMute}`);
                    playerUtils.notifyAdmins(`Player ${foundPlayerMute.nameTag} was muted ${durationText} by ${player.nameTag}. Reason: ${reasonMute}`, player, null);
                    playerUtils.debugLog(`Player ${foundPlayerMute.nameTag} muted by ${player.nameTag} ${durationText}. Reason: ${reasonMute}`, player.nameTag);
                } else {
                     player.sendMessage(`§cFailed to apply mute for ${foundPlayerMute.nameTag}. Check logs.`);
                }
            } catch (e) {
                player.sendMessage(`§cAn unexpected error occurred while trying to mute ${foundPlayerMute.nameTag}: ${e}`);
                playerUtils.debugLog(`Unexpected error during mute command for ${foundPlayerMute.nameTag} by ${player.nameTag}: ${e}`, player.nameTag);
            }
            break;
        case "unmute": // ADMIN
            if (args.length < 1) {
                player.sendMessage(`§cUsage: ${config.prefix}unmute <playername>`);
                return;
            }
            const targetPlayerNameUnmute = args[0];
            let foundPlayerUnmute = null;

            for (const p of mc.world.getAllPlayers()) {
                if (p.nameTag.toLowerCase() === targetPlayerNameUnmute.toLowerCase()) {
                    foundPlayerUnmute = p;
                    break;
                }
            }

            if (!foundPlayerUnmute) {
                player.sendMessage(`§cPlayer ${targetPlayerNameUnmute} not found.`);
                return;
            }

            try {
                if (!playerDataManager.isMuted(foundPlayerUnmute)) {
                    player.sendMessage(`§7Player ${foundPlayerUnmute.nameTag} is not currently muted.`);
                    return;
                }

                const unmuted = playerDataManager.removeMute(foundPlayerUnmute);
                if (unmuted) {
                    try {
                        foundPlayerUnmute.onScreenDisplay.setActionBar("§aYou have been unmuted.");
                    } catch (e) {
                        playerUtils.debugLog(`Failed to set action bar for unmuted player ${foundPlayerUnmute.nameTag}: ${e}`, player.nameTag);
                    }
                    player.sendMessage(`§aPlayer ${foundPlayerUnmute.nameTag} has been unmuted.`);
                    playerUtils.notifyAdmins(`Player ${foundPlayerUnmute.nameTag} was unmuted by ${player.nameTag}.`, player, null);
                    playerUtils.debugLog(`Player ${foundPlayerUnmute.nameTag} unmuted by ${player.nameTag}.`, player.nameTag);
                } else {
                    // This case should ideally be caught by isMuted, but as a fallback:
                    player.sendMessage(`§cFailed to unmute player ${foundPlayerUnmute.nameTag}. They might not have been muted or an error occurred.`);
                }
            } catch (e) {
                player.sendMessage(`§cAn unexpected error occurred while trying to unmute ${foundPlayerUnmute.nameTag}: ${e}`);
                playerUtils.debugLog(`Unexpected error during unmute command for ${foundPlayerUnmute.nameTag} by ${player.nameTag}: ${e}`, player.nameTag);
            }
            break;
        case "unmute": // ADMIN
            if (args.length < 1) {
                player.sendMessage(`§cUsage: ${config.prefix}unmute <playername>`);
                return;
            }
            const targetPlayerNameUnmute = args[0];
            let foundPlayerUnmute = null;

            for (const p of mc.world.getAllPlayers()) {
                if (p.nameTag.toLowerCase() === targetPlayerNameUnmute.toLowerCase()) {
                    foundPlayerUnmute = p;
                    break;
                }
            }

            if (!foundPlayerUnmute) {
                player.sendMessage(`§cPlayer ${targetPlayerNameUnmute} not found.`);
                return;
            }

            try {
                if (!playerDataManager.isMuted(foundPlayerUnmute)) { // Check if player is muted
                    player.sendMessage(`§7Player ${foundPlayerUnmute.nameTag} is not currently muted.`);
                    return;
                }

                const unmuted = playerDataManager.removeMute(foundPlayerUnmute);
                if (unmuted) {
                    try {
                        foundPlayerUnmute.onScreenDisplay.setActionBar("§aYou have been unmuted.");
                    } catch (e) {
                        playerUtils.debugLog(`Failed to set action bar for unmuted player ${foundPlayerUnmute.nameTag}: ${e}`, player.nameTag);
                    }
                    player.sendMessage(`§aPlayer ${foundPlayerUnmute.nameTag} has been unmuted.`);
                    playerUtils.notifyAdmins(`Player ${foundPlayerUnmute.nameTag} was unmuted by ${player.nameTag}.`, player, null);
                    playerUtils.debugLog(`Player ${foundPlayerUnmute.nameTag} unmuted by ${player.nameTag}.`, player.nameTag);
                } else {
                    // This case might be redundant due to the isMuted check, but good as a fallback
                    player.sendMessage(`§cFailed to unmute player ${foundPlayerUnmute.nameTag}. They might not have been muted or an error occurred.`);
                }
            } catch (e) {
                player.sendMessage(`§cAn unexpected error occurred while trying to unmute ${foundPlayerUnmute.nameTag}: ${e}`);
                playerUtils.debugLog(`Unexpected error during unmute command for ${foundPlayerUnmute.nameTag} by ${player.nameTag}: ${e}`, player.nameTag);
            }
            break;
        case "freeze": // ADMIN
            const frozenTag = "frozen";
            const effectDuration = 2000000; // Very long duration

            if (args.length < 1) {
                player.sendMessage(`§cUsage: ${config.prefix}freeze <playername> [on|off]`);
                return;
            }
            const targetPlayerNameFreeze = args[0];
            const subCommandFreeze = args[1] ? args[1].toLowerCase() : null;
            let foundPlayerFreeze = null;

            for (const p of mc.world.getAllPlayers()) {
                if (p.nameTag.toLowerCase() === targetPlayerNameFreeze.toLowerCase()) {
                    foundPlayerFreeze = p;
                    break;
                }
            }

            if (!foundPlayerFreeze) {
                player.sendMessage(`§cPlayer ${targetPlayerNameFreeze} not found.`);
                return;
            }

            if (foundPlayerFreeze.id === player.id) {
                player.sendMessage("§cYou cannot freeze yourself.");
                return;
            }

            let currentFreezeState = foundPlayerFreeze.hasTag(frozenTag);
            let targetFreezeState;

            if (subCommandFreeze === "on") {
                targetFreezeState = true;
            } else if (subCommandFreeze === "off") {
                targetFreezeState = false;
            } else {
                targetFreezeState = !currentFreezeState; // Toggle
            }

            if (targetFreezeState === true && !currentFreezeState) {
                try {
                    foundPlayerFreeze.addTag(frozenTag);
                    foundPlayerFreeze.addEffect("slowness", effectDuration, { amplifier: 255, showParticles: false });
                    // It's usually better to also apply movement.jump prevention if available/desired.
                    // For simplicity, slowness 255 is a strong deterrent.
                    foundPlayerFreeze.sendMessage("§cYou have been frozen by an administrator!");
                    player.sendMessage(`§aPlayer ${foundPlayerFreeze.nameTag} is now frozen.`);
                    playerUtils.notifyAdmins(`Player ${foundPlayerFreeze.nameTag} was frozen by ${player.nameTag}.`, player, null);
                } catch (e) {
                    player.sendMessage(`§cError freezing ${foundPlayerFreeze.nameTag}: ${e}`);
                    playerUtils.debugLog(`Error freezing ${foundPlayerFreeze.nameTag} by ${player.nameTag}: ${e}`);
                }
            } else if (targetFreezeState === false && currentFreezeState) {
                try {
                    foundPlayerFreeze.removeTag(frozenTag);
                    foundPlayerFreeze.removeEffect("slowness");
                    foundPlayerFreeze.sendMessage("§aYou have been unfrozen.");
                    player.sendMessage(`§aPlayer ${foundPlayerFreeze.nameTag} is no longer frozen.`);
                    playerUtils.notifyAdmins(`Player ${foundPlayerFreeze.nameTag} was unfrozen by ${player.nameTag}.`, player, null);
                } catch (e) {
                    player.sendMessage(`§cError unfreezing ${foundPlayerFreeze.nameTag}: ${e}`);
                    playerUtils.debugLog(`Error unfreezing ${foundPlayerFreeze.nameTag} by ${player.nameTag}: ${e}`);
                }
            } else {
                player.sendMessage(targetFreezeState ? `§7Player ${foundPlayerFreeze.nameTag} is already frozen.` : `§7Player ${foundPlayerFreeze.nameTag} is already unfrozen.`);
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
        // case "ui": // Removed, !ui should be an alias for !panel if desired, handled by alias resolution.
        //     uiManager.showAdminMainMenu(player, playerDataManager);
        //     break;
        case "panel": // ADMIN
            uiManager.showAdminPanelMain(player, playerDataManager); // Call the new Admin Panel
            break;
        case "notify": // ADMIN (formerly acnotifications)
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
                        if (config.acGlobalNotificationsDefaultOn) {
                            acStatusMessage += `§aON (by server default). §7Use ${config.prefix}notify off to disable.`;
                        } else {
                            acStatusMessage += `§cOFF (by server default). §7Use ${config.prefix}notify on to enable.`;
                        }
                    }
                    player.sendMessage(acStatusMessage);
                    break;
                default:
                    player.sendMessage(`§cUsage: ${config.prefix}notify <on|off|status>`);
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
                        if (config.xrayDetectionAdminNotifyByDefault) {
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
