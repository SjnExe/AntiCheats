/**
 * Command to list all currently online players being watched.
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
        playerUtils.sendMessage(player, `${header}${watchedPlayersNames.join(', ')}`);
    }

    dependencies.logManager.addLog({
        adminName: player.nameTag,
        actionType: 'command_listwatched',
        details: `Listed watched players. Count: ${watchedPlayersNames.length}`
    }, dependencies);
}
