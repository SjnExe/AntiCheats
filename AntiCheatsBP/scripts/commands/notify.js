/**
 * @file AntiCheatsBP/scripts/commands/notify.js
 * Defines the !notify command for administrators to manage their AntiCheat system notification preferences.
 * @version 1.0.0
 */
// AntiCheatsBP/scripts/commands/notify.js
import { permissionLevels } from '../core/rankManager.js';
import { playerDataManager } from '../core/playerDataManager.js'; // Corrected import path

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: "notify",
    syntax: "!notify [on|off|toggle]", // Updated syntax to show optional argument
    description: "Toggles or sets your cheat detection notifications. Defaults to toggle.",
    // Aliased by !notifications in config.js
    permissionLevel: permissionLevels.admin
};

/**
 * Executes the !notify command, allowing admins to manage their notification preferences.
 * If no argument is provided, it toggles the current preference.
 * Notification preferences are stored using playerDataManager.
 * @param {import('@minecraft/server').Player} player The player who executed the command.
 * @param {string[]} args The arguments provided with the command ([on|off|toggle]).
 * @param {import('../types.js').CommandDependencies} dependencies Command dependencies, including playerUtils and addLog.
 */
export async function execute(player, args, dependencies) {
    const { playerUtils, addLog, config } = dependencies; // Added config for prefix in usage message
    const notifKey = 'notificationsEnabled';
    const subCommand = args[0] ? args[0].toLowerCase() : "toggle";

    let currentPreference = playerDataManager.getPlayerData(player, notifKey);
    // If no preference is stored, default to true (notifications enabled)
    if (typeof currentPreference !== 'boolean') {
        currentPreference = true;
    }

    let newPreference;

    switch (subCommand) {
        case "on":
            newPreference = true;
            break;
        case "off":
            newPreference = false;
            break;
        case "toggle":
            newPreference = !currentPreference;
            break;
        default:
            // Using config.prefix for accurate usage message
            player.sendMessage(`§cInvalid argument. Usage: ${config.prefix}${definition.name} [on|off|toggle]`);
            return;
    }

    playerDataManager.setPlayerData(player, notifKey, newPreference);

    const message = `§aNotifications ${newPreference ? "enabled" : "disabled"}.`;
    player.sendMessage(message);

    const logMessageAction = newPreference ? "enabled" : "disabled";
    if(playerUtils.debugLog) playerUtils.debugLog(`Admin ${player.nameTag} ${logMessageAction} notifications. Current pref: ${newPreference}`, player.nameTag);
    if (addLog) addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: `notify_${logMessageAction}`, details: `Notifications ${logMessageAction}` });
}
