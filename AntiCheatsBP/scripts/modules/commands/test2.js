import { commandManager } from './commandManager.js';
import { Enchantment, EnchantmentTypes } from '@minecraft/server';

commandManager.register({
    name: 'test2',
    description: 'Tests EnchantmentTypes.vanishing',
    category: 'Admin',
    permissionLevel: 1,
    execute: (player, args) => {
        try {
            player.sendMessage("§eRunning Test 2: EnchantmentTypes.vanishing");
            const type = EnchantmentTypes.vanishing;
            if (type) {
                player.sendMessage("§aTest 2 Succeeded.");
            } else {
                player.sendMessage("§cTest 2 FAILED (property is undefined).");
            }
        } catch (e) {
            player.sendMessage(`§cTest 2 FAILED with error: ${e.message}`);
        }
    },
});
