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
    permissionLevel: permissionLevels.normal, // Accessible to all players
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
    const { playerDataManager } = dependencies; // Removed unused permissionLevels
    const pDataSelf = playerDataManager.getPlayerData(player.id);

    if (pDataSelf && pDataSelf.flags) {
        const totalFlags = pDataSelf.flags.totalFlags || 0;
        const lastFlagTypeString = pDataSelf.lastFlagType || 'None';

        let message = `§7Your current flags: §eTotal=${totalFlags}§7. Last type: §e${lastFlagTypeString}§r\n`;
        let specificFlagsFound = false;

        // Iterate over own properties of the flags object to avoid issues with Object.prototype
        for (const key in pDataSelf.flags) {
            if (Object.prototype.hasOwnProperty.call(pDataSelf.flags, key)) {
                if (key !== 'totalFlags' && typeof pDataSelf.flags[key] === 'object' && pDataSelf.flags[key] !== null && pDataSelf.flags[key].count > 0) {
                    const flagDetail = pDataSelf.flags[key];
                    const lastDetectionTime = flagDetail.lastDetectionTime ?
                        new Date(flagDetail.lastDetectionTime).toLocaleTimeString() :
                        'N/A';
                    message += ` §7- ${key}: §e${flagDetail.count} §7(Last: ${lastDetectionTime})\n`;
                    specificFlagsFound = true;
                }
            }
        }

        if (!specificFlagsFound && totalFlags === 0) {
            message = '§7You have no active flags.';
        } else if (!specificFlagsFound && totalFlags > 0) {
            // This case might occur if totalFlags got desynced or only contains non-object/empty flags
            message = `§7Your current flags: §eTotal=${totalFlags}§7. Last type: §e${lastFlagTypeString}§r\n§7(No specific flag type details available with counts > 0).`;
        }
        player.sendMessage(message.trim());
    } else {
        player.sendMessage('§7No flag data found for you, or you have no flags.');
    }
    // No logManager.addLog needed for players checking their own flags typically, unless desired for audit.
}
