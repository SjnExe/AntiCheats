/**
 * @file Command to list all currently online players being watched by the AntiCheat system.
 */
import * as mc from '@minecraft/server';
import { permissionLevels } from '../core/rankManager.js';

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: 'listwatched',
    syntax: '!listwatched',
    description: 'Lists all online players currently being watched.',
    aliases: ['lw', 'watchedlist'],
    permissionLevel: permissionLevels.admin,
    enabled: true,
};

/**
 * Executes the !listwatched command.
 * Iterates through all online players, checks their 'isWatched' status via playerDataManager,
 * and reports the list of watched players to the command issuer.
 * @async
 * @param {import('@minecraft/server').Player} player - The player issuing the command.
 * @param {string[]} _args - Command arguments (not used in this command).
 * @param {import('../types.js').CommandDependencies} dependencies - Object containing dependencies.
 * @returns {Promise<void>}
 */
export async function execute(player, _args, dependencies) {
    const { playerDataManager, playerUtils, logManager, getString } = dependencies;

    const onlinePlayers = mc.world.getAllPlayers();
    const watchedPlayersNames = [];

    for (const p of onlinePlayers) {
        const pData = playerDataManager.getPlayerData(p.id);
        if (pData && pData.isWatched) {
            watchedPlayersNames.push(p.nameTag);
        }
    }

    if (watchedPlayersNames.length === 0) {
        player.sendMessage(getString('command.listwatched.noPlayers'));
    } else {
        const header = getString('command.listwatched.header');
        player.sendMessage(`${header}${watchedPlayersNames.join(', ')}`);
    }

    try {
        logManager.addLog({
            adminName: player.nameTag,
            actionType: 'listWatched',
            details: `Listed watched players. Count: ${watchedPlayersNames.length}`,
        }, dependencies);
    } catch (logError) {
        console.error(`[ListWatchedCommand] Error logging: ${logError.stack || logError}`);
        if (playerUtils && playerUtils.debugLog) {
            playerUtils.debugLog(`[ListWatchedCommand] Logging error: ${logError.message}`, player.nameTag, dependencies);
        }
    }
}
