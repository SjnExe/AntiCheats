/**
 * @file AntiCheatsBP/scripts/commands/invsee.js
 * Defines the !invsee command for administrators to view a player's inventory.
 * @version 1.0.3
 */
// permissionLevels and getString are now accessed via dependencies
import { MessageFormData } from '@minecraft/server-ui';
import { ItemComponentTypes } from '@minecraft/server'; // This is a specific type import, fine to keep.

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: "invsee",
    syntax: "!invsee <playername>",
    description: "Views a player's inventory.", // Static fallback
    permissionLevel: 1, // Static fallback (Admin)
    enabled: true,
};

/**
 * Executes the invsee command.
 * @param {import('@minecraft/server').Player} player The player issuing the command.
 * @param {string[]} args The command arguments.
 * @param {import('../types.js').CommandDependencies} dependencies Command dependencies.
 */
export async function execute(player, args, dependencies) {
    const { config, playerUtils, logManager, permissionLevels } = dependencies; // getString removed
    const findPlayer = playerUtils.findPlayer;
    const prefix = config.prefix;

    // Static definitions are used

    if (args.length < 1) {
        // Placeholder: "command.invsee.usage" (Not in en_US.js) -> Using syntax
        player.sendMessage(`§cUsage: ${prefix}invsee <playername>`);
        return;
    }
    const targetPlayerName = args[0];
    const foundPlayer = findPlayer(targetPlayerName);

    if (!foundPlayer) {
        // Placeholder: "command.invsee.error.notFound" (Not in en_US.js)
        player.sendMessage(`§cPlayer "${targetPlayerName}" not found.`);
        return;
    }

    const inventoryComponent = foundPlayer.getComponent("minecraft:inventory");
    if (!inventoryComponent || !inventoryComponent.container) {
        // Placeholder: "command.invsee.error.noInventory" (Not in en_US.js)
        player.sendMessage(`§cCould not access inventory for ${foundPlayer.nameTag}.`);
        return;
    }

    const container = inventoryComponent.container;
    // Placeholder: "command.invsee.form.bodyHeader" (Not in en_US.js)
    let inventoryDetails = `Inventory of ${foundPlayer.nameTag}:\n`;
    let itemCount = 0;

    for (let i = 0; i < container.size; i++) {
        const itemStack = container.getItem(i);
        if (itemStack) {
            itemCount++;
            // Placeholder: "command.invsee.form.itemEntry.nameTag" (Not in en_US.js)
            let nameTagText = itemStack.nameTag ? ` (Name: ${itemStack.nameTag})` : "";

            let durabilityText = "";
            try {
                const durabilityComponent = itemStack.getComponent(ItemComponentTypes.Durability);
                if (durabilityComponent) {
                    // Placeholder: "command.invsee.form.itemEntry.durability" (Not in en_US.js)
                    durabilityText = ` Dur: ${durabilityComponent.maxDurability - durabilityComponent.damage}/${durabilityComponent.maxDurability}`;
                }
            } catch (e) {/* Component not present or error accessing */}

            let loreText = "";
            try {
                const lore = itemStack.getLore();
                if (lore && lore.length > 0) {
                    // Placeholder: "command.invsee.form.itemEntry.lore" (Not in en_US.js)
                    loreText = ` Lore: ["${lore.join('", "')}"]`;
                }
            } catch (e) {/* Error accessing lore */}

            let enchantsText = "";
            try {
                const enchantableComponent = itemStack.getComponent(ItemComponentTypes.Enchantable);
                if (enchantableComponent) {
                    const enchantments = enchantableComponent.getEnchantments();
                    if (enchantments.length > 0) {
                        const enchStrings = enchantments.map(ench => `${ench.type.id.replace("minecraft:", "")} ${ench.level}`);
                        // Placeholder: "command.invsee.form.itemEntry.enchants" (Not in en_US.js)
                        enchantsText = ` Enchants: ${enchStrings.join(", ")}`;
                    }
                }
            } catch (e) {/* Component not present or error accessing */}

            // Placeholder: "command.invsee.form.itemEntry" (Not in en_US.js)
            // Constructing a readable format based on the placeholders previously used.
            inventoryDetails += `Slot ${i}: ${itemStack.typeId.replace("minecraft:", "")} x${itemStack.amount}${nameTagText}${durabilityText}${enchantsText}${loreText}\n`;
        }
    }
    if (itemCount === 0) {
        // Placeholder: "command.invsee.form.emptyInventory" (Not in en_US.js)
        inventoryDetails += "Inventory is empty.\n";
    }

    logManager.addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'invsee', targetName: foundPlayer.nameTag, details: `Viewed inventory of ${foundPlayer.nameTag}` }, dependencies);

    const invForm = new MessageFormData();
    // Placeholder: "command.invsee.form.title" (Not in en_US.js)
    invForm.title(`Inventory: ${foundPlayer.nameTag}`);
    invForm.body(inventoryDetails.trim());
    // "common.button.close" -> "Close"
    invForm.button1("Close");
    invForm.show(player).catch(e => {
        playerUtils.debugLog(`[InvSeeCommand] Error showing invsee form: ${e.message}`, player.nameTag, dependencies);
        console.error(`[InvSeeCommand] Error showing invsee form: ${e.stack || e}`);
    });
}
