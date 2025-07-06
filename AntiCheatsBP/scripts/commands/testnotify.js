/**
 * @file Defines the !testnotify command for administrators to send a test notification.
 */
// Assuming permissionLevels is a static export for now.
import { permissionLevels } from '../core/rankManager.js';

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: 'testnotify',
    syntax: '[message...]', // Prefix handled by commandManager
    description: 'Sends a test notification to all online administrators/owners.',
    permissionLevel: permissionLevels.admin, // Or owner, depending on desired restriction
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
        // playerUtils.notifyAdmins should handle checking individual admin notification preferences.
        // The third argument to notifyAdmins is the 'relatedPlayer' (can be null if system message).
        // The fourth argument is 'relatedPlayerData' (can be null).
        const notifiedCount = playerUtils?.notifyAdmins(messageToSend, dependencies, player, null);

        player.sendMessage(getString('command.testnotify.success'));
        playerUtils?.playSoundForEvent(player, "commandSuccess", dependencies);

        logManager?.addLog({
            adminName: adminName,
            actionType: 'testNotificationSent', // Standardized camelCase
            details: `Sent test notification: "${messageToSend}". Notified count (approx): ${notifiedCount ?? 'N/A'}`,
        }, dependencies);

    } catch (error) {
        player.sendMessage(getString('command.testnotify.error'));
        console.error(`[TestNotifyCommand CRITICAL] Error sending test notification from ${adminName}: ${error.stack || error}`);
        playerUtils?.playSoundForEvent(player, "commandError", dependencies);
        logManager?.addLog({
            adminName: adminName,
            actionType: 'errorTestNotification', // Standardized camelCase
            context: 'TestNotifyCommand.execute',
            details: `Failed to send test notification: ${error.message}`,
            errorStack: error.stack || error.toString(),
        }, dependencies);
    }
}
