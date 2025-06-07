/**
 * @file AntiCheatsBP/scripts/commands/invsee.js
 * Defines the !invsee command for administrators to view a player's inventory.
 * @version 1.0.0
 */
// AntiCheatsBP/scripts/commands/invsee.js
import { permissionLevels } from '../core/rankManager.js';
import { MessageFormData } from '@minecraft/server-ui';
import { ItemComponentTypes } from '@minecraft/server';

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: "invsee",
    syntax: "!invsee <playername>",
    description: "Displays a read-only view of a player's inventory.",
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

    if (args.length < 1) {
        player.sendMessage(`§cUsage: ${config.prefix}invsee <playername>`);
        return;
    }
    const targetPlayerName = args[0];
    const foundPlayer = findPlayer(targetPlayerName, playerUtils);

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
    let inventoryDetails = `§lInventory of ${foundPlayer.nameTag}:§r\n`;
    let itemCount = 0;

    for (let i = 0; i < container.size; i++) {
        const itemStack = container.getItem(i);
        if (itemStack) {
            itemCount++;
            let itemInfo = `§eSlot ${i}:§r ${itemStack.typeId.replace("minecraft:", "")} x${itemStack.amount}`;
            if (itemStack.nameTag) itemInfo += ` | Name: "${itemStack.nameTag}"`;
            try {
                const durabilityComponent = itemStack.getComponent(ItemComponentTypes.Durability);
                if (durabilityComponent) itemInfo += ` | Dur: ${durabilityComponent.maxDurability - durabilityComponent.damage}/${durabilityComponent.maxDurability}`;
            } catch (e) {}
            try {
                const lore = itemStack.getLore();
                if (lore && lore.length > 0) itemInfo += ` | Lore: ["${lore.join('", "')}"]`;
            } catch (e) {}
            try {
                const enchantableComponent = itemStack.getComponent(ItemComponentTypes.Enchantable);
                if (enchantableComponent) {
                    const enchantments = enchantableComponent.getEnchantments();
                    if (enchantments.length > 0) {
                        const enchStrings = enchantments.map(ench => `${ench.type.id.replace("minecraft:", "")} ${ench.level}`);
                        itemInfo += ` | Ench: [${enchStrings.join(", ")}]`;
                    }
                }
            } catch (e) {}
            inventoryDetails += itemInfo + "\n";
        }
    }
    if (itemCount === 0) inventoryDetails += "Inventory is empty.\n";
    if (addLog) addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'invsee', targetName: foundPlayer.nameTag, details: `Viewed inventory of ${foundPlayer.nameTag}` });

    const invForm = new MessageFormData();
    invForm.title(`Inventory: ${foundPlayer.nameTag}`);
    invForm.body(inventoryDetails);
    invForm.button1("Close");
    invForm.show(player).catch(e => playerUtils.debugLog(`Error showing invsee form: ${e}`, player.nameTag));
}
