/**
 * Defines the !ban command for administrators to ban players.
 */
import { permissionLevels } from '../core/rankManager.js';
/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: "ban",
    syntax: "!ban <playername> [duration] [reason]",
    description: "Bans a player for a specified duration (e.g., 7d, 2h, perm).",
    permissionLevel: permissionLevels.admin,
    enabled: true,
};
/**
 * Executes the ban command.
 * @param {import('@minecraft/server').Player | null} player The player issuing the command, or null if system-invoked.
 * @param {string[]} args The command arguments.
 * @param {import('../types.js').CommandDependencies} dependencies Command dependencies.
 * @param {string} [invokedBy="PlayerCommand"] How the command was invoked (e.g., "PlayerCommand", "AutoMod").
 * @param {boolean} [isAutoModAction=false] Whether this ban is a direct result of an AutoMod action.
 * @param {string|null} [autoModCheckType=null] If isAutoModAction, the checkType that triggered it.
 */
export async function execute(
    player,
    args,
    dependencies,
    invokedBy = "PlayerCommand",
    isAutoModAction = false,
    autoModCheckType = null
) {
    const { config, playerUtils, playerDataManager, logManager, permissionLevels: depPermLevels, rankManager } = dependencies;

    if (args.length < 1) {
        const usageMessage = `§cUsage: ${config.prefix}ban <playername> [duration] [reason]`;
        if (player) {
            player.sendMessage(usageMessage);
        } else {
            console.warn("Ban command called without player and insufficient args by system.");
        }
        return;
    }
    const targetPlayerName = args[0];
    const durationString = args[1] || "perm";

    let reason;
    if (invokedBy === "AutoMod") {
        // For AutoMod, if args[2] (custom reason part) is missing, use a default AutoMod reason.
        // Otherwise, use the provided reason starting from args[2].
        reason = args.length > 2 ? args.slice(2).join(" ") : `AutoMod action for ${autoModCheckType || 'violations'}.`;
    } else {
        // For PlayerCommand or other invocations, reason starts from args[2] or defaults.
        reason = args.slice(2).join(" ") || "Banned by an administrator.";
    }

    const foundPlayer = playerUtils.findPlayer(targetPlayerName);

    if (!foundPlayer) {
        const message = `§cPlayer "${targetPlayerName}" not found (may be offline or invalid).`;
        if (player) {
            player.sendMessage(message);
        } else {
            console.warn(message);
        }
        return;
    }

    if (player && foundPlayer.id === player.id) {
        player.sendMessage("§cYou cannot ban yourself.");
        return;
    }

    if (invokedBy === "PlayerCommand" && player) {
        const targetPermissionLevel = rankManager.getPlayerPermissionLevel(foundPlayer, dependencies);
        const issuerPermissionLevel = rankManager.getPlayerPermissionLevel(player, dependencies);

        if (targetPermissionLevel <= depPermLevels.admin && issuerPermissionLevel > depPermLevels.owner) {
            player.sendMessage("§cYou do not have permission to ban this player.");
            return;
        }
        if (targetPermissionLevel <= depPermLevels.owner && issuerPermissionLevel > depPermLevels.owner) {
            player.sendMessage("§cOnly the server owner can ban another owner.");
            return;
        }
        if (targetPermissionLevel === depPermLevels.owner && issuerPermissionLevel === depPermLevels.owner && player.id !== foundPlayer.id) {
            player.sendMessage("§cServer owners cannot ban each other directly. This must be handled via server console or configuration if necessary.");
            return;
        }
    }

    const durationMs = playerUtils.parseDuration(durationString);
    if (durationMs === null || (durationMs <= 0 && durationMs !== Infinity)) {
        const message = "§cInvalid duration format. Use formats like '7d', '2h', '30m', or 'perm'.";
        if (player) {
            player.sendMessage(message);
        } else {
            console.warn(message + ` (Invoked by ${invokedBy})`);
        }
        return;
    }

    const bannedBy = invokedBy === "AutoMod" ? "AutoMod" : (player ? player.nameTag : "System");

    const banAdded = playerDataManager.addBan(
        foundPlayer,
        durationMs,
        reason,
        bannedBy,
        isAutoModAction,
        autoModCheckType,
        dependencies
    );

    if (banAdded) {
        const banInfo = playerDataManager.getBanInfo(foundPlayer, dependencies);
        const actualReason = banInfo ? banInfo.reason : reason;
        const actualBannedBy = banInfo ? banInfo.bannedBy : bannedBy;
        // Ensure unbanTimeDisplay is always defined before use
        const unbanTimeDisplay = banInfo ? banInfo.unbanTime : (Date.now() + durationMs);


        let kickMessageParts = [
            "§cYou have been banned from this server.",
            `§fReason: §e${actualReason}`,
            `§fBanned by: §e${actualBannedBy}`
        ];

        if (durationMs === Infinity) {
            kickMessageParts.push("§fThis ban is permanent.");
        } else {
            // unbanTimeDisplay is now guaranteed to be defined
            kickMessageParts.push(`§fExpires: §e${new Date(unbanTimeDisplay).toLocaleString()}`);
        }
        const kickMessage = kickMessageParts.join('\n');

        try {
            foundPlayer.kick(kickMessage);
        } catch (e) {
            playerUtils.debugLog(`[BanCommand] Attempted to kick banned player ${foundPlayer.nameTag} but they might have already disconnected: ${e}`, player ? player.nameTag : "System", dependencies);
        }

        const successMessage = `§aSuccessfully banned ${foundPlayer.nameTag} (${durationString}). Reason: ${actualReason}`;
        if (player) {
            player.sendMessage(successMessage);
        } else {
            console.log(successMessage.replace(/§[a-f0-9]/g, ''));
        }

        if (playerUtils.notifyAdmins) {
            const targetPData = playerDataManager.getPlayerData(foundPlayer.id);
            const adminNotifyMsg = `§7[Admin] §e${foundPlayer.nameTag} §7was banned by §e${actualBannedBy} §7(${durationString}). Reason: §f${actualReason}`;
            playerUtils.notifyAdmins(adminNotifyMsg, dependencies, player, targetPData);
        }
        if (logManager?.addLog) {
            logManager.addLog({ timestamp: Date.now(), adminName: actualBannedBy, actionType: 'ban', targetName: foundPlayer.nameTag, duration: durationString, reason: actualReason, isAutoMod: isAutoModAction, checkType: autoModCheckType }, dependencies);
        }
    } else {
        const failureMessage = `§cFailed to ban ${foundPlayer.nameTag}.`;
        if (player) {
            player.sendMessage(failureMessage);
        } else {
            console.warn(failureMessage.replace(/§[a-f0-9]/g, ''));
        }
    }
}
