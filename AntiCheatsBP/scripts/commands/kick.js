// AntiCheatsBP/scripts/commands/kick.js
import { permissionLevels } from '../core/rankManager.js';
import * as mc from '@minecraft/server'; // For world.getAllPlayers() if not using dependencies.findPlayer

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: "kick",
    syntax: "!kick <playername> [reason]",
    description: "Kicks a player from the server.",
    permissionLevel: permissionLevels.admin
};

/**
 * Executes the kick command.
 * @param {import('@minecraft/server').Player} player The player issuing the command.
 * @param {string[]} args The command arguments.
 * @param {import('../types.js').CommandDependencies} dependencies Command dependencies.
 */
export async function execute(player, args, dependencies) {
    const { config, playerUtils, addLog, findPlayer } = dependencies; // findPlayer from dependencies

    if (args.length < 1) {
        player.sendMessage(`§cUsage: ${config.prefix}kick <playername> [reason]`);
        return;
    }
    const targetPlayerName = args[0];
    const reason = args.slice(1).join(" ") || "Kicked by an administrator.";

    const foundPlayer = findPlayer(targetPlayerName, playerUtils); // Use findPlayer from dependencies

    if (foundPlayer) {
        if (foundPlayer.id === player.id) {
            player.sendMessage("§cYou cannot kick yourself.");
            return;
        }
        try {
            foundPlayer.kick(reason);
            player.sendMessage(`§aPlayer ${foundPlayer.nameTag} has been kicked. Reason: ${reason}`);
            if (playerUtils.notifyAdmins) {
                playerUtils.notifyAdmins(`Player ${foundPlayer.nameTag} was kicked by ${player.nameTag}. Reason: ${reason}`, player, null);
            }
            if (addLog) {
                addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'kick', targetName: foundPlayer.nameTag, reason: reason });
            }
        } catch (e) {
            player.sendMessage(`§cError kicking player ${targetPlayerName}: ${e}`);
            if (playerUtils.debugLog) {
                playerUtils.debugLog(`Error kicking player ${targetPlayerName}: ${e}`);
            }
        }
    } else {
        player.sendMessage(`§cPlayer "${targetPlayerName}" not found.`);
    }
}
