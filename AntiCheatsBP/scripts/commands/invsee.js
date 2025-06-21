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
    const { config, playerUtils, logManager, permissionLevels } = dependencies; // Destructure all needed
    const findPlayer = playerUtils.findPlayer;
    const prefix = config.prefix;

    // definition.description = getString("command.invsee.description");
    // definition.permissionLevel = permissionLevels.admin;

    if (args.length < 1) {
        player.sendMessage(`§cUsage: ${prefix}invsee <playername>`);
        return;
    }
    const targetPlayerName = args[0];
    const foundPlayer = findPlayer(targetPlayerName);

    if (!foundPlayer) {
        player.sendMessage(`§cPlayer '${targetPlayerName}' not found or is not online.`);
        return;
    }

    const inventoryComponent = foundPlayer.getComponent("minecraft:inventory");
    if (!inventoryComponent || !inventoryComponent.container) {
        player.sendMessage(`§cCould not access inventory for ${foundPlayer.nameTag}.`);
        return;
    }

    const container = inventoryComponent.container;
    let inventoryDetails = `Inventory of ${foundPlayer.nameTag}:\n`;
    let itemCount = 0;

    for (let i = 0; i < container.size; i++) {
        const itemStack = container.getItem(i);
        if (itemStack) {
            itemCount++;
            let nameTagText = itemStack.nameTag ? ` (Name: "${itemStack.nameTag}")` : "";

            let durabilityText = "";
            try {
                const durabilityComponent = itemStack.getComponent(ItemComponentTypes.Durability);
                if (durabilityComponent) {
                    durabilityText = ` Dur: ${durabilityComponent.maxDurability - durabilityComponent.damage}/${durabilityComponent.maxDurability}`;
                }
            } catch (e) {/* Component not present or error accessing */}

            let loreText = "";
            try {
                const lore = itemStack.getLore();
                if (lore && lore.length > 0) {
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
                        enchantsText = ` Ench: [${enchStrings.join(", ")}]`;
                    }
                }
            } catch (e) {/* Component not present or error accessing */}

            inventoryDetails += `Slot ${i}: ${itemStack.typeId.replace("minecraft:", "")} x${itemStack.amount}${nameTagText}${durabilityText}${enchantsText}${loreText}`.replace(/\s+\|/g, ' |').replace(/\|\s*$/, '').trim() + "\n";

        }
    }
    if (itemCount === 0) {
        inventoryDetails += "Inventory is empty.";
    }

    logManager.addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'invsee', targetName: foundPlayer.nameTag, details: `Viewed inventory of ${foundPlayer.nameTag}` }, dependencies);

    const invForm = new MessageFormData();
    invForm.title(`Inventory: ${foundPlayer.nameTag}`);
    invForm.body(inventoryDetails.trim());
    invForm.button1("Close");
    invForm.show(player).catch(e => {
        playerUtils.debugLog(`[InvSeeCommand] Error showing invsee form: ${e.message}`, dependencies, player.nameTag);
        console.error(`[InvSeeCommand] Error showing invsee form: ${e.stack || e}`);
    });
}
