import { commandManager } from './commandManager.js';
import { forceReloadOwnerNameFromFile, getConfig } from '../../core/configManager.js';
import { updatePlayerRank } from '../../core/main.js';
import { findPlayerByName } from '../../core/playerCache.js';
import { debugLog } from '../../core/logger.js';

commandManager.register({
    name: 'reload',
    description: 'Reloads the addon configuration from storage and updates player ranks.',
    category: 'Administration',
    permissionLevel: 1, // Admins only
    execute: (player, args) => {
        try {
            const oldOwnerNames = (getConfig().ownerPlayerNames || []).map(name => name.toLowerCase());

            forceReloadOwnerNameFromFile();
            player.sendMessage('§aConfiguration reloaded successfully. Owner name has been updated from config file.');

            const newOwnerNames = (getConfig().ownerPlayerNames || []).map(name => name.toLowerCase());

            // Combine old and new owner names to find all affected players.
            const affectedNames = [...new Set([...oldOwnerNames, ...newOwnerNames])];
            debugLog(`[Reload] Re-evaluating ranks for affected players: ${affectedNames.join(', ')}`);

            let updatedCount = 0;
            // Instead of all players, only check players whose owner status might have changed.
            for (const playerName of affectedNames) {
                const affectedPlayer = findPlayerByName(playerName);
                if (affectedPlayer) {
                    updatePlayerRank(affectedPlayer);
                    updatedCount++;
                }
            }

            player.sendMessage(`§aRanks for ${updatedCount} affected player(s) have been re-evaluated.`);

        } catch (error) {
            player.sendMessage('§cFailed to reload configuration.');
            console.error(`[!reload] ${error.stack}`);
        }
    }
});
