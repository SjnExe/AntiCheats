/**
 * @file AntiCheatsBP/scripts/commands/ban.js
 * Defines the !ban command for administrators to ban players.
 * @version 1.0.1
 */
import { permissionLevels } from '../core/rankManager.js'; // Import permissionLevels
// getString will come from dependencies.

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: "ban",
    syntax: "!ban <playername> [duration] [reason]",
    description: "Bans a player for a specified duration (e.g., 7d, 2h, perm).",
    permissionLevel: permissionLevels.admin, // Use imported permissionLevels
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
    player, // Can be null if invokedBy is not "PlayerCommand"
    args,
    dependencies,
    invokedBy = "PlayerCommand",
    isAutoModAction = false,
    autoModCheckType = null
) {
    const { config, playerUtils, playerDataManager, logManager, permissionLevels, getString, rankManager } = dependencies;

    if (args.length < 1) {
        const usageMessage = getString('command.ban.usage', { prefix: config.prefix }); // getString from dependencies
        if (player) {
            player.sendMessage(usageMessage);
        } else {
            console.warn("Ban command called without player and insufficient args by system.");
        }
        return;
    }
    const targetPlayerName = args[0];
    const durationString = args[1] || "perm"; // Default to permanent if not specified

    let reason;
    if (invokedBy === "AutoMod" && args.length <=2) {
        reason = `AutoMod action for ${autoModCheckType || 'violations'}.`; // This is more of a system reason, not directly localized.
    } else {
        reason = args.slice(2).join(" ") || (invokedBy === "AutoMod" ? `AutoMod action for ${autoModCheckType || 'violations'}.` : "Banned by an administrator.");
    }

    const foundPlayer = playerUtils.findPlayer(targetPlayerName); // Use playerUtils.findPlayer

    if (!foundPlayer) {
        const message = getString('command.ban.notFoundOffline', { targetName: targetPlayerName }); // getString from dependencies
        if (player) {
            player.sendMessage(message);
        } else {
            console.warn(message);
        }
        return;
    }

    if (player && foundPlayer.id === player.id) {
        player.sendMessage(getString('command.ban.self')); // getString from dependencies
        return;
    }

    if (invokedBy === "PlayerCommand" && player) {
        const targetPermissionLevel = rankManager.getPlayerPermissionLevel(foundPlayer, dependencies);
        const issuerPermissionLevel = rankManager.getPlayerPermissionLevel(player, dependencies);

        // permissionLevels is now from dependencies
        if (targetPermissionLevel <= permissionLevels.admin && issuerPermissionLevel > permissionLevels.owner) {
            player.sendMessage(getString('command.ban.permissionInsufficient')); // getString from dependencies
            return;
        }
        if (targetPermissionLevel <= permissionLevels.owner && issuerPermissionLevel > permissionLevels.owner) {
            player.sendMessage(getString('command.ban.ownerByNonOwner')); // getString from dependencies
            return;
        }
        if (targetPermissionLevel === permissionLevels.owner && issuerPermissionLevel === permissionLevels.owner && player.id !== foundPlayer.id) {
            player.sendMessage(getString('command.ban.ownerByOwner')); // getString from dependencies
            return;
        }
    }

    const durationMs = playerUtils.parseDuration(durationString); // Use playerUtils.parseDuration
    if (durationMs === null || (durationMs <= 0 && durationMs !== Infinity)) {
        const message = getString('command.ban.invalidDuration'); // getString from dependencies
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
        dependencies // Pass the dependencies object
    );

    if (banAdded) {
        const banInfo = playerDataManager.getBanInfo(foundPlayer, dependencies); // Pass the dependencies object
        const actualReason = banInfo ? banInfo.reason : reason;
        const actualBannedBy = banInfo ? banInfo.bannedBy : bannedBy;

        let kickMessageParts = [
            getString('command.ban.kickMessagePrefix'),
            getString('command.ban.kickMessageReason', { reason: actualReason }),
            getString('command.ban.kickMessageBannedBy', { bannedBy: actualBannedBy })
        ];

        if (durationMs === Infinity) {
            kickMessageParts.push(getString('command.ban.kickMessagePermanent'));
        } else {
            const unbanTimeDisplay = banInfo ? banInfo.unbanTime : (Date.now() + durationMs);
            kickMessageParts.push(getString('command.ban.kickMessageExpires', { expiryDate: new Date(unbanTimeDisplay).toLocaleString() }));
        }
        const kickMessage = kickMessageParts.join('\n');

        try {
            foundPlayer.kick(kickMessage);
        } catch (e) {
            // Debug log for this specific error context, config.enableDebugLogging is checked by debugLog itself
            playerUtils.debugLog(dependencies, `[BanCommand] Attempted to kick banned player ${foundPlayer.nameTag} but they might have already disconnected: ${e}`, player ? player.nameTag : "System");
        }

        const successMessage = getString('command.ban.success', { targetName: foundPlayer.nameTag, durationString: durationString, reason: actualReason }); // getString from dependencies
        if (player) {
            player.sendMessage(successMessage);
        } else {
            console.log(successMessage.replace(/§[a-f0-9]/g, ''));
        }

        if (playerUtils.notifyAdmins) {
            const targetPData = playerDataManager.getPlayerData(foundPlayer.id); // For context in notifyAdmins
            playerUtils.notifyAdmins(getString('command.ban.adminNotification', { targetName: foundPlayer.nameTag, bannedBy: actualBannedBy, durationString: durationString, reason: actualReason }), dependencies, player, targetPData); // getString from dependencies, pass dependencies
        }
        if (logManager?.addLog) { // Use logManager.addLog
            logManager.addLog({ timestamp: Date.now(), adminName: actualBannedBy, actionType: 'ban', targetName: foundPlayer.nameTag, duration: durationString, reason: actualReason, isAutoMod: isAutoModAction, checkType: autoModCheckType }, dependencies); // Pass dependencies
        }
    } else {
        const failureMessage = getString('command.ban.fail', { targetName: foundPlayer.nameTag }); // getString from dependencies
        if (player) {
            player.sendMessage(failureMessage);
        } else {
            console.warn(failureMessage.replace(/§[a-f0-9]/g, ''));
        }
    }
}
