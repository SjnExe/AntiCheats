import { commandManager } from './commandManager.js';
import { forceReloadOwnerNameFromFile } from '../../core/configManager.js';
import { updateAllPlayerRanks } from '../../core/main.js';

commandManager.register({
    name: 'reload',
    description: 'Reloads the addon configuration from storage and updates player ranks.',
    category: 'Administration',
    permissionLevel: 1, // Admins only
    execute: (player, args) => {
        try {
            forceReloadOwnerNameFromFile();
            player.sendMessage('§aConfiguration reloaded successfully. Owner name has been updated from config file.');

            // Update ranks for all online players
            updateAllPlayerRanks();
            player.sendMessage('§aAll player ranks have been re-evaluated.');

        } catch (error) {
            player.sendMessage('§cFailed to reload configuration.');
            console.error(`[!reload] ${error.stack}`);
        }
    }
});
