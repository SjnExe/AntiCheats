/**
 * @file AntiCheatsBP/scripts/commands/gma.js
 * Defines the !gma command for administrators to set a player's gamemode to Adventure.
 * @version 1.0.1
 */
import { permissionLevels } from '../core/rankManager.js';
import * as mc from '@minecraft/server';
import { getString } from '../../core/localizationManager.js'; // Import getString

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: "gma",
    syntax: "!gma [playername]",
    description: getString("command.gma.description"),
    permissionLevel: permissionLevels.admin
};

/**
 * Executes the gma (gamemode adventure) command.
 * @param {import('@minecraft/server').Player} player The player issuing the command.
 * @param {string[]} args The command arguments.
 * @param {import('../types.js').CommandDependencies} dependencies Command dependencies.
 */
export async function execute(player, args, dependencies) {
    const { playerUtils, config, addLog, findPlayer } = dependencies;
    const targetPlayerName = args[0];
    const gamemodeName = "Adventure"; // For messaging

    if (targetPlayerName) {
        const targetPlayer = findPlayer(targetPlayerName, playerUtils);
        if (targetPlayer) {
            try {
                targetPlayer.setGameMode(mc.GameMode.adventure);
                player.sendMessage(getString("command.gma.success.other", { targetPlayerName: targetPlayer.nameTag, gamemode: gamemodeName }));
                if (player.id !== targetPlayer.id) {
                    targetPlayer.sendMessage(getString("command.gma.success.self", { gamemode: gamemodeName })); // Notify target as well
                }
                if (addLog) addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'gamemode_change', targetName: targetPlayer.nameTag, details: `Set to ${gamemodeName}` });
            } catch (e) {
                player.sendMessage(getString("command.error.gamemodeSettingFailed", { playerName: targetPlayer.nameTag }));
                playerUtils.debugLog?.(`Error setting gamemode for ${targetPlayer.nameTag}: ${e}`, player.nameTag);
            }
        } else {
            player.sendMessage(getString("common.error.playerNotFoundOnline", { playerName: targetPlayerName }));
        }
    } else {
        try {
            player.setGameMode(mc.GameMode.adventure);
            player.sendMessage(getString("command.gma.success.self", { gamemode: gamemodeName }));
            if (addLog) addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'gamemode_change_self', targetName: player.nameTag, details: `Set to ${gamemodeName}` });
        } catch (e) {
            player.sendMessage(getString("command.error.gamemodeSettingFailed", { playerName: player.nameTag }));
            playerUtils.debugLog?.(`Error setting own gamemode: ${e}`, player.nameTag);
        }
    }
}
