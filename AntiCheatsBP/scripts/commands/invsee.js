/**
 * Defines the !invsee command for administrators to view a player's inventory.
 */
import { MessageFormData } from '@minecraft/server-ui';
import { ItemComponentTypes } from '@minecraft/server';
import { permissionLevels as importedPermissionLevels } from '../core/rankManager.js'; // Import permissionLevels
/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: "invsee",
    syntax: "!invsee <playername>",
    description: "Views a player's inventory.",
    permissionLevel: importedPermissionLevels.admin, // Use imported enum
    enabled: true,
};
/**
 * Executes the invsee command.
 */
export async function execute(player, args, dependencies) {
    const { config, playerUtils, logManager, permissionLevels } = dependencies;
    const findPlayer = playerUtils.findPlayer;
    const prefix = config.prefix;

    if (args.length < 1) {
        player.sendMessage(`§cUsage: ${prefix}invsee <playername>`);
        return;
    }
    const targetPlayerName = args[0];
    const foundPlayer = findPlayer(targetPlayerName);

    if (!foundPlayer) {
        player.sendMessage(`§cPlayer "${targetPlayerName}" not found.`);
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
            let nameTagText = itemStack.nameTag ? ` (Name: ${itemStack.nameTag})` : "";
            let durabilityText = "";
            const durabilityComponent = itemStack.getComponent(ItemComponentTypes.Durability);
            if (durabilityComponent) {
                durabilityText = ` Dur: ${durabilityComponent.maxDurability - durabilityComponent.damage}/${durabilityComponent.maxDurability}`;
            }

            let loreText = "";
            const lore = itemStack.getLore();
            if (lore && lore.length > 0) {
                loreText = ` Lore: ["${lore.join('", "')}"]`;
            }

            let enchantsText = "";
            try {
                const enchantableComponent = itemStack.getComponent(ItemComponentTypes.Enchantable);
                if (enchantableComponent) {
                    const enchantments = enchantableComponent.getEnchantments();
                    if (enchantments.length > 0) {
                        const enchStrings = enchantments.map(ench => `${ench.type.id.replace("minecraft:", "")} ${ench.level}`);
                        enchantsText = ` Enchants: ${enchStrings.join(", ")}`;
                    }
                }
            } catch (e) {}
            inventoryDetails += `Slot ${i}: ${itemStack.typeId.replace("minecraft:", "")} x${itemStack.amount}${nameTagText}${durabilityText}${enchantsText}${loreText}\n`;
        }
    }
    if (itemCount === 0) {
        inventoryDetails += "Inventory is empty.\n";
    }

    logManager.addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'invsee', targetName: foundPlayer.nameTag, details: `Viewed inventory of ${foundPlayer.nameTag}` }, dependencies);

    const invForm = new MessageFormData();
    invForm.title(`Inventory: ${foundPlayer.nameTag}`);
    invForm.body(inventoryDetails.trim());
    invForm.button1("Close");
    invForm.show(player).catch(e => {
        playerUtils.debugLog(`[InvSeeCommand] Error showing invsee form: ${e.message}`, player.nameTag, dependencies);
        console.error(`[InvSeeCommand] Error showing invsee form: ${e.stack || e}`);
    });
}
