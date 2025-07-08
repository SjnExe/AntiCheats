/**
 * @file Defines the !myflags command, allowing players to view their own AntiCheat flag status.
 */
/** @type {import('../types.js').CommandDefinition} */
export const definition = {
    name: 'myflags',
    syntax: '',
    description: 'Allows players to view their own AntiCheat flag status.',
    aliases: ['mf'],
    permissionLevel: 1024, // member
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
 * @returns {void}
 */
export function execute(player, _args, dependencies) {
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

        let message = `${getString('command.myflags.header', { totalFlags: totalFlags.toString(), lastFlagType: lastFlagTypeString }) }\n`;
        let specificFlagsFound = false;

        const flagKeys = Object.keys(pDataSelf.flags)
            .filter(key => key !== 'totalFlags' && typeof pDataSelf.flags[key] === 'object' && pDataSelf.flags[key] !== null && (pDataSelf.flags[key].count ?? 0) > 0)
            .sort();

        for (const key of flagKeys) {
            const flagDetail = pDataSelf.flags[key];
            const lastDetectionTime = flagDetail.lastDetectionTime ?
                new Date(flagDetail.lastDetectionTime).toLocaleString() :
                getString('common.value.notAvailable');
            message += `${getString('command.myflags.flagEntry', { key, count: (flagDetail.count ?? 0).toString(), lastDetectionTime }) }\n`;
            specificFlagsFound = true;
        }

        if (!specificFlagsFound && totalFlags === 0) {
            message = getString('command.myflags.noFlags');
        } else if (!specificFlagsFound && totalFlags > 0) {
            message = `${getString('command.myflags.header', { totalFlags: totalFlags.toString(), lastFlagType: lastFlagTypeString }) }\n${ getString('command.myflags.noSpecificFlags')}`;
            playerUtils?.debugLog(`[MyFlagsCommand WARNING] Player ${playerName} has totalFlags=${totalFlags} but no specific flag details were displayed. Flags object: ${JSON.stringify(pDataSelf.flags)}`, playerName, dependencies);
        }
        player?.sendMessage(message.trim());
    } else {
        player?.sendMessage(getString('command.myflags.noData'));
    }
}
