/**
 * @file Defines the !copyinv command for administrators to copy another player's inventory.
 */
import { ModalFormData } from '@minecraft/server-ui';
import * as mc from '@minecraft/server';

/** @type {import('../types.js').CommandDefinition} */
export const definition = {
    name: 'copyinv',
    syntax: '<playername>',
    description: 'Copies another player\'s inventory to your own. This overwrites your current inventory.',
    aliases: ['ci'],
    permissionLevel: 1, // admin
    enabled: true,
};

/**
 * Executes the !copyinv command.
 * Allows an admin to overwrite their own inventory with a copy of a target player's inventory,
 * after a confirmation step.
 * @async
 * @param {import('@minecraft/server').Player} player - The admin player issuing the command.
 * @param {string[]} args - Command arguments: <playername>.
 * @param {import('../types.js').Dependencies} dependencies - Object containing dependencies.
 * @returns {Promise<void>}
 */
export async function execute(player, args, dependencies) {
    const { config, playerUtils, logManager, playerDataManager, getString } = dependencies;
    const adminName = player?.nameTag ?? 'UnknownAdmin';
    const prefix = config?.prefix ?? '!';

    if (args.length < 1) {
        player?.sendMessage(getString('command.copyinv.usage', { prefix }));
        return;
    }

    const targetPlayerName = args[0];
    const targetPlayer = playerUtils?.findPlayer(targetPlayerName);

    if (!targetPlayer || !targetPlayer.isValid()) {
        player?.sendMessage(getString('command.copyinv.playerNotFound', { playerName: targetPlayerName }));
        return;
    }

    if (targetPlayer.id === player.id) {
        player?.sendMessage(getString('command.copyinv.cannotSelf'));
        return;
    }

    let targetInvComp, adminInvComp;
    try {
        targetInvComp = targetPlayer.getComponent(mc.EntityComponentTypes.Inventory);
        adminInvComp = player.getComponent(mc.EntityComponentTypes.Inventory);
    } catch (e) {
        player?.sendMessage(getString('command.copyinv.noAccess'));
        playerUtils?.debugLog(`[CopyInvCommand CRITICAL] Error getting inventory components: ${e.message}`, adminName, dependencies);
        console.error(`[CopyInvCommand CRITICAL] Error getting inventory components: ${e.stack || e}`);
        return;
    }


    if (!targetInvComp?.container || !adminInvComp?.container) {
        player?.sendMessage(getString('command.copyinv.noAccess'));
        return;
    }

    const form = new ModalFormData()
        .title(getString('ui.copyinv.confirm.title'))
        .textField(getString('ui.copyinv.confirm.body', { targetPlayerName: targetPlayer.nameTag }), getString('ui.copyinv.confirm.placeholder'), '')
        .toggle(getString('ui.copyinv.confirm.toggle'), false);

    let response;
    try {
        response = await form.show(player);
    } catch (formError) {
        playerUtils?.debugLog(`[CopyInvCommand CRITICAL] Confirmation form error for ${adminName}: ${formError.message}`, adminName, dependencies);
        console.error(`[CopyInvCommand CRITICAL] Confirmation form error for ${adminName}: ${formError.stack || formError}`);
        if (formError.cancelationReason !== mc.FormCancelationReason.UserBusy && formError.cancelationReason !== mc.FormCancelationReason.UserClosed) {
            player?.sendMessage(getString('command.copyinv.error.form'));
        }
        return;
    }

    if (response.canceled || !response.formValues || response.formValues[1] !== true || response.formValues[0]?.toLowerCase() !== 'confirm') {
        if (!response.canceled || (response.cancelationReason !== mc.FormCancelationReason.UserBusy && response.cancelationReason !== mc.FormCancelationReason.UserClosed)) {
            player?.sendMessage(getString('command.copyinv.cancelled'));
        }
        playerUtils?.debugLog(`[CopyInvCommand] Confirmation form cancelled or not confirmed by ${adminName}. Reason: ${response.cancelationReason}`, adminName, dependencies);
        return;
    }


    try {
        for (let i = 0; i < adminInvComp.container.size; i++) {
            adminInvComp.container.setItem(i, undefined);
        }

        let itemsCopied = 0;
        for (let i = 0; i < targetInvComp.container.size; i++) {
            const item = targetInvComp.container.getItem(i);
            adminInvComp.container.setItem(i, item);
            if (item) {
                itemsCopied++;
            }
        }

        player?.sendMessage(getString('command.copyinv.success', { targetPlayerName: targetPlayer.nameTag, itemsCopied: itemsCopied.toString() }));
        playerUtils?.playSoundForEvent(player, 'commandSuccess', dependencies);

        logManager?.addLog({
            adminName,
            actionType: 'inventoryCopied',
            targetName: targetPlayer.nameTag,
            targetId: targetPlayer.id,
            details: `Copied ${itemsCopied} items/stacks from ${targetPlayer.nameTag} to ${adminName}.`,
        }, dependencies);

        const targetPData = playerDataManager?.getPlayerData(targetPlayer.id);
        if (config?.notifyOnCopyInventory !== false) {
            const baseNotifyMsg = getString('command.copyinv.notify.copiedSimple', { adminName, targetPlayerName: targetPlayer.nameTag });
            playerUtils?.notifyAdmins(baseNotifyMsg, dependencies, player, targetPData);
        }

    } catch (e) {
        player?.sendMessage(getString('command.copyinv.error.generic', { errorMessage: e.message }));
        playerUtils?.debugLog(`[CopyInvCommand CRITICAL] Error for ${adminName} copying from ${targetPlayer.nameTag}: ${e.message}`, adminName, dependencies);
        console.error(`[CopyInvCommand CRITICAL] Error for ${adminName} copying from ${targetPlayer.nameTag}: ${e.stack || e}`);
        playerUtils?.playSoundForEvent(player, 'commandError', dependencies);
        logManager?.addLog({
            adminName,
            actionType: 'errorCopyInventory',
            context: 'CopyInvCommand.execution',
            targetName: targetPlayer.nameTag,
            targetId: targetPlayer.id,
            details: `Failed to copy inventory from ${targetPlayer.nameTag}: ${e.message}`,
            errorStack: e.stack || e.toString(),
        }, dependencies);
    }
}
