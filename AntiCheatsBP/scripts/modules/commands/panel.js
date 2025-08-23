import { commandManager } from './commandManager.js';
import { ItemStack } from '@minecraft/server';

commandManager.register({
    name: 'panel',
    description: 'Gives you the panel item.',
    category: 'General',
    permissionLevel: 1, // Admins only
    execute: (player, args) => {
        try {
            const inventory = player.getComponent('inventory');
            if (!inventory) {
                player.sendMessage('§cCould not get your inventory.');
                return;
            }

            const panelItem = new ItemStack('ac:panel', 1);
            // const enchantable = panelItem.getComponent('minecraft:enchantable');
            // enchantable.addEnchantment(new Enchantment(EnchantmentTypes.get('vanishing'), 1));

            inventory.container.addItem(panelItem);

            player.sendMessage('§aYou have been given the panel item.');
        } catch (e) {
            player.sendMessage(`§cFailed to give the panel item. Please report this to an admin. Error: ${e.stack}`);
            console.error(`[PanelCommand] Failed to give panel item: ${e.stack}`);
        }
    },
});
