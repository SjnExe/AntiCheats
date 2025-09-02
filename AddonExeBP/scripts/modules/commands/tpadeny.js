import { customCommandManager } from './customCommandManager.js';
import * as tpaManager from '../../core/tpaManager.js';
import { getConfig } from '../../core/configManager.js';

customCommandManager.register({
    name: 'tpadeny',
    aliases: ['tpno', 'tpdeny'],
    description: 'Denies an incoming TPA request.',
    category: 'TPA System',
    permissionLevel: 1024, // Everyone
    parameters: [],
    execute: (player, args) => {
        const config = getConfig();
        if (!config.tpa.enabled) {
            player.sendMessage('§cThe TPA system is currently disabled.');
            return;
        }

        tpaManager.denyRequest(player);
    }
});
