/**
 * @file Defines the !xraynotify command for administrators to manage their X-Ray ore mining notification preferences.
 */
// Assuming permissionLevels is a static export for now.
import { permissionLevels } from '../core/rankManager.js';

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: 'xraynotify',
    syntax: '[on|off|toggle|status]', // Prefix handled by commandManager
    description: 'Toggles your personal X-Ray ore mining notifications if the feature is enabled server-wide.',
    permissionLevel: permissionLevels.admin, // Typically for admins who would act on these notifications
    enabled: true,
};

/**
 * Executes the !xraynotify command.
 * Allows administrators to toggle their personal X-Ray ore mining notifications.
 * Preferences are stored using a player tag.
 * @async
 * @param {import('@minecraft/server').Player} player - The player issuing the command.
 * @param {string[]} args - Command arguments: [on|off|toggle|status].
 * @param {import('../types.js').Dependencies} dependencies - Object containing dependencies.
 * @returns {Promise<void>}
 */
export async function execute(player, args, dependencies) {
    const { config, playerUtils, logManager, getString } = dependencies;
    const adminName = player?.nameTag ?? 'UnknownAdmin';
    const prefix = config?.prefix ?? '!';

    // This command only makes sense if the server-wide X-Ray notification feature is enabled.
    if (!config?.xrayDetectionNotifyOnOreMineEnabled) {
        player.sendMessage(getString('xraynotify.featureDisabledServerWide')); // Assuming this key exists
        return;
    }

    const pData = dependencies.playerDataManager?.getPlayerData(player.id);
    if (!pData) {
        player.sendMessage(getString('common.error.playerDataNotFound'));
        return;
    }

    const subCommand = args[0]?.toLowerCase() || 'toggle'; // Default to 'toggle'

    // Player-specific preference stored in pData.xrayNotificationsEnabled
    // Global default is config.xrayDetectionAdminNotifyByDefault
    let currentPreference;
    if (typeof pData.xrayNotificationsEnabled === 'boolean') {
        currentPreference = pData.xrayNotificationsEnabled;
    } else {
        currentPreference = config?.xrayDetectionAdminNotifyByDefault ?? true; // Default to true if not in pData or config
    }

    let newPreference;
    let responseMessageKey;

    switch (subCommand) {
        case 'on':
            newPreference = true;
            responseMessageKey = 'command.xraynotify.enabled';
            break;
        case 'off':
            newPreference = false;
            responseMessageKey = 'command.xraynotify.disabled';
            break;
        case 'toggle':
            newPreference = !currentPreference;
            responseMessageKey = newPreference ? 'command.xraynotify.enabled' : 'command.xraynotify.disabled';
            break;
        case 'status':
            let statusKey;
            if (typeof pData.xrayNotificationsEnabled === 'boolean') { // Explicitly set
                statusKey = currentPreference ? 'command.xraynotify.status.onExplicit' : 'command.xraynotify.status.offExplicit';
            } else { // Using server default
                statusKey = currentPreference ? 'command.xraynotify.status.onDefault' : 'command.xraynotify.status.offDefault';
            }
            player.sendMessage(getString(statusKey));
            logManager?.addLog({
                adminName: adminName,
                actionType: 'xrayNotifyStatusChecked', // Standardized
                details: `Checked own X-Ray notification status: ${getString(statusKey)}`
            }, dependencies);
            return; // Status check done.
        default:
            player.sendMessage(getString('command.xraynotify.usage', { prefix: prefix }));
            return;
    }

    // Apply the new preference
    try {
        pData.xrayNotificationsEnabled = newPreference;
        pData.isDirtyForSave = true; // Mark pData for saving

        // No tags needed if pData is the source of truth and saved reliably.

        player.sendMessage(getString(responseMessageKey));
        playerUtils?.playSoundForEvent(player, "commandSuccess", dependencies);

        const logMessageAction = newPreference ? 'enabled' : 'disabled';
        const logActionType = newPreference ? 'xrayNotifyEnabledUser' : 'xrayNotifyDisabledUser'; // User-specific action
        playerUtils?.debugLog(`[XrayNotifyCommand] Admin ${adminName} ${logMessageAction} X-Ray notifications. New preference: ${newPreference}`, adminName, dependencies);
        logManager?.addLog({
            adminName: adminName,
            actionType: logActionType,
            details: `X-Ray notifications ${logMessageAction}`
        }, dependencies);

    } catch (error) {
        player.sendMessage(getString('command.xraynotify.error.update')); // Assuming this key exists
        console.error(`[XrayNotifyCommand CRITICAL] Error setting X-Ray notification preference for ${adminName}: ${error.stack || error}`);
        playerUtils?.playSoundForEvent(player, "commandError", dependencies);
        logManager?.addLog({
            adminName: adminName,
            actionType: 'errorXrayNotifyCommand', // Standardized
            context: 'XrayNotifyCommand.setPreference',
            details: `Failed to set X-Ray notification preference to ${newPreference}: ${error.message}`,
            errorStack: error.stack || error.toString(),
        }, dependencies);
    }
}
