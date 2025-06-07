/**
 * @file AntiCheatsBP/scripts/commands/unban.js
 * Defines the !unban command for administrators to remove a ban from a player.
 * Note: Current version primarily supports unbanning players who are online.
 * @version 1.0.0
 */
// AntiCheatsBP/scripts/commands/unban.js
import { permissionLevels } from '../core/rankManager.js';

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: "unban",
    syntax: "!unban <playername>",
    description: "Unbans a player. Note: Player must be online for this version.",
    permissionLevel: permissionLevels.admin
};

/**
 * Executes the unban command.
 * @param {import('@minecraft/server').Player} player The player issuing the command.
 * @param {string[]} args The command arguments.
 * @param {import('../types.js').CommandDependencies} dependencies Command dependencies.
 */
export async function execute(player, args, dependencies) {
    const { config, playerUtils, playerDataManager, addLog, findPlayer } = dependencies;

    if (args.length < 1) {
        player.sendMessage(`§cUsage: ${config.prefix}unban <playername>`);
        return;
    }
    const targetPlayerName = args[0];

    // Current implementation typically requires player to be online to modify their dynamic properties easily
    // For a full offline ban system, player data might need to be stored differently (e.g., world dynamic property with all banned players)
    const foundPlayer = findPlayer(targetPlayerName, playerUtils);

    if (!foundPlayer) {
        player.sendMessage(`§cPlayer "${targetPlayerName}" not found online. Offline unbanning requires different data handling not yet implemented in this command version.`);
        if (playerUtils.debugLog) playerUtils.debugLog(`Unban attempt for offline player ${targetPlayerName} by ${player.nameTag}. This version primarily handles online players.`, player.nameTag);
        return;
    }

    try {
        // Assuming isBanned and removeBan are now on playerDataManager
        if (!playerDataManager.isBanned(foundPlayer)) {
            player.sendMessage(`§7Player ${foundPlayer.nameTag} is not currently banned or their ban data is not accessible.`);
            return;
        }
        const unbanned = playerDataManager.removeBan(foundPlayer);
        if (unbanned) {
            player.sendMessage(`§aPlayer ${foundPlayer.nameTag} has been unbanned. They can rejoin if they were kicked.`);
            if (playerUtils.notifyAdmins) {
                playerUtils.notifyAdmins(`Player ${foundPlayer.nameTag} was unbanned by ${player.nameTag}.`, player, null);
            }
            if (addLog) {
                addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'unban', targetName: foundPlayer.nameTag });
            }
        } else {
            player.sendMessage(`§cFailed to unban player ${foundPlayer.nameTag}. Their ban data might not be accessible or an error occurred.`);
        }
    } catch (e) {
        player.sendMessage(`§cAn unexpected error occurred while trying to unban ${foundPlayer.nameTag}: ${e}`);
        if (playerUtils.debugLog) playerUtils.debugLog(`Unexpected error during unban command for ${foundPlayer.nameTag} by ${player.nameTag}: ${e}`, player.nameTag);
    }
}
