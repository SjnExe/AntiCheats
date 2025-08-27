import { commandManager } from './commandManager.js';
import * as homesManager from '../../core/homesManager.js';
import { getConfig } from '../../core/configManager.js';

commandManager.register({
    name: 'sethome',
    aliases: ['addhome'],
    description: 'Sets a home at your current location.',
    category: '§bHome System',
    permissionLevel: 1024, // Everyone
    execute: (player, args) => {
        const config = getConfig();
        if (!config.homes.enabled) {
            player.sendMessage('§cThe homes system is currently disabled.');
            return;
        }

        const homeName = args[0] || 'home'; // Default to 'home' if no name is provided

        const result = homesManager.setHome(player, homeName);
        player.sendMessage(result.success ? `§a${result.message}` : `§c${result.message}`);
    }
});
