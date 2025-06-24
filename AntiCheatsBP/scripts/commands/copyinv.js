/**
 * @file Defines the !copyinv command for administrators to copy another player's inventory.
 */
import { ModalFormData } from '@minecraft/server-ui';
import { permissionLevels } from '../core/rankManager.js'; // Standardized import
import * as mc from '@minecraft/server'; // For mc.Player and mc.EntityComponentTypes

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: 'copyinv',
    syntax: '!copyinv <playername>',
    description: 'Copies another player\'s inventory to your own.',
    permissionLevel: permissionLevels.admin, // Use a defined level
    enabled: true,
};

/**
 * Executes the !copyinv command.
 * Allows an admin to overwrite their own inventory with a copy of a target player's inventory,
 * after a confirmation step.
 * @async
 * @param {import('@minecraft/server').Player} player - The admin player issuing the command.
 * @param {string[]} args - Command arguments: <playername>.
 * @param {import('../types.js').CommandDependencies} dependencies - Object containing dependencies.
 * @returns {Promise<void>}
 */
export async function execute(player, args, dependencies) {
    const { config, playerUtils, logManager, playerDataManager, getString } = dependencies; // Removed unused permissionLevels

    if (args.length < 1) {
        player.sendMessage(getString('copyinv.error.usage', { prefix: config.prefix }));
        return;
    }

    const targetPlayerName = args[0];
    const targetPlayer = playerUtils.findPlayer(targetPlayerName);

    if (!targetPlayer) {
        player.sendMessage(getString('common.error.playerNotFound', { playerName: targetPlayerName }));
        return;
    }

    if (targetPlayer.id === player.id) {
        player.sendMessage(getString('copyinv.error.selfCopy'));
        return;
    }

    const targetInvComp = targetPlayer.getComponent(mc.EntityComponentTypes.Inventory);
    const adminInvComp = player.getComponent(mc.EntityComponentTypes.Inventory);

    if (!targetInvComp?.container || !adminInvComp?.container) {
        player.sendMessage(getString('copyinv.error.inventoryAccess'));
        return;
    }

    const form = new ModalFormData()
        .title(getString('copyinv.form.title'))
        .textField(getString('copyinv.form.textFieldLabel', { targetPlayerName: targetPlayer.nameTag }), getString('copyinv.form.textFieldPlaceholder'), '')
        .toggle(getString('copyinv.form.toggleLabel'), false);

    try {
        const response = await form.show(player);

        if (response.canceled || !response.formValues || !response.formValues[1] || response.formValues[0]?.toLowerCase() !== 'confirm') {
            if (!response.canceled || response.cancelationReason !== 'UserBusy') { // Avoid double message if busy
                 player.sendMessage(getString('copyinv.cancelled'));
            }
            playerUtils.debugLog(`[CopyInvCommand] Confirmation form cancelled or not confirmed by ${player.nameTag}. Reason: ${response.cancelationReason}`, player.nameTag, dependencies);
            return;
        }
    } catch (formError) {
        playerUtils.debugLog(`[CopyInvCommand] Confirmation form error for ${player.nameTag}: ${formError.message}`, player.nameTag, dependencies);
        console.error(`[CopyInvCommand] Confirmation form error for ${player.nameTag}: ${formError.stack || formError}`);
        player.sendMessage(getString('common.error.genericForm'));
        return;
    }

    try {
        // Clear admin's current inventory
        for (let i = 0; i < adminInvComp.container.size; i++) {
            adminInvComp.container.setItem(i); // Undefined clears the slot
        }

        let itemsCopied = 0;
        // Copy target's inventory to admin
        for (let i = 0; i < targetInvComp.container.size; i++) {
            const item = targetInvComp.container.getItem(i);
            adminInvComp.container.setItem(i, item); // item can be undefined, which is fine
            if (item) {
                itemsCopied++;
            }
        }

        player.sendMessage(getString('copyinv.success', { targetPlayerName: targetPlayer.nameTag, count: itemsCopied.toString() }));
        logManager.addLog({
            timestamp: Date.now(),
            adminName: player.nameTag,
            actionType: 'copyInventory', // Standardized actionType
            targetName: targetPlayer.nameTag,
            details: `Copied ${itemsCopied} items/stacks.`,
        }, dependencies);

        const targetPData = playerDataManager.getPlayerData(targetPlayer.id);
        playerUtils.notifyAdmins(
            getString('copyinv.adminNotification', { adminName: player.nameTag, targetPlayerName: targetPlayer.nameTag }),
            dependencies,
            player,
            targetPData
        );
    } catch (e) {
        player.sendMessage(getString('copyinv.error.unexpected', { error: e.message }));
        playerUtils.debugLog(`[CopyInvCommand] Error for ${player.nameTag} copying from ${targetPlayer.nameTag}: ${e.message}`, player.nameTag, dependencies);
        console.error(`[CopyInvCommand] Error for ${player.nameTag} copying from ${targetPlayer.nameTag}: ${e.stack || e}`);
        logManager.addLog({
            adminName: player.nameTag,
            actionType: 'error',
            context: 'copyInvCommand.execution',
            details: `Failed to copy inventory from ${targetPlayer.nameTag}: ${e.message}`,
        }, dependencies);
    }
}
