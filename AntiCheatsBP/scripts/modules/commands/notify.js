/** @type {import('../../types.js').CommandDefinition} */
export const definition = {
    name: 'notify',
    syntax: '[on|off|toggle|status]',
    description: 'Manages your AntiCheat system notification preferences.',
    permissionLevel: 1, // admin
};

/**
 * Executes the notify command.
 * @param {import('@minecraft/server').Player} player
 * @param {string[]} args
 * @param {import('../../types.js').Dependencies} dependencies
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
            player.sendMessage(`§cUsage: ${prefix}notify <on|off|toggle|status>`);
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
