import { commandManager } from './commandManager.js';
import * as economyManager from '../../core/economyManager.js';

commandManager.register({
    name: 'setbalance',
    aliases: ['setbal', 'setmoney'],
    description: 'Sets a player\'s balance to a specific amount. (Admin and above)',
    category: 'Economy',
    permissionLevel: 1, // Admin and above
    allowConsole: true,
    parameters: [
        { name: 'target', type: 'player', description: 'The player whose balance to set.' },
        { name: 'amount', type: 'float', description: 'The amount to set the balance to.' }
    ],
    execute: (player, args) => {
        const { target, amount } = args;

        if (!target || target.length === 0) {
            player.sendMessage('§cPlayer not found.');
            return;
        }

        const targetPlayer = target[0];

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
