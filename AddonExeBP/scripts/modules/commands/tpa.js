import { commandManager } from './commandManager.js';
import * as tpaManager from '../../core/tpaManager.js';
import { getConfig } from '../../core/configManager.js';
import { getCooldown, setCooldown } from '../../core/cooldownManager.js';

commandManager.register({
    name: 'tpa',
    description: 'Sends a request to teleport to another player.',
    aliases: ['tprequest', 'asktp', 'requesttp'],
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

        const cooldown = getCooldown(player, 'tpa');
        if (cooldown > 0) {
            player.sendMessage(`§cYou must wait ${cooldown} more seconds before sending another TPA request.`);
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

        const result = tpaManager.createRequest(player, targetPlayer, 'tpa');

        if (result.success) {
            setCooldown(player, 'tpa');
            player.sendMessage(`§aTPA request sent to ${targetPlayer.name}. They have ${config.tpa.requestTimeoutSeconds} seconds to accept.`);
            targetPlayer.sendMessage(`§a${player.name} has requested to teleport to you. Type §e/tpaccept§a to accept or §e/tpadeny§a to deny.`);
        } else {
            player.sendMessage(`§c${result.message}`);
        }
    }
});

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
            targetPlayer.sendMessage(`§a${player.name} has requested for you to teleport to them. Type §e/tpaccept§a to accept or §e/tpadeny§a to deny.`);
        } else {
            player.sendMessage(`§c${result.message}`);
        }
    }
});

commandManager.register({
    name: 'tpaccept',
    aliases: ['tpyes', 'tpac'],
    description: 'Accepts an incoming TPA request.',
    category: 'TPA System',
    permissionLevel: 1024, // Everyone
    parameters: [],
    execute: (player, args) => {
        const config = getConfig();
        if (!config.tpa.enabled) {
            player.sendMessage('§cThe TPA system is currently disabled.');
            return;
        }

        tpaManager.acceptRequest(player);
    }
});

commandManager.register({
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

commandManager.register({
    name: 'tpacancel',
    description: 'Cancels your outgoing TPA request.',
    category: 'TPA System',
    permissionLevel: 1024, // Everyone
    parameters: [],
    execute: (player, args) => {
        const config = getConfig();
        if (!config.tpa.enabled) {
            player.sendMessage('§cThe TPA system is currently disabled.');
            return;
        }

        tpaManager.cancelRequest(player);
    }
});
