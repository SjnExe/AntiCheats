import { commandManager } from './commandManager.js';
import * as economyManager from '../../core/economyManager.js';
import { findPlayerByName } from '../utils/playerUtils.js';

commandManager.register({
    name: 'setbalance',
    aliases: ['setbal', 'setmoney'],
    description: 'Sets a player\'s balance to a specific amount. (Admin and above)',
    category: 'Economy',
    permissionLevel: 1, // Admin and above
    execute: (player, args) => {
        if (args.length < 2) {
            player.sendMessage('§cUsage: !setbalance <playerName> <amount>');
            return;
        }

        const targetPlayer = findPlayerByName(args[0]);
        if (!targetPlayer) {
            player.sendMessage(`§cPlayer '${args[0]}' not found.`);
            return;
        }

        const amount = parseFloat(args[1]);
        if (isNaN(amount) || amount < 0) {
            player.sendMessage('§cInvalid amount. Please enter a non-negative number.');
            return;
        }

        const result = economyManager.setBalance(targetPlayer.id, amount);

        if (result) {
            player.sendMessage(`§aSuccessfully set ${targetPlayer.name}'s balance to §e$${amount.toFixed(2)}§a.`);
            targetPlayer.sendMessage(`§aYour balance has been set to §e$${amount.toFixed(2)}§a by an administrator.`);
        } else {
            player.sendMessage('§cFailed to set balance. Could not find player data.');
        }
    }
});
