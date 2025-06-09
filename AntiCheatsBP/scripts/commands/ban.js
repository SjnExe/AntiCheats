/**
 * @file AntiCheatsBP/scripts/commands/ban.js
 * Defines the !ban command for administrators to ban players.
 * @version 1.0.0
 */
import { permissionLevels } from '../core/rankManager.js';

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: "ban",
    syntax: "!ban <playername> [duration] [reason]",
    description: "Bans a player for a specified duration (e.g., 7d, 2h, perm).",
    permissionLevel: permissionLevels.admin
};

/**
 * Executes the ban command.
 * @param {import('@minecraft/server').Player} player The player issuing the command.
 * @param {string[]} args The command arguments.
 * @param {import('../types.js').CommandDependencies} dependencies Command dependencies.
 * @param {string} [invokedBy="PlayerCommand"] How the command was invoked (e.g., "PlayerCommand", "AutoMod").
 * @param {boolean} [isAutoModAction=false] Whether this ban is a direct result of an AutoMod action.
 * @param {string|null} [autoModCheckType=null] If isAutoModAction, the checkType that triggered it.
 */
export async function execute(
    player, // Can be null if invokedBy is not "PlayerCommand"
    args,
    dependencies,
    invokedBy = "PlayerCommand",
    isAutoModAction = false,
    autoModCheckType = null
) {
    const { config, playerUtils, playerDataManager, addLog, findPlayer, parseDuration } = dependencies;

    if (args.length < 1) {
        if (player) player.sendMessage(`§cUsage: ${config.prefix}ban <playername> [duration] [reason]`);
        else console.warn("Ban command called without player and insufficient args by system.");
        return;
    }
    const targetPlayerName = args[0];
    const durationString = args[1] || "perm"; // Default to permanent if not specified

    // Adjust reason if it's an AutoMod action and no specific reason is in args
    let reason;
    if (invokedBy === "AutoMod" && args.length <=2) { // args[0] is name, args[1] is duration (e.g. "perm")
        reason = `AutoMod action for ${autoModCheckType || 'violations'}.`;
    } else {
        reason = args.slice(2).join(" ") || (invokedBy === "AutoMod" ? `AutoMod action for ${autoModCheckType || 'violations'}.` : "Banned by an administrator.");
    }


    const foundPlayer = findPlayer(targetPlayerName, playerUtils);

    if (!foundPlayer) {
        const message = `§cPlayer "${targetPlayerName}" not found online. Offline banning by name is not yet supported by this command version.`;
        if (player) player.sendMessage(message);
        else console.warn(message);
        return;
    }

    if (player && foundPlayer.id === player.id) {
        player.sendMessage("§cYou cannot ban yourself.");
        return;
    }

    // Permission checks only apply if invoked by a player
    if (invokedBy === "PlayerCommand" && player) {
        const targetPermissionLevel = dependencies.getPlayerPermissionLevel(foundPlayer);
        const issuerPermissionLevel = dependencies.getPlayerPermissionLevel(player);

        if (targetPermissionLevel <= permissionLevels.admin && issuerPermissionLevel > permissionLevels.owner) {
            player.sendMessage("§cYou do not have sufficient permission to ban this player.");
            return;
        }
        if (targetPermissionLevel <= permissionLevels.owner && issuerPermissionLevel > permissionLevels.owner) {
            player.sendMessage("§cOwners cannot be banned by non-owners.");
            return;
        }
        if (targetPermissionLevel === permissionLevels.owner && issuerPermissionLevel === permissionLevels.owner && player.id !== foundPlayer.id) {
            player.sendMessage("§cOne Owner cannot ban another Owner directly through this command.");
            return;
        }
    }

    const durationMs = parseDuration(durationString);
    if (durationMs === null || (durationMs <= 0 && durationMs !== Infinity)) {
        const message = "§cInvalid duration format. Use formats like 7d, 2h, 5m, or perm. Default is perm if unspecified.";
        if (player) player.sendMessage(message);
        else console.warn(message + ` (Invoked by ${invokedBy})`);
        return;
    }

    const bannedBy = invokedBy === "AutoMod" ? "AutoMod" : (player ? player.nameTag : "System");

    const banAdded = playerDataManager.addBan(
        foundPlayer,
        durationMs,
        reason,
        bannedBy,
        isAutoModAction,
        autoModCheckType
    );

    if (banAdded) {
        const banInfo = playerDataManager.getBanInfo(foundPlayer); // Fetch the full ban info
        const actualReason = banInfo ? banInfo.reason : reason;
        const actualBannedBy = banInfo ? banInfo.bannedBy : bannedBy;

        let kickMessage = `§cYou have been banned from this server.\n§rReason: ${actualReason}\n`;
        kickMessage += `§cBanned by: ${actualBannedBy}\n`;
        if (durationMs === Infinity) {
            kickMessage += "§cThis ban is permanent.";
        } else {
            // Use banInfo.unbanTime if available, otherwise calculate. This handles existing bans better if somehow called.
            const unbanTimeDisplay = banInfo ? banInfo.unbanTime : (Date.now() + durationMs);
            kickMessage += `§cExpires: ${new Date(unbanTimeDisplay).toLocaleString()}`;
        }

        try {
            foundPlayer.kick(kickMessage);
        } catch (e) {
            if (playerUtils.debugLog) playerUtils.debugLog(`Attempted to kick banned player ${foundPlayer.nameTag} but they might have already disconnected: ${e}`, player ? player.nameTag : "System");
        }

        const successMessage = `§aSuccessfully banned ${foundPlayer.nameTag}. Duration: ${durationString}. Reason: ${actualReason}`;
        if (player) player.sendMessage(successMessage);
        else console.log(successMessage.replace(/§[a-f0-9]/g, '')); // Log clean message if no player

        if (playerUtils.notifyAdmins) {
            playerUtils.notifyAdmins(`Player ${foundPlayer.nameTag} was banned by ${actualBannedBy}. Duration: ${durationString}. Reason: ${actualReason}`, player, null);
        }
        if (addLog) {
            addLog({ timestamp: Date.now(), adminName: actualBannedBy, actionType: 'ban', targetName: foundPlayer.nameTag, duration: durationString, reason: actualReason, isAutoMod: isAutoModAction, checkType: autoModCheckType });
        }
    } else {
        const failureMessage = `§cFailed to ban ${foundPlayer.nameTag}. They might already be banned or an error occurred.`;
        if (player) player.sendMessage(failureMessage);
        else console.warn(failureMessage.replace(/§[a-f0-9]/g, ''));
    }
}
