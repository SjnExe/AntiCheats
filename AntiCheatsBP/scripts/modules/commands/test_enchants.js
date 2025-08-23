import { commandManager } from './commandManager.js';
import { EnchantmentTypes, Enchantment } from '@minecraft/server';

commandManager.register({
    name: 'test_enchants',
    description: 'Tests different ways of accessing enchantment types.',
    category: 'Admin',
    permissionLevel: 1,
    execute: (player, args) => {
        player.sendMessage("§e--- Starting Enchantment API Tests ---");

        // Test A: The original failing method
        try {
            const type = EnchantmentTypes.get('vanishing');
            if (type) {
                player.sendMessage("§aTest A (EnchantmentTypes.get): SUCCESS");
                const ench = new Enchantment(type, 1);
                player.sendMessage(`  -> Created Enchantment: ${ench.type.id} @ level ${ench.level}`);
            } else {
                player.sendMessage("§cTest A (EnchantmentTypes.get): FAILED (returned undefined)");
            }
        } catch (e) {
            player.sendMessage(`§cTest A (EnchantmentTypes.get): FAILED with error: ${e.message}`);
        }

        // Test B: Direct property access (camelCase)
        try {
            const type = EnchantmentTypes.vanishing;
            if (type) {
                player.sendMessage("§aTest B (EnchantmentTypes.vanishing): SUCCESS");
                const ench = new Enchantment(type, 1);
                player.sendMessage(`  -> Created Enchantment: ${ench.type.id} @ level ${ench.level}`);
            } else {
                player.sendMessage("§cTest B (EnchantmentTypes.vanishing): FAILED (property is undefined)");
            }
        } catch (e) {
            player.sendMessage(`§cTest B (EnchantmentTypes.vanishing): FAILED with error: ${e.message}`);
        }

        // Test C: Direct property access (PascalCase)
        try {
            const type = EnchantmentTypes.CurseOfVanishing;
            if (type) {
                player.sendMessage("§aTest C (EnchantmentTypes.CurseOfVanishing): SUCCESS");
                const ench = new Enchantment(type, 1);
                player.sendMessage(`  -> Created Enchantment: ${ench.type.id} @ level ${ench.level}`);
            } else {
                player.sendMessage("§cTest C (EnchantmentTypes.CurseOfVanishing): FAILED (property is undefined)");
            }
        } catch (e) {
            player.sendMessage(`§cTest C (EnchantmentTypes.CurseOfVanishing): FAILED with error: ${e.message}`);
        }

        // Test D: Logging all enchantment types
        try {
            let allTypes = "";
            for (const key in EnchantmentTypes) {
                allTypes += key + ", ";
            }
            if(allTypes.length > 0) {
                player.sendMessage("§eTest D (All Keys in EnchantmentTypes): " + allTypes);
            } else {
                player.sendMessage("§cTest D: Could not find any keys in EnchantmentTypes.");
            }
        } catch (e) {
            player.sendMessage(`§cTest D (All Keys): FAILED with error: ${e.message}`);
        }

        player.sendMessage("§e--- Enchantment API Tests Finished ---");
    },
});
