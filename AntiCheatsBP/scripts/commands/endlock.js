/**
 * /**
 * @file Defines the !endlock command for administrators to manage End dimension access.
 */
import { isEndLocked, setEndLocked } from '../utils/worldStateUtils.js';

/** @type {import('../types.js').CommandDefinition} */
export const definition = {
    name: 'endlock',
    syntax: '<on|off|status>',
    description: 'Manages End dimension access. "on" locks, "off" unlocks, "status" checks.',
    aliases: ['el'],
    permissionLevel: 1, // admin
    enabled: true,
};

/**
 * Executes the !endlock command.
 * Allows administrators to lock, unlock, or check the status of The End dimension.
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
    const dimensionNameForMsg = getString('dimensionLock.name.end');

    try {
        switch (subCommand) {
        case 'on':
        case 'lock': {
            success = setEndLocked(true);
            if (success) {
                player?.sendMessage(getString('command.endlock.locked'));
                logManager?.addLog({ adminName, actionType: 'dimensionLockEnabled', targetName: 'The End', details: 'The End dimension locked' }, dependencies);
                if (config?.notifyOnAdminUtilCommandUsage !== false) {
                    const baseNotifyMsg = getString('command.dimensionLock.notify.locked', { adminName, dimensionNamePlaceholder: dimensionNameForMsg });
                    playerUtils?.notifyAdmins(baseNotifyMsg, dependencies, player, null);
                }
                playerUtils?.playSoundForEvent(player, 'commandSuccess', dependencies);
            } else {
                player?.sendMessage(getString('command.endlock.failUpdate'));
                playerUtils?.playSoundForEvent(player, 'commandError', dependencies);
            }
            break;
        }
        case 'off':
        case 'unlock': {
            success = setEndLocked(false);
            if (success) {
                player?.sendMessage(getString('command.endlock.unlocked'));
                logManager?.addLog({ adminName, actionType: 'dimensionLockDisabled', targetName: 'The End', details: 'The End dimension unlocked' }, dependencies);
                if (config?.notifyOnAdminUtilCommandUsage !== false) {
                    const baseNotifyMsg = getString('command.dimensionLock.notify.unlocked', { adminName, dimensionNamePlaceholder: dimensionNameForMsg });
                    playerUtils?.notifyAdmins(baseNotifyMsg, dependencies, player, null);
                }
                playerUtils?.playSoundForEvent(player, 'commandSuccess', dependencies);
            } else {
                player?.sendMessage(getString('command.endlock.failUpdate'));
                playerUtils?.playSoundForEvent(player, 'commandError', dependencies);
            }
            break;
        }
        case 'status': {
            const locked = isEndLocked();
            statusText = locked ? getString('command.endlock.status.locked') : getString('command.endlock.status.unlocked');
            player?.sendMessage(getString('command.endlock.status', { statusText }));
            break;
        }
        default:
            player?.sendMessage(`§cUsage: ${prefix}endlock <on|off|status>`);

        }
    } catch (error) {
        player?.sendMessage(getString('command.endlock.error.generic', { commandName: definition.name, errorMessage: error.message }));
        console.error(`[EndlockCommand CRITICAL] Error for ${adminName} executing '${subCommand}': ${error.stack || error}`);
        playerUtils?.playSoundForEvent(player, 'commandError', dependencies);
        logManager?.addLog({
            adminName,
            actionType: 'errorDimensionLockCommand',
            context: `EndlockCommand.execute.${subCommand}`,
            targetName: 'The End',
            details: `Execution error: ${error.message}`,
            errorStack: error.stack || error.toString(),
        }, dependencies);
    }
}
