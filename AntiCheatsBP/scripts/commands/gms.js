/**
 * @file AntiCheatsBP/scripts/commands/gms.js
 * Defines the !gms command for administrators to set a player's gamemode to Survival.
 * @version 1.0.1
 */
import { permissionLevels } from '../core/rankManager.js';
import * as mc from '@minecraft/server';
import { getString } from '../core/i18n.js'; // Import getString

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: "gms",
    syntax: "!gms [playername]",
    description: getString("command.gms.description"),
    permissionLevel: permissionLevels.admin
};

/**
 * Executes the gms (gamemode survival) command.
 * @param {import('@minecraft/server').Player} player The player issuing the command.
 * @param {string[]} args The command arguments.
 * @param {import('../types.js').CommandDependencies} dependencies Command dependencies.
 */
export async function execute(player, args, dependencies) {
    const { playerUtils, config, addLog, findPlayer } = dependencies;
    const targetPlayerName = args[0];
    const gamemodeName = "Survival"; // For messaging

    if (targetPlayerName) {
        const targetPlayer = findPlayer(targetPlayerName, playerUtils);
        if (targetPlayer) {
            try {
                targetPlayer.setGameMode(mc.GameMode.survival);
                player.sendMessage(getString("command.gms.success.other", { targetPlayerName: targetPlayer.nameTag, gamemode: gamemodeName }));
                 if (player.id !== targetPlayer.id) {
                    targetPlayer.sendMessage(getString("command.gms.success.self", { gamemode: gamemodeName }));
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
            player.setGameMode(mc.GameMode.survival);
            player.sendMessage(getString("command.gms.success.self", { gamemode: gamemodeName }));
            if (addLog) addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'gamemode_change_self', targetName: player.nameTag, details: `Set to ${gamemodeName}` });
        } catch (e) {
            player.sendMessage(getString("command.error.gamemodeSettingFailed", { playerName: player.nameTag }));
            playerUtils.debugLog?.(`Error setting own gamemode: ${e}`, player.nameTag);
        }
    }
}
