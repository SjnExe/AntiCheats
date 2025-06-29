/**
 * @file Defines the !invsee command for administrators to view a player's inventory.
 */
import { MessageFormData } from '@minecraft/server-ui';
import { ItemComponentTypes, EntityComponentTypes } from '@minecraft/server';
import { permissionLevels } from '../core/rankManager.js';

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: 'invsee',
    syntax: '!invsee <playername>',
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
 * @param {import('../types.js').CommandDependencies} dependencies - Object containing dependencies.
 * @returns {Promise<void>}
 */
export async function execute(player, args, dependencies) {
    const { config, playerUtils, logManager } = dependencies;
    const prefix = config.prefix;

    if (args.length < 1) {
        player.sendMessage(`§cUsage: ${prefix}invsee <playername>`);
        return;
    }

    const targetPlayerName = args[0];
    const foundPlayer = playerUtils.findPlayer(targetPlayerName);

    if (!foundPlayer) {
        player.sendMessage(`§cPlayer '${targetPlayerName}' not found.`);
        return;
    }

    const inventoryComponent = foundPlayer.getComponent(EntityComponentTypes.Inventory);
    if (!inventoryComponent?.container) {
        player.sendMessage(`§cCould not access ${foundPlayer.nameTag}'s inventory.`);
        return;
    }

    const container = inventoryComponent.container;
    let inventoryDetails = `§6Inventory of ${foundPlayer.nameTag}:§r\n`;
    let itemCount = 0;

    for (let i = 0; i < container.size; i++) {
        const itemStack = container.getItem(i);
        if (itemStack) {
            itemCount++;
            let nameTagText = itemStack.nameTag ? ` (Name: ${itemStack.nameTag})` : '';
            let durabilityText = '';
            try {
                const durabilityComponent = itemStack.getComponent(ItemComponentTypes.Durability);
                if (durabilityComponent) {
                    durabilityText = ` (Dur: ${durabilityComponent.maxDurability - durabilityComponent.damage}/${durabilityComponent.maxDurability})`;
                }
            } catch (e) { /* Component might not exist, ignore */ }

            let loreText = '';
            const lore = itemStack.getLore();
            if (lore && lore.length > 0) {
                loreText = ` (Lore: ['${lore.join('\', \'')}'])`;
            }

            let enchantsText = '';
            try {
                const enchantableComponent = itemStack.getComponent(ItemComponentTypes.Enchantable);
                if (enchantableComponent) {
                    const enchantments = enchantableComponent.getEnchantments();
                    if (enchantments.length > 0) {
                        const enchStrings = enchantments.map(ench => `${ench.type.id.replace('minecraft:', '')} ${ench.level}`);
                        enchantsText = ` (Enchants: ${enchStrings.join(', ')})`;
                    }
                }
            } catch (e) { /* Component might not exist or item not enchantable, ignore */ }

            inventoryDetails += `§eSlot ${i}: §f${itemStack.typeId.replace('minecraft:', '')} §7x${itemStack.amount}${nameTagText}${durabilityText}${enchantsText}${loreText}\n`;
        }
    }

    if (itemCount === 0) {
        inventoryDetails += '§7(Inventory is empty)\n';
    }

    try {
        logManager.addLog({
            timestamp: Date.now(),
            adminName: player.nameTag,
            actionType: 'invsee',
            targetName: foundPlayer.nameTag,
            details: `Viewed inventory of ${foundPlayer.nameTag}`,
        }, dependencies);

        const invForm = new MessageFormData();
        invForm.title(`Inventory: ${foundPlayer.nameTag}`);
        invForm.body(inventoryDetails.trim());
        invForm.button1('Close');

        await invForm.show(player);
    } catch (e) {
        playerUtils.debugLog(`[InvSeeCommand] Error showing invsee form: ${e.message}`, player.nameTag, dependencies);
        console.error(`[InvSeeCommand] Error showing invsee form for ${player.nameTag}: ${e.stack || e}`);
        player.sendMessage('§cAn error occurred while trying to display the inventory.');
        logManager.addLog({
            adminName: player.nameTag,
            actionType: 'error',
            context: 'invseeCommand.formDisplay',
            details: `Failed to display inventory for ${foundPlayer.nameTag}: ${e.message}`,
        }, dependencies);
    }
}
