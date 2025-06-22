/**
 * @file AntiCheatsBP/scripts/commands/listwatched.js
 * @description Command to list all currently online players being watched.
 * @version 1.0.1
 */
import * as mc from '@minecraft/server';
/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: "listwatched",
    syntax: "!listwatched",
    description: "command.listwatched.description",
    aliases: ["lw", "watchedlist"],
    permissionLevel: null,
    enabled: true,
};
/**
 * Executes the listwatched command.
 * @param {import('@minecraft/server').Player} player The player issuing the command.
 * @param {string[]} args The command arguments (unused).
 * @param {import('../types.js').CommandDependencies} dependencies Command dependencies.
 */
export async function execute(player, args, dependencies) {
    const { playerDataManager, playerUtils, permissionLevels, config } = dependencies;

    if (definition.permissionLevel === null) {
        definition.permissionLevel = permissionLevels.admin;
    }

    const onlinePlayers = mc.world.getAllPlayers();
    const watchedPlayersNames = [];

    for (const p of onlinePlayers) {
        const pData = playerDataManager.getPlayerData(p.id);
        if (pData && pData.isWatched) {
            watchedPlayersNames.push(p.nameTag);
        }
    }

    if (watchedPlayersNames.length === 0) {
        playerUtils.sendMessage(player, "No players are currently being watched.");
    } else {
        const header = "Currently watched players: ";
        if (playerUtils.sendMessage && typeof playerUtils.sendMessage === 'function') {
            playerUtils.sendMessage(player, `${header}${watchedPlayersNames.join(', ')}`);
        } else {
            player.sendMessage(`${header}${watchedPlayersNames.join(', ')}`);
        }
    }
    if (dependencies.logManager && dependencies.logManager.addLog) {
        dependencies.logManager.addLog({
            adminName: player.nameTag,
            actionType: 'command_listwatched',
            details: `Listed watched players. Count: ${watchedPlayersNames.length}`
        }, dependencies);
    }
}
