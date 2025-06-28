/**
 * Defines the !xraynotify command for administrators to manage their X-Ray mining notifications.
 */
import { permissionLevels as importedPermissionLevels } from '../core/rankManager.js';
/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: 'xraynotify',
    syntax: '!xraynotify <on|off|status>',
    description: 'Manages your X-Ray mining notification preferences.',
    permissionLevel: importedPermissionLevels.admin,
    enabled: true,
};
/**
 * Executes the xraynotify command.
 */
export async function execute(player, args, dependencies) {
    const { config, playerUtils, logManager } = dependencies;
    const subCommand = args[0] ? args[0].toLowerCase() : 'status';
    const notifyOnTag = 'xray_notify_on';
    const notifyOffTag = 'xray_notify_off';
    const prefix = config.prefix;

    switch (subCommand) {
        case 'on':
            player.removeTag(notifyOffTag); // It's safe to call removeTag even if tag isn't present
            player.addTag(notifyOnTag);
            player.sendMessage('§aX-Ray mining notifications are now ENABLED for you.');
            playerUtils.debugLog(`[XrayNotifyCommand] Admin ${player.nameTag} enabled X-Ray notifications.`, player.nameTag, dependencies);
            logManager.addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'xrayNotifyOn', details: 'X-Ray notifications ON' }, dependencies);
            break;
        case 'off':
            player.removeTag(notifyOnTag); // It's safe to call removeTag even if tag isn't present
            player.addTag(notifyOffTag);
            player.sendMessage('§cX-Ray mining notifications are now DISABLED for you.');
            playerUtils.debugLog(`[XrayNotifyCommand] Admin ${player.nameTag} disabled X-Ray notifications.`, player.nameTag, dependencies);
            logManager.addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'xrayNotifyOff', details: 'X-Ray notifications OFF' }, dependencies);
            break;
        case 'status':
            const isOn = player.hasTag(notifyOnTag);
            const isOff = player.hasTag(notifyOffTag);
            let statusMessage;

            if (isOn) {
                statusMessage = '§eYour X-Ray notifications are currently: ON (explicitly set)';
            } else if (isOff) {
                statusMessage = '§eYour X-Ray notifications are currently: OFF (explicitly set)';
            } else {
                statusMessage = config.xrayDetectionAdminNotifyByDefault ?
                                   '§eYour X-Ray notifications are currently: ON (server default)' :
                                   '§eYour X-Ray notifications are currently: OFF (server default)';
            }
            player.sendMessage(statusMessage);
            logManager.addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'xrayNotifyStatus', details: 'Checked X-Ray notifications status' }, dependencies);
            break;
        default:
            player.sendMessage(`§cUsage: ${prefix}xraynotify <on|off|status>`);
    }
}
