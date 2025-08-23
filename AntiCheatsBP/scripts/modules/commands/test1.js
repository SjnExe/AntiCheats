import { commandManager } from './commandManager.js';
import { ItemStack } from '@minecraft/server';

commandManager.register({
    name: 'test1',
    description: 'Control test: Gives a plain diamond sword.',
    category: 'Admin',
    permissionLevel: 0,
    execute: (player, args) => {
        try {
            player.sendMessage("§eRunning Test 1: Giving plain diamond sword...");
            const inventory = player.getComponent('inventory');
            if (!inventory) {
                player.sendMessage('§cCould not get your inventory.');
                return;
            }
            const sword = new ItemStack('minecraft:diamond_sword', 1);
            inventory.container.addItem(sword);
            player.sendMessage("§aTest 1 Succeeded: Gave plain diamond sword.");
        } catch (e) {
            player.sendMessage(`§cTest 1 Failed. Error: ${e.message}`);
            console.error(`[Test1Command] Failed: ${e.stack}`);
        }
    },
});
