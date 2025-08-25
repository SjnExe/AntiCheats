import { commandManager } from './commandManager.js';
import { showPanel } from '../../core/uiManager.js';
import { ItemStack, EnchantmentType } from '@minecraft/server';

commandManager.register({
    name: 'panel',
    aliases: ['ui', 'gui'],
    description: 'Opens the main UI panel or gives you the panel item.',
    category: 'General',
    permissionLevel: 1, // Admin and above
    execute: (player, args) => {
        if (args[0]?.toLowerCase() === 'get') {
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
            panelItem.getComponent('enchantable')?.addEnchantment({ type: new EnchantmentType('vanishing'), level: 1 });
            container.addItem(panelItem);
            player.sendMessage('§aYou have received the panel item.');
        } else {
            // Default action: open the panel directly
            showPanel(player, 'mainPanel');
        }
    }
});
