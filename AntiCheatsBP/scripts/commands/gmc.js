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
    const { playerUtils, logManager, config, getString, permissionLevels } = dependencies; // Removed findPlayer from direct destructuring
    const targetPlayerName = args[0];
    const gamemodeName = "Creative"; // For messaging

    if (targetPlayerName) {
        const targetPlayer = playerUtils.findPlayer(targetPlayerName); // Use playerUtils.findPlayer
        if (targetPlayer) {
            try {
                targetPlayer.setGameMode(mc.GameMode.creative);
                player.sendMessage(getString("command.gmc.success.other", { targetPlayerName: targetPlayer.nameTag, gamemode: gamemodeName }));
                if (player.id !== targetPlayer.id) {
                    targetPlayer.sendMessage(getString("command.gmc.success.self", { gamemode: gamemodeName }));
                }
                logManager.addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'gamemode_change', targetName: targetPlayer.nameTag, details: `Set to ${gamemodeName}` }, dependencies);
            } catch (e) {
                player.sendMessage(getString("command.error.gamemodeSettingFailed", { playerName: targetPlayer.nameTag }));
                playerUtils.debugLog(dependencies, `[GMCCommand] Error setting gamemode for ${targetPlayer.nameTag}: ${e.message}`, player.nameTag);
                console.error(`[GMCCommand] Error setting gamemode for ${targetPlayer.nameTag}: ${e.stack || e}`);
            }
        } else {
            player.sendMessage(getString("common.error.playerNotFoundOnline", { playerName: targetPlayerName }));
        }
    } else {
        try {
            player.setGameMode(mc.GameMode.creative);
            player.sendMessage(getString("command.gmc.success.self", { gamemode: gamemodeName }));
            logManager.addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'gamemode_change_self', targetName: player.nameTag, details: `Set to ${gamemodeName}` }, dependencies);
        } catch (e) {
            player.sendMessage(getString("command.error.gamemodeSettingFailed", { playerName: player.nameTag }));
            playerUtils.debugLog(dependencies, `[GMCCommand] Error setting own gamemode: ${e.message}`, player.nameTag);
            console.error(`[GMCCommand] Error setting own gamemode: ${e.stack || e}`);
        }
    }
}
