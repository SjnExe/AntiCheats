/**
 * @file AntiCheatsBP/scripts/commands/copyinv.js
 * Defines the !copyinv command for administrators to copy another player's inventory.
 * @version 1.0.0
 */
// AntiCheatsBP/scripts/commands/copyinv.js
import { permissionLevels } from '../core/rankManager.js';
import { ModalFormData } from '@minecraft/server-ui'; // Specific UI import

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: "copyinv",
    syntax: "!copyinv <playername>",
    description: "Copies another player's inventory to your own.",
    permissionLevel: permissionLevels.admin
};

/**
 * Executes the copyinv command.
 * @param {import('@minecraft/server').Player} player The player issuing the command.
 * @param {string[]} args The command arguments.
 * @param {import('../types.js').CommandDependencies} dependencies Command dependencies.
 */
export async function execute(player, args, dependencies) {
    const { config, playerUtils, addLog, findPlayer: depFindPlayer } = dependencies;
    // Use findPlayer from dependencies (which itself might be a local fallback in commandManager or from playerUtils)
    const findPlayerFunc = depFindPlayer || (playerUtils && playerUtils.findPlayer);

    if (!findPlayerFunc) {
        player.sendMessage("§cCommand error: Player lookup utility not available.");
        console.error("[copyinvCmd] findPlayer utility is not available in dependencies.");
        return;
    }

    if (args.length < 1) {
        player.sendMessage(`§cUsage: ${config.prefix}copyinv <playername>`);
        return;
    }
    const targetPlayerName = args[0];
    const targetPlayer = findPlayerFunc(targetPlayerName, playerUtils);

    if (!targetPlayer) { player.sendMessage(`§cPlayer "${targetPlayerName}" not found.`); return; }
    if (targetPlayer.id === player.id) { player.sendMessage("§cYou cannot copy your own inventory."); return; }

    const targetInvComp = targetPlayer.getComponent("minecraft:inventory");
    const adminInvComp = player.getComponent("minecraft:inventory");
    if (!targetInvComp || !targetInvComp.container || !adminInvComp || !adminInvComp.container) {
        player.sendMessage("§cCould not access inventories."); return;
    }

    const form = new ModalFormData()
        .title("Confirm Inventory Copy")
        .body(`Overwrite YOUR inventory with a copy of ${targetPlayer.nameTag}'s inventory? THIS CANNOT BE UNDONE.`)
        .toggle("Yes, I confirm.", false);

    const response = await form.show(player).catch(e => {
        if(playerUtils.debugLog) playerUtils.debugLog(`copyinv confirmation form cancelled or failed for ${player.nameTag}: ${e}`, player.nameTag);
        return { canceled: true }; // Ensure a response object for cancellation check
    });

    if (response.canceled || !response.formValues || !response.formValues[0]) { // Added check for formValues
        player.sendMessage("§7Inventory copy cancelled."); return;
    }

    try {
        for (let i = 0; i < adminInvComp.container.size; i++) { // Clear admin's inv
            adminInvComp.container.setItem(i);
        }
        let itemsCopied = 0;
        for (let i = 0; i < targetInvComp.container.size; i++) {
            const item = targetInvComp.container.getItem(i);
            adminInvComp.container.setItem(i, item); // item can be undefined, which clears the slot
            if (item) itemsCopied++;
        }
        player.sendMessage(`§aCopied ${targetPlayer.nameTag}'s inventory (${itemsCopied} items/stacks). Your inventory overwritten.`);
        if (addLog) addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'copy_inventory', targetName: targetPlayer.nameTag, details: `Copied ${itemsCopied} items.` });
        if (playerUtils.notifyAdmins) playerUtils.notifyAdmins(`${player.nameTag} copied ${targetPlayer.nameTag}'s inventory.`, player, null);
    } catch (e) {
        player.sendMessage(`§cError copying inventory: ${e}`);
        if (playerUtils.debugLog) playerUtils.debugLog(`copyinv error for ${player.nameTag} from ${targetPlayer.nameTag}: ${e}`, player.nameTag);
    }
}
