/**
 * @file Defines the !notify command for administrators to manage their AntiCheat system notification preferences.
 */
/** @type {import('../types.js').CommandDefinition} */
export const definition = {
    name: 'notify',
    syntax: '[on|off|toggle|status]',
    description: 'Manages your AntiCheat system notification preferences.',
    aliases: ['noti', 'notifications'],
    permissionLevel: 1, // admin
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
 * @returns {void}
 */
export function execute(player, args, dependencies) {
    const { playerUtils, logManager, config, playerDataManager, getString } = dependencies;
    const adminName = player?.nameTag ?? 'UnknownAdmin';
    const prefix = config?.prefix ?? '!';

    const pDataKeyForNotifications = 'notificationsEnabled';

    const subCommand = args[0]?.toLowerCase() || 'toggle';

    const pData = playerDataManager?.getPlayerData(player.id);
    if (!pData) {
        playerUtils?.debugLog(`[NotifyCommand CRITICAL] pData not found for admin ${adminName}. Cannot reliably manage notifications.`, adminName, dependencies);
        player.sendMessage(getString('common.error.playerDataNotFound'));
        return;
    }

    let currentPreference;
    if (typeof pData[pDataKeyForNotifications] === 'boolean') {
        currentPreference = pData[pDataKeyForNotifications];
    } else {
        currentPreference = config?.acGlobalNotificationsDefaultOn ?? true;
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
        case 'status': {
            const statusText = currentPreference ? getString('common.boolean.yes').toUpperCase() : getString('common.boolean.no').toUpperCase();
            const sourceTextKey = typeof pData[pDataKeyForNotifications] === 'boolean' ?
                'command.notify.status.source.explicit' :
                'command.notify.status.source.default';
            player.sendMessage(getString('command.notify.status', { statusText, sourceText: getString(sourceTextKey) }));
            logManager?.addLog({
                adminName,
                actionType: 'notifyStatusChecked',
                details: `Checked own notification status: ${statusText} (${getString(sourceTextKey)})`,
            }, dependencies);
            return;
        }
        default:
            player.sendMessage(getString('command.notify.usage', { prefix }));
            return;
    }

    try {
        pData[pDataKeyForNotifications] = newPreference;
        pData.isDirtyForSave = true;

        player.sendMessage(getString(responseMessageKey));
        playerUtils?.playSoundForEvent(player, 'commandSuccess', dependencies);

        const logMessageAction = newPreference ? 'enabled' : 'disabled';
        const logActionType = newPreference ? 'notifyEnabledUser' : 'notifyDisabledUser';
        playerUtils?.debugLog(`[NotifyCommand] Admin ${adminName} ${logMessageAction} AntiCheat notifications. New preference: ${newPreference}`, adminName, dependencies);
        logManager?.addLog({
            adminName,
            actionType: logActionType,
            details: `User notifications ${logMessageAction}`,
        }, dependencies);

    } catch (error) {
        player.sendMessage(getString('command.notify.error.update'));
        console.error(`[NotifyCommand CRITICAL] Error setting notification preference for ${adminName}: ${error.stack || error}`);
        playerUtils?.playSoundForEvent(player, 'commandError', dependencies);
        logManager?.addLog({
            adminName,
            actionType: 'errorNotifyCommand',
            context: 'NotifyCommand.setPreference',
            details: `Failed to set notification preference to ${newPreference}: ${error.message}`,
            errorStack: error.stack || error.toString(),
        }, dependencies);
    }
}
