import { commandManager } from './commandManager.js';
import { loadConfig } from '../../core/configManager.js';
import { initialize as initializeRanks } from '../../core/rankManager.js';
import { initialize as initializePunishments } from '../../core/punishmentManager.js';

commandManager.register({
    name: 'reload',
    description: 'Performs a soft reload of the addon\'s main systems (config, ranks, etc.).',
    category: 'Admin',
    permissionLevel: 0, // Owner only
    execute: (player, args) => {
        player.sendMessage('§eAttempting to reload addon systems...');
        try {
            // Re-run initialization logic for various managers
            loadConfig();
            initializeRanks();
            initializePunishments();
            // Add other managers' init functions here if they exist

            player.sendMessage('§aAddon systems reloaded successfully.');
        } catch (error) {
            player.sendMessage('§cFailed to reload addon systems. Check the console for errors.');
            console.error(`[!reload] ${error.stack}`);
        }
    },
});
