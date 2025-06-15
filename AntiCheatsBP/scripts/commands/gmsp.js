/**
 * @file AntiCheatsBP/scripts/commands/gmsp.js
 * Defines the !gmsp command for administrators to set a player's gamemode to Spectator.
 * @version 1.0.2
 */
import { permissionLevels } from '../core/rankManager.js';
import * as mc from '@minecraft/server';
import { getString } from '../core/i18n.js'; // Import getString

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: "gmsp",
    syntax: "!gmsp [playername]",
    description: getString("command.gmsp.description"),
    permissionLevel: permissionLevels.admin,
    enabled: true,
};

/**
 * Executes the gmsp (gamemode spectator) command.
 * @param {import('@minecraft/server').Player} player The player issuing the command.
 * @param {string[]} args The command arguments.
 * @param {import('../types.js').CommandDependencies} dependencies Command dependencies.
 */
export async function execute(player, args, dependencies) {
    const { playerUtils, addLog, findPlayer, config: runtimeConfig } = dependencies; // Use runtimeConfig for enableDebugLogging
    const targetPlayerName = args[0];
    const gamemodeName = "Spectator"; // For messaging

    if (targetPlayerName) {
        const targetPlayer = findPlayer(targetPlayerName, playerUtils);
        if (targetPlayer) {
            try {
                targetPlayer.setGameMode(mc.GameMode.spectator);
                player.sendMessage(getString("command.gmsp.success.other", { targetPlayerName: targetPlayer.nameTag, gamemode: gamemodeName }));
                if (player.id !== targetPlayer.id) {
                    targetPlayer.sendMessage(getString("command.gmsp.success.self", { gamemode: gamemodeName }));
                }
                if (addLog) addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'gamemode_change', targetName: targetPlayer.nameTag, details: `Set to ${gamemodeName}` });
            } catch (e) {
                player.sendMessage(getString("command.error.gamemodeSettingFailed", { playerName: targetPlayer.nameTag }));
                if (runtimeConfig.enableDebugLogging) {
                    playerUtils.debugLog?.(`Error setting gamemode for ${targetPlayer.nameTag}: ${e}`, player.nameTag);
                }
            }
        } else {
            player.sendMessage(getString("common.error.playerNotFoundOnline", { playerName: targetPlayerName }));
        }
    } else {
        try {
            player.setGameMode(mc.GameMode.spectator);
            player.sendMessage(getString("command.gmsp.success.self", { gamemode: gamemodeName }));
            if (addLog) addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'gamemode_change_self', targetName: player.nameTag, details: `Set to ${gamemodeName}` });
        } catch (e) {
            player.sendMessage(getString("command.error.gamemodeSettingFailed", { playerName: player.nameTag }));
            if (runtimeConfig.enableDebugLogging) {
                playerUtils.debugLog?.(`Error setting own gamemode: ${e}`, player.nameTag);
            }
        }
    }
}
