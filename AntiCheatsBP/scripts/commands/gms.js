/**
 * @file AntiCheatsBP/scripts/commands/gms.js
 * Defines the !gms command for administrators to set a player's gamemode to Survival.
 * @version 1.0.3
 */
// permissionLevels and getString are now accessed via dependencies
import * as mc from '@minecraft/server';

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: "gms",
    syntax: "!gms [playername]",
    description: "Sets a player's gamemode to Survival.", // Static fallback
    permissionLevel: 1, // Static fallback (Admin)
    enabled: true,
};

/**
 * Executes the gms (gamemode survival) command.
 * @param {import('@minecraft/server').Player} player The player issuing the command.
 * @param {string[]} args The command arguments.
 * @param {import('../types.js').CommandDependencies} dependencies Command dependencies.
 */
export async function execute(player, args, dependencies) {
    const { playerUtils, logManager, findPlayer, config, getString, permissionLevels } = dependencies;
    const targetPlayerName = args[0];
    const gamemodeName = "Survival"; // For messaging

    if (targetPlayerName) {
        const targetPlayer = findPlayer(targetPlayerName);
        if (targetPlayer) {
            try {
                targetPlayer.setGameMode(mc.GameMode.survival);
                player.sendMessage(getString("command.gms.success.other", { targetPlayerName: targetPlayer.nameTag, gamemode: gamemodeName }));
                if (player.id !== targetPlayer.id) {
                    targetPlayer.sendMessage(getString("command.gms.success.self", { gamemode: gamemodeName }));
                }
                logManager.addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'gamemode_change', targetName: targetPlayer.nameTag, details: `Set to ${gamemodeName}` }, dependencies);
            } catch (e) {
                player.sendMessage(getString("command.error.gamemodeSettingFailed", { playerName: targetPlayer.nameTag }));
                playerUtils.debugLog(`[GMSCommand] Error setting gamemode for ${targetPlayer.nameTag}: ${e.message}`, player.nameTag, dependencies);
                console.error(`[GMSCommand] Error setting gamemode for ${targetPlayer.nameTag}: ${e.stack || e}`);
            }
        } else {
            player.sendMessage(getString("common.error.playerNotFoundOnline", { playerName: targetPlayerName }));
        }
    } else {
        try {
            player.setGameMode(mc.GameMode.survival);
            player.sendMessage(getString("command.gms.success.self", { gamemode: gamemodeName }));
            logManager.addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'gamemode_change_self', targetName: player.nameTag, details: `Set to ${gamemodeName}` }, dependencies);
        } catch (e) {
            player.sendMessage(getString("command.error.gamemodeSettingFailed", { playerName: player.nameTag }));
            playerUtils.debugLog(`[GMSCommand] Error setting own gamemode: ${e.message}`, player.nameTag, dependencies);
            console.error(`[GMSCommand] Error setting own gamemode: ${e.stack || e}`);
        }
    }
}
