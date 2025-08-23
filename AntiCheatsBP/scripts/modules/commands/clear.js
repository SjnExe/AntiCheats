import { world } from '@minecraft/server';
import { commandManager } from './commandManager.js';
import { getPlayer, playSound } from '../../core/utils.js';

commandManager.register({
    name: 'clear',
    description: 'Clears the inventory of a player or yourself.',
    category: 'Utility',
    permissionLevel: 0, // Default permission for self-clearing
    execute: (player, args) => {
        if (args.length > 0) {
            // Clearing another player's inventory (requires admin)
            const pData = global.playerData.get(player.name);
            if (pData.permissionLevel < 1) {
                player.sendMessage("§cYou do not have permission to clear another player's inventory.");
                playSound(player, 'note.bass');
                return;
            }

            const targetName = args[0];
            const targetPlayer = getPlayer(targetName);

            if (!targetPlayer) {
                player.sendMessage(`§cPlayer "${targetName}" not found.`);
                playSound(player, 'note.bass');
                return;
            }

            const inventory = targetPlayer.getComponent('inventory').container;
            for (let i = 0; i < inventory.size; i++) {
                inventory.setItem(i);
            }

            player.sendMessage(`§aSuccessfully cleared the inventory of ${targetPlayer.name}.`);
            targetPlayer.sendMessage('§eYour inventory has been cleared by an admin.');
            playSound(player, 'random.orb');
            playSound(targetPlayer, 'random.orb');
        } else {
            // Clearing own inventory
            const inventory = player.getComponent('inventory').container;
            for (let i = 0; i < inventory.size; i++) {
                inventory.setItem(i);
            }
            player.sendMessage('§aYour inventory has been cleared.');
            playSound(player, 'random.orb');
        }
    },
});
