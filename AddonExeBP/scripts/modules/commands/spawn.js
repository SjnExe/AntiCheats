import { world } from '@minecraft/server';
import { commandManager } from './commandManager.js';
import { getConfig } from '../../core/configManager.js';
import { getCooldown, setCooldown } from '../../core/cooldownManager.js';
import { playSound, startTeleportWarmup } from '../../core/utils.js';
import { errorLog } from '../../core/errorLogger.js';

commandManager.register({
    name: 'spawn',
    aliases: ['lobby', 'hub'],
    description: 'Teleports you to the server spawn point.',
    category: 'General',
    permissionLevel: 1024, // Everyone
    parameters: [],
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

        const teleportLogic = () => {
            try {
                const dimension = world.getDimension(spawnLocation.dimensionId);
                player.teleport(spawnLocation, { dimension: dimension });
                player.sendMessage('§aTeleporting you to spawn...');
                setCooldown(player, 'spawn');
                playSound(player, 'random.orb');
            } catch (e) {
                player.sendMessage('§cFailed to teleport to spawn. The dimension may be invalid or the location unsafe.');
                errorLog(`[/x:spawn] Failed to teleport: ${e.stack}`);
                playSound(player, 'note.bass');
            }
        };

        startTeleportWarmup(player, warmupSeconds, teleportLogic, 'spawn');
    }
});
