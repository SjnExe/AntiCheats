/**
 * @file Command to list all currently online players being watched by the AntiCheat system.
 */
import * as mc from '@minecraft/server'; // For mc.world
// Assuming permissionLevels is a static export for now.
import { permissionLevels } from '../core/rankManager.js';

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: 'listwatched',
    syntax: '', // Prefix handled by commandManager
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
 * @param {import('../types.js').Dependencies} dependencies - Object containing dependencies.
 * @returns {Promise<void>}
 */
export async function execute(player, _args, dependencies) {
    const { playerDataManager, playerUtils, logManager, getString } = dependencies;
    const adminName = player?.nameTag ?? 'UnknownAdmin';

    if (!mc?.world?.getAllPlayers) { // Check if API is available
        console.error("[ListWatchedCommand CRITICAL] mc.world.getAllPlayers is not available.");
        player.sendMessage(getString('common.error.genericCommandError', { commandName: definition.name, errorMessage: "System error"}));
        return;
    }

    const onlinePlayers = mc.world.getAllPlayers();
    const watchedPlayersNames = [];

    for (const p of onlinePlayers) {
        if (!p.isValid()) continue; // Skip invalid players
        const pData = playerDataManager?.getPlayerData(p.id);
        if (pData && pData.isWatched) {
            watchedPlayersNames.push(p.nameTag);
        }
    }

    if (watchedPlayersNames.length === 0) {
        player.sendMessage(getString('command.listwatched.noPlayers'));
    } else {
        const header = getString('command.listwatched.header');
        // Join with a comma and space for readability.
        player.sendMessage(`${header}${watchedPlayersNames.join(', ')}`);
    }
    playerUtils?.playSoundForEvent(player, "commandSuccess", dependencies);

    try {
        logManager?.addLog({
            adminName: adminName,
            actionType: 'watchedPlayersListed', // Standardized camelCase
            details: `Listed watched players. Count: ${watchedPlayersNames.length}. List: [${watchedPlayersNames.join(', ')}]`,
        }, dependencies);
    } catch (logError) {
        console.error(`[ListWatchedCommand CRITICAL] Error logging: ${logError.stack || logError}`);
        playerUtils?.debugLog(`[ListWatchedCommand CRITICAL] Logging error for ${adminName}: ${logError.message}`, adminName, dependencies);
    }
}
