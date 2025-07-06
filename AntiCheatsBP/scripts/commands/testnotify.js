/**
 * @file Defines the !testnotify command for administrators to send a test notification.
 */
import { permissionLevels } from '../core/rankManager.js';

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: 'testnotify',
    syntax: '[message...]',
    description: 'Sends a test notification to all online administrators/owners.',
    permissionLevel: permissionLevels.admin,
    enabled: true,
};

/**
 * Executes the !testnotify command.
 * Sends a test notification message to all online admins/owners.
 * @async
 * @param {import('@minecraft/server').Player} player - The player issuing the command.
 * @param {string[]} args - Command arguments (the message to send).
 * @param {import('../types.js').Dependencies} dependencies - Object containing dependencies.
 * @returns {Promise<void>}
 */
export async function execute(player, args, dependencies) {
    const { playerUtils, logManager, getString } = dependencies;
    const adminName = player?.nameTag ?? 'UnknownAdmin';

    const messageToSend = args.length > 0 ? args.join(' ') : getString('command.testnotify.message', { playerName: adminName });

    try {
        const notifiedCount = playerUtils?.notifyAdmins(messageToSend, dependencies, player, null);

        player.sendMessage(getString('command.testnotify.success'));
        playerUtils?.playSoundForEvent(player, "commandSuccess", dependencies);

        logManager?.addLog({
            adminName: adminName,
            actionType: 'testNotificationSent',
            details: `Sent test notification: "${messageToSend}". Notified count (approx): ${notifiedCount ?? 'N/A'}`,
        }, dependencies);

    } catch (error) {
        player.sendMessage(getString('command.testnotify.error'));
        console.error(`[TestNotifyCommand CRITICAL] Error sending test notification from ${adminName}: ${error.stack || error}`);
        playerUtils?.playSoundForEvent(player, "commandError", dependencies);
        logManager?.addLog({
            adminName: adminName,
            actionType: 'errorTestNotification',
            context: 'TestNotifyCommand.execute',
            details: `Failed to send test notification: ${error.message}`,
            errorStack: error.stack || error.toString(),
        }, dependencies);
    }
}
