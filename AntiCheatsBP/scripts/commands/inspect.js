/**
 * @file AntiCheatsBP/scripts/commands/inspect.js
 * Defines the !inspect command for administrators to view a player's AntiCheat data.
 * @version 1.0.1
 */
import { permissionLevels } from '../core/rankManager.js';
import { getString } from '../core/i18n.js';

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: "inspect",
    syntax: "!inspect <playername>",
    description: getString("command.inspect.description"),
    permissionLevel: permissionLevels.admin
};

/**
 * Executes the inspect command.
 * @param {import('@minecraft/server').Player} player The player issuing the command.
 * @param {string[]} args The command arguments.
 * @param {import('../types.js').CommandDependencies} dependencies Command dependencies.
 */
export async function execute(player, args, dependencies) {
    const { config, playerUtils, playerDataManager, addLog, findPlayer } = dependencies;

    if (args.length < 1) {
        player.sendMessage(getString("command.inspect.usage", { prefix: config.prefix }));
        return;
    }
    const targetPlayerName = args[0];
    const targetPlayer = findPlayer(targetPlayerName, playerUtils);

    if (!targetPlayer) {
        player.sendMessage(getString("common.error.invalidPlayer", { targetName: targetPlayerName }));
        return;
    }

    const pData = playerDataManager.getPlayerData(targetPlayer.id);
    let messageLines = [];
    messageLines.push(getString("command.inspect.header", { playerName: targetPlayer.nameTag }));

    if (pData) {
        messageLines.push(getString("command.inspect.playerId", { id: targetPlayer.id }));
        messageLines.push(getString("command.inspect.watchedStatus", { status: pData.isWatched ? getString("common.boolean.yes") : getString("common.boolean.no") }));
        messageLines.push(getString("command.inspect.totalFlags", { count: pData.flags ? pData.flags.totalFlags || 0 : 0 }));
        messageLines.push(getString("command.inspect.lastFlagType", { type: pData.lastFlagType || getString("common.value.none") }));

        let specificFlagsFound = false;
        if (pData.flags) {
            messageLines.push(getString("command.inspect.flagsByTypeHeader"));
            for (const flagKey in pData.flags) {
                if (flagKey !== "totalFlags" && typeof pData.flags[flagKey] === 'object' && pData.flags[flagKey] !== null && pData.flags[flagKey].count > 0) {
                    const flagData = pData.flags[flagKey];
                    const timestamp = flagData.lastDetectionTime ? new Date(flagData.lastDetectionTime).toLocaleTimeString() : getString("common.value.notApplicable");
                    messageLines.push(getString("command.inspect.flagEntry", { flagKey: flagKey, count: flagData.count, timestamp: timestamp }));
                    specificFlagsFound = true;
                }
            }
            if (!specificFlagsFound) {
                messageLines.push(getString("command.inspect.noSpecificFlags"));
            }
        }

        const muteInfo = (playerDataManager.getMuteInfo && typeof playerDataManager.getMuteInfo === 'function')
            ? playerDataManager.getMuteInfo(targetPlayer)
            : null;
        if (muteInfo) {
            const expiry = muteInfo.unmuteTime === Infinity ? getString("common.value.permanent") : new Date(muteInfo.unmuteTime).toLocaleString();
            messageLines.push(getString("command.inspect.mutedYes", { expiryDate: expiry, reason: muteInfo.reason }));
        } else {
            messageLines.push(getString("command.inspect.mutedNo"));
        }

        const banInfo = (playerDataManager.getBanInfo && typeof playerDataManager.getBanInfo === 'function')
            ? playerDataManager.getBanInfo(targetPlayer)
            : null;
        if (banInfo) {
            const expiry = banInfo.unbanTime === Infinity ? getString("common.value.permanent") : new Date(banInfo.unbanTime).toLocaleString();
            messageLines.push(getString("command.inspect.bannedYes", { expiryDate: expiry, reason: banInfo.reason }));
        } else {
            messageLines.push(getString("command.inspect.bannedNo"));
        }

    } else {
        messageLines.push(getString("command.inspect.noData"));
    }

    player.sendMessage(messageLines.join("\n"));
    if (addLog) {
        addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'inspect_player', targetName: targetPlayer.nameTag, details: `Inspected ${targetPlayer.nameTag}` });
    }
}
