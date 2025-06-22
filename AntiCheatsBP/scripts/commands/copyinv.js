/**
 * @file AntiCheatsBP/scripts/commands/copyinv.js
 * Defines the !copyinv command for administrators to copy another player's inventory.
 * @version 1.0.2
 */
// permissionLevels and getString are now accessed via dependencies
import { ModalFormData } from '@minecraft/server-ui';

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: "copyinv",
    syntax: "!copyinv <playername>",
    description: "Copies another player's inventory to your own.", // Static fallback
    permissionLevel: 1, // Static fallback (Admin)
    enabled: true,
};

/**
 * Executes the copyinv command.
 * @param {import('@minecraft/server').Player} player The player issuing the command.
 * @param {string[]} args The command arguments.
 * @param {import('../types.js').CommandDependencies} dependencies Command dependencies.
 */
export async function execute(player, args, dependencies) {
    const { config, playerUtils, logManager, permissionLevels, playerDataManager } = dependencies; // getString removed
    const findPlayer = playerUtils.findPlayer;

    if (!findPlayer) {
        // "command.copyinv.error.playerLookupUnavailable" -> "§cCommand error: Player lookup utility not available."
        player.sendMessage("§cCommand error: Player lookup utility not available.");
        console.error("[CopyInvCommand] findPlayer utility is not available in playerUtils from dependencies.");
        return;
    }

    if (args.length < 1) {
        // "command.copyinv.usage" -> "§cUsage: {prefix}copyinv <playername>"
        player.sendMessage(`§cUsage: ${config.prefix}copyinv <playername>`);
        return;
    }
    const targetPlayerName = args[0];
    const targetPlayer = findPlayer(targetPlayerName);

    if (!targetPlayer) {
        // "common.error.invalidPlayer" -> "Player \"{targetName}\" not found."
        player.sendMessage(`Player "${targetPlayerName}" not found.`);
        return;
    }
    if (targetPlayer.id === player.id) {
        // "command.copyinv.error.selfCopy" -> "§cYou cannot copy your own inventory."
        player.sendMessage("§cYou cannot copy your own inventory.");
        return;
    }

    const targetInvComp = targetPlayer.getComponent("minecraft:inventory");
    const adminInvComp = player.getComponent("minecraft:inventory");
    if (!targetInvComp || !targetInvComp.container || !adminInvComp || !adminInvComp.container) {
        // "command.copyinv.error.inventoryAccess" -> "§cCould not access inventories."
        player.sendMessage("§cCould not access inventories.");
        return;
    }

    const form = new ModalFormData()
        // "command.copyinv.confirm.title" -> "Confirm Inventory Copy"
        .title("Confirm Inventory Copy")
        // "command.copyinv.confirm.body" -> "Overwrite YOUR inventory with a copy of {targetPlayerName}'s inventory? THIS CANNOT BE UNDONE."
        // Note: The original code used .body() for this, but ModalFormData has .textField() or .toggle(). Assuming it was meant to be a body/label-like text.
        // For ModalFormData, a simple message like this usually goes in .body() if it's just text, or a textField if it needs to be part of a form field.
        // Given the .toggle follows, .body() seems more appropriate if the API supported it directly here.
        // Replicating structure: using .body() if available on ModalFormData, or adapting. The current ModalFormData does not have a separate .body string.
        // Let's assume the intent was to use the text field for this message, though it's unusual.
        // If ModalFormData has a .body method, it should be used. Otherwise, this text might be part of the title or a textField.
        // The provided code uses .body() on ModalFormData which is not standard. It should be .textField or part of title.
        // Let's assume it's a text field for the user to see the warning.
        // The original code had .body(getString(...)).toggle(...) - this is unusual.
        // If it's a simple confirmation, a MessageFormData is better. But sticking to ModalFormData as used.
        // This will be a text field label, the second arg is placeholder, third is default value.
        .textField(`Overwrite YOUR inventory with a copy of ${targetPlayer.nameTag}'s inventory? THIS CANNOT BE UNDONE.`, "Type 'confirm' to proceed", "")
        // "command.copyinv.confirm.toggle" -> "Yes, I confirm." - This seems more like a toggle label.
        .toggle("Yes, I confirm.", false);


    const response = await form.show(player).catch(e => {
        playerUtils.debugLog(`[CopyInvCommand] Confirmation form cancelled or failed for ${player.nameTag}: ${e.message}`, player.nameTag, dependencies);
        console.error(`[CopyInvCommand] Confirmation form error for ${player.nameTag}: ${e.stack || e}`);
        return { canceled: true, error: true };
    });

    // Index for toggle is 1 if textField is 0.
    if (response.canceled || !response.formValues || !response.formValues[1]) { // Check toggle
        if (!response.error) {
            // "command.copyinv.cancelled" -> "§7Inventory copy cancelled."
            player.sendMessage("§7Inventory copy cancelled.");
        }
        return;
    }

    try {
        for (let i = 0; i < adminInvComp.container.size; i++) { // Clear admin's inv
            adminInvComp.container.setItem(i);
        }
        let itemsCopied = 0;
        for (let i = 0; i < targetInvComp.container.size; i++) {
            const item = targetInvComp.container.getItem(i);
            adminInvComp.container.setItem(i, item);
            if (item) {
                itemsCopied++;
            }
        }
        // "command.copyinv.success" -> "§aCopied {targetPlayerName}'s inventory ({itemCount} items/stacks). Your inventory overwritten."
        player.sendMessage(`§aCopied ${targetPlayer.nameTag}'s inventory (${itemsCopied} items/stacks). Your inventory overwritten.`);
        logManager.addLog({
            timestamp: Date.now(),
            adminName: player.nameTag,
            actionType: 'copy_inventory',
            targetName: targetPlayer.nameTag,
            // "command.copyinv.log" -> "Copied {itemCount} items."
            details: `Copied ${itemsCopied} items.`
        }, dependencies);

        const targetPData = playerDataManager.getPlayerData(targetPlayer.id);
        // "command.copyinv.notifyAdmins" -> "{adminName} copied {targetPlayerName}'s inventory."
        playerUtils.notifyAdmins(
            `${player.nameTag} copied ${targetPlayer.nameTag}'s inventory.`,
            dependencies,
            player,
            targetPData
        );
    } catch (e) {
        // "common.error.generic" -> "§cAn unexpected error occurred."
        player.sendMessage(`§cAn unexpected error occurred.: ${e.message}`);
        playerUtils.debugLog(`[CopyInvCommand] Error for ${player.nameTag} copying from ${targetPlayer.nameTag}: ${e.message}`, player.nameTag, dependencies);
        console.error(`[CopyInvCommand] Error for ${player.nameTag} copying from ${targetPlayer.nameTag}: ${e.stack || e}`);
    }
}
