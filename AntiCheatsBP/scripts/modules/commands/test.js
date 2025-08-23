import { commandManager } from './commandManager.js';
import { ItemStack, Enchantment, EnchantmentTypes } from '@minecraft/server';

commandManager.register({
    name: 'test',
    description: 'A command for debugging issues.',
    category: 'Admin',
    permissionLevel: 0, // Allow owner to use
    execute: (player, args) => {
        const inventory = player.getComponent('inventory');
        if (!inventory) {
            player.sendMessage('§cCould not get your inventory.');
            return;
        }

        // Test 1: Enchant a standard item (diamond sword)
        try {
            player.sendMessage("§eAttempting to give enchanted diamond sword...");
            const sword = new ItemStack('minecraft:diamond_sword', 1);
            const swordEnchantable = sword.getComponent('minecraft:enchantable');
            swordEnchantable.addEnchantment(new Enchantment(EnchantmentTypes.get('vanishing'), 1));
            inventory.container.addItem(sword);
            player.sendMessage("§aSuccessfully gave enchanted diamond sword.");
        } catch (e) {
            player.sendMessage(`§cFailed to give enchanted diamond sword. Error: ${e.message}`);
            console.error(`[TestCommand] Failed on diamond sword: ${e.stack}`);
        }

        // Test 2: Enchant the custom panel item
        try {
            player.sendMessage("§eAttempting to give enchanted panel item...");
            const panelItem = new ItemStack('ac:panel', 1);
            const panelEnchantable = panelItem.getComponent('minecraft:enchantable');
            panelEnchantable.addEnchantment(new Enchantment(EnchantmentTypes.get('vanishing'), 1));
            inventory.container.addItem(panelItem);
            player.sendMessage("§aSuccessfully gave enchanted panel item.");
        } catch (e) {
            player.sendMessage(`§cFailed to give enchanted panel item. Error: ${e.message}`);
            console.error(`[TestCommand] Failed on panel item: ${e.stack}`);
        }
    },
});
