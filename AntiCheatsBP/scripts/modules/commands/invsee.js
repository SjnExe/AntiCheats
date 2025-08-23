import { world } from '@minecraft/server';
import { MessageFormData } from '@minecraft/server-ui';
import { commandManager } from './commandManager.js';

commandManager.register({
    name: 'invsee',
    description: "Views a player's inventory.",
    category: 'Admin',
    permissionLevel: 1, // Admin only
    execute: (player, args) => {
        if (args.length < 1) {
            player.sendMessage('§cUsage: !invsee <playerName>');
            return;
        }

        const targetName = args[0];
        const targetPlayer = [...world.getPlayers()].find(p => p.name === targetName);

        if (!targetPlayer) {
            player.sendMessage(`§cPlayer "${targetName}" not found.`);
            return;
        }

        const ITEMS_PER_PAGE = 15;

        function showInventoryPage(viewingPlayer, target, page = 0) {
            const inventory = target.getComponent('inventory').container;
            const items = [];
            for (let i = 0; i < inventory.size; i++) {
                const item = inventory.getItem(i);
                if (item) {
                    items.push(`§eSlot ${i}: §f${item.typeId.replace('minecraft:', '')} §7x${item.amount}`);
                }
            }

            if (items.length === 0) {
                new MessageFormData()
                    .title(`Inventory: ${target.name}`)
                    .body('§7(Inventory is empty)')
                    .button1('§cClose')
                    .show(viewingPlayer).catch(e => console.error(`[InvSee] Empty inv form promise rejected: ${e.stack}`));
                return;
            }

            const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE);
            const startIndex = page * ITEMS_PER_PAGE;
            const pageItems = items.slice(startIndex, startIndex + ITEMS_PER_PAGE);

            const form = new MessageFormData()
                .title(`Inventory: ${target.name} (Page ${page + 1}/${totalPages})`)
                .body(pageItems.join('\n'))
                .button1('Close');

            if (page + 1 < totalPages) {
                form.button2('Next Page');
            }

            form.show(viewingPlayer).then(response => {
                if (response.canceled || response.selection === 0) return;
                if (response.selection === 1) {
                    showInventoryPage(viewingPlayer, target, page + 1);
                }
            }).catch(e => console.error(`[InvSee] form.show promise rejected: ${e.stack}`));
        }

        showInventoryPage(player, targetPlayer, 0);
    },
});
