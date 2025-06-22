/**
 * @file AntiCheatsBP/scripts/commands/gmc.js
 * Defines the !gmc command for administrators to set a player's gamemode to Creative.
 * @version 1.0.3
 */
// permissionLevels and getString are now accessed via dependencies
import * as mc from '@minecraft/server';

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: "gmc",
    syntax: "!gmc [playername]",
    description: "Sets a player's gamemode to Creative.", // Static fallback
    permissionLevel: 1, // Static fallback (Admin)
    enabled: true,
};

/**
 * Executes the gmc (gamemode creative) command.
 * @param {import('@minecraft/server').Player} player The player issuing the command.
 * @param {string[]} args The command arguments.
 * @param {import('../types.js').CommandDependencies} dependencies Command dependencies.
 * @returns {Promise<void>}
 */
export async function execute(player, args, dependencies) {
    const { playerUtils, logManager, config, permissionLevels } = dependencies; // getString and findPlayer removed
    const targetPlayerName = args[0];
    const gamemodeName = "Creative"; // For messaging

    if (targetPlayerName) {
        const targetPlayer = playerUtils.findPlayer(targetPlayerName);
        if (targetPlayer) {
            try {
                targetPlayer.setGameMode(mc.GameMode.creative);
                // Placeholder for "command.gmc.success.other"
                player.sendMessage(`§aSet ${targetPlayer.nameTag}'s gamemode to ${gamemodeName}.`);
                if (player.id !== targetPlayer.id) {
                    // Placeholder for "command.gmc.success.self" (contextually for other player)
                    targetPlayer.sendMessage(`§aYour gamemode has been set to ${gamemodeName}.`);
                }
                logManager.addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'gamemode_change', targetName: targetPlayer.nameTag, details: `Set to ${gamemodeName}` }, dependencies);
            } catch (e) {
                // "command.error.gamemodeSettingFailed" -> "§cError setting game mode for {playerName}."
                player.sendMessage(`§cError setting game mode for ${targetPlayer.nameTag}.`);
                playerUtils.debugLog(`[GMCCommand] Error setting gamemode for ${targetPlayer.nameTag}: ${e.message}`, player.nameTag, dependencies);
                console.error(`[GMCCommand] Error setting gamemode for ${targetPlayer.nameTag}: ${e.stack || e}`);
            }
        } else {
            // "common.error.playerNotFoundOnline" -> "§cPlayer '{playerName}' not found or is not online."
            player.sendMessage(`§cPlayer '${targetPlayerName}' not found or is not online.`);
        }
    } else {
        try {
            player.setGameMode(mc.GameMode.creative);
            // Placeholder for "command.gmc.success.self"
            player.sendMessage(`§aYour gamemode has been set to ${gamemodeName}.`);
            logManager.addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'gamemode_change_self', targetName: player.nameTag, details: `Set to ${gamemodeName}` }, dependencies);
        } catch (e) {
            // "command.error.gamemodeSettingFailed" -> "§cError setting game mode for {playerName}."
            player.sendMessage(`§cError setting game mode for ${player.nameTag}.`);
            playerUtils.debugLog(`[GMCCommand] Error setting own gamemode: ${e.message}`, player.nameTag, dependencies);
            console.error(`[GMCCommand] Error setting own gamemode: ${e.stack || e}`);
        }
    }
}
