import { commandManager } from './commandManager.js';
import * as homesManager from '../../core/homesManager.js';
import { getConfig } from '../../core/configManager.js';

commandManager.register({
    name: 'homes',
    description: 'Lists all of your set homes.',
    category: 'Homes',
    permissionLevel: 1024, // Everyone
    execute: (player, args) => {
        const config = getConfig();
        if (!config.homes.enabled) {
            player.sendMessage('§cThe homes system is currently disabled.');
            return;
        }

        const homeList = homesManager.listHomes(player);
        const homeCount = homeList.length;
        const maxHomes = config.homes.maxHomes;

        if (homeCount === 0) {
            player.sendMessage(`§aYou have no homes set. Use !sethome <name> to set one. (${homeCount}/${maxHomes})`);
        } else {
            player.sendMessage(`§aYour homes (${homeCount}/${maxHomes}): §e${homeList.join(', ')}`);
        }
    },
});
