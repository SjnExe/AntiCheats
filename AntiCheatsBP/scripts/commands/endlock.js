/**
 * @file Defines the !endlock command for administrators to manage End dimension access.
 */
import { isEndLocked, setEndLocked } from '../utils/worldStateUtils.js';
import { permissionLevels } from '../core/rankManager.js'; // Standardized import

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: 'endlock',
    syntax: '!endlock <on|off|status>',
    description: 'Manages End dimension access.',
    permissionLevel: permissionLevels.admin, // Use a defined level
    enabled: true,
};

/**
 * Executes the !endlock command.
 * Allows administrators to lock, unlock, or check the status of The End dimension.
 * @async
 * @param {import('@minecraft/server').Player} player - The player issuing the command.
 * @param {string[]} args - Command arguments: [on|off|status].
 * @param {import('../types.js').CommandDependencies} dependencies - Object containing dependencies.
 * @returns {Promise<void>}
 */
export async function execute(player, args, dependencies) {
    const { config, playerUtils, logManager, getString } = dependencies; // Removed unused permissionLevels from here
    const subCommand = args[0] ? args[0].toLowerCase() : 'status';
    const prefix = config.prefix;

    let statusText;
    let success = false; // To track if setEndLocked was successful

    try {
        switch (subCommand) {
            case 'on':
            case 'lock':
                success = setEndLocked(true);
                if (success) {
                    player.sendMessage(getString('endlock.locked'));
                    logManager.addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'endLockOn', details: 'The End locked' }, dependencies);
                    playerUtils.notifyAdmins(getString('endlock.adminNotification.locked', { playerName: player.nameTag }), dependencies, player, null);
                } else {
                    player.sendMessage(getString('endlock.error.failedUpdate'));
                }
                break;
            case 'off':
            case 'unlock':
                success = setEndLocked(false);
                if (success) {
                    player.sendMessage(getString('endlock.unlocked'));
                    logManager.addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'endLockOff', details: 'The End unlocked' }, dependencies);
                    playerUtils.notifyAdmins(getString('endlock.adminNotification.unlocked', { playerName: player.nameTag }), dependencies, player, null);
                } else {
                    player.sendMessage(getString('endlock.error.failedUpdate'));
                }
                break;
            case 'status':
                const locked = isEndLocked(); // This function should not throw, handles its own try-catch
                statusText = locked ? getString('endlock.status.locked') : getString('endlock.status.unlocked');
                player.sendMessage(getString('endlock.status.current', { status: statusText }));
                break;
            default:
                player.sendMessage(getString('endlock.error.usage', { prefix: prefix }));
                return;
        }
    } catch (error) {
        player.sendMessage(getString('common.error.unexpectedCommand', { commandName: definition.name, error: error.message }));
        console.error(`[EndlockCommand] Error executing '${subCommand}' for ${player.nameTag}: ${error.stack || error}`);
        logManager.addLog({
            adminName: player.nameTag,
            actionType: 'error',
            context: `endlockCommand.${subCommand}`,
            details: `Execution error: ${error.message}`,
        }, dependencies);
    }
}
