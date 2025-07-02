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
    const { config, playerUtils, logManager, getString } = dependencies;
    const subCommand = args[0] ? args[0].toLowerCase() : 'status';
    const notifyOnTag = 'xray_notify_on';
    const notifyOffTag = 'xray_notify_off';
    const prefix = config.prefix;

    switch (subCommand) {
        case 'on':
            player.removeTag(notifyOffTag);
            player.addTag(notifyOnTag);
            player.sendMessage(getString('command.xraynotify.enabled'));
            playerUtils.debugLog(`[XrayNotifyCommand] Admin ${player.nameTag} enabled X-Ray notifications.`, player.nameTag, dependencies);
            logManager.addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'xrayNotifyOn', details: 'X-Ray notifications ON' }, dependencies);
            break;
        case 'off':
            player.removeTag(notifyOnTag);
            player.addTag(notifyOffTag);
            player.sendMessage(getString('command.xraynotify.disabled'));
            playerUtils.debugLog(`[XrayNotifyCommand] Admin ${player.nameTag} disabled X-Ray notifications.`, player.nameTag, dependencies);
            logManager.addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'xrayNotifyOff', details: 'X-Ray notifications OFF' }, dependencies);
            break;
        case 'status':
            const isOn = player.hasTag(notifyOnTag);
            const isOff = player.hasTag(notifyOffTag);
            let statusMessageKey;

            if (isOn) {
                statusMessageKey = 'command.xraynotify.status.onExplicit';
            } else if (isOff) {
                statusMessageKey = 'command.xraynotify.status.offExplicit';
            } else {
                statusMessageKey = config.xrayDetectionAdminNotifyByDefault ?
                                   'command.xraynotify.status.onDefault' :
                                   'command.xraynotify.status.offDefault';
            }
            player.sendMessage(getString(statusMessageKey));
            logManager.addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'xrayNotifyStatus', details: 'Checked X-Ray notifications status' }, dependencies);
            break;
        default:
            player.sendMessage(getString('command.xraynotify.usage', { prefix: prefix }));
    }
}
