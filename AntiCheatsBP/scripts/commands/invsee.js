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
    const { config, playerUtils, logManager, getString } = dependencies;
    const prefix = config.prefix;

    if (args.length < 1) {
        player.sendMessage(getString('command.invsee.usage', { prefix: prefix }));
        return;
    }

    const targetPlayerName = args[0];
    const foundPlayer = playerUtils.findPlayer(targetPlayerName);

    if (!foundPlayer) {
        player.sendMessage(getString('common.error.playerNotFound', { playerName: targetPlayerName }));
        return;
    }

    const inventoryComponent = foundPlayer.getComponent(EntityComponentTypes.Inventory);
    if (!inventoryComponent?.container) {
        player.sendMessage(getString('command.invsee.noAccess', { playerName: foundPlayer.nameTag }));
        return;
    }

    const container = inventoryComponent.container;
    let inventoryDetails = getString('ui.invsee.header', { playerName: foundPlayer.nameTag }) + '\n';
    let itemCount = 0;

    for (let i = 0; i < container.size; i++) {
        const itemStack = container.getItem(i);
        if (itemStack) {
            itemCount++;
            let nameTagText = itemStack.nameTag ? getString('command.invsee.item.nameTag', { nameTag: itemStack.nameTag }) : '';
            let durabilityText = '';
            try {
                const durabilityComponent = itemStack.getComponent(ItemComponentTypes.Durability);
                if (durabilityComponent) {
                    durabilityText = getString('command.invsee.item.durability', { currentDurability: (durabilityComponent.maxDurability - durabilityComponent.damage).toString(), maxDurability: durabilityComponent.maxDurability.toString() });
                }
            } catch (e) { /* Component might not exist, ignore */ }

            let loreText = '';
            const lore = itemStack.getLore();
            if (lore && lore.length > 0) {
                loreText = getString('command.invsee.item.lore', { loreEntries: lore.join("', '") });
            }

            let enchantsText = '';
            try {
                const enchantableComponent = itemStack.getComponent(ItemComponentTypes.Enchantable);
                if (enchantableComponent) {
                    const enchantments = enchantableComponent.getEnchantments();
                    if (enchantments.length > 0) {
                        const enchStrings = enchantments.map(ench => `${ench.type.id.replace('minecraft:', '')} ${ench.level}`);
                        enchantsText = getString('command.invsee.item.enchants', { enchantEntries: enchStrings.join(', ') });
                    }
                }
            } catch (e) { /* Component might not exist or item not enchantable, ignore */ }

            inventoryDetails += getString('ui.invsee.slotEntry', { slotNum: i.toString(), itemId: itemStack.typeId.replace('minecraft:', ''), amount: itemStack.amount.toString(), nameTagText, durabilityText, enchantsText, loreText }) + '\n';
        }
    }

    if (itemCount === 0) {
        inventoryDetails += getString('ui.invsee.empty') + '\n';
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
        invForm.title(getString('ui.invsee.title', { playerName: foundPlayer.nameTag }));
        invForm.body(inventoryDetails.trim());
        invForm.button1(getString('common.button.close'));

        await invForm.show(player);
    } catch (e) {
        playerUtils.debugLog(`[InvSeeCommand] Error showing invsee form: ${e.message}`, player.nameTag, dependencies);
        console.error(`[InvSeeCommand] Error showing invsee form for ${player.nameTag}: ${e.stack || e}`);
        player.sendMessage(getString('command.invsee.error.display'));
        logManager.addLog({
            adminName: player.nameTag,
            actionType: 'errorInvseeDisplay', // More specific
            context: 'InvSeeCommand.formDisplay', // Consistent casing with other logs
            details: `Failed to display inventory for ${foundPlayer.nameTag}: ${e.message}`,
        }, dependencies);
    }
}
