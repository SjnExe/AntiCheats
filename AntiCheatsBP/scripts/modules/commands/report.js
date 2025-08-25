import { commandManager } from './commandManager.js';
import { findPlayerByName } from '../utils/playerUtils.js';
import { createReport } from '../../core/reportManager.js';

commandManager.register({
    name: 'report',
    description: 'Reports a player for misconduct.',
    category: 'General',
    permissionLevel: 1024, // Everyone
    execute: (player, args) => {
        if (args.length < 2) {
            player.sendMessage('§cUsage: !report <playerName> <reason>');
            return;
        }

        const targetPlayer = findPlayerByName(args[0]);
        if (!targetPlayer) {
            player.sendMessage(`§cPlayer '${args[0]}' not found.`);
            return;
        }

        const reason = args.slice(1).join(' ');
        createReport(player, targetPlayer, reason);
        player.sendMessage('§aThank you for your report. An admin will review it shortly.');
    }
});
