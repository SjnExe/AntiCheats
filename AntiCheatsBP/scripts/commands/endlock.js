/**
 * @file Defines the !endlock command for administrators to manage End dimension access.
 */
import { isEndLocked, setEndLocked } from '../utils/worldStateUtils.js';
import { permissionLevels } from '../core/rankManager.js';

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: 'endlock',
    syntax: '!endlock <on|off|status>',
    description: 'Manages End dimension access.',
    permissionLevel: permissionLevels.admin,
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
    const { config, playerUtils, logManager, getString } = dependencies;
    const subCommand = args[0] ? args[0].toLowerCase() : 'status';
    const prefix = config.prefix;

    let statusText;
    let success = false;

    try {
        switch (subCommand) {
            case 'on':
            case 'lock':
                success = setEndLocked(true);
                if (success) {
                    player.sendMessage(getString('command.endlock.locked'));
                    logManager.addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'endLockOn', details: 'The End locked' }, dependencies);
                    playerUtils.notifyAdmins(`§7[Admin] The End dimension was locked by §e${player.nameTag}§7.`, dependencies, player, null);
                } else {
                    player.sendMessage(getString('command.endlock.failUpdate'));
                }
                break;
            case 'off':
            case 'unlock':
                success = setEndLocked(false);
                if (success) {
                    player.sendMessage(getString('command.endlock.unlocked'));
                    logManager.addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'endLockOff', details: 'The End unlocked' }, dependencies);
                    playerUtils.notifyAdmins(`§7[Admin] The End dimension was unlocked by §e${player.nameTag}§7.`, dependencies, player, null);
                } else {
                    player.sendMessage(getString('command.endlock.failUpdate'));
                }
                break;
            case 'status':
                const locked = isEndLocked();
                statusText = locked ? getString('command.endlock.status.locked') : getString('command.endlock.status.unlocked');
                player.sendMessage(getString('command.endlock.status', { statusText: statusText }));
                break;
            default:
                player.sendMessage(getString('command.endlock.usage', { prefix: prefix }));
                return;
        }
    } catch (error) {
        player.sendMessage(getString('command.endlock.error.generic', { commandName: definition.name, errorMessage: error.message }));
        console.error(`[EndlockCommand] Error executing '${subCommand}' for ${player.nameTag}: ${error.stack || error}`);
        logManager.addLog({
            adminName: player.nameTag,
            actionType: 'error',
            context: `endlockCommand.${subCommand}`,
            details: `Execution error: ${error.message}`,
        }, dependencies);
    }
}
