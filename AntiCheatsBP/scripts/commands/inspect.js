/**
 * @file Defines the !inspect command for administrators to view a player's AntiCheat data.
 */
import { permissionLevels } from '../core/rankManager.js'; // Standardized import

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: 'inspect',
    syntax: '!inspect <playername>',
    description: 'Views a player\'s AntiCheat data and status, including flags, mutes, and bans.',
    permissionLevel: permissionLevels.admin, // Use a defined level
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
    const { config, playerUtils, playerDataManager, logManager, getString } = dependencies; // Removed unused permissionLevels

    if (args.length < 1) {
        player.sendMessage(getString('inspect.error.usage', { prefix: config.prefix }));
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
    messageLines.push(getString('inspect.header', { playerName: targetPlayer.nameTag }));

    if (pData) {
        messageLines.push(getString('inspect.entry.playerId', { playerId: targetPlayer.id }));
        messageLines.push(getString('inspect.entry.isWatched', { status: pData.isWatched ? getString('common.boolean.yes') : getString('common.boolean.no') }));
        messageLines.push(getString('inspect.entry.totalFlags', { count: (pData.flags?.totalFlags ?? 0).toString() }));
        messageLines.push(getString('inspect.entry.lastFlagType', { type: pData.lastFlagType || getString('common.value.none') }));

        let specificFlagsFound = false;
        if (pData.flags) {
            messageLines.push(getString('inspect.label.flagsByType'));
            for (const flagKey in pData.flags) {
                // Ensure it's a flag object and not 'totalFlags' or other properties
                if (flagKey !== 'totalFlags' && typeof pData.flags[flagKey] === 'object' && pData.flags[flagKey] !== null && pData.flags[flagKey].count > 0) {
                    const flagData = pData.flags[flagKey];
                    const timestamp = flagData.lastDetectionTime ? new Date(flagData.lastDetectionTime).toLocaleTimeString() : getString('common.value.notApplicable');
                    messageLines.push(getString('inspect.flagDetail', { flagName: flagKey, count: flagData.count.toString(), lastTime: timestamp }));
                    specificFlagsFound = true;
                }
            }
            if (!specificFlagsFound) {
                messageLines.push(getString('inspect.noSpecificFlags'));
            }
        }

        const muteInfo = playerDataManager.getMuteInfo(targetPlayer, dependencies);
        if (muteInfo) {
            const expiry = muteInfo.unmuteTime === Infinity ? getString('common.duration.permanent') : new Date(muteInfo.unmuteTime).toLocaleString();
            messageLines.push(getString('inspect.entry.muted.yes', { expiryDate: expiry, reason: muteInfo.reason || getString('common.value.noReasonProvided') }));
        } else {
            messageLines.push(getString('inspect.entry.muted.no'));
        }

        const banInfo = playerDataManager.getBanInfo(targetPlayer, dependencies);
        if (banInfo) {
            const expiry = banInfo.unbanTime === Infinity ? getString('common.duration.permanent') : new Date(banInfo.unbanTime).toLocaleString();
            messageLines.push(getString('inspect.entry.banned.yes', { expiryDate: expiry, reason: banInfo.reason || getString('common.value.noReasonProvided') }));
        } else {
            messageLines.push(getString('inspect.entry.banned.no'));
        }

        // Example of adding more pData fields:
        // if (pData.lastCombatInteractionTime) {
        //     messageLines.push(getString('inspect.entry.lastCombat', { time: new Date(pData.lastCombatInteractionTime).toLocaleString() }));
        // }

    } else {
        messageLines.push(getString('inspect.error.noData'));
    }

    player.sendMessage(messageLines.join('\n'));

    try {
        logManager.addLog({
            timestamp: Date.now(),
            adminName: player.nameTag,
            actionType: 'inspectPlayer', // Standardized
            targetName: targetPlayer.nameTag,
            details: `Inspected ${targetPlayer.nameTag}`,
        }, dependencies);
    } catch (logError) {
        console.error(`[InspectCommand] Error logging inspect action: ${logError.stack || logError}`);
        playerUtils.debugLog(`[InspectCommand] Logging error: ${logError.message}`, player.nameTag, dependencies);
    }
}
