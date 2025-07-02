/**
 * @file Defines the !myflags command, allowing players to view their own AntiCheat flag status.
 */
import { permissionLevels } from '../core/rankManager.js';

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: 'myflags',
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
    const { playerDataManager, getString } = dependencies;
    const pDataSelf = playerDataManager.getPlayerData(player.id);

    if (pDataSelf && pDataSelf.flags) {
        const totalFlags = pDataSelf.flags.totalFlags || 0;
        const lastFlagTypeString = pDataSelf.lastFlagType || getString('common.value.notAvailable');

        let message = getString('command.myflags.header', { totalFlags: totalFlags.toString(), lastFlagType: lastFlagTypeString }) + '\n';
        let specificFlagsFound = false;

        // Iterate over own properties of the flags object to avoid issues with Object.prototype
        for (const key in pDataSelf.flags) {
            if (Object.prototype.hasOwnProperty.call(pDataSelf.flags, key)) {
                if (key !== 'totalFlags' && typeof pDataSelf.flags[key] === 'object' && pDataSelf.flags[key] !== null && pDataSelf.flags[key].count > 0) {
                    const flagDetail = pDataSelf.flags[key];
                    const lastDetectionTime = flagDetail.lastDetectionTime ?
                        new Date(flagDetail.lastDetectionTime).toLocaleTimeString() :
                        getString('common.value.notAvailable');
                    message += getString('command.myflags.flagEntry', { key: key, count: flagDetail.count.toString(), lastDetectionTime: lastDetectionTime }) + '\n';
                    specificFlagsFound = true;
                }
            }
        }

        if (!specificFlagsFound && totalFlags === 0) {
            message = getString('command.myflags.noFlags');
        } else if (!specificFlagsFound && totalFlags > 0) {
            // This case might occur if totalFlags got desynced or only contains non-object/empty flags
            message = getString('command.myflags.header', { totalFlags: totalFlags.toString(), lastFlagType: lastFlagTypeString }) + '\n' + getString('command.myflags.noSpecificFlags');
        }
        player.sendMessage(message.trim());
    } else {
        player.sendMessage(getString('command.myflags.noData'));
    }
    // No logManager.addLog needed for players checking their own flags typically, unless desired for audit.
}
