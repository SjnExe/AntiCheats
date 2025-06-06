// AntiCheatsBP/scripts/commands/inspect.js
import { permissionLevels } from '../core/rankManager.js';

export const definition = {
    name: "inspect",
    syntax: "!inspect <playername>",
    description: "Shows a summary of a player's anti-cheat data.",
    permissionLevel: permissionLevels.ADMIN
};

export async function execute(player, args, dependencies) {
    const { config, playerUtils, playerDataManager, addLog, findPlayer } = dependencies;

    if (args.length < 1) {
        player.sendMessage(`§cUsage: ${config.prefix}inspect <playername>`);
        return;
    }
    const targetPlayerName = args[0];
    const targetPlayer = findPlayer(targetPlayerName, playerUtils);

    if (!targetPlayer) {
        player.sendMessage(`§cPlayer "${targetPlayerName}" not found.`);
        return;
    }

    const pData = playerDataManager.getPlayerData(targetPlayer.id);
    let message = `§e--- AntiCheat Data for ${targetPlayer.nameTag} ---\n`;

    if (pData) {
        message += `§fPlayer ID: §7${targetPlayer.id}\n`;
        message += `§fIs Watched: §7${pData.isWatched ? "Yes" : "No"}\n`;
        message += `§fTotal Flags: §c${pData.flags ? pData.flags.totalFlags || 0 : 0}\n`;
        message += `§fLast Flag Type: §7${pData.lastFlagType || "None"}\n`;

        if (pData.flags) {
             for (const flagKey in pData.flags) {
                if (flagKey !== "totalFlags" && typeof pData.flags[flagKey] === 'object' && pData.flags[flagKey] !== null && pData.flags[flagKey].count > 0) {
                    const flagData = pData.flags[flagKey];
                    message += `  §f- ${flagKey}: §c${flagData.count} §7(Last: ${flagData.lastDetectionTime ? new Date(flagData.lastDetectionTime).toLocaleTimeString() : 'N/A'})\n`;
                }
            }
        }
        // Attempt to get mute info, checking if getMuteInfo exists on playerDataManager
        const muteInfo = (playerDataManager.getMuteInfo && typeof playerDataManager.getMuteInfo === 'function')
            ? playerDataManager.getMuteInfo(targetPlayer)
            : null;
        if (muteInfo) {
             message += `§fMuted: §cYes (Expires: ${muteInfo.muteExpires === Infinity ? 'Permanent' : new Date(muteInfo.muteExpires).toLocaleString()}, Reason: ${muteInfo.muteReason})\n`;
        } else {
             message += `§fMuted: §aNo\n`;
        }
        // Ban info would require a similar getBanInfo
        const banInfo = (playerDataManager.getBanInfo && typeof playerDataManager.getBanInfo === 'function')
            ? playerDataManager.getBanInfo(targetPlayer)
            : null;
        if (banInfo) {
            message += `§fBanned: §cYes (Expires: ${banInfo.banExpires === Infinity ? 'Permanent' : new Date(banInfo.banExpires).toLocaleString()}, Reason: ${banInfo.banReason})\n`;
        } else {
            message += `§fBanned: §aNo\n`;
        }

    } else {
        message += "§7No AntiCheat data found for this player (they might not have triggered any checks or joined recently).";
    }

    player.sendMessage(message.trim());
    if (addLog) {
        addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'inspect_player', targetName: targetPlayer.nameTag, details: `Inspected ${targetPlayer.nameTag}` });
    }
}
