import { world } from '@minecraft/server';
import { commandManager } from './commandManager.js';
import { errorLog } from '../../core/errorLogger.js';
import * as homesManager from '../../core/homesManager.js';
import { getConfig } from '../../core/configManager.js';
import { getCooldown, setCooldown } from '../../core/cooldownManager.js';
import { startTeleportWarmup } from '../../core/utils.js';

commandManager.register({
    name: 'home',
    description: 'Teleports you to one of your set homes.',
    category: 'Home System',
    permissionLevel: 1024, // Everyone
    parameters: [
        { name: 'homeName', type: 'string', description: 'The name of the home to teleport to. Defaults to "home".', optional: true }
    ],
    execute: (player, args) => {
        const config = getConfig();
        if (!config.homes.enabled) {
            player.sendMessage('§cThe homes system is currently disabled.');
            return;
        }

        const cooldown = getCooldown(player, 'homes');
        if (cooldown > 0) {
            player.sendMessage(`§cYou must wait ${cooldown} more seconds before using this command again.`);
            return;
        }

        const homeName = args.homeName || 'home';
        const homeLocation = homesManager.getHome(player, homeName);

        if (!homeLocation) {
            player.sendMessage(`§cHome '${homeName}' not found. Use /homes to see your list of homes.`);
            return;
        }

        const warmupSeconds = config.homes.teleportWarmupSeconds;

        const teleportLogic = () => {
            try {
                player.teleport(homeLocation, { dimension: world.getDimension(homeLocation.dimensionId) });
                player.sendMessage(`§aTeleported to home '${homeName}'.`);
                setCooldown(player, 'homes');
            } catch (e) {
                player.sendMessage(`§cFailed to teleport. Error: ${e.message}`);
                errorLog(`[/x:home] Failed to teleport: ${e.stack}`);
            }
        };

        startTeleportWarmup(player, warmupSeconds, teleportLogic, `home '${homeName}'`);
    }
});
