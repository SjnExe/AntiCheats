/**
 * @file Defines the !resetflags command for administrators to clear a player's accumulated AntiCheat flags
 * and associated violation tracking data. Also aliased by !clearwarnings.
 */

import { permissionLevels } from '../core/rankManager.js';

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: 'resetflags',
    syntax: '!resetflags <playerName>',
    description: "Clears a player's AntiCheat flags and violation data.", // Hardcoded string
    permissionLevel: permissionLevels.admin,
    aliases: ['clearwarnings'], // Added alias
    enabled: true,
};

/**
 * Executes the resetflags command.
 * @param {import('@minecraft/server').Player} player The player executing the command.
 * @param {string[]} args Command arguments: [playerName].
 * @param {import('../types.js').Dependencies} dependencies The dependencies object.
 */
export async function execute(player, args, dependencies) {
    const { config, playerUtils, playerDataManager, logManager } = dependencies; // Removed unused permissionLevels from destructuring
    const findPlayer = playerUtils.findPlayer; // Consistent with other commands
    const prefix = config.prefix;

    if (args.length < 1) {
        player.sendMessage(`§cUsage: ${prefix}resetflags <playerName>`);
        return;
    }
    const targetPlayerName = args[0];
    const targetPlayer = findPlayer(targetPlayerName);

    if (!targetPlayer) {
        player.sendMessage(`§cPlayer '${targetPlayerName}' not found or is not online.`);
        return;
    }

    const pData = playerDataManager.getPlayerData(targetPlayer.id);
    if (pData) {
        // Reset core flag counts
        if (pData.flags) {
            pData.flags.totalFlags = 0;
            for (const flagKey in pData.flags) {
                if (Object.prototype.hasOwnProperty.call(pData.flags, flagKey) &&
                    typeof pData.flags[flagKey] === 'object' &&
                    pData.flags[flagKey] !== null) {
                    pData.flags[flagKey].count = 0;
                    pData.flags[flagKey].lastDetectionTime = 0;
                }
            }
        } else {
            pData.flags = { totalFlags: 0 }; // Initialize if flags object doesn't exist
        }
        pData.lastFlagType = ''; // Use empty string for consistency

        // Reset specific check-related data stored in playerData
        pData.consecutiveOffGroundTicks = 0;
        pData.fallDistance = 0;
        pData.consecutiveOnGroundSpeedingTicks = 0;
        pData.attackEvents = [];
        pData.blockBreakEvents = [];
        pData.recentHits = [];
        pData.recentPlaceTimestamps = [];

        // Reset data for autoToolCheck
        pData.isAttemptingBlockBreak = false;
        pData.switchedToOptimalToolForBreak = false;
        pData.optimalToolSlotForLastBreak = null;
        pData.lastBreakCompleteTick = 0;

        // Reset data for instaBreakCheck
        pData.breakStartTimeMs = 0;
        pData.breakStartTickGameTime = 0;
        pData.expectedBreakDurationTicks = 0;

        // Reset data for buildingChecks (pillar/scaffold)
        pData.consecutivePillarBlocks = 0;
        pData.lastPillarTick = 0;
        pData.currentPillarX = null;
        pData.currentPillarZ = null;
        pData.consecutiveDownwardBlocks = 0;
        pData.lastDownwardScaffoldTick = 0;
        pData.lastDownwardScaffoldBlockLocation = null;
        // Add any other specific playerData fields that track violations here

        pData.isDirtyForSave = true; // Mark for saving
        await playerDataManager.prepareAndSavePlayerData(targetPlayer, dependencies);

        player.sendMessage(`§aSuccessfully reset flags and violation data for ${targetPlayer.nameTag}.`); // Clarified message
        playerUtils.notifyAdmins(`§7[Admin] §e${player.nameTag}§7 reset flags for §e${targetPlayer.nameTag}.`, dependencies, player, pData);
        logManager.addLog({
            timestamp: Date.now(),
            adminName: player.nameTag,
            actionType: 'reset_flags',
            targetName: targetPlayer.nameTag,
            details: `Reset flags and violation data for ${targetPlayer.nameTag}`, // Clarified log
        }, dependencies);

        playerUtils.debugLog(`[ResetFlagsCommand] Flags reset for ${targetPlayer.nameTag} by ${player.nameTag}.`, pData.isWatched ? targetPlayer.nameTag : null, dependencies);

    } else {
        player.sendMessage(`§cCould not reset flags for ${targetPlayer.nameTag} (no player data found).`);
        // Log this scenario as it might indicate an issue
        logManager.addLog({
            timestamp: Date.now(),
            actionType: 'error',
            context: 'ResetFlagsCommandExecute',
            details: `Attempted to reset flags for ${targetPlayer.nameTag}, but no player data was found. Issuer: ${player.nameTag}`,
        }, dependencies);
    }
}
