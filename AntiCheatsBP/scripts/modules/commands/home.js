import { world, system } from '@minecraft/server';
import { commandManager } from './commandManager.js';
import * as homesManager from '../../core/homesManager.js';
import { getConfig } from '../../core/configManager.js';
import { getCooldown, setCooldown } from '../../core/cooldownManager.js';

commandManager.register({
    name: 'home',
    description: 'Teleports you to one of your set homes.',
    category: 'Homes',
    permissionLevel: 1024, // Everyone
    execute: (player, args) => {
        const config = getConfig();
        if (!config.homes.enabled) {
            player.sendMessage('§cThe homes system is currently disabled.');
            return;
        }

        const cooldown = getCooldown(player, 'home');
        if (cooldown > 0) {
            player.sendMessage(`§cYou must wait ${cooldown} more seconds before using this command again.`);
            return;
        }

        const homeName = args[0] || 'home';
        const homeLocation = homesManager.getHome(player, homeName);

        if (!homeLocation) {
            player.sendMessage(`§cHome '${homeName}' not found. Use !homes to see your list of homes.`);
            return;
        }

        const warmupSeconds = config.homes.teleportWarmupSeconds;

        const teleportLogic = () => {
            try {
                player.teleport(homeLocation, { dimension: world.getDimension(homeLocation.dimensionId) });
                player.sendMessage(`§aTeleported to home '${homeName}'.`);
                setCooldown(player, 'home');
            } catch (e) {
                player.sendMessage(`§cFailed to teleport. Error: ${e.message}`);
                console.error(`[home] Failed to teleport: ${e.stack}`);
            }
        };

        if (warmupSeconds > 0) {
            player.sendMessage(`§aTeleporting to home '${homeName}' in ${warmupSeconds} seconds. Don't move!`);
            system.runTimeout(teleportLogic, warmupSeconds * 20);
        } else {
            teleportLogic();
        }
    }
});
