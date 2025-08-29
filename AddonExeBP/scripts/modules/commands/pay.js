import { commandManager } from './commandManager.js';
import * as economyManager from '../../core/economyManager.js';
import { getConfig } from '../../core/configManager.js';
import { findPlayerByName } from '../utils/playerUtils.js';
import { getPlayer } from '../../core/playerDataManager.js';

commandManager.register({
    name: 'pay',
    description: 'Pays another player from your balance.',
    category: 'Economy',
    permissionLevel: 1024,
    execute: (player, args) => {
        const config = getConfig();
        if (!config.economy.enabled) {
            return player.sendMessage('§cThe economy system is currently disabled.');
        }
        if (args.length < 2) {
            return player.sendMessage('§cUsage: !pay <playerName> <amount>');
        }

        const targetPlayer = findPlayerByName(args[0]);
        if (!targetPlayer) {
            return player.sendMessage(`§cPlayer '${args[0]}' not found.`);
        }
        if (targetPlayer.id === player.id) {
            return player.sendMessage('§cYou cannot pay yourself.');
        }

        const amount = parseFloat(args[1]);
        if (isNaN(amount) || amount <= 0) {
            return player.sendMessage('§cInvalid amount. Please enter a positive number.');
        }

        const sourceData = getPlayer(player.id);
        if (!sourceData || sourceData.balance < amount) {
            return player.sendMessage('§cYou do not have enough money for this payment.');
        }

        // Check if confirmation is required
        if (amount > config.economy.paymentConfirmationThreshold) {
            economyManager.createPendingPayment(player.id, targetPlayer.id, amount);
            player.sendMessage(`§ePayment of $${amount.toFixed(2)} to ${targetPlayer.name} is pending.`);
            player.sendMessage(`§eType §a!payconfirm§e within ${config.economy.paymentConfirmationTimeout} seconds to complete the transaction.`);
        } else {
            // Transfer directly for smaller amounts
            const result = economyManager.transfer(player.id, targetPlayer.id, amount);
            if (result.success) {
                player.sendMessage(`§aYou have paid §e$${amount.toFixed(2)}§a to ${targetPlayer.name}.`);
                targetPlayer.sendMessage(`§aYou have received §e$${amount.toFixed(2)}§a from ${player.name}.`);
            } else {
                player.sendMessage(`§cPayment failed: ${result.message}`);
            }
        }
    }
});
