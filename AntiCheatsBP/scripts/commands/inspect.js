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
    const { config, playerUtils, playerDataManager, logManager, permissionLevels } = dependencies; // getString removed
    const findPlayer = playerUtils.findPlayer;

    // Static definitions are used

    if (args.length < 1) {
        // "command.inspect.usage" -> "§cUsage: {prefix}inspect <playername>"
        player.sendMessage(`§cUsage: ${config.prefix}inspect <playername>`);
        return;
    }
    const targetPlayerName = args[0];
    const targetPlayer = findPlayer(targetPlayerName);

    if (!targetPlayer) {
        // "common.error.invalidPlayer" -> "Player \"{targetName}\" not found."
        player.sendMessage(`Player "${targetPlayerName}" not found.`);
        return;
    }

    const pData = playerDataManager.getPlayerData(targetPlayer.id);
    let messageLines = [];
    // "command.inspect.header" -> "§e--- AntiCheat Data for {playerName} ---"
    messageLines.push(`§e--- AntiCheat Data for ${targetPlayer.nameTag} ---`);

    if (pData) {
        // "command.inspect.playerId" -> "§fPlayer ID: §7{id}"
        messageLines.push(`§fPlayer ID: §7${targetPlayer.id}`);
        // "command.inspect.watchedStatus" -> "§fIs Watched: §7{status}"
        // "common.boolean.yes" -> "Yes", "common.boolean.no" -> "No"
        messageLines.push(`§fIs Watched: §7${pData.isWatched ? "Yes" : "No"}`);
        // "command.inspect.totalFlags" -> "§fTotal Flags: §c{count}"
        messageLines.push(`§fTotal Flags: §c${pData.flags ? pData.flags.totalFlags || 0 : 0}`);
        // "command.inspect.lastFlagType" -> "§fLast Flag Type: §7{type}"
        // "common.value.none" -> "None"
        messageLines.push(`§fLast Flag Type: §7${pData.lastFlagType || "None"}`);

        let specificFlagsFound = false;
        if (pData.flags) {
            // "command.inspect.flagsByTypeHeader" -> "§fFlags by type:"
            messageLines.push("§fFlags by type:");
            for (const flagKey in pData.flags) {
                if (flagKey !== "totalFlags" && typeof pData.flags[flagKey] === 'object' && pData.flags[flagKey] !== null && pData.flags[flagKey].count > 0) {
                    const flagData = pData.flags[flagKey];
                    // "common.value.notApplicable" -> "N/A"
                    const timestamp = flagData.lastDetectionTime ? new Date(flagData.lastDetectionTime).toLocaleTimeString() : "N/A";
                    // "command.inspect.flagEntry" -> "  §f- {flagKey}: §c{count} §7(Last: {timestamp})"
                    messageLines.push(`  §f- ${flagKey}: §c${flagData.count} §7(Last: ${timestamp})`);
                    specificFlagsFound = true;
                }
            }
            if (!specificFlagsFound) {
                // "command.inspect.noSpecificFlags" -> "    §7No specific flag types recorded."
                messageLines.push("    §7No specific flag types recorded.");
            }
        }

        const muteInfo = playerDataManager.getMuteInfo(targetPlayer, dependencies);
        if (muteInfo) {
            // "common.value.permanent" -> "Permanent"
            const expiry = muteInfo.unmuteTime === Infinity ? "Permanent" : new Date(muteInfo.unmuteTime).toLocaleString();
            // "command.inspect.mutedYes" -> "§fMuted: §cYes (Expires: {expiryDate}, Reason: {reason})"
            messageLines.push(`§fMuted: §cYes (Expires: ${expiry}, Reason: ${muteInfo.reason})`);
        } else {
            // "command.inspect.mutedNo" -> "§fMuted: §aNo"
            messageLines.push("§fMuted: §aNo");
        }

        const banInfo = playerDataManager.getBanInfo(targetPlayer, dependencies);
        if (banInfo) {
            // "common.value.permanent" -> "Permanent"
            const expiry = banInfo.unbanTime === Infinity ? "Permanent" : new Date(banInfo.unbanTime).toLocaleString();
            // "command.inspect.bannedYes" -> "§fBanned: §cYes (Expires: {expiryDate}, Reason: {reason})"
            messageLines.push(`§fBanned: §cYes (Expires: ${expiry}, Reason: ${banInfo.reason})`);
        } else {
            // "command.inspect.bannedNo" -> "§fBanned: §aNo"
            messageLines.push("§fBanned: §aNo");
        }

    } else {
        // "command.inspect.noData" -> "§7No AntiCheat data found for this player (they might not have triggered any checks or joined recently)."
        messageLines.push("§7No AntiCheat data found for this player (they might not have triggered any checks or joined recently).");
    }

    player.sendMessage(messageLines.join("\n"));
    logManager.addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'inspect_player', targetName: targetPlayer.nameTag, details: `Inspected ${targetPlayer.nameTag}` }, dependencies);
}
