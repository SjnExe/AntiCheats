import { commandManager } from './commandManager.js';
import { Enchantment, EnchantmentTypes } from '@minecraft/server';

commandManager.register({
    name: 'test1',
    description: 'Tests EnchantmentTypes.get()',
    category: 'Admin',
    permissionLevel: 1,
    execute: (player, args) => {
        try {
            player.sendMessage("§eRunning Test 1: EnchantmentTypes.get('vanishing')");
            const type = EnchantmentTypes.get('vanishing');
            if (type) {
                player.sendMessage("§aTest 1 Succeeded.");
            } else {
                player.sendMessage("§cTest 1 FAILED (returned undefined).");
            }
        } catch (e) {
            player.sendMessage(`§cTest 1 FAILED with error: ${e.message}`);
        }
    },
});
