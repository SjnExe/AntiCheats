// AntiCheatsBP/scripts/commands/mute.js
import { permissionLevels } from '../core/rankManager.js';

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: "mute",
    syntax: "!mute <playername> [duration] [reason]",
    description: "Mutes a player for a specified duration (e.g., 5m, 1h, 1d, perm).",
    permissionLevel: permissionLevels.admin
};

/**
 * Executes the mute command.
 * @param {import('@minecraft/server').Player} player The player issuing the command.
 * @param {string[]} args The command arguments.
 * @param {import('../types.js').CommandDependencies} dependencies Command dependencies.
 */
export async function execute(player, args, dependencies) {
    const { config, playerUtils, playerDataManager, addLog, findPlayer, parseDuration } = dependencies;

    if (args.length < 1) {
        player.sendMessage(`§cUsage: ${config.prefix}mute <playername> [duration] [reason]`);
        return;
    }
    const targetPlayerName = args[0];
    const durationString = args[1] || "1h"; // Default duration if not specified
    const reason = args.slice(2).join(" ") || "Muted by an administrator.";

    const foundPlayer = findPlayer(targetPlayerName, playerUtils);

    if (!foundPlayer) {
        player.sendMessage(`§cPlayer "${targetPlayerName}" not found.`);
        return;
    }

    if (foundPlayer.id === player.id) {
        player.sendMessage("§cYou cannot mute yourself.");
        return;
    }

    const durationMs = parseDuration(durationString);
    if (durationMs === null || (durationMs <= 0 && durationMs !== Infinity)) {
        player.sendMessage("§cInvalid duration format. Use formats like 5m, 2h, 1d, or perm. Default is 1h if unspecified.");
        return;
    }

    try {
        // Assuming addMute is now on playerDataManager and handles persistence
        const muteAdded = playerDataManager.addMute(foundPlayer, durationMs, reason);
        if (muteAdded) {
            const durationText = durationMs === Infinity ? "permanently (this session/until unmuted)" : `for ${durationString}`;
            try {
                foundPlayer.onScreenDisplay.setActionBar(`§cYou have been muted ${durationText}. Reason: ${reason}`);
            } catch (e) {
                if (playerUtils.debugLog) playerUtils.debugLog(`Failed to set action bar for muted player ${foundPlayer.nameTag}: ${e}`, player.nameTag);
            }
            player.sendMessage(`§aPlayer ${foundPlayer.nameTag} has been muted ${durationText}. Reason: ${reason}`);
            if (playerUtils.notifyAdmins) {
                playerUtils.notifyAdmins(`Player ${foundPlayer.nameTag} was muted ${durationText} by ${player.nameTag}. Reason: ${reason}`, player, null);
            }
            if (addLog) {
                addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'mute', targetName: foundPlayer.nameTag, duration: durationString, reason: reason });
            }
        } else {
            player.sendMessage(`§cFailed to apply mute for ${foundPlayer.nameTag}. They might already be muted with a longer or permanent duration, or an error occurred.`);
        }
    } catch (e) {
        player.sendMessage(`§cAn unexpected error occurred while trying to mute ${foundPlayer.nameTag}: ${e}`);
        if (playerUtils.debugLog) playerUtils.debugLog(`Unexpected error during mute command for ${foundPlayer.nameTag} by ${player.nameTag}: ${e}`, player.nameTag);
    }
}
