/**
 * @file AntiCheatsBP/scripts/commands/notify.js
 * Defines the !notify command for administrators to manage their AntiCheat system notification preferences.
 * @version 1.0.3
 */
// permissionLevels and getString are now accessed via dependencies

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: "notify",
    syntax: "!notify [on|off|toggle|status]",
    description: "Manages your AntiCheat system notification preferences.", // Static fallback
    permissionLevel: 1, // Static fallback (Admin)
    enabled: true,
};

/**
 * Executes the !notify command.
 * @param {import('@minecraft/server').Player} player The player who executed the command.
 * @param {string[]} args The arguments provided with the command ([on|off|toggle|status]).
 * @param {import('../types.js').CommandDependencies} dependencies Command dependencies.
 */
export async function execute(player, args, dependencies) {
    const { playerUtils, logManager, config, playerDataManager, permissionLevels } = dependencies; // getString removed
    const notifKey = 'ac_notifications_enabled';

    const subCommand = args[0] ? args[0].toLowerCase() : "toggle";

    // Static definitions are used

    let pData = playerDataManager.getPlayerData(player.id);
    if (!pData) {
        playerUtils.debugLog(`[NotifyCommand] pData not found for ${player.nameTag}. This should not happen.`, player.nameTag, dependencies);
        pData = { id: player.id, isWatched: false }; // Minimal pData for logic continuation
    }

    let currentPreference = pData[notifKey];
    if (typeof currentPreference !== 'boolean') {
        const notificationsOffTag = "ac_notifications_off";
        const notificationsOnTag = "ac_notifications_on";
        if (player.hasTag(notificationsOnTag)) currentPreference = true;
        else if (player.hasTag(notificationsOffTag)) currentPreference = false;
        else currentPreference = config.acGlobalNotificationsDefaultOn;
    }

    let newPreference;
    let responseMessage;

    switch (subCommand) {
        case "on":
            newPreference = true;
            // Placeholder for "command.notify.status.enabled"
            responseMessage = "§aAntiCheat notifications are now ENABLED for you.";
            break;
        case "off":
            newPreference = false;
            // Placeholder for "command.notify.status.disabled"
            responseMessage = "§cAntiCheat notifications are now DISABLED for you.";
            break;
        case "toggle":
            newPreference = !currentPreference;
            // Placeholders for "command.notify.status.enabled" / "command.notify.status.disabled"
            responseMessage = newPreference ? "§aAntiCheat notifications are now ENABLED for you." : "§cAntiCheat notifications are now DISABLED for you.";
            break;
        case "status":
            // "common.status.enabled" -> "ENABLED"
            // "common.status.disabled" -> "DISABLED"
            const statusText = currentPreference ? "ENABLED" : "DISABLED";
            // Placeholder for "command.notify.currentStatus"
            player.sendMessage(`§eYour AntiCheat notifications are currently: ${statusText.toUpperCase()}`);
            logManager.addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'notify_status_checked', details: `Checked own notification status: ${statusText}` }, dependencies);
            return;
        default:
            // Placeholder for "command.notify.usage"
            player.sendMessage(`§cUsage: ${config.prefix}notify <on|off|toggle|status>`);
            return;
    }

    // Update player tags based on new preference for compatibility with playerUtils.notifyAdmins
    const notificationsOffTag = "ac_notifications_off"; // Consider centralizing tag names
    const notificationsOnTag = "ac_notifications_on";
    try {
        if (newPreference) {
            player.removeTag(notificationsOffTag);
            player.addTag(notificationsOnTag);
        } else {
            player.removeTag(notificationsOnTag);
            player.addTag(notificationsOffTag);
        }
    } catch (e) {
         playerUtils.debugLog(`[NotifyCommand] Error updating tags for ${player.nameTag}: ${e.message}`, player.nameTag, dependencies);
    }

    // Also save to pData for direct querying if needed, though tags are primary for notifyAdmins
    playerDataManager.setPlayerData(player.id, notifKey, newPreference, dependencies);

    player.sendMessage(responseMessage);

    const logMessageAction = newPreference ? "enabled" : "disabled";
    playerUtils.debugLog(`[NotifyCommand] Admin ${player.nameTag} ${logMessageAction} AntiCheat notifications. Current pref: ${newPreference}`, player.nameTag, dependencies);
    logManager.addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: `notify_${logMessageAction}`, details: `Notifications ${logMessageAction}` }, dependencies);
}
