/**
 * @file AntiCheatsBP/scripts/commands/invsee.js
 * Defines the !invsee command for administrators to view a player's inventory.
 * @version 1.0.1
 */
import { permissionLevels } from '../core/rankManager.js';
import { MessageFormData } from '@minecraft/server-ui';
import { ItemComponentTypes } from '@minecraft/server';
import { getString } from '../../core/localizationManager.js'; // Import getString

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: "invsee",
    syntax: "!invsee <playername>",
    description: getString("command.invsee.description"),
    permissionLevel: permissionLevels.admin
};

/**
 * Executes the invsee command.
 * @param {import('@minecraft/server').Player} player The player issuing the command.
 * @param {string[]} args The command arguments.
 * @param {import('../types.js').CommandDependencies} dependencies Command dependencies.
 */
export async function execute(player, args, dependencies) {
    const { config, playerUtils, addLog, findPlayer } = dependencies;
    const prefix = config.prefix;

    if (args.length < 1) {
        player.sendMessage(getString("command.invsee.usage", { prefix: prefix }));
        return;
    }
    const targetPlayerName = args[0];
    const foundPlayer = findPlayer(targetPlayerName, playerUtils);

    if (!foundPlayer) {
        player.sendMessage(getString("command.invsee.error.notFound", { playerName: targetPlayerName }));
        return;
    }

    const inventoryComponent = foundPlayer.getComponent("minecraft:inventory");
    if (!inventoryComponent || !inventoryComponent.container) {
        player.sendMessage(getString("command.invsee.error.noInventory", { playerName: foundPlayer.nameTag }));
        return;
    }

    const container = inventoryComponent.container;
    let inventoryDetails = getString("command.invsee.form.bodyHeader", { playerName: foundPlayer.nameTag });
    let itemCount = 0;

    for (let i = 0; i < container.size; i++) {
        const itemStack = container.getItem(i);
        if (itemStack) {
            itemCount++;
            let nameTagText = itemStack.nameTag ? getString("command.invsee.form.itemEntry.nameTag", { nameTag: itemStack.nameTag }) : "";

            let durabilityText = "";
            try {
                const durabilityComponent = itemStack.getComponent(ItemComponentTypes.Durability);
                if (durabilityComponent) {
                    durabilityText = getString("command.invsee.form.itemEntry.durability", { currentDurability: durabilityComponent.maxDurability - durabilityComponent.damage, maxDurability: durabilityComponent.maxDurability });
                }
            } catch (e) {/* Component not present or error accessing */}

            let loreText = "";
            try {
                const lore = itemStack.getLore();
                if (lore && lore.length > 0) {
                    loreText = getString("command.invsee.form.itemEntry.lore", { loreString: lore.join('", "') });
                }
            } catch (e) {/* Error accessing lore */}

            let enchantsText = "";
            try {
                const enchantableComponent = itemStack.getComponent(ItemComponentTypes.Enchantable);
                if (enchantableComponent) {
                    const enchantments = enchantableComponent.getEnchantments();
                    if (enchantments.length > 0) {
                        const enchStrings = enchantments.map(ench => `${ench.type.id.replace("minecraft:", "")} ${ench.level}`);
                        enchantsText = getString("command.invsee.form.itemEntry.enchants", { enchantsString: enchStrings.join(", ") });
                    }
                }
            } catch (e) {/* Component not present or error accessing */}

            inventoryDetails += getString("command.invsee.form.itemEntry", {
                slotNum: i,
                itemName: itemStack.typeId.replace("minecraft:", ""),
                itemAmount: itemStack.amount,
                nameTag: nameTagText,
                durability: durabilityText,
                enchants: enchantsText,
                lore: loreText
            }).replace(/\s+\|/g, ' |').replace(/\|\s*$/, '').trim() + "\n"; // Clean up extra spaces and trailing pipes

        }
    }
    if (itemCount === 0) {
        inventoryDetails += getString("command.invsee.form.emptyInventory");
    }

    if (addLog) addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'invsee', targetName: foundPlayer.nameTag, details: `Viewed inventory of ${foundPlayer.nameTag}` });

    const invForm = new MessageFormData();
    invForm.title(getString("command.invsee.form.title", { playerName: foundPlayer.nameTag }));
    invForm.body(inventoryDetails.trim());
    invForm.button1(getString("common.button.close"));
    invForm.show(player).catch(e => playerUtils.debugLog(`Error showing invsee form: ${e}`, player.nameTag));
}
