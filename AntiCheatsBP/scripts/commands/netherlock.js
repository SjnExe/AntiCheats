/**
 * @file Defines the !netherlock command for administrators to manage Nether dimension access.
 */
import { isNetherLocked, setNetherLocked } from '../utils/worldStateUtils.js';
import { permissionLevels } from '../core/rankManager.js';

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: 'netherlock',
    syntax: '!netherlock <on|off|status>',
    description: 'Manages Nether dimension access.',
    permissionLevel: permissionLevels.admin,
    enabled: true,
};

/**
 * Executes the !netherlock command.
 * Allows administrators to lock, unlock, or check the status of the Nether dimension.
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
                success = setNetherLocked(true); // This function now handles its own try-catch for property setting
                if (success) {
                    player.sendMessage(getString('command.netherlock.locked'));
                    logManager.addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'netherLockOn', details: 'Nether locked' }, dependencies);
                    playerUtils.notifyAdmins(`§7[Admin] §e${player.nameTag}§7 has LOCKED the Nether.`, dependencies, player, null);
                } else {
                    player.sendMessage(getString('command.netherlock.failUpdate'));
                }
                break;
            case 'off':
            case 'unlock':
                success = setNetherLocked(false);
                if (success) {
                    player.sendMessage(getString('command.netherlock.unlocked'));
                    logManager.addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'netherLockOff', details: 'Nether unlocked' }, dependencies);
                    playerUtils.notifyAdmins(`§7[Admin] §e${player.nameTag}§7 has UNLOCKED the Nether.`, dependencies, player, null);
                } else {
                    player.sendMessage(getString('command.netherlock.failUpdate'));
                }
                break;
            case 'status':
                const locked = isNetherLocked(); // This function handles its own try-catch
                statusText = locked ? getString('command.netherlock.status.locked') : getString('command.netherlock.status.unlocked');
                player.sendMessage(getString('command.netherlock.status', { statusText: statusText }));
                break;
            default:
                player.sendMessage(getString('command.netherlock.usage', { prefix: prefix }));
                return; // Explicit return for default case
        }
    } catch (error) {
        // This catch is for unexpected errors within this execute function's logic,
        // not for errors from setNetherLocked/isNetherLocked as they handle their own.
        player.sendMessage(getString('command.netherlock.error.generic', { errorMessage: error.message }));
        console.error(`[NetherlockCommand] Error executing '${subCommand}' for ${player.nameTag}: ${error.stack || error}`);
        logManager.addLog({
            adminName: player.nameTag,
            actionType: 'error',
            context: `netherlockCommand.${subCommand}`,
            details: `Execution error: ${error.message}`,
        }, dependencies);
    }
}
