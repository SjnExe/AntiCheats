/**
 * Defines the !kick command for administrators to remove a player from the server.
 */
import { permissionLevels } from '../core/rankManager.js';
/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: "kick",
    syntax: "!kick <playername> [reason]",
    description: "Kicks a player from the server.",
    permissionLevel: permissionLevels.admin,
    enabled: true,
};
/**
 * Executes the kick command.
 * @param {import('@minecraft/server').Player} player The player issuing the command.
 * @param {string[]} args The command arguments.
 * @param {import('../types.js').CommandDependencies} dependencies Command dependencies.
 */
export async function execute(player, args, dependencies) {
    const { config, playerUtils, logManager, playerDataManager, permissionLevels: depPermLevels } = dependencies;

    if (args.length < 1) {
        player.sendMessage(`§cUsage: ${config.prefix}kick <playername> [reason]`);
        return;
    }
    const targetPlayerName = args[0];
    const reason = args.slice(1).join(" ") || "Kicked by an administrator.";

    const foundPlayer = playerUtils.findPlayer(targetPlayerName);

    if (foundPlayer) {
        if (foundPlayer.id === player.id) {
            player.sendMessage("§cYou cannot kick yourself.");
            return;
        }

        const targetPermissionLevel = playerUtils.getPlayerPermissionLevel(foundPlayer);
        const issuerPermissionLevel = playerUtils.getPlayerPermissionLevel(player);

        if (targetPermissionLevel <= depPermLevels.admin && issuerPermissionLevel > depPermLevels.owner) {
            player.sendMessage("§cYou do not have permission to kick this player.");
            return;
        }
        if (targetPermissionLevel <= depPermLevels.owner && issuerPermissionLevel > depPermLevels.owner) {
            player.sendMessage("§cOnly the server owner can kick another owner.");
            return;
        }
        if (targetPermissionLevel === depPermLevels.owner && issuerPermissionLevel === depPermLevels.owner && player.id !== foundPlayer.id) {
            player.sendMessage("§cServer owners cannot kick each other directly.");
            return;
        }

        try {
            const originalReason = reason;
            const kickMessageToTarget = `§cYou have been kicked by ${player.nameTag}. Reason: ${originalReason}`;
            foundPlayer.kick(kickMessageToTarget);

            player.sendMessage(`§aKicked ${foundPlayer.nameTag}. Reason: ${originalReason}`);

            if (playerUtils.notifyAdmins) {
                const targetPData = playerDataManager.getPlayerData(foundPlayer.id);
                playerUtils.notifyAdmins(`§7[Admin] §e${foundPlayer.nameTag} §7was kicked by §e${player.nameTag}§7. Reason: §f${originalReason}`, player, targetPData);
            }
            if (logManager?.addLog) {
                logManager.addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'kick', targetName: foundPlayer.nameTag, reason: originalReason }, dependencies);
            }
        } catch (e) {
            player.sendMessage(`§cError kicking ${targetPlayerName}: ${e.message}`);
            console.error(`[KickCommand] Error kicking player ${targetPlayerName}: ${e.stack || e}`);
            logManager?.addLog?.({ actionType: 'error', details: `[KickCommand] Failed to kick ${targetPlayerName}: ${e.stack || e}` }, dependencies);
        }
    } else {
        player.sendMessage(`Player "${targetPlayerName}" not found.`);
    }
}
