import { commandManager } from './commandManager.js';
import * as tpaManager from '../../core/tpaManager.js';
import { getConfig } from '../../core/configManager.js';
import { findPlayerByName } from '../utils/playerUtils.js';
import { getCooldown, setCooldown } from '../../core/cooldownManager.js';

commandManager.register({
    name: 'tpa',
    description: 'Sends a request to teleport to another player.',
    category: '§bPlayer Utilities',
    permissionLevel: 1024, // Everyone
    execute: (player, args) => {
        const config = getConfig();
        if (!config.tpa.enabled) {
            player.sendMessage('§cThe TPA system is currently disabled.');
            return;
        }

        const cooldown = getCooldown(player, 'tpa');
        if (cooldown > 0) {
            player.sendMessage(`§cYou must wait ${cooldown} more seconds before sending another TPA request.`);
            return;
        }

        if (args.length < 1) {
            player.sendMessage('§cUsage: !tpa <playerName>');
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

        const result = tpaManager.createRequest(player, targetPlayer, 'tpa');

        if (result.success) {
            setCooldown(player, 'tpa');
            player.sendMessage(`§aTPA request sent to ${targetPlayer.name}. They have ${config.tpa.requestTimeoutSeconds} seconds to accept.`);
            targetPlayer.sendMessage(`§a${player.name} has requested to teleport to you. Type §e!tpaccept§a to accept or §e!tpadeny§a to deny.`);
        } else {
            player.sendMessage(`§c${result.message}`);
        }
    }
});
