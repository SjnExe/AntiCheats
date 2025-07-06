/**
 * @file Defines the !notify command for administrators to manage their AntiCheat system notification preferences.
 */
// Assuming permissionLevels is a static export for now.
import { permissionLevels } from '../core/rankManager.js';

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: 'notify',
    syntax: '[on|off|toggle|status]', // Prefix handled by commandManager
    description: 'Manages your AntiCheat system notification preferences.',
    permissionLevel: permissionLevels.admin, // Only admins can manage their notifications
    enabled: true,
};

/**
 * Executes the !notify command.
 * Allows administrators to toggle their AntiCheat notifications on/off or check their current status.
 * Preferences are stored using a field in PlayerAntiCheatData (`pData.notificationsEnabled`).
 * Player tags are secondary and can be used for persistence if pData is not fully loaded/saved immediately.
 * @async
 * @param {import('@minecraft/server').Player} player - The player issuing the command.
 * @param {string[]} args - Command arguments: [on|off|toggle|status].
 * @param {import('../types.js').Dependencies} dependencies - Object containing dependencies.
 * @returns {Promise<void>}
 */
export async function execute(player, args, dependencies) {
    const { playerUtils, logManager, config, playerDataManager, getString } = dependencies;
    const adminName = player?.nameTag ?? 'UnknownAdmin';
    const prefix = config?.prefix ?? '!';

    // Key for storing notification preference in pData.
    // This should align with how playerUtils.notifyAdmins checks preferences.
    const pDataKeyForNotifications = 'notificationsEnabled'; // Example key, ensure it's used by notifyAdmins logic.

    const subCommand = args[0]?.toLowerCase() || 'toggle'; // Default to 'toggle'

    let pData = playerDataManager?.getPlayerData(player.id);
    if (!pData) {
        // This should ideally not happen for an online admin. If it does, it's a problem.
        playerUtils?.debugLog(`[NotifyCommand CRITICAL] pData not found for admin ${adminName}. Cannot reliably manage notifications.`, adminName, dependencies);
        player.sendMessage(getString('common.error.playerDataNotFound')); // Generic error
        return;
    }

    // Determine current preference: pData is primary, then config default. Tags are not used as primary source.
    let currentPreference;
    if (typeof pData[pDataKeyForNotifications] === 'boolean') {
        currentPreference = pData[pDataKeyForNotifications];
    } else {
        // If not explicitly set in pData, fall back to the global default from config
        currentPreference = config?.acGlobalNotificationsDefaultOn ?? true; // Default to true if config itself is missing
        // Optionally, set it in pData now if it was undefined to establish an explicit state.
        // pData[pDataKeyForNotifications] = currentPreference;
        // pData.isDirtyForSave = true;
        // playerUtils?.debugLog(`[NotifyCommand] Preference for ${adminName} was undefined, set to default: ${currentPreference}`, adminName, dependencies);
    }


    let newPreference;
    let responseMessageKey;

    switch (subCommand) {
        case 'on':
            newPreference = true;
            responseMessageKey = 'command.notify.enabled';
            break;
        case 'off':
            newPreference = false;
            responseMessageKey = 'command.notify.disabled';
            break;
        case 'toggle':
            newPreference = !currentPreference;
            responseMessageKey = newPreference ? 'command.notify.enabled' : 'command.notify.disabled';
            break;
        case 'status':
            const statusText = currentPreference ? getString('common.boolean.yes').toUpperCase() : getString('common.boolean.no').toUpperCase();
            // Determine if the status is based on an explicit setting in pData or the server default
            const sourceTextKey = typeof pData[pDataKeyForNotifications] === 'boolean' ?
                'command.notify.status.source.explicit' :
                'command.notify.status.source.default';
            player.sendMessage(getString('command.notify.status', { statusText: statusText, sourceText: getString(sourceTextKey) }));
            logManager?.addLog({
                adminName: adminName,
                actionType: 'notifyStatusChecked', // Standardized
                details: `Checked own notification status: ${statusText} (${getString(sourceTextKey)})`
            }, dependencies);
            return; // Status check done.
        default:
            player.sendMessage(getString('command.notify.usage', { prefix: prefix }));
            return;
    }

    // Apply the new preference
    try {
        pData[pDataKeyForNotifications] = newPreference;
        pData.isDirtyForSave = true;
        // No tags needed if pData is the source of truth and saved reliably.
        // If tags were used as primary:
        // player.removeTag(newPreference ? 'ac_notifications_off' : 'ac_notifications_on');
        // player.addTag(newPreference ? 'ac_notifications_on' : 'ac_notifications_off');

        player.sendMessage(getString(responseMessageKey));
        playerUtils?.playSoundForEvent(player, "commandSuccess", dependencies);

        const logMessageAction = newPreference ? 'enabled' : 'disabled';
        const logActionType = newPreference ? 'notifyEnabledUser' : 'notifyDisabledUser'; // User-specific action
        playerUtils?.debugLog(`[NotifyCommand] Admin ${adminName} ${logMessageAction} AntiCheat notifications. New preference: ${newPreference}`, adminName, dependencies);
        logManager?.addLog({
            adminName: adminName,
            actionType: logActionType,
            details: `User notifications ${logMessageAction}`
        }, dependencies);

    } catch (error) { // Catch errors from pData update or tag operations if they were used
        player.sendMessage(getString('command.notify.error.update'));
        console.error(`[NotifyCommand CRITICAL] Error setting notification preference for ${adminName}: ${error.stack || error}`);
        playerUtils?.playSoundForEvent(player, "commandError", dependencies);
        logManager?.addLog({
            adminName: adminName,
            actionType: 'errorNotifyCommand',
            context: 'NotifyCommand.setPreference',
            details: `Failed to set notification preference to ${newPreference}: ${error.message}`,
            errorStack: error.stack || error.toString(),
        }, dependencies);
    }
}
