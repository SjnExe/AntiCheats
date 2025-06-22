/**
 * @file AntiCheatsBP/scripts/commands/resetflags.js
 * Defines the !resetflags command for administrators to clear a player's accumulated AntiCheat flags
 * and associated violation tracking data. Also aliased by !clearwarnings.
 * @version 1.0.3
 */
// permissionLevels and getString are now accessed via dependencies

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: "resetflags",
    syntax: "!resetflags <playername>",
    description: "Clears a player's AntiCheat flags and violation data.", // Static fallback
    permissionLevel: 1, // Static fallback (Admin)
    enabled: true,
};

/**
 * Executes the resetflags command.
 * @param {import('@minecraft/server').Player} player The player issuing the command.
 * @param {string[]} args The command arguments.
 * @param {import('../types.js').CommandDependencies} dependencies Command dependencies.
 */
export async function execute(player, args, dependencies) {
    const { config, playerUtils, playerDataManager, logManager, permissionLevels } = dependencies; // getString removed
    const findPlayer = playerUtils.findPlayer;
    const prefix = config.prefix;

    // Static definitions are used

    if (args.length < 1) {
        // Placeholder for "command.resetflags.usage" -> "§cUsage: {prefix}resetflags <playername>"
        player.sendMessage(`§cUsage: ${prefix}resetflags <playername>`);
        return;
    }
    const targetPlayerName = args[0];
    const targetPlayer = findPlayer(targetPlayerName);

    if (!targetPlayer) {
        // "common.error.playerNotFoundOnline" -> "§cPlayer '{playerName}' not found or is not online."
        player.sendMessage(`§cPlayer '${targetPlayerName}' not found or is not online.`);
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
            pData.flags = { totalFlags: 0 };
        }
        pData.lastFlagType = "";

        // Reset other specific violation trackers
        if (pData.hasOwnProperty('consecutiveOffGroundTicks')) pData.consecutiveOffGroundTicks = 0;
        if (pData.hasOwnProperty('fallDistance')) pData.fallDistance = 0;
        if (pData.hasOwnProperty('consecutiveOnGroundSpeedingTicks')) pData.consecutiveOnGroundSpeedingTicks = 0;
        if (pData.hasOwnProperty('attackEvents')) pData.attackEvents = [];
        if (pData.hasOwnProperty('blockBreakEvents')) pData.blockBreakEvents = [];
        if (pData.hasOwnProperty('recentHits')) pData.recentHits = [];
        if (pData.hasOwnProperty('recentPlaceTimestamps')) pData.recentPlaceTimestamps = [];
        pData.isAttemptingBlockBreak = false; pData.switchedToOptimalToolForBreak = false;
        pData.optimalToolSlotForLastBreak = null; pData.lastBreakCompleteTick = 0;
        pData.breakStartTimeMs = 0; pData.breakStartTickGameTime = 0; pData.expectedBreakDurationTicks = 0;
        pData.consecutivePillarBlocks = 0; pData.lastPillarTick = 0; pData.currentPillarX = null; pData.currentPillarZ = null;
        pData.consecutiveDownwardBlocks = 0; pData.lastDownwardScaffoldTick = 0; pData.lastDownwardScaffoldBlockLocation = null;

        pData.isDirtyForSave = true;
        await playerDataManager.prepareAndSavePlayerData(targetPlayer, dependencies);

        // Placeholder for "command.resetflags.success" -> "§aSuccessfully reset flags for {targetName}."
        player.sendMessage(`§aSuccessfully reset flags for ${targetPlayer.nameTag}.`);
        // Placeholder for "command.resetflags.adminNotify" -> "§7[Admin] §e{adminName}§7 reset flags for §e{targetName}."
        playerUtils.notifyAdmins(`§7[Admin] §e${player.nameTag}§7 reset flags for §e${targetPlayer.nameTag}.`, dependencies, player, pData);
        logManager.addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'reset_flags', targetName: targetPlayer.nameTag, details: `Reset flags for ${targetPlayer.nameTag}` }, dependencies);

        playerUtils.debugLog(`[ResetFlagsCommand] Flags reset for ${targetPlayer.nameTag} by ${player.nameTag}.`, pData.isWatched ? targetPlayer.nameTag : null, dependencies);

    } else {
        // Placeholder for "command.resetflags.failNoData" -> "§cCould not reset flags for {targetName} (no player data found)."
        player.sendMessage(`§cCould not reset flags for ${targetPlayer.nameTag} (no player data found).`);
    }
}
