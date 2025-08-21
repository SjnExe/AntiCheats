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

        const inventory = targetPlayer.getComponent('inventory').container;
        let inventoryDetails = `§6Inventory of ${targetPlayer.name}:\n`;
        let itemCount = 0;

        for (let i = 0; i < inventory.size; i++) {
            const item = inventory.getItem(i);
            if (item) {
                itemCount++;
                inventoryDetails += `§eSlot ${i}: §f${item.typeId.replace('minecraft:', '')} §7x${item.amount}\n`;
            }
        }

        if (itemCount === 0) {
            inventoryDetails += '§7(Inventory is empty)';
        }

        const form = new MessageFormData()
            .title(`Inventory: ${targetPlayer.name}`)
            .body(inventoryDetails.trim())
            .button1('§cClose');

        form.show(player);
    },
});
