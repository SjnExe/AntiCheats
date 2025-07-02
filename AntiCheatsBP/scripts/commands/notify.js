/**
 * @file Defines the !notify command for administrators to manage their AntiCheat system notification preferences.
 */
import { permissionLevels } from '../core/rankManager.js';

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: 'notify',
    syntax: '!notify [on|off|toggle|status]',
    description: 'Manages your AntiCheat system notification preferences.',
    permissionLevel: permissionLevels.admin,
    enabled: true,
};

/**
 * Executes the !notify command.
 * Allows administrators to toggle their AntiCheat notifications on/off or check their current status.
 * Preferences are stored using player tags ('ac_notifications_on', 'ac_notifications_off') and
 * a field in PlayerAntiCheatData (`pData.ac_notifications_enabled`).
 * @async
 * @param {import('@minecraft/server').Player} player - The player issuing the command.
 * @param {string[]} args - Command arguments: [on|off|toggle|status].
 * @param {import('../types.js').CommandDependencies} dependencies - Object containing dependencies.
 * @returns {Promise<void>}
 */
export async function execute(player, args, dependencies) {
    const { playerUtils, logManager, config, playerDataManager, getString } = dependencies;
    const notifEnabledPDataKey = 'ac_notifications_enabled';
    const notificationsOffTag = 'ac_notifications_off';
    const notificationsOnTag = 'ac_notifications_on';

    const subCommand = args[0] ? args[0].toLowerCase() : 'toggle';

    let pData = playerDataManager.getPlayerData(player.id);
    if (!pData) {
        playerUtils.debugLog(`[NotifyCommand] pData not found for ${player.nameTag}. Creating temporary minimal pData for this command.`, player.nameTag, dependencies);
        pData = { id: player.id, isWatched: false, [notifEnabledPDataKey]: config.acGlobalNotificationsDefaultOn };
    }

    let currentPreference;
    if (typeof pData[notifEnabledPDataKey] === 'boolean') {
        currentPreference = pData[notifEnabledPDataKey];
    } else if (player.hasTag(notificationsOnTag)) {
        currentPreference = true;
    } else if (player.hasTag(notificationsOffTag)) {
        currentPreference = false;
    } else {
        currentPreference = config.acGlobalNotificationsDefaultOn;
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
            const statusText = currentPreference ? getString('common.boolean.yes').toUpperCase() : getString('common.boolean.no').toUpperCase(); // Or specific "ENABLED"/"DISABLED" keys
            let sourceTextKey = 'command.notify.status.source.default';
            if (typeof pData[notifEnabledPDataKey] === 'boolean' || player.hasTag(notificationsOnTag) || player.hasTag(notificationsOffTag)) {
                sourceTextKey = 'command.notify.status.source.explicit';
            }
            player.sendMessage(getString('command.notify.status', { statusText: statusText, sourceText: getString(sourceTextKey) }));
            try {
                logManager.addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'notifyStatusChecked', details: `Checked own notification status: ${statusText} ${getString(sourceTextKey)}` }, dependencies);
            } catch (logError) {
                console.error(`[NotifyCommand] Error logging status check: ${logError.stack || logError}`);
            }
            return;
        default:
            player.sendMessage(getString('command.notify.usage', { prefix: config.prefix }));
            return;
    }

    try {
        if (newPreference) {
            player.removeTag(notificationsOffTag);
            player.addTag(notificationsOnTag);
        } else {
            player.removeTag(notificationsOnTag);
            player.addTag(notificationsOffTag);
        }

        if (pData) {
            pData[notifEnabledPDataKey] = newPreference;
            pData.isDirtyForSave = true;
        } else {
            playerUtils.debugLog(`[NotifyCommand] Critical: pData was unexpectedly null/undefined when trying to set ${notifEnabledPDataKey} for ${player.nameTag}. Tags set, but pData not updated.`, player.nameTag, dependencies);
        }

        player.sendMessage(getString(responseMessageKey));

        const logMessageAction = newPreference ? 'enabled' : 'disabled';
        const logActionType = newPreference ? 'notifyEnabled' : 'notifyDisabled';
        playerUtils.debugLog(`[NotifyCommand] Admin ${player.nameTag} ${logMessageAction} AntiCheat notifications. New preference: ${newPreference}`, player.nameTag, dependencies);
        logManager.addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: logActionType, details: `Notifications ${logMessageAction}` }, dependencies);

    } catch (tagError) {
        player.sendMessage(getString('command.notify.error.update'));
        console.error(`[NotifyCommand] Error setting tags for ${player.nameTag}: ${tagError.stack || tagError}`);
        logManager.addLog({
            adminName: player.nameTag,
            actionType: 'error',
            context: 'notifyCommand.setTags',
            details: `Failed to set notification tags: ${tagError.message}`,
        }, dependencies);
    }
}
