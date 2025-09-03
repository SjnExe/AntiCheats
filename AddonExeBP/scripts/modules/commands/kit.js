import { commandManager } from './commandManager.js';
import * as kitsManager from '../../core/kitsManager.js';
import { getConfig } from '../../core/configManager.js';

commandManager.register({
    name: 'kit',
    description: 'Lists available kits or claims a specific kit.',
    category: 'General',
    permissionLevel: 1024, // Everyone
    parameters: [
        { name: 'kitName', type: 'string', description: 'The name of the kit to claim, or "list" to see all kits.', optional: true }
    ],
    execute: (player, args) => {
        const config = getConfig();
        if (!config.kits.enabled) {
            player.sendMessage('§cThe kits system is currently disabled.');
            return;
        }

        const action = args.kitName;

        if (!action || action.toLowerCase() === 'list') {
            const allKits = kitsManager.listKits();
            if (allKits.length === 0) {
                player.sendMessage('§cThere are no kits available.');
                return;
            }
            player.sendMessage(`§aAvailable kits: §e${allKits.join(', ')}`);
            player.sendMessage('§7Use /x:kit <kitName> to claim a kit.');
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
