/**
 * @file Defines the !invsee command for administrators to view a player's inventory.
 */
import { MessageFormData } from '@minecraft/server-ui';
import * as mc from '@minecraft/server'; // For mc.ItemComponentTypes, mc.EntityComponentTypes
// Assuming permissionLevels is a static export for now.
import { permissionLevels } from '../core/rankManager.js';

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: 'invsee',
    syntax: '<playername>', // Prefix handled by commandManager
    description: 'Views a player\'s inventory.',
    permissionLevel: permissionLevels.admin,
    enabled: true,
};

/**
 * Executes the !invsee command.
 * Displays the target player's inventory in a message form to the command issuer.
 * @async
 * @param {import('@minecraft/server').Player} player - The player issuing the command.
 * @param {string[]} args - Command arguments: <playername>.
 * @param {import('../types.js').Dependencies} dependencies - Object containing dependencies.
 * @returns {Promise<void>}
 */
export async function execute(player, args, dependencies) {
    const { config, playerUtils, logManager, getString } = dependencies;
    const adminName = player?.nameTag ?? 'UnknownAdmin';
    const prefix = config?.prefix ?? '!';

    if (args.length < 1) {
        player.sendMessage(getString('command.invsee.usage', { prefix: prefix }));
        return;
    }

    const targetPlayerName = args[0];
    const foundPlayer = playerUtils?.findPlayer(targetPlayerName);

    if (!foundPlayer || !foundPlayer.isValid()) { // Added isValid
        player.sendMessage(getString('common.error.playerNotFoundOnline', { playerName: targetPlayerName }));
        return;
    }

    let inventoryComponent;
    try {
        inventoryComponent = foundPlayer.getComponent(mc.EntityComponentTypes.Inventory);
    } catch (e) {
        player.sendMessage(getString('command.invsee.noAccess', { playerName: foundPlayer.nameTag }));
        playerUtils?.debugLog(`[InvSeeCommand CRITICAL] Error getting inventory component for ${foundPlayer.nameTag}: ${e.message}`, adminName, dependencies);
        console.error(`[InvSeeCommand CRITICAL] Error getting inventory component for ${foundPlayer.nameTag}: ${e.stack || e}`);
        return;
    }


    if (!inventoryComponent?.container) {
        player.sendMessage(getString('command.invsee.noAccess', { playerName: foundPlayer.nameTag }));
        return;
    }

    const container = inventoryComponent.container;
    let inventoryDetails = getString('ui.invsee.header', { playerName: foundPlayer.nameTag }) + '\n';
    let itemCount = 0;

    for (let i = 0; i < container.size; i++) {
        const itemStack = container.getItem(i); // This is an ItemStack or undefined
        if (itemStack) { // Check if itemStack is not undefined
            itemCount++;
            let nameTagText = itemStack.nameTag ? getString('command.invsee.item.nameTag', { nameTag: itemStack.nameTag }) : '';
            let durabilityText = '';
            try {
                // mc.ItemComponentTypes.Durability is correct
                const durabilityComponent = itemStack.getComponent(mc.ItemComponentTypes.Durability);
                if (durabilityComponent) {
                    durabilityText = getString('command.invsee.item.durability', { currentDurability: (durabilityComponent.maxDurability - durabilityComponent.damage).toString(), maxDurability: durabilityComponent.maxDurability.toString() });
                }
            } catch (e) { /* Component might not exist, ignore */ }

            let loreText = '';
            const lore = itemStack.getLore(); // Returns string[]
            if (lore && lore.length > 0) {
                loreText = getString('command.invsee.item.lore', { loreEntries: lore.join("', '") });
            }

            let enchantsText = '';
            try {
                // mc.ItemComponentTypes.Enchantable is correct
                const enchantableComponent = itemStack.getComponent(mc.ItemComponentTypes.Enchantable);
                if (enchantableComponent) {
                    const enchantments = enchantableComponent.getEnchantments(); // Returns Enchantment[]
                    if (enchantments.length > 0) {
                        const enchStrings = enchantments.map(ench => `${ench.type.id.replace('minecraft:', '')} ${ench.level}`);
                        enchantsText = getString('command.invsee.item.enchants', { enchantEntries: enchStrings.join(', ') });
                    }
                }
            } catch (e) { /* Component might not exist or item not enchantable, ignore */ }

            inventoryDetails += getString('ui.invsee.slotEntry', {
                slotNum: i.toString(),
                itemId: itemStack.typeId.replace('minecraft:', ''),
                amount: itemStack.amount.toString(),
                nameTagText,
                durabilityText,
                enchantsText,
                loreText
            }) + '\n';
        }
    }

    if (itemCount === 0) {
        inventoryDetails += getString('ui.invsee.empty') + '\n';
    }

    try {
        logManager?.addLog({
            adminName: adminName,
            actionType: 'inventoryViewed', // Standardized camelCase
            targetName: foundPlayer.nameTag,
            targetId: foundPlayer.id,
            details: `Viewed inventory of ${foundPlayer.nameTag}`,
        }, dependencies);

        const invForm = new MessageFormData();
        invForm.title(getString('ui.invsee.title', { playerName: foundPlayer.nameTag }));
        invForm.body(inventoryDetails.trim());
        invForm.button1(getString('common.button.close')); // Changed from OK to Close for consistency

        playerUtils?.playSoundForEvent(player, "uiFormOpen", dependencies);
        await invForm.show(player);
        // No specific success sound for just viewing, form open sound is enough.

    } catch (e) {
        playerUtils?.debugLog(`[InvSeeCommand CRITICAL] Error showing invsee form for ${adminName}: ${e.message}`, adminName, dependencies);
        console.error(`[InvSeeCommand CRITICAL] Error showing invsee form for ${adminName}: ${e.stack || e}`);
        player.sendMessage(getString('command.invsee.error.display'));
        logManager?.addLog({
            adminName: adminName,
            actionType: 'errorInvseeDisplay',
            context: 'InvSeeCommand.formDisplay',
            targetName: foundPlayer.nameTag,
            targetId: foundPlayer.id,
            details: `Failed to display inventory for ${foundPlayer.nameTag}: ${e.message}`,
            errorStack: e.stack || e.toString(),
        }, dependencies);
    }
}
