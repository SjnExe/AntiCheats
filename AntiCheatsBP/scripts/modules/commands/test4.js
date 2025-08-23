import { commandManager } from './commandManager.js';
import { EnchantmentTypes } from '@minecraft/server';

commandManager.register({
    name: 'test4',
    description: 'Lists all keys in EnchantmentTypes.',
    category: 'Admin',
    permissionLevel: 1,
    execute: (player, args) => {
        try {
            player.sendMessage("§eRunning Test 4: Listing all keys in EnchantmentTypes...");
            let allKeys = "";
            for (const key in EnchantmentTypes) {
                allKeys += key + ", ";
            }
            if (allKeys.length > 0) {
                player.sendMessage("§aTest 4 Keys: " + allKeys);
            } else {
                player.sendMessage("§cTest 4 FAILED: Could not find any keys in EnchantmentTypes.");
            }
        } catch (e) {
            player.sendMessage(`§cTest 4 FAILED with error: ${e.message}`);
        }
    },
});
