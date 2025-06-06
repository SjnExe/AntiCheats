// AntiCheatsBP/scripts/commands/resetflags.js
import { permissionLevels } from '../core/rankManager.js';

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: "resetflags",
    syntax: "!resetflags <playername>",
    description: "Resets a player's flags and violation data.",
    // Aliased by clearwarnings in config.js
    permissionLevel: permissionLevels.admin
};

/**
 * Executes the resetflags command.
 * @param {import('@minecraft/server').Player} player The player issuing the command.
 * @param {string[]} args The command arguments.
 * @param {import('../types.js').CommandDependencies} dependencies Command dependencies.
 */
export async function execute(player, args, dependencies) {
    const { config, playerUtils, playerDataManager, addLog, findPlayer } = dependencies;

    if (args.length < 1) {
        player.sendMessage(`§cUsage: ${config.prefix}${definition.name} <playername>`); // Use definition.name for usage
        return;
    }
    const targetPlayerName = args[0];
    const targetPlayer = findPlayer(targetPlayerName, playerUtils);

    if (!targetPlayer) {
        player.sendMessage(`§cPlayer "${targetPlayerName}" not found.`);
        return;
    }

    const pData = playerDataManager.getPlayerData(targetPlayer.id);
    if (pData) {
        // Reset flags
        if (pData.flags) {
            pData.flags.totalFlags = 0;
            for (const flagKey in pData.flags) {
                if (typeof pData.flags[flagKey] === 'object' && pData.flags[flagKey] !== null) {
                    pData.flags[flagKey].count = 0;
                    pData.flags[flagKey].lastDetectionTime = 0;
                }
            }
        } else {
            pData.flags = { totalFlags: 0 }; // Initialize if flags object didn't exist
        }
        pData.lastFlagType = "";

        // Reset other specific violation trackers if they exist
        if (pData.hasOwnProperty('consecutiveOffGroundTicks')) pData.consecutiveOffGroundTicks = 0;
        if (pData.hasOwnProperty('fallDistance')) pData.fallDistance = 0;
        if (pData.hasOwnProperty('consecutiveOnGroundSpeedingTicks')) pData.consecutiveOnGroundSpeedingTicks = 0;
        if (pData.hasOwnProperty('attackEvents')) pData.attackEvents = [];
        if (pData.hasOwnProperty('blockBreakEvents')) pData.blockBreakEvents = [];
        // Add any other specific fields that need clearing

        playerDataManager.prepareAndSavePlayerData(targetPlayer); // Save changes

        player.sendMessage(`§aFlags and violation data reset for ${targetPlayer.nameTag}.`);
        if (playerUtils.notifyAdmins) {
            playerUtils.notifyAdmins(`Flags for ${targetPlayer.nameTag} were reset by ${player.nameTag}.`, player, pData);
        }
        if (addLog) {
            addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'reset_flags', targetName: targetPlayer.nameTag, details: `Reset flags for ${targetPlayer.nameTag}` });
        }
        if (playerUtils.debugLog) {
            playerUtils.debugLog(`Flags reset for ${targetPlayer.nameTag} by ${player.nameTag}.`, player.nameTag);
        }
    } else {
        player.sendMessage(`§cCould not retrieve data for ${targetPlayer.nameTag}. No flags reset.`);
    }
}
