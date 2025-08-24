import { commandManager } from './commandManager.js';
import { getConfig } from '../../core/configManager.js';
import { playSound } from '../../core/utils.js';
import { world } from '@minecraft/server';

commandManager.register({
    name: 'spawn',
    description: 'Teleports you to the server spawn point.',
    category: 'General',
    permissionLevel: 1024, // Everyone
    execute: (player, args) => {
        const config = getConfig();
        const spawnLocation = config.spawnLocation;

        if (!spawnLocation || typeof spawnLocation.x !== 'number') {
            player.sendMessage('§cThe server spawn point has not been set by an admin.');
            playSound(player, 'note.bass');
            return;
        }

        try {
            const dimension = world.getDimension(spawnLocation.dimensionId);
            player.teleport(spawnLocation, { dimension: dimension });
            player.sendMessage('§aTeleporting you to spawn...');
            playSound(player, 'random.orb');
        } catch (e) {
            player.sendMessage('§cFailed to teleport to spawn. The dimension may be invalid or the location unsafe.');
            console.error(`[SpawnCommand] Failed to teleport: ${e.stack}`);
            playSound(player, 'note.bass');
        }
    },
});
