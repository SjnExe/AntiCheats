/**
 * Defines the !gmc command for administrators to set a player's gamemode to Creative.
 */
import * as mc from '@minecraft/server';
import { permissionLevels as importedPermissionLevels } from '../core/rankManager.js'; // Import permissionLevels
/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: "gmc",
    syntax: "!gmc [playername]",
    description: "Sets a player's gamemode to Creative.",
    permissionLevel: importedPermissionLevels.admin, // Use imported enum
    enabled: true,
};
/**
 * Executes the gmc (gamemode creative) command.
 */
export async function execute(player, args, dependencies) {
    const { playerUtils, logManager, config, permissionLevels } = dependencies;
    const targetPlayerName = args[0];
    const gamemodeName = "Creative";

    if (targetPlayerName) {
        const targetPlayer = playerUtils.findPlayer(targetPlayerName);
        if (targetPlayer) {
            try {
                targetPlayer.setGameMode(mc.GameMode.creative);
                player.sendMessage(`§aSet ${targetPlayer.nameTag}'s gamemode to ${gamemodeName}.`);
                if (player.id !== targetPlayer.id) {
                    targetPlayer.sendMessage(`§aYour gamemode has been set to ${gamemodeName}.`);
                }
                logManager.addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'gamemode_change', targetName: targetPlayer.nameTag, details: `Set to ${gamemodeName}` }, dependencies);
            } catch (e) {
                player.sendMessage(`§cError setting game mode for ${targetPlayer.nameTag}.`);
                playerUtils.debugLog(`[GMCCommand] Error setting gamemode for ${targetPlayer.nameTag}: ${e.message}`, player.nameTag, dependencies);
                console.error(`[GMCCommand] Error setting gamemode for ${targetPlayer.nameTag}: ${e.stack || e}`);
            }
        } else {
            player.sendMessage(`§cPlayer '${targetPlayerName}' not found or is not online.`);
        }
    } else {
        try {
            player.setGameMode(mc.GameMode.creative);
            player.sendMessage(`§aYour gamemode has been set to ${gamemodeName}.`);
            logManager.addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'gamemode_change_self', targetName: player.nameTag, details: `Set to ${gamemodeName}` }, dependencies);
        } catch (e) {
            player.sendMessage(`§cError setting game mode for ${player.nameTag}.`);
            playerUtils.debugLog(`[GMCCommand] Error setting own gamemode: ${e.message}`, player.nameTag, dependencies);
            console.error(`[GMCCommand] Error setting own gamemode: ${e.stack || e}`);
        }
    }
}
