/**
 * @file Defines the !copyinv command for administrators to copy another player's inventory.
 */
import { ModalFormData } from '@minecraft/server-ui';
import { permissionLevels } from '../core/rankManager.js'; // Standardized import
import * as mc from '@minecraft/server';

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
    const { config, playerUtils, logManager, playerDataManager } = dependencies;

    if (args.length < 1) {
        player.sendMessage(`§cUsage: ${config.prefix}copyinv <playername>`);
        return;
    }

    const targetPlayerName = args[0];
    const targetPlayer = playerUtils.findPlayer(targetPlayerName);

    if (!targetPlayer) {
        player.sendMessage(`§cPlayer '${targetPlayerName}' not found.`);
        return;
    }

    if (targetPlayer.id === player.id) {
        player.sendMessage('§cYou cannot copy your own inventory.');
        return;
    }

    const targetInvComp = targetPlayer.getComponent(mc.EntityComponentTypes.Inventory);
    const adminInvComp = player.getComponent(mc.EntityComponentTypes.Inventory);

    if (!targetInvComp?.container || !adminInvComp?.container) {
        player.sendMessage('§cCould not access inventories.');
        return;
    }

    const form = new ModalFormData()
        .title('Confirm Inventory Copy')
        .textField(`Type 'confirm' to copy ${targetPlayer.nameTag}'s inventory. THIS WILL OVERWRITE YOUR CURRENT INVENTORY.`, 'Type "confirm" here', '')
        .toggle('Yes, I understand my inventory will be overwritten.', false);

    try {
        const response = await form.show(player);

        if (response.canceled || !response.formValues || !response.formValues[1] || response.formValues[0]?.toLowerCase() !== 'confirm') {
            if (!response.canceled || response.cancelationReason !== 'UserBusy') { // Avoid double message if busy
                 player.sendMessage('§eInventory copy cancelled.');
            }
            playerUtils.debugLog(`[CopyInvCommand] Confirmation form cancelled or not confirmed by ${player.nameTag}. Reason: ${response.cancelationReason}`, player.nameTag, dependencies);
            return;
        }
    } catch (formError) {
        playerUtils.debugLog(`[CopyInvCommand] Confirmation form error for ${player.nameTag}: ${formError.message}`, player.nameTag, dependencies);
        console.error(`[CopyInvCommand] Confirmation form error for ${player.nameTag}: ${formError.stack || formError}`);
        player.sendMessage('§cAn error occurred with the confirmation form.');
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

        player.sendMessage(`§aSuccessfully copied ${targetPlayer.nameTag}'s inventory (${itemsCopied} items/stacks).`);
        logManager.addLog({
            timestamp: Date.now(),
            adminName: player.nameTag,
            actionType: 'copyInventory', // Standardized actionType
            targetName: targetPlayer.nameTag,
            details: `Copied ${itemsCopied} items/stacks.`,
        }, dependencies);

        const targetPData = playerDataManager.getPlayerData(targetPlayer.id);
        playerUtils.notifyAdmins(
            `§7[Admin] §e${player.nameTag}§7 copied the inventory of §e${targetPlayer.nameTag}§7.`,
            dependencies,
            player,
            targetPData
        );
    } catch (e) {
        player.sendMessage(`§cAn unexpected error occurred: ${e.message}`);
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
