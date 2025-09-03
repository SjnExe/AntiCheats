import { commandManager } from './commandManager.js';

commandManager.register({
    name: 'invsee',
    description: "Views a player's inventory in chat.",
    category: 'Moderation',
    permissionLevel: 1, // Admin only
    parameters: [
        { name: 'target', type: 'player', description: 'The player whose inventory to view.' },
        { name: 'page', type: 'int', description: 'The page of the inventory to view.', optional: true }
    ],
    execute: (player, args) => {
        const { target, page: pageArg } = args;

        if (!target || target.length === 0) {
            player.sendMessage('§cPlayer not found.');
            return;
        }

        const targetPlayer = target[0];

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
        let page = (pageArg || 1) - 1;
        if (page < 0 || page >= totalPages) {
            page = 0;
        }

        const startIndex = page * ITEMS_PER_PAGE;
        const pageItems = items.slice(startIndex, startIndex + ITEMS_PER_PAGE);

        let message = `§6Inv: ${targetPlayer.name} (Page ${page + 1}/${totalPages})§r\n`;
        message += pageItems.join('\n');

        player.sendMessage(message);
    }
});
