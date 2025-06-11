/**
 * @file AntiCheatsBP/scripts/commands/notify.js
 * Defines the !notify command for administrators to manage their AntiCheat system notification preferences.
 * @version 1.0.1
 */
import { permissionLevels } from '../core/rankManager.js';
import { playerDataManager } from '../core/playerDataManager.js';
import { getString } from '../../core/i18n.js'; // Import getString

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: "notify",
    syntax: "!notify [on|off|toggle|status]",
    description: getString("command.notify.description"),
    permissionLevel: permissionLevels.admin
};

/**
 * Executes the !notify command.
 * @param {import('@minecraft/server').Player} player The player who executed the command.
 * @param {string[]} args The arguments provided with the command ([on|off|toggle|status]).
 * @param {import('../types.js').CommandDependencies} dependencies Command dependencies.
 */
export async function execute(player, args, dependencies) {
    const { playerUtils, addLog, config } = dependencies;
    const notifKey = 'notificationsEnabled'; // Stored in playerDataManager
    const subCommand = args[0] ? args[0].toLowerCase() : "toggle";

    let currentPreference = playerDataManager.getPlayerData(player.id, notifKey); // Use player.id
    if (typeof currentPreference !== 'boolean') {
        currentPreference = dependencies.config.acGlobalNotificationsDefaultOn; // Use global default from main config
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
            if (addLog) addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'notify_status_checked', details: `Checked own notification status: ${statusText}` });
            return; // Exit after status
        default:
            player.sendMessage(getString("command.notify.usage", { prefix: config.prefix }));
            return;
    }

    playerDataManager.setPlayerData(player.id, notifKey, newPreference); // Use player.id

    player.sendMessage(getString(messageKey));

    const logMessageAction = newPreference ? "enabled" : "disabled";
    if(playerUtils.debugLog) playerUtils.debugLog(`Admin ${player.nameTag} ${logMessageAction} notifications. Current pref: ${newPreference}`, player.nameTag);
    if (addLog) addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: `notify_${logMessageAction}`, details: `Notifications ${logMessageAction}` });
}
