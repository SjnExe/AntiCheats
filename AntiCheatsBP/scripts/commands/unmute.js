// AntiCheatsBP/scripts/commands/unmute.js
import { permissionLevels } from '../core/rankManager.js';

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: "unmute",
    syntax: "!unmute <playername>",
    description: "Unmutes a player.",
    permissionLevel: permissionLevels.admin
};

/**
 * Executes the unmute command.
 * @param {import('@minecraft/server').Player} player The player issuing the command.
 * @param {string[]} args The command arguments.
 * @param {import('../types.js').CommandDependencies} dependencies Command dependencies.
 */
export async function execute(player, args, dependencies) {
    const { config, playerUtils, playerDataManager, addLog, findPlayer } = dependencies;

    if (args.length < 1) {
        player.sendMessage(`§cUsage: ${config.prefix}unmute <playername>`);
        return;
    }
    const targetPlayerName = args[0];
    const foundPlayer = findPlayer(targetPlayerName, playerUtils);

    if (!foundPlayer) {
        player.sendMessage(`§cPlayer "${targetPlayerName}" not found.`);
        return;
    }

    try {
        // Assuming isMuted and removeMute are now on playerDataManager
        if (!playerDataManager.isMuted(foundPlayer)) {
            player.sendMessage(`§7Player ${foundPlayer.nameTag} is not currently muted.`);
            return;
        }
        const unmuted = playerDataManager.removeMute(foundPlayer);
        if (unmuted) {
            try {
                foundPlayer.onScreenDisplay.setActionBar("§aYou have been unmuted.");
            } catch (e) {
                if (playerUtils.debugLog) playerUtils.debugLog(`Failed to set action bar for unmuted player ${foundPlayer.nameTag}: ${e}`, player.nameTag);
            }
            player.sendMessage(`§aPlayer ${foundPlayer.nameTag} has been unmuted.`);
            if (playerUtils.notifyAdmins) {
                playerUtils.notifyAdmins(`Player ${foundPlayer.nameTag} was unmuted by ${player.nameTag}.`, player, null);
            }
            if (addLog) {
                addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'unmute', targetName: foundPlayer.nameTag });
            }
        } else {
            player.sendMessage(`§cFailed to unmute player ${foundPlayer.nameTag}. They might not have been muted or an error occurred.`);
        }
    } catch (e) {
        player.sendMessage(`§cAn unexpected error occurred while trying to unmute ${foundPlayer.nameTag}: ${e}`);
        if (playerUtils.debugLog) playerUtils.debugLog(`Unexpected error during unmute command for ${foundPlayer.nameTag} by ${player.nameTag}: ${e}`, player.nameTag);
    }
}
