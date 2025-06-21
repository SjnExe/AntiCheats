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
    const { config, playerUtils, playerDataManager, logManager, permissionLevels } = dependencies;
    const findPlayer = playerUtils.findPlayer;

    // definition.description = getString("command.inspect.description");
    // definition.permissionLevel = permissionLevels.admin;

    if (args.length < 1) {
        player.sendMessage(`§cUsage: ${config.prefix}inspect <playername>`);
        return;
    }
    const targetPlayerName = args[0];
    const targetPlayer = findPlayer(targetPlayerName); // Assumes findPlayer is part of playerUtils

    if (!targetPlayer) {
        player.sendMessage(`Player "${targetPlayerName}" not found.`);
        return;
    }

    const pData = playerDataManager.getPlayerData(targetPlayer.id); // Pass dependencies if getPlayerData expects it
    let messageLines = [];
    messageLines.push(`§e--- AntiCheat Data for ${targetPlayer.nameTag} ---`);

    if (pData) {
        messageLines.push(`§fPlayer ID: §7${targetPlayer.id}`);
        messageLines.push(`§fIs Watched: §7${pData.isWatched ? "Yes" : "No"}`);
        messageLines.push(`§fTotal Flags: §c${pData.flags ? pData.flags.totalFlags || 0 : 0}`);
        messageLines.push(`§fLast Flag Type: §7${pData.lastFlagType || "None"}`);

        let specificFlagsFound = false;
        if (pData.flags) {
            messageLines.push("§fFlags by type:");
            for (const flagKey in pData.flags) {
                if (flagKey !== "totalFlags" && typeof pData.flags[flagKey] === 'object' && pData.flags[flagKey] !== null && pData.flags[flagKey].count > 0) {
                    const flagData = pData.flags[flagKey];
                    const timestamp = flagData.lastDetectionTime ? new Date(flagData.lastDetectionTime).toLocaleTimeString() : "N/A";
                    messageLines.push(`  §f- ${flagKey}: §c${flagData.count} §7(Last: ${timestamp})`);
                    specificFlagsFound = true;
                }
            }
            if (!specificFlagsFound) {
                messageLines.push("    §7No specific flag types recorded.");
            }
        }

        const muteInfo = playerDataManager.getMuteInfo(targetPlayer, dependencies); // Pass dependencies
        if (muteInfo) {
            const expiry = muteInfo.unmuteTime === Infinity ? "Permanent" : new Date(muteInfo.unmuteTime).toLocaleString();
            messageLines.push(`§fMuted: §cYes (Expires: ${expiry}, Reason: ${muteInfo.reason})`);
        } else {
            messageLines.push("§fMuted: §aNo");
        }

        const banInfo = playerDataManager.getBanInfo(targetPlayer, dependencies); // Pass dependencies
        if (banInfo) {
            const expiry = banInfo.unbanTime === Infinity ? "Permanent" : new Date(banInfo.unbanTime).toLocaleString();
            messageLines.push(`§fBanned: §cYes (Expires: ${expiry}, Reason: ${banInfo.reason})`);
        } else {
            messageLines.push("§fBanned: §aNo");
        }

    } else {
        messageLines.push("§7No AntiCheat data found for this player (they might not have triggered any checks or joined recently).");
    }

    player.sendMessage(messageLines.join("\n"));
    logManager.addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'inspect_player', targetName: targetPlayer.nameTag, details: `Inspected ${targetPlayer.nameTag}` }, dependencies);
}
