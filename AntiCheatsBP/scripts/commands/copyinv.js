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
    const { config, playerUtils, logManager, getString, permissionLevels, playerDataManager } = dependencies;
    const findPlayer = playerUtils.findPlayer;

    if (!findPlayer) {
        player.sendMessage(getString("command.copyinv.error.playerLookupUnavailable"));
        console.error("[CopyInvCommand] findPlayer utility is not available in playerUtils from dependencies.");
        return;
    }

    if (args.length < 1) {
        player.sendMessage(getString("command.copyinv.usage", { prefix: config.prefix }));
        return;
    }
    const targetPlayerName = args[0];
    const targetPlayer = findPlayer(targetPlayerName);

    if (!targetPlayer) {
        player.sendMessage(getString("common.error.invalidPlayer", { targetName: targetPlayerName }));
        return;
    }
    if (targetPlayer.id === player.id) {
        player.sendMessage(getString("command.copyinv.error.selfCopy"));
        return;
    }

    const targetInvComp = targetPlayer.getComponent("minecraft:inventory");
    const adminInvComp = player.getComponent("minecraft:inventory");
    if (!targetInvComp || !targetInvComp.container || !adminInvComp || !adminInvComp.container) {
        player.sendMessage(getString("command.copyinv.error.inventoryAccess"));
        return;
    }

    const form = new ModalFormData()
        .title(getString("command.copyinv.confirm.title"))
        .body(getString("command.copyinv.confirm.body", { targetPlayerName: targetPlayer.nameTag }))
        .toggle(getString("command.copyinv.confirm.toggle"), false);

    const response = await form.show(player).catch(e => {
        playerUtils.debugLog(`[CopyInvCommand] Confirmation form cancelled or failed for ${player.nameTag}: ${e.message}`, player.nameTag, dependencies); // No change needed here
        console.error(`[CopyInvCommand] Confirmation form error for ${player.nameTag}: ${e.stack || e}`);
        return { canceled: true, error: true }; // Ensure error prop for later check
    });

    if (response.canceled || !response.formValues || !response.formValues[0]) {
        if (!response.error) { // Only send cancellation message if it wasn't an error
            player.sendMessage(getString("command.copyinv.cancelled"));
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
        player.sendMessage(getString("command.copyinv.success", { targetPlayerName: targetPlayer.nameTag, itemCount: itemsCopied }));
        logManager.addLog({
            timestamp: Date.now(),
            adminName: player.nameTag,
            actionType: 'copy_inventory',
            targetName: targetPlayer.nameTag,
            details: getString("command.copyinv.log", { itemCount: itemsCopied })
        }, dependencies);

        const targetPData = playerDataManager.getPlayerData(targetPlayer.id); // Pass dependencies if getPlayerData expects it
        playerUtils.notifyAdmins(
            getString("command.copyinv.notifyAdmins", { adminName: player.nameTag, targetPlayerName: targetPlayer.nameTag }),
            dependencies,
            player,
            targetPData
        );
    } catch (e) {
        player.sendMessage(getString("common.error.generic") + `: ${e.message}`);
        playerUtils.debugLog(`[CopyInvCommand] Error for ${player.nameTag} copying from ${targetPlayer.nameTag}: ${e.message}`, player.nameTag, dependencies);
        console.error(`[CopyInvCommand] Error for ${player.nameTag} copying from ${targetPlayer.nameTag}: ${e.stack || e}`);
    }
}
