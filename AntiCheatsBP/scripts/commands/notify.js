/**
 * @file Defines the !notify command for administrators to manage their AntiCheat system notification preferences.
 */
import { permissionLevels } from '../core/rankManager.js'; // Standardized import

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: 'notify',
    syntax: '!notify [on|off|toggle|status]',
    description: 'Manages your AntiCheat system notification preferences.',
    permissionLevel: permissionLevels.admin, // Use a defined level
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
    const { playerUtils, logManager, config, playerDataManager } = dependencies; // Removed unused permissionLevels
    const notifEnabledPDataKey = 'ac_notifications_enabled'; // Key for pData storage
    const notificationsOffTag = 'ac_notifications_off'; // Tag for explicitly off
    const notificationsOnTag = 'ac_notifications_on';   // Tag for explicitly on

    const subCommand = args[0] ? args[0].toLowerCase() : 'toggle'; // Default to 'toggle'

    let pData = playerDataManager.getPlayerData(player.id);
    if (!pData) {
        // This should ideally not happen if ensurePlayerDataInitialized is called on player join/load.
        // However, create a temporary minimal pData if it's missing to allow command to function.
        playerUtils.debugLog(`[NotifyCommand] pData not found for ${player.nameTag}. Creating temporary minimal pData for this command.`, player.nameTag, dependencies);
        pData = { id: player.id, isWatched: false, [notifEnabledPDataKey]: config.acGlobalNotificationsDefaultOn }; // Initialize with default
        // Note: This temporary pData won't be saved unless explicitly marked dirty and saved by another process.
        // For a settings command like this, directly modifying tags is primary, pData is secondary/cache.
    }

    // Determine current preference: pData -> Tags -> Config Default
    let currentPreference;
    if (typeof pData[notifEnabledPDataKey] === 'boolean') {
        currentPreference = pData[notifEnabledPDataKey];
    } else if (player.hasTag(notificationsOnTag)) {
        currentPreference = true;
    } else if (player.hasTag(notificationsOffTag)) {
        currentPreference = false;
    } else {
        currentPreference = config.acGlobalNotificationsDefaultOn; // Fallback to server default
    }

    let newPreference;
    let responseMessage;

    switch (subCommand) {
        case 'on':
            newPreference = true;
            responseMessage = '§aAntiCheat notifications are now ENABLED for you.';
            break;
        case 'off':
            newPreference = false;
            responseMessage = '§cAntiCheat notifications are now DISABLED for you.';
            break;
        case 'toggle':
            newPreference = !currentPreference;
            responseMessage = newPreference ? '§aAntiCheat notifications are now ENABLED for you.' : '§cAntiCheat notifications are now DISABLED for you.';
            break;
        case 'status':
            const statusText = currentPreference ? 'ENABLED' : 'DISABLED';
            let sourceText = '(Server Default)';
            if (typeof pData[notifEnabledPDataKey] === 'boolean' || player.hasTag(notificationsOnTag) || player.hasTag(notificationsOffTag)) {
                sourceText = '(Explicitly Set)';
            }
            player.sendMessage(`§eYour AntiCheat notifications are currently: ${statusText} ${sourceText}`);
            try {
                logManager.addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'notifyStatusChecked', details: `Checked own notification status: ${statusText} ${sourceText}` }, dependencies);
            } catch (logError) {
                console.error(`[NotifyCommand] Error logging status check: ${logError.stack || logError}`);
            }
            return;
        default:
            player.sendMessage(`§cUsage: ${config.prefix}notify <on|off|toggle|status>`);
            return;
    }

    // Apply changes: Tags first, then pData
    try {
        if (newPreference) {
            player.removeTag(notificationsOffTag); // Safe even if tag isn't present
            player.addTag(notificationsOnTag);
        } else {
            player.removeTag(notificationsOnTag);
            player.addTag(notificationsOffTag);
        }

        // Update the pData object directly and mark for saving
        if (pData) { // Check again in case it was temporarily created
            pData[notifEnabledPDataKey] = newPreference;
            pData.isDirtyForSave = true;
        } else {
            // Should not be reached if pData was initialized correctly or temporary one was made
            playerUtils.debugLog(`[NotifyCommand] Critical: pData was unexpectedly null/undefined when trying to set ${notifEnabledPDataKey} for ${player.nameTag}. Tags set, but pData not updated.`, player.nameTag, dependencies);
        }

        player.sendMessage(responseMessage);

        const logMessageAction = newPreference ? 'enabled' : 'disabled';
        const logActionType = newPreference ? 'notifyEnabled' : 'notifyDisabled'; // camelCase actionType
        playerUtils.debugLog(`[NotifyCommand] Admin ${player.nameTag} ${logMessageAction} AntiCheat notifications. New preference: ${newPreference}`, player.nameTag, dependencies);
        logManager.addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: logActionType, details: `Notifications ${logMessageAction}` }, dependencies);

    } catch (tagError) {
        player.sendMessage('§cAn error occurred while updating your notification settings.');
        console.error(`[NotifyCommand] Error setting tags for ${player.nameTag}: ${tagError.stack || tagError}`);
        logManager.addLog({
            adminName: player.nameTag,
            actionType: 'error',
            context: 'notifyCommand.setTags',
            details: `Failed to set notification tags: ${tagError.message}`,
        }, dependencies);
    }
}
