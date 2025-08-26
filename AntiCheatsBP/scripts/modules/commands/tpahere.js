import { commandManager } from './commandManager.js';
import * as tpaManager from '../../core/tpaManager.js';
import { getConfig } from '../../core/configManager.js';
import { findPlayerByName } from '../utils/playerUtils.js';

commandManager.register({
    name: 'tpahere',
    description: 'Requests another player to teleport to you.',
    category: '§bPlayer Utilities',
    permissionLevel: 1024, // Everyone
    execute: (player, args) => {
        const config = getConfig();
        if (!config.tpa.enabled) {
            player.sendMessage('§cThe TPA system is currently disabled.');
            return;
        }

        if (args.length < 1) {
            player.sendMessage('§cUsage: !tpahere <playerName>');
            return;
        }

        const targetPlayer = findPlayerByName(args[0]);
        if (!targetPlayer) {
            player.sendMessage(`§cPlayer '${args[0]}' not found.`);
            return;
        }

        if (targetPlayer.id === player.id) {
            player.sendMessage('§cYou cannot send a TPA request to yourself.');
            return;
        }

        const result = tpaManager.createRequest(player, targetPlayer, 'tpahere');

        if (result.success) {
            player.sendMessage(`§aTPA Here request sent to ${targetPlayer.name}. They have ${config.tpa.requestTimeoutSeconds} seconds to accept.`);
            targetPlayer.sendMessage(`§a${player.name} has requested for you to teleport to them. Type §e!tpaccept§a to accept or §e!tpadeny§a to deny.`);
        } else {
            player.sendMessage(`§c${result.message}`);
        }
    }
});
