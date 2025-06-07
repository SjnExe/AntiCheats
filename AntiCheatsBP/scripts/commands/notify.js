/**
 * @file AntiCheatsBP/scripts/commands/notify.js
 * Defines the !notify command for administrators to manage their AntiCheat system notification preferences.
 * @version 1.0.0
 */
// AntiCheatsBP/scripts/commands/notify.js
import { permissionLevels } from '../core/rankManager.js';
import { playerDataManager } from '../playerDataManager.js'; // Added import

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: "notify",
    syntax: "!notify <on|off|toggle>", // Updated syntax
    description: "Toggles or sets your AntiCheat system notifications.", // Updated description
    // Aliased by !notifications in config.js
    permissionLevel: permissionLevels.admin
};

/**
 * Executes the notify command.
 * @param {import('@minecraft/server').Player} player The player issuing the command.
 * @param {string[]} args The command arguments.
 * @param {import('../types.js').CommandDependencies} dependencies Command dependencies.
 */
export async function execute(player, args, dependencies) {
    const { config, playerUtils, addLog } = dependencies;
    const notifKey = 'notificationsEnabled';
    // Default to 'toggle' if no argument is provided, as per subtask requirements
    const subCommand = args[0] ? args[0].toLowerCase() : "toggle";

    let newPreference;

    switch (subCommand) {
        case "on":
            newPreference = true;
            playerDataManager.setPlayerData(player, notifKey, newPreference);
            player.sendMessage("§aAntiCheat system notifications ON.");
            if(playerUtils.debugLog) playerUtils.debugLog(`Admin ${player.nameTag} turned ON AntiCheat notifications.`, player.nameTag);
            if (addLog) addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'notify_on', details: 'AC notifications ON' });
            break;
        case "off":
            newPreference = false;
            playerDataManager.setPlayerData(player, notifKey, newPreference);
            player.sendMessage("§cAntiCheat system notifications OFF.");
            if(playerUtils.debugLog) playerUtils.debugLog(`Admin ${player.nameTag} turned OFF AntiCheat notifications.`, player.nameTag);
            if (addLog) addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'notify_off', details: 'AC notifications OFF' });
            break;
        case "toggle":
            // Get current preference. If undefined, use server default.
            let currentPreference = playerDataManager.getPlayerData(player, notifKey);
            if (typeof currentPreference === 'undefined') {
                currentPreference = config.acGlobalNotificationsDefaultOn;
            }
            newPreference = !currentPreference;
            playerDataManager.setPlayerData(player, notifKey, newPreference);
            player.sendMessage(`§eAntiCheat system notifications ${newPreference ? "§aON" : "§cOFF"} (toggled).`);
            if(playerUtils.debugLog) playerUtils.debugLog(`Admin ${player.nameTag} toggled AntiCheat notifications to ${newPreference ? "ON" : "OFF"}.`, player.nameTag);
            if (addLog) addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'notify_toggle', details: `AC notifications toggled to ${newPreference ? "ON" : "OFF"}` });
            break;
        default:
            player.sendMessage(`§cUsage: ${config.prefix}${definition.name} <on|off|toggle>`);
            return; // Ensure no further processing for invalid subcommands
    }
}
