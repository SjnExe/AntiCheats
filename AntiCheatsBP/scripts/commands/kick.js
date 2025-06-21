/**
 * @file AntiCheatsBP/scripts/commands/kick.js
 * Defines the !kick command for administrators to remove a player from the server.
 * @version 1.0.2
 */
import { permissionLevels } from '../core/rankManager.js'; // Import permissionLevels
// getString will come from dependencies.

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: "kick",
    syntax: "!kick <playername> [reason]",
    description: "Kicks a player from the server.",
    permissionLevel: permissionLevels.admin, // Use imported permissionLevels
    enabled: true,
};

/**
 * Executes the kick command.
 * @param {import('@minecraft/server').Player} player The player issuing the command.
 * @param {string[]} args The command arguments.
 * @param {import('../types.js').CommandDependencies} dependencies Command dependencies.
 */
export async function execute(player, args, dependencies) {
    const { config, playerUtils, logManager, playerDataManager, permissionLevels } = dependencies;

    if (args.length < 1) {
        player.sendMessage(`§cUsage: ${config.prefix}kick <playername> [reason]`);
        return;
    }
    const targetPlayerName = args[0];
    const reason = args.slice(1).join(" ") || "Kicked by an administrator.";

    const foundPlayer = playerUtils.findPlayer(targetPlayerName); // Use playerUtils.findPlayer

    if (foundPlayer) {
        if (foundPlayer.id === player.id) {
            player.sendMessage("§cYou cannot kick yourself.");
            return;
        }

        // It's good practice to check permissions before attempting to kick
        const targetPermissionLevel = playerUtils.getPlayerPermissionLevel(foundPlayer);
        const issuerPermissionLevel = playerUtils.getPlayerPermissionLevel(player);

        if (targetPermissionLevel <= permissionLevels.admin && issuerPermissionLevel > permissionLevels.owner) {
            player.sendMessage("You do not have sufficient permission to kick this player.");
            return;
        }
         if (targetPermissionLevel <= permissionLevels.owner && issuerPermissionLevel > permissionLevels.owner) {
            player.sendMessage("Owners can only be kicked by other owners.");
            return;
        }
        if (targetPermissionLevel === permissionLevels.owner && issuerPermissionLevel === permissionLevels.owner && player.id !== foundPlayer.id) {
             player.sendMessage("One owner cannot kick another owner.");
            return;
        }

        try {
            const originalReason = reason;
            const kickMessageToTarget = `§cYou have been kicked from the server by ${player.nameTag}.\nReason: ${originalReason}\nIf you believe this was a mistake, contact staff. Your command prefix is ${config.prefix}`;
            foundPlayer.kick(kickMessageToTarget);

            player.sendMessage(`§aSuccessfully kicked ${foundPlayer.nameTag} for: ${originalReason}`);

            if (playerUtils.notifyAdmins) {
                const targetPData = playerDataManager.getPlayerData(foundPlayer.id); // playerDataManager from dependencies
                playerUtils.notifyAdmins(`§7[Admin] §e${foundPlayer.nameTag} §7was kicked by §e${player.nameTag}§7. Reason: §f${originalReason}`, player, targetPData);
            }
            if (logManager?.addLog) {
                logManager.addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'kick', targetName: foundPlayer.nameTag, reason: originalReason }, dependencies);
            }
        } catch (e) {
            player.sendMessage(`§cError kicking ${targetPlayerName}: ${e.message}`);
            // Standardized error logging
            console.error(`[KickCommand] Error kicking player ${targetPlayerName}: ${e.stack || e}`);
            logManager?.addLog?.({ actionType: 'error', details: `[KickCommand] Failed to kick ${targetPlayerName}: ${e.stack || e}` }, dependencies);
        }
    } else {
        player.sendMessage(`§cPlayer '${targetPlayerName}' not found or is not online.`);
    }
}
