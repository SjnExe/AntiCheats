import { commandManager } from './commandManager.js';
import * as tpaManager from '../../core/tpaManager.js';
import { getConfig } from '../../core/configManager.js';

commandManager.register({
    name: 'tpahere',
    description: 'Requests another player to teleport to you.',
    aliases: ['tphere', 'tprequesthere'],
    category: 'TPA System',
    permissionLevel: 1024, // Everyone
    parameters: [
        { name: 'target', type: 'player', description: 'The player to send the request to.' }
    ],
    execute: (player, args) => {
        const { target } = args;
        const config = getConfig();
        if (!config.tpa.enabled) {
            player.sendMessage('§cThe TPA system is currently disabled.');
            return;
        }

        if (!target || target.length === 0) {
            player.sendMessage('§cPlayer not found.');
            return;
        }

        const targetPlayer = target[0];

        if (targetPlayer.id === player.id) {
            player.sendMessage('§cYou cannot send a TPA request to yourself.');
            return;
        }

        const result = tpaManager.createRequest(player, targetPlayer, 'tpahere');

        if (result.success) {
            player.sendMessage(`§aTPA Here request sent to ${targetPlayer.name}. They have ${config.tpa.requestTimeoutSeconds} seconds to accept.`);
            targetPlayer.sendMessage(`§a${player.name} has requested for you to teleport to them. Type §e/x:tpaccept§a to accept or §e/x:tpadeny§a to deny.`);
        } else {
            player.sendMessage(`§c${result.message}`);
        }
    }
});
