/**
 * @file AntiCheatsBP/scripts/commands/mute.js
 * Defines the !mute command for administrators to prevent a player from sending chat messages.
 * @version 1.0.0
 */
// AntiCheatsBP/scripts/commands/mute.js
import { permissionLevels } from '../core/rankManager.js';

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: "mute",
    syntax: "!mute <playername> [duration] [reason]",
    description: "Mutes a player for a specified duration (e.g., 5m, 1h, 1d, perm).",
    permissionLevel: permissionLevels.admin
};

/**
 * Executes the mute command.
 * @param {import('@minecraft/server').Player} player The player issuing the command.
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
    const { config, playerUtils, playerDataManager, addLog, findPlayer, parseDuration } = dependencies;

    if (args.length < 1) {
        if (player) player.sendMessage(`§cUsage: ${config.prefix}mute <playername> [duration] [reason]`);
        else console.warn("Mute command called without player and insufficient args by system.");
        return;
    }
    const targetPlayerName = args[0];
    const durationString = args[1] || (invokedBy === "AutoMod" ? "10m" : "1h"); // Default duration

    let reason;
    if (invokedBy === "AutoMod" && args.length <= 2) { // args[0] is name, args[1] is duration
        reason = `AutoMod action for ${autoModCheckType || 'violations'}.`;
    } else {
        reason = args.slice(2).join(" ") || (invokedBy === "AutoMod" ? `AutoMod action for ${autoModCheckType || 'violations'}.` : "Muted by an administrator.");
    }

    const foundPlayer = findPlayer(targetPlayerName, playerUtils);

    if (!foundPlayer) {
        const message = `§cPlayer "${targetPlayerName}" not found.`;
        if (player) player.sendMessage(message);
        else console.warn(message);
        return;
    }

    if (player && foundPlayer.id === player.id) {
        player.sendMessage("§cYou cannot mute yourself.");
        return;
    }

    // Basic permission check if invoked by player
    if (invokedBy === "PlayerCommand" && player) {
        const targetPermissionLevel = dependencies.getPlayerPermissionLevel(foundPlayer);
        const issuerPermissionLevel = dependencies.getPlayerPermissionLevel(player);
        if (targetPermissionLevel >= issuerPermissionLevel && player.id !== foundPlayer.id) {
             player.sendMessage("§cYou do not have sufficient permissions to mute this player.");
             return;
        }
    }


    const durationMs = parseDuration(durationString);
    if (durationMs === null || (durationMs <= 0 && durationMs !== Infinity)) {
        const message = `§cInvalid duration format. Use formats like 5m, 2h, 1d, or perm. Default is ${invokedBy === "AutoMod" ? "10m" : "1h"} if unspecified.`;
        if (player) player.sendMessage(message);
        else console.warn(message + ` (Invoked by ${invokedBy})`);
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
            autoModCheckType
        );

        if (muteAdded) {
            const muteInfo = playerDataManager.getMuteInfo(foundPlayer); // Fetch full info
            const actualReason = muteInfo ? muteInfo.reason : reason;
            const actualMutedBy = muteInfo ? muteInfo.mutedBy : mutedBy;
            const durationText = durationMs === Infinity ? "permanently (this session/until unmuted)" : `for ${durationString}`;

            try {
                foundPlayer.onScreenDisplay.setActionBar(`§cYou have been muted ${durationText}. Reason: ${actualReason}`);
            } catch (e) {
                if (playerUtils.debugLog) playerUtils.debugLog(`Failed to set action bar for muted player ${foundPlayer.nameTag}: ${e}`, player ? player.nameTag : "System");
            }

            const successMessage = `§aPlayer ${foundPlayer.nameTag} has been muted ${durationText}. Reason: ${actualReason}`;
            if (player) player.sendMessage(successMessage);
            else console.log(successMessage.replace(/§[a-f0-9]/g, ''));


            if (playerUtils.notifyAdmins) {
                playerUtils.notifyAdmins(`Player ${foundPlayer.nameTag} was muted ${durationText} by ${actualMutedBy}. Reason: ${actualReason}`, player, null);
            }
            if (addLog) {
                addLog({
                    timestamp: Date.now(),
                    adminName: actualMutedBy,
                    actionType: 'mute',
                    targetName: foundPlayer.nameTag,
                    duration: durationString,
                    reason: actualReason,
                    isAutoMod: isAutoModAction,
                    checkType: autoModCheckType
                });
            }
        } else {
            const failureMessage = `§cFailed to apply mute for ${foundPlayer.nameTag}. They might already be muted with a longer or permanent duration, or an error occurred.`;
            if (player) player.sendMessage(failureMessage);
            else console.warn(failureMessage.replace(/§[a-f0-9]/g, ''));
        }
    } catch (e) {
        const errorMessage = `§cAn unexpected error occurred while trying to mute ${foundPlayer.nameTag}: ${e}`;
        if (player) player.sendMessage(errorMessage);
        else console.error(errorMessage.replace(/§[a-f0-9]/g, ''));
        if (playerUtils.debugLog) playerUtils.debugLog(`Unexpected error during mute command for ${foundPlayer.nameTag} by ${player ? player.nameTag : invokedBy}: ${e}`, player ? player.nameTag : "System");
    }
}
