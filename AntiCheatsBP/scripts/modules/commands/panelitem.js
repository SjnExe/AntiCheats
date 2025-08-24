import { commandManager } from './commandManager.js';
import { ItemStack, MinecraftEnchantmentTypes } from '@minecraft/server';

commandManager.register({
    name: 'panelitem',
    description: 'Gives you the panel item.',
    category: 'Utility',
    permissionLevel: 1024, // Everyone
    execute: (player, args) => {
        const container = player.getComponent('inventory').container;

        // Check if player already has the item
        for (let i = 0; i < container.size; i++) {
            const item = container.getItem(i);
            if (item && item.typeId === 'ac:panel') {
                player.sendMessage('§cYou already have the panel item.');
                return;
            }
        }

        // Check if inventory is full
        if (container.emptySlotsCount === 0) {
            player.sendMessage('§cYour inventory is full.');
            return;
        }

        const panelItem = new ItemStack('ac:panel', 1);
        panelItem.getComponent('enchantable')?.addEnchantment({ type: MinecraftEnchantmentTypes.vanishing, level: 1 });
        container.addItem(panelItem);
        player.sendMessage('§aYou have received the panel item.');
    }
});
