/**
 * @file Defines the !myflags command, allowing players to view their own AntiCheat flag status.
 */
// Assuming permissionLevels is a static export for now.
import { permissionLevels } from '../core/rankManager.js';

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: 'myflags',
    syntax: '', // Prefix handled by commandManager
    description: 'Allows players to view their own AntiCheat flag status.',
    permissionLevel: permissionLevels.member, // Accessible by all members
    enabled: true,
};

/**
 * Executes the !myflags command.
 * Displays the command issuer's current AntiCheat flags, including total count, last flag type,
 * and a breakdown of specific flag counts with their last detection times.
 * @async
 * @param {import('@minecraft/server').Player} player - The player issuing the command.
 * @param {string[]} _args - Command arguments (not used in this command).
 * @param {import('../types.js').Dependencies} dependencies - Object containing dependencies.
 * @returns {Promise<void>}
 */
export async function execute(player, _args, dependencies) {
    const { playerDataManager, getString, playerUtils } = dependencies;
    const playerName = player?.nameTag ?? 'UnknownPlayer';

    if (!player?.isValid()) {
        console.warn('[MyFlagsCommand] Invalid player object.');
        return;
    }

    const pDataSelf = playerDataManager?.getPlayerData(player.id);

    if (pDataSelf?.flags) {
        const totalFlags = pDataSelf.flags.totalFlags ?? 0;
        const lastFlagTypeString = pDataSelf.lastFlagType || getString('common.value.notAvailable');

        let message = getString('command.myflags.header', { totalFlags: totalFlags.toString(), lastFlagType: lastFlagTypeString }) + '\n';
        let specificFlagsFound = false;

        // Sort flag keys alphabetically for consistent display, excluding 'totalFlags'
        const flagKeys = Object.keys(pDataSelf.flags)
            .filter(key => key !== 'totalFlags' && typeof pDataSelf.flags[key] === 'object' && pDataSelf.flags[key] !== null && (pDataSelf.flags[key].count ?? 0) > 0)
            .sort();

        for (const key of flagKeys) {
            const flagDetail = pDataSelf.flags[key];
            const lastDetectionTime = flagDetail.lastDetectionTime ?
                new Date(flagDetail.lastDetectionTime).toLocaleString() : // Use locale string for better readability
                getString('common.value.notAvailable');
            message += getString('command.myflags.flagEntry', { key: key, count: (flagDetail.count ?? 0).toString(), lastDetectionTime: lastDetectionTime }) + '\n';
            specificFlagsFound = true;
        }

        if (!specificFlagsFound && totalFlags === 0) {
            message = getString('command.myflags.noFlags');
        } else if (!specificFlagsFound && totalFlags > 0) {
            // This case indicates totalFlags might be > 0 but no individual flag counts are, or they are not structured as expected.
            message = getString('command.myflags.header', { totalFlags: totalFlags.toString(), lastFlagType: lastFlagTypeString }) + '\n' + getString('command.myflags.noSpecificFlags');
            playerUtils?.debugLog(`[MyFlagsCommand WARNING] Player ${playerName} has totalFlags=${totalFlags} but no specific flag details were displayed. Flags object: ${JSON.stringify(pDataSelf.flags)}`, playerName, dependencies);
        }
        player?.sendMessage(message.trim());
    } else {
        player?.sendMessage(getString('command.myflags.noData'));
    }
    // No server-side logging for this command by default, as it's a self-check.
    // playerUtils?.playSoundForEvent(player, "commandSuccess", dependencies); // Optional sound
}
