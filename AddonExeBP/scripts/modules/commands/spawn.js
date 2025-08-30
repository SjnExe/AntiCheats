import { world, system } from '@minecraft/server';
import { commandManager } from './commandManager.js';
import { getConfig } from '../../core/configManager.js';
import { getCooldown, setCooldown } from '../../core/cooldownManager.js';
import { playSound } from '../../core/utils.js';

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

        const cooldown = getCooldown(player, 'spawn');
        if (cooldown > 0) {
            player.sendMessage(`§cYou must wait ${cooldown} more seconds before using this command again.`);
            return;
        }

        const warmupSeconds = config.spawn.teleportWarmupSeconds;
        const initialLocation = player.location;

        const teleportLogic = () => {
            // Check if player has moved during warmup
            const currentLocation = player.location;
            const distanceMoved = Math.sqrt(
                Math.pow(currentLocation.x - initialLocation.x, 2) +
                Math.pow(currentLocation.y - initialLocation.y, 2) +
                Math.pow(currentLocation.z - initialLocation.z, 2)
            );

            if (distanceMoved > 1) {
                player.sendMessage('§cTeleport canceled because you moved.');
                playSound(player, 'note.bass');
                return;
            }

            try {
                const dimension = world.getDimension(spawnLocation.dimensionId);
                player.teleport(spawnLocation, { dimension: dimension });
                player.sendMessage('§aTeleporting you to spawn...');
                setCooldown(player, 'spawn');
                playSound(player, 'random.orb');
            } catch (e) {
                player.sendMessage('§cFailed to teleport to spawn. The dimension may be invalid or the location unsafe.');
                console.error(`[SpawnCommand] Failed to teleport: ${e.stack}`);
                playSound(player, 'note.bass');
            }
        };

        if (warmupSeconds > 0) {
            player.sendMessage(`§aTeleporting you to spawn in ${warmupSeconds} seconds. Don't move!`);
            system.runTimeout(teleportLogic, warmupSeconds * 20);
        } else {
            teleportLogic();
        }
    }
});
