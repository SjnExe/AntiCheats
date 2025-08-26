import { commandManager } from './commandManager.js';
import * as homesManager from '../../core/homesManager.js';
import { getConfig } from '../../core/configManager.js';

commandManager.register({
    name: 'delhome',
    aliases: ['remhome', 'deletehome'],
    description: 'Deletes one of your set homes.',
    category: '§bPlayer Utilities',
    permissionLevel: 1024, // Everyone
    execute: (player, args) => {
        const config = getConfig();
        if (!config.homes.enabled) {
            player.sendMessage('§cThe homes system is currently disabled.');
            return;
        }

        const homeName = args[0];
        if (!homeName) {
            player.sendMessage('§cUsage: !delhome <homeName>');
            return;
        }

        const result = homesManager.deleteHome(player, homeName);
        player.sendMessage(result.success ? `§a${result.message}` : `§c${result.message}`);
    }
});
