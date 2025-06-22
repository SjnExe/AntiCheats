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
    const { config, playerUtils, logManager, playerDataManager, permissionLevels } = dependencies; // getString removed

    if (args.length < 1) {
        // Placeholder for 'command.kick.usage' -> "§cUsage: {prefix}kick <playername> [reason]"
        player.sendMessage(`§cUsage: ${config.prefix}kick <playername> [reason]`);
        return;
    }
    const targetPlayerName = args[0];
    // Placeholder for 'command.kick.defaultReason' -> "Kicked by an administrator."
    const reason = args.slice(1).join(" ") || "Kicked by an administrator.";

    const foundPlayer = playerUtils.findPlayer(targetPlayerName);

    if (foundPlayer) {
        if (foundPlayer.id === player.id) {
            // Placeholder for 'command.kick.self' -> "§cYou cannot kick yourself."
            player.sendMessage("§cYou cannot kick yourself.");
            return;
        }

        const targetPermissionLevel = playerUtils.getPlayerPermissionLevel(foundPlayer);
        const issuerPermissionLevel = playerUtils.getPlayerPermissionLevel(player);

        if (targetPermissionLevel <= permissionLevels.admin && issuerPermissionLevel > permissionLevels.owner) {
            // Adapting "command.ban.permissionInsufficient" -> "§cYou do not have permission to ban this player."
            player.sendMessage("§cYou do not have permission to kick this player.");
            return;
        }
         if (targetPermissionLevel <= permissionLevels.owner && issuerPermissionLevel > permissionLevels.owner) {
            // Adapting "command.ban.ownerByNonOwner" -> "§cOnly the server owner can ban another owner."
            player.sendMessage("§cOnly the server owner can kick another owner.");
            return;
        }
        if (targetPermissionLevel === permissionLevels.owner && issuerPermissionLevel === permissionLevels.owner && player.id !== foundPlayer.id) {
            // Adapting "command.ban.ownerByOwner" -> "§cServer owners cannot ban each other directly..."
             player.sendMessage("§cServer owners cannot kick each other directly.");
            return;
        }

        try {
            const originalReason = reason;
            // Placeholder for 'command.kick.targetNotification' -> "§cYou have been kicked by {adminName}. Reason: {reason}"
            const kickMessageToTarget = `§cYou have been kicked by ${player.nameTag}. Reason: ${originalReason}`;
            foundPlayer.kick(kickMessageToTarget);

            // Placeholder for 'command.kick.success' -> "§aKicked {targetName}. Reason: {reason}"
            player.sendMessage(`§aKicked ${foundPlayer.nameTag}. Reason: ${originalReason}`);

            if (playerUtils.notifyAdmins) {
                const targetPData = playerDataManager.getPlayerData(foundPlayer.id);
                // Placeholder for 'command.kick.adminNotification' -> "§7[Admin] §e{targetName} §7was kicked by §e{adminName}§7. Reason: §f{reason}"
                playerUtils.notifyAdmins(`§7[Admin] §e${foundPlayer.nameTag} §7was kicked by §e${player.nameTag}§7. Reason: §f${originalReason}`, player, targetPData);
            }
            if (logManager?.addLog) {
                logManager.addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'kick', targetName: foundPlayer.nameTag, reason: originalReason }, dependencies);
            }
        } catch (e) {
            // Placeholder for 'command.kick.error' -> "§cError kicking {targetName}: {error}"
            player.sendMessage(`§cError kicking ${targetPlayerName}: ${e.message}`);
            console.error(`[KickCommand] Error kicking player ${targetPlayerName}: ${e.stack || e}`);
            logManager?.addLog?.({ actionType: 'error', details: `[KickCommand] Failed to kick ${targetPlayerName}: ${e.stack || e}` }, dependencies);
        }
    } else {
        // Using "common.error.invalidPlayer" -> "Player \"{targetName}\" not found." (More generic than a specific kick.notFound)
        player.sendMessage(`Player "${targetPlayerName}" not found.`);
    }
}
