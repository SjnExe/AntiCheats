import { commandManager } from './commandManager.js';
import * as tpaManager from '../../core/tpaManager.js';
import { getConfig } from '../../core/configManager.js';

commandManager.register({
    name: 'tpaccept',
    aliases: ['tpyes'],
    description: 'Accepts an incoming TPA request.',
    category: '§3TPA System',
    permissionLevel: 1024, // Everyone
    execute: (player, args) => {
        const config = getConfig();
        if (!config.tpa.enabled) {
            player.sendMessage('§cThe TPA system is currently disabled.');
            return;
        }

        tpaManager.acceptRequest(player);
    }
});
