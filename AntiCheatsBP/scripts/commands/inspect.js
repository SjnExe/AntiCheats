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
    const { config, playerUtils, playerDataManager, logManager } = dependencies;

    if (args.length < 1) {
        player.sendMessage(`§cUsage: ${config.prefix}inspect <playername>`); // Hardcoded string
        return;
    }

    const targetPlayerName = args[0];
    const targetPlayer = playerUtils.findPlayer(targetPlayerName);

    if (!targetPlayer) {
        player.sendMessage(`§cPlayer '${targetPlayerName}' not found.`); // Hardcoded string
        return;
    }

    const pData = playerDataManager.getPlayerData(targetPlayer.id);
    const messageLines = [];
    messageLines.push(`§6--- AntiCheat Status for ${targetPlayer.nameTag} ---`); // Hardcoded string

    if (pData) {
        messageLines.push(`§ePlayer ID: §f${targetPlayer.id}`); // Hardcoded string
        messageLines.push(`§eWatched: §f${pData.isWatched ? 'Yes' : 'No'}`); // Hardcoded string
        messageLines.push(`§eTotal Flags: §f${pData.flags?.totalFlags ?? 0}`); // Hardcoded string
        messageLines.push(`§eLast Flag Type: §f${pData.lastFlagType || 'None'}`); // Hardcoded string

        let specificFlagsFound = false;
        if (pData.flags) {
            messageLines.push("§eFlags by Type:"); // Hardcoded string
            for (const flagKey in pData.flags) {
                // Ensure it's a flag object and not 'totalFlags' or other properties
                if (flagKey !== 'totalFlags' && typeof pData.flags[flagKey] === 'object' && pData.flags[flagKey] !== null && pData.flags[flagKey].count > 0) {
                    const flagData = pData.flags[flagKey];
                    const timestamp = flagData.lastDetectionTime ? new Date(flagData.lastDetectionTime).toLocaleTimeString() : 'N/A'; // Hardcoded string
                    messageLines.push(`  §7- ${flagKey}: §f${flagData.count} (Last: ${timestamp})`); // Hardcoded string
                    specificFlagsFound = true;
                }
            }
            if (!specificFlagsFound) {
                messageLines.push("  §7(No specific flags with counts > 0)"); // Hardcoded string
            }
        }

        const muteInfo = playerDataManager.getMuteInfo(targetPlayer, dependencies);
        if (muteInfo) {
            const expiry = muteInfo.unmuteTime === Infinity ? 'Permanent' : new Date(muteInfo.unmuteTime).toLocaleString(); // Hardcoded string
            messageLines.push(`§eMuted: §cYes (Expires: ${expiry}, Reason: ${muteInfo.reason || 'No reason provided'})`); // Hardcoded string
        } else {
            messageLines.push('§eMuted: §aNo'); // Hardcoded string
        }

        const banInfo = playerDataManager.getBanInfo(targetPlayer, dependencies);
        if (banInfo) {
            const expiry = banInfo.unbanTime === Infinity ? 'Permanent' : new Date(banInfo.unbanTime).toLocaleString(); // Hardcoded string
            messageLines.push(`§eBanned: §cYes (Expires: ${expiry}, Reason: ${banInfo.reason || 'No reason provided'})`); // Hardcoded string
        } else {
            messageLines.push('§eBanned: §aNo'); // Hardcoded string
        }

        // Example of adding more pData fields:
        // if (pData.lastCombatInteractionTime) {
        //     messageLines.push(`§eLast Combat: §f${new Date(pData.lastCombatInteractionTime).toLocaleString()}`); // Hardcoded string
        // }

    } else {
        messageLines.push('§cNo AntiCheat data found for this player.'); // Hardcoded string
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
