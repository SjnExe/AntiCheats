import { MessageFormData } from '@minecraft/server-ui';
import * as mc from '@minecraft/server';

/** @type {import('../types.js').CommandDefinition} */
export const definition = {
    name: 'invsee',
    syntax: '<playername>',
    description: 'Views a player\'s inventory.',
    permissionLevel: 1, // admin
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
    const usageMessage = `§cUsage: ${prefix}invsee <playername>`;

    if (args.length < 1) {
        player.sendMessage(usageMessage);
        return;
    }

    const targetPlayerName = args[0];
    const foundPlayer = playerUtils?.findPlayer(targetPlayerName);

    if (!foundPlayer || !foundPlayer.isValid()) {
        player.sendMessage(getString('common.error.playerNotFoundOnline', { playerName: targetPlayerName }));
        return;
    }

    let inventoryComponent;
    inventoryComponent = foundPlayer.getComponent(mc.EntityComponentTypes.Inventory);


    if (!inventoryComponent?.container) {
        player.sendMessage(getString('command.invsee.noAccess', { playerName: foundPlayer.nameTag }));
        return;
    }

    const container = inventoryComponent.container;
    let inventoryDetails = `${getString('ui.invsee.header', { playerName: foundPlayer.nameTag }) }\n`;
    let itemCount = 0;

    for (let i = 0; i < container.size; i++) {
        const itemStack = container.getItem(i);
        if (itemStack) {
            itemCount++;
            const nameTagText = itemStack.nameTag ? getString('command.invsee.item.nameTag', { nameTag: itemStack.nameTag }) : '';
            let durabilityText = '';
            const durabilityComponent = itemStack.getComponent(mc.ItemComponentTypes.Durability);
            if (durabilityComponent) {
                durabilityText = getString('command.invsee.item.durability', { currentDurability: (durabilityComponent.maxDurability - durabilityComponent.damage).toString(), maxDurability: durabilityComponent.maxDurability.toString() });
            }

            let loreText = '';
            const lore = itemStack.getLore();
            if (lore && lore.length > 0) {
                loreText = getString('command.invsee.item.lore', { loreEntries: lore.join('\', \'') });
            }

            let enchantsText = '';
            const enchantableComponent = itemStack.getComponent(mc.ItemComponentTypes.Enchantable);
            if (enchantableComponent) {
                const enchantments = enchantableComponent.getEnchantments();
                if (enchantments.length > 0) {
                    const enchStrings = enchantments.map(ench => `${ench.type.id.replace('minecraft:', '')} ${ench.level}`);
                    enchantsText = getString('command.invsee.item.enchants', { enchantEntries: enchStrings.join(', ') });
                }
            }

            inventoryDetails += `${getString('ui.invsee.slotEntry', {
                slotNum: i.toString(),
                itemId: itemStack.typeId.replace('minecraft:', ''),
                amount: itemStack.amount.toString(),
                nameTagText,
                durabilityText,
                enchantsText,
                loreText,
            }) }\n`;
        }
    }

    if (itemCount === 0) {
        inventoryDetails += `${getString('ui.invsee.empty') }\n`;
    }

    try {
        logManager?.addLog({
            adminName,
            actionType: 'inventoryViewed',
            targetName: foundPlayer.nameTag,
            targetId: foundPlayer.id,
            details: `Viewed inventory of ${foundPlayer.nameTag}`,
        }, dependencies);

        const invForm = new MessageFormData();
        invForm.title(getString('ui.invsee.title', { playerName: foundPlayer.nameTag }));
        invForm.body(inventoryDetails.trim());
        invForm.button1(getString('common.button.close'));

        playerUtils?.playSoundForEvent(player, 'uiFormOpen', dependencies);
        await invForm.show(player);

    } catch (e) {
        playerUtils?.debugLog(`[InvSeeCommand CRITICAL] Error showing invsee form for ${adminName}: ${e.message}`, adminName, dependencies);
        console.error(`[InvSeeCommand CRITICAL] Error showing invsee form for ${adminName}: ${e.stack || e}`);
        player.sendMessage(getString('command.invsee.error.display'));
        logManager?.addLog({
            adminName,
            actionType: 'errorInvseeDisplay',
            context: 'InvSeeCommand.formDisplay',
            targetName: foundPlayer.nameTag,
            targetId: foundPlayer.id,
            details: `Failed to display inventory for ${foundPlayer.nameTag}: ${e.message}`,
            errorStack: e.stack || e.toString(),
        }, dependencies);
    }
}
