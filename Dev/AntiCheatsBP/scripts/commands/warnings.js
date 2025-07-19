// Defines the !warnings command for administrators to view a summary of a player's AntiCheat flags.
/** @type {import('../types.js').CommandDefinition} */
export const definition = {
    name: 'warnings',
    syntax: '<playername>',
    description: 'Displays a summary of a player\'s AntiCheat flags (warnings).',
    permissionLevel: 1, // admin
    enabled: true,
};

/**
 * Executes the !warnings command.
 * Displays a summary of the target player's AntiCheat flags to the command issuer.
 * @async
 * @param {import('@minecraft/server').Player} player - The player issuing the command.
 * @param {string[]} args - Command arguments: [playername].
 * @param {import('../types.js').Dependencies} dependencies - Object containing dependencies.
 * @returns {void}
 */
export function execute(player, args, dependencies) {
    const { config, playerUtils, playerDataManager, logManager, getString } = dependencies;
    const adminName = player?.nameTag ?? 'UnknownAdmin';
    const prefix = config?.prefix ?? '!';

    if (args.length < 1) {
        player.sendMessage(getString('command.warnings.usage', { prefix }));
        return;
    }

    const targetPlayerName = args[0];
    const targetPlayer = playerUtils?.findPlayer(targetPlayerName);

    if (!targetPlayer || !targetPlayer.isValid()) {
        player.sendMessage(getString('common.error.playerNotFoundOnline', { playerName: targetPlayerName }));
        return;
    }

    const pData = playerDataManager?.getPlayerData(targetPlayer.id);
    const messageLines = [];
    messageLines.push(getString('command.warnings.header', { playerName: targetPlayer.nameTag }));

    if (pData && pData.flags) {
        const totalFlags = pData.flags.totalFlags ?? 0;
        messageLines.push(getString('command.warnings.totalFlags', { totalFlags: totalFlags.toString() }));

        const lastFlagType = pData.lastFlagType || getString('common.value.notAvailable');
        messageLines.push(getString('command.warnings.lastFlagType', { lastFlagType }));

        let specificFlagsOutput = '';
        let specificFlagsFound = false;
        const flagKeys = Object.keys(pData.flags)
            .filter(key => key !== 'totalFlags' && typeof pData.flags[key] === 'object' && pData.flags[key] !== null && (pData.flags[key].count ?? 0) > 0)
            .sort();

        for (const flagKey of flagKeys) {
            const flagData = pData.flags[flagKey];
            const lastTime = flagData.lastDetectionTime ? new Date(flagData.lastDetectionTime).toLocaleTimeString() : getString('common.value.notAvailable');
            specificFlagsOutput += `\n${ getString('command.warnings.flagEntry', { flagKey, count: (flagData.count ?? 0).toString(), lastTime })}`;
            specificFlagsFound = true;
        }

        if (specificFlagsFound) {
            messageLines.push(getString('command.warnings.individualFlagsHeader') + specificFlagsOutput);
        } else if (totalFlags > 0) {
            messageLines.push(getString('command.warnings.noSpecific'));
            playerUtils?.debugLog(`[WarningsCommand WARNING] Player ${targetPlayer.nameTag} has totalFlags=${totalFlags} but no specific flag details were displayed. Flags object: ${JSON.stringify(pData.flags)}`, adminName, dependencies);
        } else {
            messageLines.push(getString('command.myflags.noFlags'));
        }
    } else {
        messageLines.push(getString('command.warnings.noData', { playerName: targetPlayer.nameTag }));
    }

    player.sendMessage(messageLines.join('\n'));
    playerUtils?.playSoundForEvent(player, 'commandSuccess', dependencies);

    try {
        logManager?.addLog({
            adminName,
            actionType: 'warningsViewed',
            targetName: targetPlayer.nameTag,
            targetId: targetPlayer.id,
            details: `Viewed warnings for ${targetPlayer.nameTag}. Total flags: ${pData?.flags?.totalFlags ?? 'N/A'}.`,
        }, dependencies);
    } catch (logError) {
        console.error(`[WarningsCommand CRITICAL] Error logging warnings view: ${logError.stack || logError}`);
        playerUtils?.debugLog(`[WarningsCommand CRITICAL] Logging error for ${adminName}: ${logError.message}`, adminName, dependencies);
    }
}
