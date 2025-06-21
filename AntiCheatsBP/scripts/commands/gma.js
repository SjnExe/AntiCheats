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
    const { playerUtils, logManager, findPlayer, config, getString, permissionLevels } = dependencies;
    const targetPlayerName = args[0];
    const gamemodeName = "Adventure"; // For messaging

    // Update definition properties if needed (assuming commandManager handles this at load time if dynamic)
    // definition.description = getString("command.gma.description");
    // definition.permissionLevel = permissionLevels.admin;

    if (targetPlayerName) {
        const targetPlayer = findPlayer(targetPlayerName); // findPlayer is often part of playerUtils or global
        if (targetPlayer) {
            try {
                targetPlayer.setGameMode(mc.GameMode.adventure);
                player.sendMessage(getString("command.gma.success.other", { targetPlayerName: targetPlayer.nameTag, gamemode: gamemodeName }));
                if (player.id !== targetPlayer.id) {
                    targetPlayer.sendMessage(getString("command.gma.success.self", { gamemode: gamemodeName }));
                }
                logManager.addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'gamemode_change', targetName: targetPlayer.nameTag, details: `Set to ${gamemodeName}` }, dependencies);
            } catch (e) {
                player.sendMessage(getString("command.error.gamemodeSettingFailed", { playerName: targetPlayer.nameTag }));
                playerUtils.debugLog(`[GMACommand] Error setting gamemode for ${targetPlayer.nameTag}: ${e.message}`, player.nameTag, dependencies);
                console.error(`[GMACommand] Error setting gamemode for ${targetPlayer.nameTag}: ${e.stack || e}`);
            }
        } else {
            player.sendMessage(getString("common.error.playerNotFoundOnline", { playerName: targetPlayerName }));
        }
    } else {
        try {
            player.setGameMode(mc.GameMode.adventure);
            player.sendMessage(getString("command.gma.success.self", { gamemode: gamemodeName }));
            logManager.addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'gamemode_change_self', targetName: player.nameTag, details: `Set to ${gamemodeName}` }, dependencies);
        } catch (e) {
            player.sendMessage(getString("command.error.gamemodeSettingFailed", { playerName: player.nameTag }));
            playerUtils.debugLog(`[GMACommand] Error setting own gamemode: ${e.message}`, player.nameTag, dependencies);
            console.error(`[GMACommand] Error setting own gamemode: ${e.stack || e}`);
        }
    }
}
