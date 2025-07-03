/**
 * @file Defines the !myflags command, allowing players to view their own AntiCheat flag status.
 */
import { permissionLevels } from '../core/rankManager.js'; // Assuming permissionLevels is correctly populated

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: 'myflags', // Already camelCase
    syntax: '!myflags',
    description: 'Allows players to view their own AntiCheat flag status.',
    permissionLevel: permissionLevels.member,
    enabled: true,
};

/**
 * Executes the !myflags command.
 * Displays the command issuer's current AntiCheat flags, including total count, last flag type,
 * and a breakdown of specific flag counts with their last detection times.
 * @async
 * @param {import('@minecraft/server').Player} player - The player issuing the command.
 * @param {string[]} _args - Command arguments (not used in this command).
 * @param {import('../types.js').CommandDependencies} dependencies - Object containing dependencies.
 * @returns {Promise<void>}
 */
export async function execute(player, _args, dependencies) {
    const { playerDataManager, getString, playerUtils } = dependencies; // Added playerUtils for debug
    const playerName = player?.nameTag ?? 'UnknownPlayer';

    const pDataSelf = playerDataManager?.getPlayerData(player.id);

    if (pDataSelf?.flags) {
        const totalFlags = pDataSelf.flags.totalFlags ?? 0;
        const lastFlagTypeString = pDataSelf.lastFlagType || getString('common.value.notAvailable');

        let message = getString('command.myflags.header', { totalFlags: totalFlags.toString(), lastFlagType: lastFlagTypeString }) + '\n';
        let specificFlagsFound = false;

        for (const key in pDataSelf.flags) {
            if (Object.prototype.hasOwnProperty.call(pDataSelf.flags, key)) {
                // Ensure the flag entry is an object and has a count property
                if (key !== 'totalFlags' && typeof pDataSelf.flags[key] === 'object' && pDataSelf.flags[key] !== null && typeof pDataSelf.flags[key].count === 'number' && pDataSelf.flags[key].count > 0) {
                    const flagDetail = pDataSelf.flags[key];
                    const lastDetectionTime = flagDetail.lastDetectionTime ?
                        new Date(flagDetail.lastDetectionTime).toLocaleTimeString() : // Using toLocaleTimeString for brevity
                        getString('common.value.notAvailable');
                    // Key is already expected to be camelCase from pData structure
                    message += getString('command.myflags.flagEntry', { key: key, count: flagDetail.count.toString(), lastDetectionTime: lastDetectionTime }) + '\n';
                    specificFlagsFound = true;
                }
            }
        }

        if (!specificFlagsFound && totalFlags === 0) {
            message = getString('command.myflags.noFlags');
        } else if (!specificFlagsFound && totalFlags > 0) {
            // This case indicates totalFlags might be > 0 but no individual flag counts are, or they are not structured as expected.
            message = getString('command.myflags.header', { totalFlags: totalFlags.toString(), lastFlagType: lastFlagTypeString }) + '\n' + getString('command.myflags.noSpecificFlags');
            playerUtils?.debugLog(`[MyFlagsCommand.execute] Player ${playerName} has totalFlags=${totalFlags} but no specific flag details were displayed. Flags object: ${JSON.stringify(pDataSelf.flags)}`, playerName, dependencies);
        }
        player?.sendMessage(message.trim());
    } else {
        player?.sendMessage(getString('command.myflags.noData'));
    }
    // No server-side logging for this command by default, as it's a self-check.
    // playerUtils?.debugLog(`[MyFlagsCommand.execute] ${playerName} checked their flags.`, playerName, dependencies); // Optional debug log
}
