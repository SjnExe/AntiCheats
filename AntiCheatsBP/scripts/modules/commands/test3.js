import { commandManager } from './commandManager.js';
import { Enchantment, EnchantmentTypes } from '@minecraft/server';

commandManager.register({
    name: 'test3',
    description: 'Tests EnchantmentTypes.CurseOfVanishing',
    category: 'Admin',
    permissionLevel: 1,
    execute: (player, args) => {
        try {
            player.sendMessage("§eRunning Test 3: EnchantmentTypes.CurseOfVanishing");
            const type = EnchantmentTypes.CurseOfVanishing;
            if (type) {
                player.sendMessage("§aTest 3 Succeeded.");
            } else {
                player.sendMessage("§cTest 3 FAILED (property is undefined).");
            }
        } catch (e) {
            player.sendMessage(`§cTest 3 FAILED with error: ${e.message}`);
        }
    },
});
