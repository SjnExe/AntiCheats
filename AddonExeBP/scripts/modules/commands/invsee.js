import { commandManager } from './commandManager.js';
import { findPlayerByName } from '../utils/playerUtils.js';

commandManager.register({
    name: 'invsee',
    description: "Views a player's inventory in chat.",
    category: '§cModeration',
    permissionLevel: 1, // Admin only
    execute: (player, args) => {
        if (args.length < 1) {
            player.sendMessage('§cUsage: !invsee <playerName> [page]');
            return;
        }

        const targetName = args[0];
        const targetPlayer = findPlayerByName(targetName);

        if (!targetPlayer) {
            player.sendMessage(`§cPlayer "${targetName}" not found.`);
            return;
        }

        const inventory = targetPlayer.getComponent('inventory').container;
        const items = [];
        for (let i = 0; i < inventory.size; i++) {
            const item = inventory.getItem(i);
            if (item) {
                items.push(`§eS${i}: §f${item.typeId.replace('minecraft:', '')} §7x${item.amount}`);
            }
        }

        if (items.length === 0) {
            player.sendMessage(`§6Inventory of ${targetPlayer.name}: §r§7(Empty)`);
            return;
        }

        const ITEMS_PER_PAGE = 10;
        const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE);
        let page = parseInt(args[1], 10) - 1 || 0;
        if (page < 0 || page >= totalPages) {
            page = 0;
        }

        const startIndex = page * ITEMS_PER_PAGE;
        const pageItems = items.slice(startIndex, startIndex + ITEMS_PER_PAGE);

        let message = `§6Inv: ${targetPlayer.name} (Page ${page + 1}/${totalPages})§r[AddonExe]`;
        message += pageItems.join('[AddonExe]');

        player.sendMessage(message);
    }
});
