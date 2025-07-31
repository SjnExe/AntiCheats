/** @type {import('../../types.js').CommandDefinition} */
export const definition = {
    name: 'inspect',
    syntax: '<playername>',
    description: 'Views a player\'s AntiCheat data and status, including flags, mutes, and bans.',
    permissionLevel: 1, // admin
};

/**
 * Executes the inspect command.
 * @param {import('@minecraft/server').Player} player
 * @param {string[]} args
 * @param {import('../../types.js').Dependencies} dependencies
 */
export function execute(player, args, dependencies) {
    const { config, playerUtils, playerDataManager, logManager, getString } = dependencies;
    const adminName = player?.nameTag ?? 'UnknownAdmin';
    const prefix = config?.prefix ?? '!';
    const usageMessage = `§cUsage: ${prefix}inspect <playername>`;

    if (args.length < 1) {
        player.sendMessage(usageMessage);
        return;
    }

    const targetPlayerName = args[0];
    const targetPlayer = playerUtils?.findPlayer(targetPlayerName);
    let pData;

    if (targetPlayer && targetPlayer.isValid()) {
        pData = playerDataManager?.getPlayerData(targetPlayer.id);
    } else {
        player.sendMessage(getString('common.error.playerNotFoundOnline', { playerName: targetPlayerName }));
        return;
    }


    const messageLines = [];
    const targetDisplayName = targetPlayer?.nameTag ?? targetPlayerName;
    messageLines.push(getString('command.inspect.header', { playerName: targetDisplayName }));

    if (pData) {
        messageLines.push(getString('command.inspect.playerId', { playerId: targetPlayer?.id ?? pData.id ?? getString('common.value.unknown') }));
        messageLines.push(getString('command.inspect.watched', { isWatched: pData.isWatched ? getString('common.boolean.yes') : getString('common.boolean.no') }));
        messageLines.push(getString('command.inspect.totalFlags', { totalFlags: (pData.flags?.totalFlags ?? 0).toString() }));
        messageLines.push(getString('command.inspect.lastFlagType', { lastFlagType: pData.lastFlagType || getString('common.value.notAvailable') }));

        let specificFlagsFound = false;
        if (pData.flags) {
            messageLines.push(getString('command.inspect.flagsByTypeHeader'));
            const flagKeys = Object.keys(pData.flags)
                .filter(key => key !== 'totalFlags' && typeof pData.flags[key] === 'object' && pData.flags[key] !== null && (pData.flags[key].count ?? 0) > 0)
                .sort();

            for (const flagKey of flagKeys) {
                const flagData = pData.flags[flagKey];
                const timestamp = flagData.lastDetectionTime ? new Date(flagData.lastDetectionTime).toLocaleString() : getString('common.value.notAvailable');
                messageLines.push(getString('command.inspect.flagEntry', { flagKey, count: (flagData.count ?? 0).toString(), timestamp }));
                specificFlagsFound = true;
            }
            if (!specificFlagsFound) {
                messageLines.push(getString('command.inspect.noSpecificFlags'));
            }
        }

        const muteInfo = targetPlayer ? playerDataManager?.getMuteInfo(targetPlayer, dependencies) : pData.muteInfo;
        if (muteInfo) {
            const expiry = muteInfo.unmuteTime === Infinity ? getString('ban.duration.permanent') : new Date(muteInfo.unmuteTime).toLocaleString();
            messageLines.push(getString('command.inspect.muted.yes', { expiry, reason: muteInfo.reason || getString('common.value.noReasonProvided') }));
        } else {
            messageLines.push(getString('command.inspect.muted.no'));
        }

        const banInfo = targetPlayer ? playerDataManager?.getBanInfo(targetPlayer, dependencies) : pData.banInfo;
        if (banInfo) {
            const expiry = banInfo.unbanTime === Infinity ? getString('ban.duration.permanent') : new Date(banInfo.unbanTime).toLocaleString();
            messageLines.push(getString('command.inspect.banned.yes', { expiry, reason: banInfo.reason || getString('common.value.noReasonProvided') }));
        } else {
            messageLines.push(getString('command.inspect.banned.no'));
        }

    } else {
        messageLines.push(getString('command.inspect.noData'));
    }

    player.sendMessage(messageLines.join('\n'));
    playerUtils?.playSoundForEvent(player, 'commandSuccess', dependencies);

    try {
        logManager?.addLog({
            adminName,
            actionType: 'playerInspected',
            targetName: targetDisplayName,
            targetId: targetPlayer?.id ?? pData?.id,
            details: `Inspected ${targetDisplayName}`,
        }, dependencies);
    } catch (logError) {
        console.error(`[InspectCommand CRITICAL] Error logging inspect action: ${logError.stack || logError}`);
        playerUtils?.debugLog(`[InspectCommand CRITICAL] Logging error for ${adminName}: ${logError.message}`, adminName, dependencies);
    }
}
