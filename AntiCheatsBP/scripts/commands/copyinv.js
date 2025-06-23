/**
 * Defines the !copyinv command for administrators to copy another player's inventory.
 */
import { ModalFormData } from '@minecraft/server-ui';
import { permissionLevels as importedPermissionLevels } from '../core/rankManager.js'; // Import permissionLevels
/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: "copyinv",
    syntax: "!copyinv <playername>",
    description: "Copies another player's inventory to your own.",
    permissionLevel: importedPermissionLevels.admin, // Use imported enum
    enabled: true,
};
/**
 * Executes the copyinv command.
 */
export async function execute(player, args, dependencies) {
    const { config, playerUtils, logManager, permissionLevels, playerDataManager } = dependencies;
    const findPlayer = playerUtils.findPlayer;

    if (args.length < 1) {
        player.sendMessage(`§cUsage: ${config.prefix}copyinv <playername>`);
        return;
    }
    const targetPlayerName = args[0];
    const targetPlayer = findPlayer(targetPlayerName);

    if (!targetPlayer) {
        player.sendMessage(`Player "${targetPlayerName}" not found.`);
        return;
    }
    if (targetPlayer.id === player.id) {
        player.sendMessage("§cYou cannot copy your own inventory.");
        return;
    }

    const targetInvComp = targetPlayer.getComponent("minecraft:inventory");
    const adminInvComp = player.getComponent("minecraft:inventory");
    if (!targetInvComp || !targetInvComp.container || !adminInvComp || !adminInvComp.container) {
        player.sendMessage("§cCould not access inventories.");
        return;
    }

    const form = new ModalFormData()
        .title("Confirm Inventory Copy")
        .textField(`Overwrite YOUR inventory with a copy of ${targetPlayer.nameTag}'s inventory? THIS CANNOT BE UNDONE.`, "Type 'confirm' to proceed", "")
        .toggle("Yes, I confirm.", false);

    const response = await form.show(player).catch(e => {
        playerUtils.debugLog(`[CopyInvCommand] Confirmation form cancelled or failed for ${player.nameTag}: ${e.message}`, player.nameTag, dependencies);
        console.error(`[CopyInvCommand] Confirmation form error for ${player.nameTag}: ${e.stack || e}`);
        return { canceled: true, error: true };
    });

    if (response.canceled || !response.formValues || !response.formValues[1]) {
        if (!response.error) {
            player.sendMessage("§7Inventory copy cancelled.");
        }
        return;
    }

    try {
        for (let i = 0; i < adminInvComp.container.size; i++) {
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
        player.sendMessage(`§aCopied ${targetPlayer.nameTag}'s inventory (${itemsCopied} items/stacks). Your inventory overwritten.`);
        logManager.addLog({
            timestamp: Date.now(),
            adminName: player.nameTag,
            actionType: 'copy_inventory',
            targetName: targetPlayer.nameTag,
            details: `Copied ${itemsCopied} items.`
        }, dependencies);

        const targetPData = playerDataManager.getPlayerData(targetPlayer.id);
        playerUtils.notifyAdmins(
            `${player.nameTag} copied ${targetPlayer.nameTag}'s inventory.`,
            dependencies,
            player,
            targetPData
        );
    } catch (e) {
        player.sendMessage(`§cAn unexpected error occurred.: ${e.message}`);
        playerUtils.debugLog(`[CopyInvCommand] Error for ${player.nameTag} copying from ${targetPlayer.nameTag}: ${e.message}`, player.nameTag, dependencies);
        console.error(`[CopyInvCommand] Error for ${player.nameTag} copying from ${targetPlayer.nameTag}: ${e.stack || e}`);
    }
}
