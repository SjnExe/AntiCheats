/**
 * @file AntiCheatsBP/scripts/commands/xraynotify.js
 * Defines the !xraynotify command for administrators to manage their X-Ray mining notifications.
 * @version 1.0.0
 */
// AntiCheatsBP/scripts/commands/xraynotify.js
import { permissionLevels } from '../core/rankManager.js';

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: "xraynotify",
    syntax: "!xraynotify <on|off|status>",
    description: "Manage X-Ray ore mining notifications for yourself.",
    permissionLevel: permissionLevels.admin
};

/**
 * Executes the xraynotify command.
 * @param {import('@minecraft/server').Player} player The player issuing the command.
 * @param {string[]} args The command arguments.
 * @param {import('../types.js').CommandDependencies} dependencies Command dependencies.
 */
export async function execute(player, args, dependencies) {
    const { config, playerUtils, addLog } = dependencies;
    const subCommand = args[0] ? args[0].toLowerCase() : "status";
    const notifyOnTag = "xray_notify_on";
    const notifyOffTag = "xray_notify_off";

    switch (subCommand) {
        case "on":
            try { player.removeTag(notifyOffTag); } catch (e) {}
            player.addTag(notifyOnTag);
            player.sendMessage("§aX-Ray ore mining notifications enabled for you.");
            if (playerUtils.debugLog) playerUtils.debugLog(`Admin ${player.nameTag} enabled X-Ray notifications.`, player.nameTag);
            if (addLog) addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'xraynotify_on', details: 'X-Ray notifications ON' });
            break;
        case "off":
            try { player.removeTag(notifyOnTag); } catch (e) {}
            player.addTag(notifyOffTag);
            player.sendMessage("§cX-Ray ore mining notifications disabled for you.");
            if (playerUtils.debugLog) playerUtils.debugLog(`Admin ${player.nameTag} disabled X-Ray notifications.`, player.nameTag);
            if (addLog) addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'xraynotify_off', details: 'X-Ray notifications OFF' });
            break;
        case "status":
            const isOn = player.hasTag(notifyOnTag);
            const isOff = player.hasTag(notifyOffTag);
            let statusMessage = "§eYour X-Ray notification status: ";
            if (isOn) {
                statusMessage += "§aON (explicitly).";
            } else if (isOff) {
                statusMessage += "§cOFF (explicitly).";
            } else {
                // Assuming xrayDetectionAdminNotifyByDefault is a boolean in config
                if (config.xrayDetectionAdminNotifyByDefault) {
                    statusMessage += `§aON (by server default). §7Use '${config.prefix}xraynotify off' to disable.`;
                } else {
                    statusMessage += `§cOFF (by server default). §7Use '${config.prefix}xraynotify on' to enable.`;
                }
            }
            player.sendMessage(statusMessage);
            if (addLog) addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'xraynotify_status', details: `Checked X-Ray notifications status` }); // Removed statusMessage from log details for brevity
            break;
        default:
            player.sendMessage(`§cUsage: ${config.prefix}${definition.name} <on|off|status>`);
    }
}
