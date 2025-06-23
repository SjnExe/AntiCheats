/**
 * Defines the !notify command for administrators to manage their AntiCheat system notification preferences.
 */
/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: "notify",
    syntax: "!notify [on|off|toggle|status]",
    description: "Manages your AntiCheat system notification preferences.",
    permissionLevel: 1,
    enabled: true,
};
/**
 * Executes the !notify command.
 */
export async function execute(player, args, dependencies) {
    const { playerUtils, logManager, config, playerDataManager, permissionLevels } = dependencies;
    const notifKey = 'ac_notifications_enabled';

    const subCommand = args[0] ? args[0].toLowerCase() : "toggle";

    let pData = playerDataManager.getPlayerData(player.id);
    if (!pData) {
        playerUtils.debugLog(`[NotifyCommand] pData not found for ${player.nameTag}. This should not happen.`, player.nameTag, dependencies);
        pData = { id: player.id, isWatched: false };
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
            responseMessage = "§aAntiCheat notifications are now ENABLED for you.";
            break;
        case "off":
            newPreference = false;
            responseMessage = "§cAntiCheat notifications are now DISABLED for you.";
            break;
        case "toggle":
            newPreference = !currentPreference;
            responseMessage = newPreference ? "§aAntiCheat notifications are now ENABLED for you." : "§cAntiCheat notifications are now DISABLED for you.";
            break;
        case "status":
            const statusText = currentPreference ? "ENABLED" : "DISABLED";
            player.sendMessage(`§eYour AntiCheat notifications are currently: ${statusText.toUpperCase()}`);
            logManager.addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'notify_status_checked', details: `Checked own notification status: ${statusText}` }, dependencies);
            return;
        default:
            player.sendMessage(`§cUsage: ${config.prefix}notify <on|off|toggle|status>`);
            return;
    }

    const notificationsOffTag = "ac_notifications_off";
    const notificationsOnTag = "ac_notifications_on";
    if (newPreference) {
        player.removeTag(notificationsOffTag);
        player.addTag(notificationsOnTag);
    } else {
        player.removeTag(notificationsOnTag);
        player.addTag(notificationsOffTag);
    }

    // Update the pData object directly
    if (pData) {
        pData[notifKey] = newPreference;
        pData.isDirtyForSave = true; // Ensure the change is saved
    } else {
        // This case should ideally not be reached if pData was fetched or initialized correctly earlier
        playerUtils.debugLog(`[NotifyCommand] Critical: pData was unexpectedly null when trying to set ${notifKey} for ${player.nameTag}.`, player.nameTag, dependencies);
    }

    player.sendMessage(responseMessage);

    const logMessageAction = newPreference ? "enabled" : "disabled";
    playerUtils.debugLog(`[NotifyCommand] Admin ${player.nameTag} ${logMessageAction} AntiCheat notifications. Current pref: ${newPreference}`, player.nameTag, dependencies);
    logManager.addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: `notify_${logMessageAction}`, details: `Notifications ${logMessageAction}` }, dependencies);
}
