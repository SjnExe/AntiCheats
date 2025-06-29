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
    const { config, playerUtils, logManager } = dependencies;
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
                    player.sendMessage('§aThe End dimension is now locked.');
                    logManager.addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'endLockOn', details: 'The End locked' }, dependencies);
                    playerUtils.notifyAdmins(`§7[Admin] The End dimension was locked by §e${player.nameTag}§7.`, dependencies, player, null);
                } else {
                    player.sendMessage('§cFailed to update End lock status.');
                }
                break;
            case 'off':
            case 'unlock':
                success = setEndLocked(false);
                if (success) {
                    player.sendMessage('§aThe End dimension is now unlocked.');
                    logManager.addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'endLockOff', details: 'The End unlocked' }, dependencies);
                    playerUtils.notifyAdmins(`§7[Admin] The End dimension was unlocked by §e${player.nameTag}§7.`, dependencies, player, null);
                } else {
                    player.sendMessage('§cFailed to update End lock status.');
                }
                break;
            case 'status':
                const locked = isEndLocked();
                statusText = locked ? '§cLocked' : '§aUnlocked';
                player.sendMessage(`§eEnd dimension status: ${statusText}`);
                break;
            default:
                player.sendMessage(`§cUsage: ${prefix}endlock <on|off|status>`);
                return;
        }
    } catch (error) {
        player.sendMessage(`§cAn unexpected error occurred with the ${definition.name} command: ${error.message}`);
        console.error(`[EndlockCommand] Error executing '${subCommand}' for ${player.nameTag}: ${error.stack || error}`);
        logManager.addLog({
            adminName: player.nameTag,
            actionType: 'error',
            context: `endlockCommand.${subCommand}`,
            details: `Execution error: ${error.message}`,
        }, dependencies);
    }
}
