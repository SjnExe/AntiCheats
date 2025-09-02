import { commandManager } from './commandManager.js';
import { saveAllData } from '../../core/dataManager.js';
import { playSoundFromConfig } from '../../core/utils.js';

commandManager.register({
    name: 'save',
    description: 'Manually saves all server data to disk.',
    category: 'Administration',
    permissionLevel: 1, // Admins only
    execute: (player, args) => {
        player.sendMessage('§aStarting manual data save...');
        try {
            saveAllData({ log: true });
            player.sendMessage('§aAll server data has been successfully saved.');
            playSoundFromConfig(player, 'adminNotificationReceived');
        } catch (e) {
            player.sendMessage(`§cAn error occurred during save: ${e.message}`);
            console.error(`[SaveCommand] Manual save failed: ${e.stack}`);
        }
    }
});
