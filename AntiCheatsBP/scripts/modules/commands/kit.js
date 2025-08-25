import { commandManager } from './commandManager.js';
import * as kitsManager from '../../core/kitsManager.js';
import { getConfig } from '../../core/configManager.js';

commandManager.register({
    name: 'kit',
    description: 'Lists available kits or claims a specific kit.',
    category: 'Kits',
    permissionLevel: 1024, // Everyone
    execute: (player, args) => {
        const config = getConfig();
        if (!config.kits.enabled) {
            player.sendMessage('§cThe kits system is currently disabled.');
            return;
        }

        const action = args[0];

        if (!action || action.toLowerCase() === 'list') {
            const allKits = kitsManager.listKits();
            if (allKits.length === 0) {
                player.sendMessage('§cThere are no kits available.');
                return;
            }
            player.sendMessage(`§aAvailable kits: §e${allKits.join(', ')}`);
            player.sendMessage('§7Use !kit <kitName> to claim a kit.');
            return;
        }

        // Claim a kit
        const kitName = action;
        const result = kitsManager.giveKit(player, kitName);

        if (result.success) {
            player.sendMessage(`§a${result.message}`);
        } else {
            player.sendMessage(`§c${result.message}`);
        }
    }
});
