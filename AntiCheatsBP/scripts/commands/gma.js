/**
 * @file AntiCheatsBP/scripts/commands/gma.js
 * Defines the !gma command for administrators to set a player's gamemode to Adventure.
 * @version 1.0.3
 */
// permissionLevels and getString are now accessed via dependencies
import * as mc from '@minecraft/server';

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: "gma",
    syntax: "!gma [playername]",
    description: "Sets a player's gamemode to Adventure.", // Static fallback, or to be set by commandManager
    permissionLevel: 1, // Static fallback (Admin), or to be set by commandManager
    enabled: true,
};

/**
 * Executes the gma (gamemode adventure) command.
 * @param {import('@minecraft/server').Player} player The player issuing the command.
 * @param {string[]} args The command arguments.
 * @param {import('../types.js').CommandDependencies} dependencies Command dependencies.
 */
export async function execute(player, args, dependencies) {
    const { playerUtils, logManager, findPlayer, config, permissionLevels } = dependencies; // getString removed
    const targetPlayerName = args[0];
    const gamemodeName = "Adventure"; // For messaging

    // Static definitions are used

    if (targetPlayerName) {
        const targetPlayer = findPlayer(targetPlayerName);
        if (targetPlayer) {
            try {
                targetPlayer.setGameMode(mc.GameMode.adventure);
                // Placeholder for "command.gma.success.other"
                player.sendMessage(`§aSet ${targetPlayer.nameTag}'s gamemode to ${gamemodeName}.`);
                if (player.id !== targetPlayer.id) {
                    // Placeholder for "command.gma.success.self" (contextually for other player)
                    targetPlayer.sendMessage(`§aYour gamemode has been set to ${gamemodeName}.`);
                }
                logManager.addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'gamemode_change', targetName: targetPlayer.nameTag, details: `Set to ${gamemodeName}` }, dependencies);
            } catch (e) {
                // "command.error.gamemodeSettingFailed" -> "§cError setting game mode for {playerName}."
                player.sendMessage(`§cError setting game mode for ${targetPlayer.nameTag}.`);
                playerUtils.debugLog(`[GMACommand] Error setting gamemode for ${targetPlayer.nameTag}: ${e.message}`, player.nameTag, dependencies);
                console.error(`[GMACommand] Error setting gamemode for ${targetPlayer.nameTag}: ${e.stack || e}`);
            }
        } else {
            // "common.error.playerNotFoundOnline" -> "§cPlayer '{playerName}' not found or is not online."
            player.sendMessage(`§cPlayer '${targetPlayerName}' not found or is not online.`);
        }
    } else {
        try {
            player.setGameMode(mc.GameMode.adventure);
            // Placeholder for "command.gma.success.self"
            player.sendMessage(`§aYour gamemode has been set to ${gamemodeName}.`);
            logManager.addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'gamemode_change_self', targetName: player.nameTag, details: `Set to ${gamemodeName}` }, dependencies);
        } catch (e) {
            // "command.error.gamemodeSettingFailed" -> "§cError setting game mode for {playerName}."
            player.sendMessage(`§cError setting game mode for ${player.nameTag}.`);
            playerUtils.debugLog(`[GMACommand] Error setting own gamemode: ${e.message}`, player.nameTag, dependencies);
            console.error(`[GMACommand] Error setting own gamemode: ${e.stack || e}`);
        }
    }
}
