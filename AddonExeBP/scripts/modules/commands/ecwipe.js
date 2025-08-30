import { world } from '@minecraft/server';
import { commandManager } from './commandManager.js';
import { playSound } from '../../core/utils.js';
import { debugLog } from '../../core/logger.js';

commandManager.register({
    name: 'ecwipe',
    description: "Clears a player's Ender Chest.",
    category: 'Administration',
    permissionLevel: 1, // Admin only
    execute: (player, args) => {
        if (args.length < 1) {
            player.sendMessage('§cUsage: !ecwipe <playerName>');
            playSound(player, 'note.bass');
            return;
        }

        const targetName = args[0].toLowerCase();
        const allPlayers = world.getPlayers();

        let targetPlayer;
        for (const p of allPlayers) {
            if (p.name.toLowerCase() === targetName) {
                targetPlayer = p;
                break;
            }
        }

        if (!targetPlayer) {
            player.sendMessage(`§cPlayer "${args[0]}" not found or is offline.`);
            playSound(player, 'note.bass');
            return;
        }

        try {
            // Per user feedback, this is believed to be a vanilla API function.
            targetPlayer.wipeEnderchest();

            debugLog(`[ecwipe] Successfully called wipeEnderchest() on ${targetPlayer.name}.`);
            player.sendMessage(`§aSuccessfully wiped the Ender Chest of ${targetPlayer.name}.`);
            targetPlayer.sendMessage('§eYour Ender Chest has been wiped by an admin.');
            playSound(player, 'random.orb');
            playSound(targetPlayer, 'random.orb');

        } catch (error) {
            debugLog(`[ecwipe] Error calling wipeEnderchest(): ${JSON.stringify(error)}`);
            player.sendMessage(`§cAn error occurred while wiping the Ender Chest for ${targetPlayer.name}. It may not be a valid function.`);
            playSound(player, 'note.bass');
        }
    }
});
