/**
 * Defines the !gmsp command for administrators to set a player's gamemode to Spectator.
 */
import * as mc from '@minecraft/server';
/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: "gmsp",
    syntax: "!gmsp [playername]",
    description: "Sets a player's gamemode to Spectator.",
    permissionLevel: 1,
    enabled: true,
};
/**
 * Executes the gmsp (gamemode spectator) command.
 */
export async function execute(player, args, dependencies) {
    const { playerUtils, logManager, findPlayer, config, permissionLevels } = dependencies;
    const targetPlayerName = args[0];
    const gamemodeName = "Spectator";

    if (targetPlayerName) {
        const targetPlayer = findPlayer(targetPlayerName);
        if (targetPlayer) {
            try {
                targetPlayer.setGameMode(mc.GameMode.spectator);
                player.sendMessage(`§aSet ${targetPlayer.nameTag}'s gamemode to ${gamemodeName}.`);
                if (player.id !== targetPlayer.id) {
                    targetPlayer.sendMessage(`§aYour gamemode has been set to ${gamemodeName}.`);
                }
                logManager.addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'gamemode_change', targetName: targetPlayer.nameTag, details: `Set to ${gamemodeName}` }, dependencies);
            } catch (e) {
                player.sendMessage(`§cError setting game mode for ${targetPlayer.nameTag}.`);
                playerUtils.debugLog(`[GMSPCommand] Error setting gamemode for ${targetPlayer.nameTag}: ${e.message}`, player.nameTag, dependencies);
                console.error(`[GMSPCommand] Error setting gamemode for ${targetPlayer.nameTag}: ${e.stack || e}`);
            }
        } else {
            player.sendMessage(`§cPlayer '${targetPlayerName}' not found or is not online.`);
        }
    } else {
        try {
            player.setGameMode(mc.GameMode.spectator);
            player.sendMessage(`§aYour gamemode has been set to ${gamemodeName}.`);
            logManager.addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'gamemode_change_self', targetName: player.nameTag, details: `Set to ${gamemodeName}` }, dependencies);
        } catch (e) {
            player.sendMessage(`§cError setting game mode for ${player.nameTag}.`);
            playerUtils.debugLog(`[GMSPCommand] Error setting own gamemode: ${e.message}`, player.nameTag, dependencies);
            console.error(`[GMSPCommand] Error setting own gamemode: ${e.stack || e}`);
        }
    }
}
