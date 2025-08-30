import { world } from '@minecraft/server';
import { commandManager } from './commandManager.js';
import { playSound } from '../../core/utils.js';
import { findPlayerByName } from '../utils/playerUtils.js';
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

        const targetName = args[0];
        const initialTargetPlayer = findPlayerByName(targetName);

        if (!initialTargetPlayer) {
            player.sendMessage(`§cPlayer "${targetName}" not found or is offline.`);
            playSound(player, 'note.bass');
            return;
        }

        // Attempt to get a fresh player object from the world, as the cached one might be stale
        const targetPlayer = world.getPlayer(initialTargetPlayer.id);
        if (!targetPlayer) {
            debugLog(`[ecwipe] Failed to get fresh player object for ${targetName} from world.getPlayer().`);
            player.sendMessage(`§cCould not get a valid player reference for "${targetName}".`);
            playSound(player, 'note.bass');
            return;
        }
        debugLog(`[ecwipe] Successfully found target player ${targetPlayer.name}.`);

        const enderChestComponent = targetPlayer.getComponent('minecraft:ender_chest');
        debugLog(`[ecwipe] Ender Chest component for ${targetPlayer.name}: ${enderChestComponent ? 'Found' : 'Not Found'}`);

        if (!enderChestComponent) {
            player.sendMessage(`§cCould not access the Ender Chest component for ${targetPlayer.name}. This might be a temporary API issue.`);
            playSound(player, 'note.bass');
            return;
        }

        const enderChestContainer = enderChestComponent.container;
        debugLog(`[ecwipe] Ender Chest container for ${targetPlayer.name}: ${enderChestContainer ? 'Found' : 'Not Found'}`);

        if (!enderChestContainer) {
            player.sendMessage(`§cCould not access the Ender Chest container for ${targetPlayer.name}.`);
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
    }
});
