/**
 * @file Defines the !endlock command for administrators to manage End dimension access.
 */
import { isEndLocked, setEndLocked } from '../utils/worldStateUtils.js';
import { permissionLevels } from '../core/rankManager.js';

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: 'endlock', // Already camelCase
    syntax: '!endlock <on|off|status>',
    description: 'Manages End dimension access.',
    permissionLevel: permissionLevels.admin, // Assuming permissionLevels is correctly populated
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
    const subCommand = args[0]?.toLowerCase() || 'status'; // Default to 'status', ensure lowercase
    const prefix = config?.prefix;
    const adminName = player?.nameTag ?? 'UnknownAdmin';

    let statusText;
    let success = false;

    try {
        switch (subCommand) {
            case 'on':
            case 'lock':
                success = setEndLocked(true); // worldStateUtils functions are synchronous
                if (success) {
                    player?.sendMessage(getString('command.endlock.locked'));
                    logManager?.addLog({ adminName, actionType: 'endLockEnabled', details: 'The End locked' }, dependencies);
                    playerUtils?.notifyAdmins(`§7[Admin] The End dimension was locked by §e${adminName}§7.`, dependencies, player, null);
                } else {
                    player?.sendMessage(getString('command.endlock.failUpdate'));
                }
                break;
            case 'off':
            case 'unlock':
                success = setEndLocked(false);
                if (success) {
                    player?.sendMessage(getString('command.endlock.unlocked'));
                    logManager?.addLog({ adminName, actionType: 'endLockDisabled', details: 'The End unlocked' }, dependencies);
                    playerUtils?.notifyAdmins(`§7[Admin] The End dimension was unlocked by §e${adminName}§7.`, dependencies, player, null);
                } else {
                    player?.sendMessage(getString('command.endlock.failUpdate'));
                }
                break;
            case 'status':
                const locked = isEndLocked(); // Synchronous
                statusText = locked ? getString('command.endlock.status.locked') : getString('command.endlock.status.unlocked');
                player?.sendMessage(getString('command.endlock.status', { statusText }));
                break;
            default:
                player?.sendMessage(getString('command.endlock.usage', { prefix }));
                return;
        }
    } catch (error) {
        player?.sendMessage(getString('command.endlock.error.generic', { commandName: definition.name, errorMessage: error.message }));
        console.error(`[EndlockCommand.execute] Error for ${adminName} executing '${subCommand}': ${error.stack || error}`);
        logManager?.addLog({
            adminName,
            actionType: 'errorEndlockCommand', // More specific error actionType
            context: `EndlockCommand.execute.${subCommand}`,
            details: `Execution error: ${error.message}`,
            error: error.stack || error.message,
        }, dependencies);
    }
}
