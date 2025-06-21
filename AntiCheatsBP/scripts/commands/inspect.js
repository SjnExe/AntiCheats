/**
 * @file AntiCheatsBP/scripts/commands/inspect.js
 * Defines the !inspect command for administrators to view a player's AntiCheat data.
 * @version 1.0.3
 */
// permissionLevels and getString are now accessed via dependencies

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: "inspect",
    syntax: "!inspect <playername>",
    description: "Views a player's AntiCheat data and status.", // Static fallback
    permissionLevel: 1, // Static fallback (Admin)
    enabled: true,
};

/**
 * Executes the inspect command.
 * @param {import('@minecraft/server').Player} player The player issuing the command.
 * @param {string[]} args The command arguments.
 * @param {import('../types.js').CommandDependencies} dependencies Command dependencies.
 */
export async function execute(player, args, dependencies) {
    const { config, playerUtils, playerDataManager, logManager, getString, permissionLevels } = dependencies;
    const findPlayer = playerUtils.findPlayer;

    // definition.description = getString("command.inspect.description");
    // definition.permissionLevel = permissionLevels.admin;

    if (args.length < 1) {
        player.sendMessage(getString("command.inspect.usage", { prefix: config.prefix }));
        return;
    }
    const targetPlayerName = args[0];
    const targetPlayer = findPlayer(targetPlayerName); // Assumes findPlayer is part of playerUtils

    if (!targetPlayer) {
        player.sendMessage(getString("common.error.invalidPlayer", { targetName: targetPlayerName }));
        return;
    }

    const pData = playerDataManager.getPlayerData(targetPlayer.id); // Pass dependencies if getPlayerData expects it
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

        const muteInfo = playerDataManager.getMuteInfo(targetPlayer, dependencies); // Pass dependencies
        if (muteInfo) {
            const expiry = muteInfo.unmuteTime === Infinity ? getString("common.value.permanent") : new Date(muteInfo.unmuteTime).toLocaleString();
            messageLines.push(getString("command.inspect.mutedYes", { expiryDate: expiry, reason: muteInfo.reason }));
        } else {
            messageLines.push(getString("command.inspect.mutedNo"));
        }

        const banInfo = playerDataManager.getBanInfo(targetPlayer, dependencies); // Pass dependencies
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
    logManager.addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'inspect_player', targetName: targetPlayer.nameTag, details: `Inspected ${targetPlayer.nameTag}` }, dependencies);
}
