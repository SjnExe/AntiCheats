/**
 * @file Defines the !invsee command for administrators to view a player's inventory.
 */
import { MessageFormData } from '@minecraft/server-ui';
import { ItemComponentTypes, EntityComponentTypes } from '@minecraft/server'; // Added EntityComponentTypes
import { permissionLevels } from '../core/rankManager.js'; // Standardized import

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: 'invsee',
    syntax: '!invsee <playername>',
    description: 'Views a player\'s inventory.',
    permissionLevel: permissionLevels.admin, // Use a defined level
    enabled: true,
};

/**
 * Executes the !invsee command.
 * Displays the target player's inventory in a message form to the command issuer.
 * @async
 * @param {import('@minecraft/server').Player} player - The player issuing the command.
 * @param {string[]} args - Command arguments: <playername>.
 * @param {import('../types.js').CommandDependencies} dependencies - Object containing dependencies.
 * @returns {Promise<void>}
 */
export async function execute(player, args, dependencies) {
    const { config, playerUtils, logManager, getString } = dependencies; // Removed unused permissionLevels
    const prefix = config.prefix;

    if (args.length < 1) {
        player.sendMessage(getString('invsee.error.usage', { prefix: prefix }));
        return;
    }

    const targetPlayerName = args[0];
    const foundPlayer = playerUtils.findPlayer(targetPlayerName);

    if (!foundPlayer) {
        player.sendMessage(getString('common.error.playerNotFound', { playerName: targetPlayerName }));
        return;
    }

    const inventoryComponent = foundPlayer.getComponent(EntityComponentTypes.Inventory); // Standardized component access
    if (!inventoryComponent?.container) { // Added optional chaining
        player.sendMessage(getString('invsee.error.inventoryAccess', { playerName: foundPlayer.nameTag }));
        return;
    }

    const container = inventoryComponent.container;
    let inventoryDetails = getString('invsee.form.header', { playerName: foundPlayer.nameTag }) + '\n';
    let itemCount = 0;

    for (let i = 0; i < container.size; i++) {
        const itemStack = container.getItem(i);
        if (itemStack) {
            itemCount++;
            let nameTagText = itemStack.nameTag ? getString('invsee.item.nameTag', { nameTag: itemStack.nameTag }) : '';
            let durabilityText = '';
            try {
                const durabilityComponent = itemStack.getComponent(ItemComponentTypes.Durability);
                if (durabilityComponent) {
                    durabilityText = getString('invsee.item.durability', { current: (durabilityComponent.maxDurability - durabilityComponent.damage).toString(), max: durabilityComponent.maxDurability.toString() });
                }
            } catch (e) { /* Component might not exist, ignore */ }

            let loreText = '';
            const lore = itemStack.getLore();
            if (lore && lore.length > 0) {
                loreText = getString('invsee.item.lore', { loreLines: `['${lore.join('\', \'')}']` });
            }

            let enchantsText = '';
            try {
                const enchantableComponent = itemStack.getComponent(ItemComponentTypes.Enchantable);
                if (enchantableComponent) {
                    const enchantments = enchantableComponent.getEnchantments();
                    if (enchantments.length > 0) {
                        const enchStrings = enchantments.map(ench => `${ench.type.id.replace('minecraft:', '')} ${ench.level}`);
                        enchantsText = getString('invsee.item.enchants', { enchants: enchStrings.join(', ') });
                    }
                }
            } catch (e) { /* Component might not exist or item not enchantable, ignore */ }

            inventoryDetails += getString('invsee.item.format', {
                slot: i.toString(),
                itemId: itemStack.typeId.replace('minecraft:', ''),
                amount: itemStack.amount.toString(),
                nameTag: nameTagText,
                durability: durabilityText,
                enchants: enchantsText,
                lore: loreText,
            }).replace(/\s\(\s*\)/g, '').replace(/,\s*$/, '').trim() + '\n'; // Clean up empty parentheticals or trailing commas
        }
    }

    if (itemCount === 0) {
        inventoryDetails += getString('invsee.inventoryEmpty') + '\n';
    }

    try {
        logManager.addLog({
            timestamp: Date.now(),
            adminName: player.nameTag,
            actionType: 'invsee', // Standardized
            targetName: foundPlayer.nameTag,
            details: `Viewed inventory of ${foundPlayer.nameTag}`,
        }, dependencies);

        const invForm = new MessageFormData();
        invForm.title(getString('invsee.form.title', { playerName: foundPlayer.nameTag }));
        invForm.body(inventoryDetails.trim());
        invForm.button1(getString('common.button.close')); // Standardized button text

        await invForm.show(player);
        // No .then() needed if we're not doing anything after close, catch handles error
    } catch (e) {
        playerUtils.debugLog(`[InvSeeCommand] Error showing invsee form: ${e.message}`, player.nameTag, dependencies);
        console.error(`[InvSeeCommand] Error showing invsee form for ${player.nameTag}: ${e.stack || e}`);
        player.sendMessage(getString('common.error.genericForm'));
        // Log the error for invsee form display
        logManager.addLog({
            adminName: player.nameTag,
            actionType: 'error',
            context: 'invseeCommand.formDisplay',
            details: `Failed to display inventory for ${foundPlayer.nameTag}: ${e.message}`,
        }, dependencies);
    }
}
