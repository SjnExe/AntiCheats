import { commandManager } from './commandManager.js';
import * as tpaManager from '../../core/tpaManager.js';
import { getConfig } from '../../core/configManager.js';

commandManager.register({
    name: 'tpadeny',
    aliases: ['tpno'],
    description: 'Denies an incoming TPA request.',
    category: 'TPA',
    permissionLevel: 1024, // Everyone
    execute: (player, args) => {
        const config = getConfig();
        if (!config.tpa.enabled) {
            player.sendMessage('§cThe TPA system is currently disabled.');
            return;
        }

        tpaManager.denyRequest(player);
    },
});
