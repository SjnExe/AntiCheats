import { commandManager } from './commandManager.js';
import * as economyManager from '../../core/economyManager.js';
import { world } from '@minecraft/server';

commandManager.register({
    name: 'payconfirm',
    description: 'Confirms a pending payment.',
    category: 'Economy',
    permissionLevel: 1024,
    execute: (player, args) => {
        const pendingPayment = economyManager.getPendingPayment(player.id);

        if (!pendingPayment) {
            return player.sendMessage('§cYou have no pending payment to confirm.');
        }

        const { targetPlayerId, amount } = pendingPayment;
        const targetPlayer = world.getPlayer(targetPlayerId);

        if (!targetPlayer) {
            economyManager.clearPendingPayment(player.id);
            return player.sendMessage('§cThe target player has gone offline. Payment cancelled.');
        }

        const result = economyManager.transfer(player.id, targetPlayerId, amount);

        if (result.success) {
            player.sendMessage(`§aPayment confirmed. You sent §e$${amount.toFixed(2)}§a to ${targetPlayer.name}.`);
            targetPlayer.sendMessage(`§aYou have received §e$${amount.toFixed(2)}§a from ${player.name}.`);
        } else {
            // This might happen if the player spent their money after the initial !pay command
            player.sendMessage(`§cPayment failed: ${result.message}`);
        }

        // Clear the pending payment regardless of success or failure
        economyManager.clearPendingPayment(player.id);
    }
});
