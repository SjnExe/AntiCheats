// Defines the !netherlock command for administrators to manage Nether dimension access.
import { isNetherLocked, setNetherLocked } from '../utils/worldStateUtils.js';

/** @type {import('../types.js').CommandDefinition} */
export const definition = {
    name: 'netherlock',
    syntax: '<on|off|status>',
    description: 'Manages Nether dimension access. "on" locks, "off" unlocks, "status" checks.',
    permissionLevel: 1, // admin
    enabled: true,
};

/**
 * Executes the !netherlock command.
 * Allows administrators to lock, unlock, or check the status of the Nether dimension.
 * @async
 * @param {import('@minecraft/server').Player} player - The player issuing the command.
 * @param {string[]} args - Command arguments: [on|off|status].
 * @param {import('../types.js').Dependencies} dependencies - Object containing dependencies.
 * @returns {void}
 */
export function execute(player, args, dependencies) {
    const { config, playerUtils, logManager, getString } = dependencies;
    const subCommand = args[0]?.toLowerCase() || 'status';
    const prefix = config?.prefix ?? '!';
    const adminName = player?.nameTag ?? 'UnknownAdmin';

    let statusText;
    let success = false;
    const dimensionNameForMsg = getString('dimensionLock.name.nether');

    try {
        switch (subCommand) {
        case 'on':
        case 'lock': {
            success = setNetherLocked(true);
            if (success) {
                player?.sendMessage(getString('command.netherlock.locked'));
                logManager?.addLog({ adminName, actionType: 'dimensionLockEnabled', targetName: 'Nether', details: 'Nether dimension locked' }, dependencies);
                if (config?.notifyOnAdminUtilCommandUsage !== false) {
                    const baseNotifyMsg = getString('command.dimensionLock.notify.locked', { adminName, dimensionNamePlaceholder: dimensionNameForMsg });
                    playerUtils?.notifyAdmins(baseNotifyMsg, dependencies, player, null);
                }
                playerUtils?.playSoundForEvent(player, 'commandSuccess', dependencies);
            } else {
                player?.sendMessage(getString('command.netherlock.failUpdate'));
                playerUtils?.playSoundForEvent(player, 'commandError', dependencies);
            }
            break;
        }
        case 'off':
        case 'unlock': {
            success = setNetherLocked(false);
            if (success) {
                player?.sendMessage(getString('command.netherlock.unlocked'));
                logManager?.addLog({ adminName, actionType: 'dimensionLockDisabled', targetName: 'Nether', details: 'Nether dimension unlocked' }, dependencies);
                if (config?.notifyOnAdminUtilCommandUsage !== false) {
                    const baseNotifyMsg = getString('command.dimensionLock.notify.unlocked', { adminName, dimensionNamePlaceholder: dimensionNameForMsg });
                    playerUtils?.notifyAdmins(baseNotifyMsg, dependencies, player, null);
                }
                playerUtils?.playSoundForEvent(player, 'commandSuccess', dependencies);
            } else {
                player?.sendMessage(getString('command.netherlock.failUpdate'));
                playerUtils?.playSoundForEvent(player, 'commandError', dependencies);
            }
            break;
        }
        case 'status': {
            const locked = isNetherLocked();
            statusText = locked ? getString('command.netherlock.status.locked') : getString('command.netherlock.status.unlocked');
            player?.sendMessage(getString('command.netherlock.status', { statusText }));
            break;
        }
        default:
            player?.sendMessage(`§cUsage: ${prefix}netherlock <on|off|status>`);

        }
    } catch (error) {
        player?.sendMessage(getString('command.netherlock.error.generic', { commandName: definition.name, errorMessage: error.message }));
        console.error(`[NetherlockCommand CRITICAL] Error for ${adminName} executing '${subCommand}': ${error.stack || error}`);
        playerUtils?.playSoundForEvent(player, 'commandError', dependencies);
        logManager?.addLog({
            adminName,
            actionType: 'errorDimensionLockCommand',
            context: `NetherlockCommand.execute.${subCommand}`,
            targetName: 'Nether',
            details: `Execution error: ${error.message}`,
            errorStack: error.stack || error.toString(),
        }, dependencies);
    }
}
