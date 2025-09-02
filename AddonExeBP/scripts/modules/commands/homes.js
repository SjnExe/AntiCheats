import { customCommandManager } from './customCommandManager.js';
import * as homesManager from '../../core/homesManager.js';
import { getConfig } from '../../core/configManager.js';

customCommandManager.register({
    name: 'homes',
    description: 'Lists all of your set homes.',
    aliases: ['homelist'],
    category: 'Home System',
    permissionLevel: 1024, // Everyone
    parameters: [],
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
            player.sendMessage(`§aYou have no homes set. Use /exe:sethome <name> to set one. (${homeCount}/${maxHomes})`);
        } else {
            player.sendMessage(`§aYour homes (${homeCount}/${maxHomes}): §e${homeList.join(', ')}`);
        }
    }
});
