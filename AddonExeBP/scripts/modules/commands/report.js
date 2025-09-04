import { commandManager } from './commandManager.js';
import * as reportManager from '../../core/reportManager.js';
import { findPlayerByName } from '../../core/playerCache.js';

commandManager.register({
    name: 'report',
    description: 'Reports a player for a specific reason.',
    category: 'General',
    permissionLevel: 1024, // Everyone
    parameters: [
        { name: 'target', type: 'player', description: 'The player to report.' },
        { name: 'reason', type: 'text', description: 'The reason for the report.' }
    ],
    execute: (player, args) => {
        const { target, reason } = args;

        if (!target || target.length === 0) {
            player.sendMessage('§cPlayer not found.');
            return;
        }
        if (!reason || reason.trim().length === 0) {
            player.sendMessage('§cYou must provide a reason for the report. For multi-word reasons, please enclose the reason in "quotes".');
            return;
        }
        let targetPlayer;
        if (typeof target === 'string') {
            targetPlayer = findPlayerByName(target);
            if (!targetPlayer) {
                player.sendMessage(`§cPlayer "${target}" not found or is not online.`);
                return;
            }
        } else {
            targetPlayer = target[0];
        }


        if (targetPlayer.id === player.id) {
            player.sendMessage('§cYou cannot report yourself.');
            return;
        }

        reportManager.createReport(player, targetPlayer, reason);
        player.sendMessage('§aReport submitted. Thank you for your help.');
    }
});
