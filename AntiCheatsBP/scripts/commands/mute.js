/**
 * @file AntiCheatsBP/scripts/commands/mute.js
 * Defines the !mute command for administrators to prevent a player from sending chat messages.
 * @version 1.0.2
 */
// permissionLevels and getString will be accessed via dependencies.

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: "mute",
    syntax: "!mute <playername> [duration] [reason]",
    description: "command.mute.description", // Key for localization
    permissionLevel: null, // To be set from dependencies.permissionLevels.admin
    enabled: true,
};

/**
 * Executes the mute command.
 * @param {import('@minecraft/server').Player | null} player The player issuing the command, or null if system-invoked.
 * @param {string[]} args The command arguments.
 * @param {import('../types.js').CommandDependencies} dependencies Command dependencies.
 * @param {string} [invokedBy="PlayerCommand"] How the command was invoked.
 * @param {boolean} [isAutoModAction=false] Whether this is an AutoMod action.
 * @param {string|null} [autoModCheckType=null] If AutoMod, the check type.
 */
export async function execute(
    player, // Can be null
    args,
    dependencies,
    invokedBy = "PlayerCommand",
    isAutoModAction = false,
    autoModCheckType = null
) {
    const { config, playerUtils, playerDataManager, logManager, rankManager, permissionLevels } = dependencies; // getString removed

    // Ensure definition properties are set if not already by a command loader
    if (definition.permissionLevel === null) {
        definition.permissionLevel = permissionLevels.admin;
    }
    // definition.description is static or resolved by help if it's a key.

    if (args.length < 1) {
        // Placeholder for 'command.mute.usage' -> "§cUsage: {prefix}mute <playername> [duration] [reason]"
        const usageMessage = `§cUsage: ${config.prefix}mute <playername> [duration] [reason]`;
        if (player) {
            player.sendMessage(usageMessage);
        } else {
            console.warn("Mute command called without player and insufficient args by system.");
        }
        return;
    }
    const targetPlayerName = args[0];
    const defaultDuration = invokedBy === "AutoMod" ? "10m" : "1h";
    const durationString = args[1] || defaultDuration;

    let reason;
    if (invokedBy === "AutoMod" && args.length <= 2) {
        reason = `AutoMod action for ${autoModCheckType || 'violations'}.`; // System reason
    } else {
        // Placeholder for "command.mute.defaultAdminReason" -> "Muted by an administrator."
        reason = args.slice(2).join(" ") || (invokedBy === "AutoMod" ? `AutoMod action for ${autoModCheckType || 'violations'}.` : "Muted by an administrator.");
    }

    const foundPlayer = playerUtils.findPlayer(targetPlayerName);

    if (!foundPlayer) {
        // Placeholder for 'command.mute.notFound' -> "§cPlayer \"{targetName}\" not found."
        const message = `§cPlayer "${targetPlayerName}" not found.`;
        if (player) {
            player.sendMessage(message);
        } else {
            console.warn(message);
        }
        return;
    }

    if (player && foundPlayer.id === player.id) {
        // Placeholder for 'command.mute.self' -> "§cYou cannot mute yourself."
        player.sendMessage("§cYou cannot mute yourself.");
        return;
    }

    if (invokedBy === "PlayerCommand" && player) {
        // Use rankManager from dependencies
        const targetPermissionLevel = rankManager.getPlayerPermissionLevel(foundPlayer, dependencies);
        const issuerPermissionLevel = rankManager.getPlayerPermissionLevel(player, dependencies);
        if (targetPermissionLevel <= issuerPermissionLevel && player.id !== foundPlayer.id && targetPermissionLevel <= permissionLevels.admin) {
            // Placeholder for 'command.mute.permissionInsufficient' -> "§cYou do not have permission to mute this player."
            player.sendMessage("§cYou do not have permission to mute this player.");
            return;
        }
    }

    const durationMs = playerUtils.parseDuration(durationString);
    if (durationMs === null || (durationMs <= 0 && durationMs !== Infinity)) {
        // Placeholder for 'command.mute.invalidDuration' -> "§cInvalid duration. Example: 10m, 1h, 2d. Default: {defaultDuration}"
        const message = `§cInvalid duration. Example: 10m, 1h, 2d. Default: ${defaultDuration}`;
        if (player) {
            player.sendMessage(message);
        } else {
            console.warn(message + ` (Invoked by ${invokedBy})`);
        }
        return;
    }

    try {
        const mutedBy = invokedBy === "AutoMod" ? "AutoMod" : (player ? player.nameTag : "System");
        const muteAdded = playerDataManager.addMute(
            foundPlayer,
            durationMs,
            reason,
            mutedBy,
            isAutoModAction,
            autoModCheckType,
            dependencies // Pass dependencies to addMute
        );

        if (muteAdded) {
            const muteInfo = playerDataManager.getMuteInfo(foundPlayer, dependencies); // Pass dependencies
            const actualReason = muteInfo ? muteInfo.reason : reason;
            const actualMutedBy = muteInfo ? muteInfo.mutedBy : mutedBy;
            // "common.value.permanent" -> "Permanent"
            // Placeholder for "command.mute.durationFor" -> "{duration}"
            const durationText = durationMs === Infinity ? "Permanent" : durationString;


            // Placeholders for targetNotification keys
            // 'command.mute.targetNotification.permanent' -> "§cYou have been permanently muted. Reason: {reason}"
            // 'command.mute.targetNotification.timed' -> "§cYou have been muted for {durationString}. Reason: {reason}"
            let targetNotificationMessage = durationMs === Infinity
                ? `§cYou have been permanently muted. Reason: ${actualReason}`
                : `§cYou have been muted for ${durationString}. Reason: ${actualReason}`;
            try {
                foundPlayer.onScreenDisplay.setActionBar(targetNotificationMessage);
            } catch (e) {
                if (config.enableDebugLogging && playerUtils.debugLog) {
                    playerUtils.debugLog(`Failed to set action bar for muted player ${foundPlayer.nameTag}: ${e}`, dependencies, player ? player.nameTag : "System");
                }
            }

            // Placeholder for 'command.mute.success' -> "§aMuted {targetName} for {durationText}. Reason: {reason}"
            const successMessage = `§aMuted ${foundPlayer.nameTag} for ${durationText}. Reason: ${actualReason}`;
            if (player) {
                player.sendMessage(successMessage);
            } else {
                console.log(successMessage.replace(/§[a-f0-9]/g, ''));
            }

            if (playerUtils.notifyAdmins) {
                const targetPData = playerDataManager.getPlayerData(foundPlayer.id);
                // Placeholder for 'command.mute.adminNotification' -> "§7[Admin] §e{targetName} §7was muted by §e{mutedBy} §7for {durationText}. Reason: §f{reason}"
                playerUtils.notifyAdmins(`§7[Admin] §e${foundPlayer.nameTag} §7was muted by §e${actualMutedBy} §7for ${durationText}. Reason: §f${actualReason}`, dependencies, player, targetPData);
            }
            if (logManager && logManager.addLog) {
                logManager.addLog({
                    timestamp: Date.now(),
                    adminName: actualMutedBy,
                    actionType: 'mute',
                    targetName: foundPlayer.nameTag,
                    duration: durationString,
                    reason: actualReason,
                    isAutoMod: isAutoModAction,
                    checkType: autoModCheckType
                }, dependencies);
            }
        } else {
            // Placeholder for 'command.mute.fail' -> "§cFailed to mute {targetName}."
            const failureMessage = `§cFailed to mute ${foundPlayer.nameTag}.`;
            if (player) {
                player.sendMessage(failureMessage);
            } else {
                console.warn(failureMessage.replace(/§[a-f0-9]/g, ''));
            }
        }
    } catch (e) {
        // Placeholder for 'command.mute.error' -> "§cError muting {targetName}: {error}"
        const errorMessage = `§cError muting ${foundPlayer.nameTag}: ${e}`;
        if (player) {
            player.sendMessage(errorMessage);
        } else {
            console.error(errorMessage.replace(/§[a-f0-9]/g, ''));
        }
        if (config.enableDebugLogging && playerUtils.debugLog) {
            playerUtils.debugLog(`Unexpected error during mute command for ${foundPlayer.nameTag} by ${player ? player.nameTag : invokedBy}: ${e}`, player ? player.nameTag : "System", dependencies);
        }
    }
}
