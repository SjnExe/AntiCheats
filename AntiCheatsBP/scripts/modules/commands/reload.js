import { commandManager } from './commandManager.js';
import { loadConfig } from '../../core/configManager.js';

commandManager.register({
    name: 'reload',
    description: 'Reloads the addon configuration from storage.',
    permissionLevel: 1, // Admins only
    execute: (player, args) => {
        try {
            loadConfig();
            player.sendMessage('§aConfiguration reloaded successfully.');
        } catch (error) {
            player.sendMessage('§cFailed to reload configuration.');
            console.error(`[!reload] ${error.stack}`);
        }
    },
});
