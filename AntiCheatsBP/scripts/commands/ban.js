/**
 * @file AntiCheatsBP/scripts/commands/ban.js
 * Defines the !ban command for administrators to ban players.
 * @version 1.0.0
 */
// AntiCheatsBP/scripts/commands/ban.js
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
 */
export async function execute(player, args, dependencies) {
    const { config, playerUtils, playerDataManager, addLog, findPlayer, parseDuration } = dependencies;

    if (args.length < 1) {
        player.sendMessage(`§cUsage: ${config.prefix}ban <playername> [duration] [reason]`);
        return;
    }
    const targetPlayerName = args[0];
    const durationString = args[1] || "perm"; // Default to permanent if not specified
    const reason = args.slice(2).join(" ") || "Banned by an administrator.";

    const foundPlayer = findPlayer(targetPlayerName, playerUtils);

    if (!foundPlayer) {
        // Note: For a full ban system, you'd want to be able to ban offline players by name.
        // This current implementation relies on the player being online (found by findPlayer).
        player.sendMessage(`§cPlayer "${targetPlayerName}" not found online. Offline banning by name is not yet supported by this command version.`);
        return;
    }

    if (foundPlayer.id === player.id) {
        player.sendMessage("§cYou cannot ban yourself.");
        return;
    }

    // Prevent banning admins/owners unless the issuer is an owner and target is an admin (or similar logic)
    // This requires getPlayerPermissionLevel to be available or passed via dependencies
    const targetPermissionLevel = dependencies.getPlayerPermissionLevel(foundPlayer);
    const issuerPermissionLevel = dependencies.getPlayerPermissionLevel(player);

    if (targetPermissionLevel <= permissionLevels.admin && issuerPermissionLevel > permissionLevels.owner) {
        player.sendMessage("§cYou do not have sufficient permission to ban this player.");
        return;
    }
     if (targetPermissionLevel <= permissionLevels.owner && issuerPermissionLevel > permissionLevels.owner) { // Only owner can ban owner
        player.sendMessage("§cOwners cannot be banned by non-owners.");
        return;
    }
    if (targetPermissionLevel === permissionLevels.owner && issuerPermissionLevel === permissionLevels.owner && player.id !== foundPlayer.id) {
         player.sendMessage("§cOne Owner cannot ban another Owner directly through this command."); // Or implement specific owner-to-owner logic
         return;
    }


    const durationMs = parseDuration(durationString);
    if (durationMs === null || (durationMs <= 0 && durationMs !== Infinity)) {
        player.sendMessage("§cInvalid duration format. Use formats like 7d, 2h, 5m, or perm. Default is perm if unspecified.");
        return;
    }

    // Assuming addBan is on playerDataManager and handles persistence
    const banAdded = playerDataManager.addBan(foundPlayer, durationMs, reason);

    if (banAdded) {
        let kickMessage = `§cYou have been banned from this server.\n§rReason: ${reason}\n`;
        if (durationMs === Infinity) {
            kickMessage += "§cThis ban is permanent.";
        } else {
            const unbanTime = Date.now() + durationMs;
            kickMessage += `§cExpires: ${new Date(unbanTime).toLocaleString()}`;
        }

        try {
            foundPlayer.kick(kickMessage);
        } catch (e) {
            if (playerUtils.debugLog) playerUtils.debugLog(`Attempted to kick banned player ${foundPlayer.nameTag} but they might have already disconnected: ${e}`, player.nameTag);
        }

        player.sendMessage(`§aSuccessfully banned ${foundPlayer.nameTag}. Duration: ${durationString}. Reason: ${reason}`);
        if (playerUtils.notifyAdmins) {
            playerUtils.notifyAdmins(`Player ${foundPlayer.nameTag} was banned by ${player.nameTag}. Duration: ${durationString}. Reason: ${reason}`, player, null);
        }
        if (addLog) {
            addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'ban', targetName: foundPlayer.nameTag, duration: durationString, reason: reason });
        }
    } else {
        player.sendMessage(`§cFailed to ban ${foundPlayer.nameTag}. They might already be banned or an error occurred.`);
    }
}
