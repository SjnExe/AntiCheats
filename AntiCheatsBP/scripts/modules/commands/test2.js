import { commandManager } from './commandManager.js';
import { ItemStack, Enchantment, EnchantmentTypes } from '@minecraft/server';

commandManager.register({
    name: 'test2',
    description: 'Enchantment API test.',
    category: 'Admin',
    permissionLevel: 1,
    execute: (player, args) => {
        try {
            player.sendMessage("§eRunning Test 2: Attempting to use Enchantment API...");
            const type = EnchantmentTypes.get('vanishing');
            if (!type) {
                player.sendMessage("§cTest 2 Failed: EnchantmentTypes.get('vanishing') returned undefined.");
                return;
            }
            const enchantment = new Enchantment(type, 1);
            player.sendMessage("§aTest 2 Succeeded: Created Enchantment object successfully.");
        } catch (e) {
            player.sendMessage(`§cTest 2 Failed. Error: ${e.message}`);
            console.error(`[Test2Command] Failed: ${e.stack}`);
        }
    },
});
