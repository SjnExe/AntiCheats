import { customCommandManager } from './customCommandManager.js';
import * as homesManager from '../../core/homesManager.js';
import { getConfig } from '../../core/configManager.js';

customCommandManager.register({
    name: 'delhome',
    aliases: ['remhome', 'deletehome', 'rmhome'],
    description: 'Deletes one of your set homes.',
    category: 'Home System',
    permissionLevel: 1024, // Everyone
    parameters: [
        { name: 'homeName', type: 'string', description: 'The name of the home to delete.' }
    ],
    execute: (player, args) => {
        const config = getConfig();
        if (!config.homes.enabled) {
            player.sendMessage('§cThe homes system is currently disabled.');
            return;
        }

        const { homeName } = args;

        const result = homesManager.deleteHome(player, homeName);
        player.sendMessage(result.success ? `§a${result.message}` : `§c${result.message}`);
    }
});
