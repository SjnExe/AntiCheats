import { world } from '@minecraft/server';
import { commandManager } from './commandManager.js';
import { getPlayer, playSound } from '../../core/utils.js';

commandManager.register({
    name: 'ecwipe',
    description: "Clears a player's Ender Chest.",
    category: 'Admin',
    permissionLevel: 1, // Admin only
    execute: (player, args) => {
        if (args.length < 1) {
            player.sendMessage('§cUsage: !ecwipe <playerName>');
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

        const enderChestContainer = targetPlayer.enderChest;
        if (!enderChestContainer) {
            player.sendMessage(`§cCould not access the Ender Chest for ${targetPlayer.name}.`);
            playSound(player, 'note.bass');
            return;
        }

        for (let i = 0; i < enderChestContainer.size; i++) {
            enderChestContainer.setItem(i);
        }

        player.sendMessage(`§aSuccessfully wiped the Ender Chest of ${targetPlayer.name}.`);
        targetPlayer.sendMessage('§eYour Ender Chest has been wiped by an admin.');
        playSound(player, 'random.orb');
        playSound(targetPlayer, 'random.orb');
    },
});
