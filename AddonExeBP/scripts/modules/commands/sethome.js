import { commandManager } from './commandManager.js';
import * as homesManager from '../../core/homesManager.js';
import { getConfig } from '../../core/configManager.js';

commandManager.register({
    name: 'sethome',
    aliases: ['addhome', 'createhome'],
    description: 'Sets a home at your current location.',
    category: 'Home System',
    permissionLevel: 1024, // Everyone
    parameters: [
        { name: 'homeName', type: 'string', description: 'The name of the home to set. Defaults to "home".', optional: true }
    ],
    execute: (player, args) => {
        const config = getConfig();
        if (!config.homes.enabled) {
            player.sendMessage('§cThe homes system is currently disabled.');
            return;
        }

        const homeName = args.homeName || 'home';

        const result = homesManager.setHome(player, homeName);
        player.sendMessage(result.success ? `§a${result.message}` : `§c${result.message}`);
    }
});
