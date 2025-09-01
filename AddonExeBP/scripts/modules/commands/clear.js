import { commandManager } from './commandManager.js';
import { playSound } from '../../core/utils.js';
import { findPlayerByName } from '../utils/playerUtils.js';
import { getPlayer } from '../../core/playerDataManager.js';

commandManager.register({
    name: 'clear',
    description: 'Clears the inventory of a player or yourself.',
    aliases: ['ci', 'clearinv'],
    category: 'Moderation',
    permissionLevel: 1, // Admin-only to prevent accidental self-clearing
    execute: (player, args) => {
        if (args.length > 0) {
            // Clearing another player's inventory (requires admin)
            const executorData = getPlayer(player.id);
            if (executorData.permissionLevel > 1) { // Assuming 0=owner, 1=admin
                player.sendMessage("§cYou do not have permission to clear another player's inventory.");
                playSound(player, 'note.bass');
                return;
            }

            const targetName = args[0];
            const targetPlayer = findPlayerByName(targetName);

            if (!targetPlayer) {
                player.sendMessage(`§cPlayer "${targetName}" not found.`);
                playSound(player, 'note.bass');
                return;
            }

            const targetData = getPlayer(targetPlayer.id);
            if (executorData.permissionLevel >= targetData.permissionLevel) {
                player.sendMessage('§cYou cannot clear the inventory of a player with the same or higher rank than you.');
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
    }
});
