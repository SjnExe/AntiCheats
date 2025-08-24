import { commandManager } from './commandManager.js';
import { findPlayerByName } from '../utils/playerUtils.js';
import { playSound } from '../../core/utils.js';

commandManager.register({
    name: 'copyinv',
    description: "Copies a player's inventory, replacing your own.",
    category: 'Admin',
    permissionLevel: 1, // Admins only
    execute: (player, args) => {
        if (args.length < 1) {
            player.sendMessage('§cUsage: !copyinv <playerName>');
            return;
        }

        const targetName = args[0];
        const targetPlayer = findPlayerByName(targetName);

        if (!targetPlayer) {
            player.sendMessage(`§cPlayer "${targetName}" not found.`);
            return;
        }

        if (player.id === targetPlayer.id) {
            player.sendMessage('§cYou cannot copy your own inventory.');
            return;
        }

        try {
            const playerInv = player.getComponent('inventory').container;
            const targetInv = targetPlayer.getComponent('inventory').container;

            // Clear the admin's inventory first
            playerInv.clearAll();

            // Copy items
            for (let i = 0; i < targetInv.size; i++) {
                const item = targetInv.getItem(i);
                if (item) {
                    playerInv.setItem(i, item);
                }
            }
            player.sendMessage(`§aSuccessfully copied inventory from ${targetPlayer.name}.`);
            playSound(player, 'random.orb');
        } catch (e) {
            player.sendMessage('§cFailed to copy inventory.');
            console.error(`[CopyInv] Error: ${e.stack}`);
        }
    }
});
