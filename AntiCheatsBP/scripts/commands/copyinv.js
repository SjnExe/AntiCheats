/**
 * @file AntiCheatsBP/scripts/commands/copyinv.js
 * Defines the !copyinv command for administrators to copy another player's inventory.
 * @version 1.0.1
 */
import { permissionLevels } from '../core/rankManager.js';
import { ModalFormData } from '@minecraft/server-ui';
import { getString } from '../core/i18n.js';

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: "copyinv",
    syntax: "!copyinv <playername>",
    description: getString("command.copyinv.description"),
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
    const findPlayerFunc = depFindPlayer || (playerUtils && playerUtils.findPlayer);

    if (!findPlayerFunc) {
        player.sendMessage(getString("command.copyinv.error.playerLookupUnavailable"));
        console.error("[copyinvCmd] findPlayer utility is not available in dependencies.");
        return;
    }

    if (args.length < 1) {
        player.sendMessage(getString("command.copyinv.usage", { prefix: config.prefix }));
        return;
    }
    const targetPlayerName = args[0];
    const targetPlayer = findPlayerFunc(targetPlayerName, playerUtils);

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
        if (config.enableDebugLogging) {
            playerUtils.debugLog(`copyinv confirmation form cancelled or failed for ${player.nameTag}: ${e}`, player.nameTag);
        }
        return { canceled: true };
    });

    if (response.canceled || !response.formValues || !response.formValues[0]) {
        player.sendMessage(getString("command.copyinv.cancelled"));
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
        if (addLog) {
            addLog({
                timestamp: Date.now(),
                adminName: player.nameTag,
                actionType: 'copy_inventory',
                targetName: targetPlayer.nameTag,
                details: getString("command.copyinv.log", { itemCount: itemsCopied })
            });
        }
        if (playerUtils.notifyAdmins) {
            const targetPData = dependencies.playerDataManager.getPlayerData(targetPlayer.id); // For context
            playerUtils.notifyAdmins(
                getString("command.copyinv.notifyAdmins", { adminName: player.nameTag, targetPlayerName: targetPlayer.nameTag }),
                player,
                targetPData
            );
        }
    } catch (e) {
        player.sendMessage(getString("common.error.generic") + `: ${e}`); // Keep specific error for debug, but generic for user
        if (config.enableDebugLogging) {
            playerUtils.debugLog(`copyinv error for ${player.nameTag} from ${targetPlayer.nameTag}: ${e}`, player.nameTag);
        }
    }
}
