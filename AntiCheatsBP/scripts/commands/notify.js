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
    const { playerUtils, logManager, config, playerDataManager, getString, permissionLevels } = dependencies;
    const notifKey = 'ac_notifications_enabled'; // Using a more specific key for player data
    // This key should ideally be a constant or from a config if used elsewhere.
    // If this is intended to map to the "ac_notifications_on"/"off" tags, the logic needs adjustment.
    // For now, assuming it's a new boolean field in pData.

    const subCommand = args[0] ? args[0].toLowerCase() : "toggle";

    // definition.description = getString("command.notify.description");
    // definition.permissionLevel = permissionLevels.admin;

    let pData = playerDataManager.getPlayerData(player.id);
    if (!pData) {
        playerUtils.debugLog(`[NotifyCommand] pData not found for ${player.nameTag}. This should not happen.`, dependencies, player.nameTag);
        // Initialize a temporary minimal pData if necessary for currentPreference logic, though setPlayerData should handle creation.
        pData = { id: player.id, isWatched: false };
    }

    let currentPreference = pData[notifKey];
    if (typeof currentPreference !== 'boolean') {
        // Infer current preference from tags if the specific pData field is not set
        const notificationsOffTag = "ac_notifications_off";
        const notificationsOnTag = "ac_notifications_on";
        if (player.hasTag(notificationsOnTag)) currentPreference = true;
        else if (player.hasTag(notificationsOffTag)) currentPreference = false;
        else currentPreference = config.acGlobalNotificationsDefaultOn;
    }

    let newPreference;
    let messageKey;

    switch (subCommand) {
        case "on":
            newPreference = true;
            messageKey = "command.notify.status.enabled";
            break;
        case "off":
            newPreference = false;
            messageKey = "command.notify.status.disabled";
            break;
        case "toggle":
            newPreference = !currentPreference;
            messageKey = newPreference ? "command.notify.status.enabled" : "command.notify.status.disabled";
            break;
        case "status":
            const statusText = getString(currentPreference ? "common.status.enabled" : "common.status.disabled");
            player.sendMessage(getString("command.notify.currentStatus", { status: statusText.toUpperCase() }));
            logManager.addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'notify_status_checked', details: `Checked own notification status: ${statusText}` }, dependencies);
            return;
        default:
            player.sendMessage(getString("command.notify.usage", { prefix: config.prefix }));
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
         playerUtils.debugLog(`[NotifyCommand] Error updating tags for ${player.nameTag}: ${e.message}`, dependencies, player.nameTag);
    }

    // Also save to pData for direct querying if needed, though tags are primary for notifyAdmins
    playerDataManager.setPlayerData(player.id, notifKey, newPreference, dependencies);

    player.sendMessage(getString(messageKey));

    const logMessageAction = newPreference ? "enabled" : "disabled";
    playerUtils.debugLog(`[NotifyCommand] Admin ${player.nameTag} ${logMessageAction} AntiCheat notifications. Current pref: ${newPreference}`, dependencies, player.nameTag);
    logManager.addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: `notify_${logMessageAction}`, details: `Notifications ${logMessageAction}` }, dependencies);
}
