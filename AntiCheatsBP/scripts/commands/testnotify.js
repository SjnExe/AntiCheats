/**
 * @file Defines the !testnotify command for owners to send a test admin notification.
 * Useful for verifying that the admin notification system is working correctly.
 */

import { permissionLevels } from '../core/rankManager.js';

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: 'testnotify',
    syntax: '!testnotify',
    description: 'Sends a test admin notification to verify system functionality.',
    permissionLevel: permissionLevels.owner,
    enabled: true,
};

/**
 * Executes the testnotify command.
 * @param {import('@minecraft/server').Player} player The player executing the command.
 * @param {string[]} _args Command arguments (not used).
 * @param {import('../types.js').Dependencies} dependencies The dependencies object.
 */
export async function execute(player, _args, dependencies) {
    const { playerUtils, logManager, getString } = dependencies;

    const notificationMessage = getString('command.testnotify.message', { playerName: player.nameTag });

    try {
        playerUtils.notifyAdmins(notificationMessage, dependencies, player, null);
        player.sendMessage(getString('command.testnotify.success'));

        logManager.addLog({
            timestamp: Date.now(),
            adminName: player.nameTag,
            actionType: 'commandTestNotify',
            details: 'Successfully sent a test notification.',
        }, dependencies);

    } catch (error) {
        console.error(`[TestNotifyCommand] Error sending test notification for ${player.nameTag}: ${error.stack || error}`);
        player.sendMessage(getString('command.testnotify.error'));
        logManager.addLog({
            timestamp: Date.now(),
            adminName: player.nameTag,
            actionType: 'error',
            context: 'TestNotifyCommandExecute',
            details: `Failed to send test notification: ${error.stack || error}`,
        }, dependencies);
    }
}
