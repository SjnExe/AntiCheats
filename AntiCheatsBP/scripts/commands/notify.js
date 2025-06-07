/**
 * @file AntiCheatsBP/scripts/commands/notify.js
 * Defines the !notify command for administrators to manage their AntiCheat system notification preferences.
 * @version 1.0.0
 */
// AntiCheatsBP/scripts/commands/notify.js
import { permissionLevels } from '../core/rankManager.js';

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: "notify",
    syntax: "!notify <on|off|status>",
    description: "Toggles or checks your AntiCheat system notifications.",
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
    const acNotificationsOffTag = "ac_notifications_off";
    const acNotificationsOnTag = "ac_notifications_on";
    const subCommand = args[0] ? args[0].toLowerCase() : "status";

    switch (subCommand) {
        case "on":
            try { player.removeTag(acNotificationsOffTag); } catch (e) {}
            try { player.addTag(acNotificationsOnTag); } catch (e) { if(playerUtils.debugLog) playerUtils.debugLog(`Failed to add ${acNotificationsOnTag} for ${player.nameTag}: ${e}`, player.nameTag); }
            player.sendMessage("§aAntiCheat system notifications ON.");
            if(playerUtils.debugLog) playerUtils.debugLog(`Admin ${player.nameTag} turned ON AntiCheat notifications.`, player.nameTag);
            if (addLog) addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'notify_on', details: 'AC notifications ON' });
            break;
        case "off":
            try { player.removeTag(acNotificationsOnTag); } catch (e) {}
            try { player.addTag(acNotificationsOffTag); } catch (e) { if(playerUtils.debugLog) playerUtils.debugLog(`Failed to add ${acNotificationsOffTag} for ${player.nameTag}: ${e}`, player.nameTag); }
            player.sendMessage("§cAntiCheat system notifications OFF.");
            if(playerUtils.debugLog) playerUtils.debugLog(`Admin ${player.nameTag} turned OFF AntiCheat notifications.`, player.nameTag);
            if (addLog) addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'notify_off', details: 'AC notifications OFF' });
            break;
        case "status":
            const acIsOn = player.hasTag(acNotificationsOnTag);
            const acIsOff = player.hasTag(acNotificationsOffTag);
            let acStatusMessage = "§eYour AntiCheat system notification status: ";
            if (acIsOn) {
                acStatusMessage += "§aON (explicitly).";
            } else if (acIsOff) {
                acStatusMessage += "§cOFF (explicitly).";
            } else {
                if (config.acGlobalNotificationsDefaultOn) {
                    acStatusMessage += `§aON (by server default). §7Use ${config.prefix}notify off to disable.`;
                } else {
                    acStatusMessage += `§cOFF (by server default). §7Use ${config.prefix}notify on to enable.`;
                }
            }
            player.sendMessage(acStatusMessage);
            if (addLog) addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'notify_status', details: `Checked AC notifications status (${acStatusMessage})` });
            break;
        default:
            player.sendMessage(`§cUsage: ${config.prefix}${definition.name} <on|off|status>`);
    }
}
