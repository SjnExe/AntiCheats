// Command to list all currently online players being watched by the AntiCheat system.
import * as mc from '@minecraft/server';

/** @type {import('../types.js').CommandDefinition} */
export const definition = {
    name: 'listwatched',
    syntax: '',
    description: 'Lists all online players currently being watched.',
    permissionLevel: 1, // admin
};

/**
 * Executes the !listwatched command.
 * Iterates through all online players, checks their 'isWatched' status via playerDataManager,
 * and reports the list of watched players to the command issuer.
 * @async
 * @param {import('@minecraft/server').Player} player - The player issuing the command.
 * @param {string[]} _args - Command arguments (not used in this command).
 * @param {import('../types.js').Dependencies} dependencies - Object containing dependencies.
 * @returns {void}
 */
export function execute(player, _args, dependencies) {
    const { playerDataManager, playerUtils, logManager, getString } = dependencies;
    const adminName = player?.nameTag ?? 'UnknownAdmin';

    if (!mc?.world?.getAllPlayers) {
        console.error('[ListWatchedCommand CRITICAL] mc.world.getAllPlayers is not available.');
        player.sendMessage(getString('common.error.genericCommandError', { commandName: definition.name, errorMessage: 'System error' }));
        return;
    }

    const onlinePlayers = mc.world.getAllPlayers();
    const watchedPlayersNames = [];

    for (const p of onlinePlayers) {
        if (!p.isValid()) {
            continue;
        }
        const pData = playerDataManager?.getPlayerData(p.id);
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
    playerUtils?.playSoundForEvent(player, 'commandSuccess', dependencies);

    try {
        logManager?.addLog({
            adminName,
            actionType: 'watchedPlayersListed',
            details: `Listed watched players. Count: ${watchedPlayersNames.length}. List: [${watchedPlayersNames.join(', ')}]`,
        }, dependencies);
    } catch (logError) {
        console.error(`[ListWatchedCommand CRITICAL] Error logging: ${logError.stack || logError}`);
        playerUtils?.debugLog(`[ListWatchedCommand CRITICAL] Logging error for ${adminName}: ${logError.message}`, adminName, dependencies);
    }
}
