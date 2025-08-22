import { commandManager } from './commandManager.js';
import * as economyManager from '../../core/economyManager.js';
import { getConfig } from '../../core/configManager.js';
import { findPlayerByName } from '../utils/playerUtils.js';

commandManager.register({
    name: 'pay',
    description: 'Pays another player from your balance.',
    category: 'Economy',
    permissionLevel: 1024, // Everyone
    execute: (player, args) => {
        const config = getConfig();
        if (!config.economy.enabled) {
            player.sendMessage('§cThe economy system is currently disabled.');
            return;
        }

        if (args.length < 2) {
            player.sendMessage('§cUsage: !pay <playerName> <amount>');
            return;
        }

        const targetPlayer = findPlayerByName(args[0]);
        if (!targetPlayer) {
            player.sendMessage(`§cPlayer '${args[0]}' not found.`);
            return;
        }

        if (targetPlayer.id === player.id) {
            player.sendMessage('§cYou cannot pay yourself.');
            return;
        }

        const amount = parseFloat(args[1]);
        if (isNaN(amount) || amount <= 0) {
            player.sendMessage('§cInvalid amount. Please enter a positive number.');
            return;
        }

        const result = economyManager.transfer(player.id, targetPlayer.id, amount);

        if (result.success) {
            player.sendMessage(`§aYou have paid §e$${amount.toFixed(2)}§a to ${targetPlayer.name}.`);
            targetPlayer.sendMessage(`§aYou have received §e$${amount.toFixed(2)}§a from ${player.name}.`);
        } else {
            player.sendMessage(`§cPayment failed: ${result.message}`);
        }
    },
});
