import { commandManager } from './commandManager.js';
import { playSound } from '../../core/utils.js';
import { getPlayer } from '../../core/playerDataManager.js';

commandManager.register({
    name: 'clear',
    description: 'Clears the inventory of a player or yourself.',
    aliases: ['ci', 'clearinv'],
    category: 'Moderation',
    permissionLevel: 1, // Admin-only to prevent accidental self-clearing
    disableSlashCommand: true,
    parameters: [
        { name: 'target', type: 'player', description: 'The player whose inventory to clear.', optional: true }
    ],
    execute: (player, args) => {
        let targetPlayer = player;
        if (args.target && args.target.length > 0) {
            const executorData = getPlayer(player.id);
            if (executorData.permissionLevel > 1) {
                player.sendMessage("§cYou do not have permission to clear another player's inventory.");
                playSound(player, 'note.bass');
                return;
            }

            targetPlayer = args.target[0];
            const targetData = getPlayer(targetPlayer.id);
            if (executorData.permissionLevel >= targetData.permissionLevel) {
                player.sendMessage('§cYou cannot clear the inventory of a player with the same or higher rank than you.');
                playSound(player, 'note.bass');
                return;
            }
        }

        const inventory = targetPlayer.getComponent('inventory').container;
        for (let i = 0; i < inventory.size; i++) {
            inventory.setItem(i);
        }

        if (targetPlayer.id === player.id) {
            player.sendMessage('§aYour inventory has been cleared.');
        } else {
            player.sendMessage(`§aSuccessfully cleared the inventory of ${targetPlayer.name}.`);
            targetPlayer.sendMessage('§eYour inventory has been cleared by an admin.');
            playSound(targetPlayer, 'random.orb');
        }
        playSound(player, 'random.orb');
    }
});
