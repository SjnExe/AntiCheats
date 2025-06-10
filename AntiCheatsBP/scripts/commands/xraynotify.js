/**
 * @file AntiCheatsBP/scripts/commands/xraynotify.js
 * Defines the !xraynotify command for administrators to manage their X-Ray mining notifications.
 * @version 1.0.1
 */
import { permissionLevels } from '../core/rankManager.js';
import { getString } from '../../core/localizationManager.js'; // Import getString

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: "xraynotify",
    syntax: "!xraynotify <on|off|status>",
    description: getString("command.xraynotify.description"),
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
    const prefix = config.prefix;

    switch (subCommand) {
        case "on":
            try { player.removeTag(notifyOffTag); } catch (e) {}
            player.addTag(notifyOnTag);
            player.sendMessage(getString("command.xraynotify.status.enabled"));
            if (playerUtils.debugLog) playerUtils.debugLog(`Admin ${player.nameTag} enabled X-Ray notifications.`, player.nameTag);
            if (addLog) addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'xraynotify_on', details: 'X-Ray notifications ON' });
            break;
        case "off":
            try { player.removeTag(notifyOnTag); } catch (e) {}
            player.addTag(notifyOffTag);
            player.sendMessage(getString("command.xraynotify.status.disabled"));
            if (playerUtils.debugLog) playerUtils.debugLog(`Admin ${player.nameTag} disabled X-Ray notifications.`, player.nameTag);
            if (addLog) addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'xraynotify_off', details: 'X-Ray notifications OFF' });
            break;
        case "status":
            const isOn = player.hasTag(notifyOnTag);
            const isOff = player.hasTag(notifyOffTag);
            let statusMessageKey;

            if (isOn) {
                statusMessageKey = "command.xraynotify.currentStatus.onExplicit";
            } else if (isOff) {
                statusMessageKey = "command.xraynotify.currentStatus.offExplicit";
            } else {
                statusMessageKey = config.xrayDetectionAdminNotifyByDefault ?
                                   "command.xraynotify.currentStatus.onDefault" :
                                   "command.xraynotify.currentStatus.offDefault";
            }
            player.sendMessage(getString(statusMessageKey, { prefix: prefix }));
            if (addLog) addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'xraynotify_status', details: `Checked X-Ray notifications status` });
            break;
        default:
            player.sendMessage(getString("command.xraynotify.usage", { prefix: prefix }));
    }
}
