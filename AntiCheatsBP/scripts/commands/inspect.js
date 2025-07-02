/**
 * @file Defines the !inspect command for administrators to view a player's AntiCheat data.
 */
import { permissionLevels } from '../core/rankManager.js';

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: 'inspect',
    syntax: '!inspect <playername>',
    description: 'Views a player\'s AntiCheat data and status, including flags, mutes, and bans.',
    permissionLevel: permissionLevels.admin,
    enabled: true,
};

/**
 * Executes the !inspect command.
 * Displays detailed AntiCheat information about a target player to the command issuer.
 * @async
 * @param {import('@minecraft/server').Player} player - The player issuing the command.
 * @param {string[]} args - Command arguments: <playername>.
 * @param {import('../types.js').CommandDependencies} dependencies - Object containing dependencies.
 * @returns {Promise<void>}
 */
export async function execute(player, args, dependencies) {
    const { config, playerUtils, playerDataManager, logManager, getString } = dependencies;

    if (args.length < 1) {
        player.sendMessage(getString('command.inspect.usage', { prefix: config.prefix }));
        return;
    }

    const targetPlayerName = args[0];
    const targetPlayer = playerUtils.findPlayer(targetPlayerName);

    if (!targetPlayer) {
        player.sendMessage(getString('common.error.playerNotFound', { playerName: targetPlayerName }));
        return;
    }

    const pData = playerDataManager.getPlayerData(targetPlayer.id);
    const messageLines = [];
    messageLines.push(getString('command.inspect.header', { playerName: targetPlayer.nameTag }));

    if (pData) {
        messageLines.push(getString('command.inspect.playerId', { playerId: targetPlayer.id }));
        messageLines.push(getString('command.inspect.watched', { isWatched: pData.isWatched ? getString('common.boolean.yes') : getString('common.boolean.no') }));
        messageLines.push(getString('command.inspect.totalFlags', { totalFlags: (pData.flags?.totalFlags ?? 0).toString() }));
        messageLines.push(getString('command.inspect.lastFlagType', { lastFlagType: pData.lastFlagType || getString('common.value.notAvailable') }));

        let specificFlagsFound = false;
        if (pData.flags) {
            messageLines.push(getString('command.inspect.flagsByTypeHeader'));
            for (const flagKey in pData.flags) {
                if (flagKey !== 'totalFlags' && typeof pData.flags[flagKey] === 'object' && pData.flags[flagKey] !== null && pData.flags[flagKey].count > 0) {
                    const flagData = pData.flags[flagKey];
                    const timestamp = flagData.lastDetectionTime ? new Date(flagData.lastDetectionTime).toLocaleTimeString() : getString('common.value.notAvailable');
                    messageLines.push(getString('command.inspect.flagEntry', { flagKey: flagKey, count: flagData.count.toString(), timestamp: timestamp }));
                    specificFlagsFound = true;
                }
            }
            if (!specificFlagsFound) {
                messageLines.push(getString('command.inspect.noSpecificFlags'));
            }
        }

        const muteInfo = playerDataManager.getMuteInfo(targetPlayer, dependencies);
        if (muteInfo) {
            const expiry = muteInfo.unmuteTime === Infinity ? getString('ban.duration.permanent') : new Date(muteInfo.unmuteTime).toLocaleString();
            messageLines.push(getString('command.inspect.muted.yes', { expiry: expiry, reason: muteInfo.reason || getString('common.value.noReasonProvided') }));
        } else {
            messageLines.push(getString('command.inspect.muted.no'));
        }

        const banInfo = playerDataManager.getBanInfo(targetPlayer, dependencies);
        if (banInfo) {
            const expiry = banInfo.unbanTime === Infinity ? getString('ban.duration.permanent') : new Date(banInfo.unbanTime).toLocaleString();
            messageLines.push(getString('command.inspect.banned.yes', { expiry: expiry, reason: banInfo.reason || getString('common.value.noReasonProvided') }));
        } else {
            messageLines.push(getString('command.inspect.banned.no'));
        }

    } else {
        messageLines.push(getString('command.inspect.noData'));
    }

    player.sendMessage(messageLines.join('\n'));

    try {
        logManager.addLog({
            timestamp: Date.now(),
            adminName: player.nameTag,
            actionType: 'inspectPlayer',
            targetName: targetPlayer.nameTag,
            details: `Inspected ${targetPlayer.nameTag}`,
        }, dependencies);
    } catch (logError) {
        console.error(`[InspectCommand] Error logging inspect action: ${logError.stack || logError}`);
        playerUtils.debugLog(`[InspectCommand] Logging error: ${logError.message}`, player.nameTag, dependencies);
    }
}
