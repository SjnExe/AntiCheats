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
    const { config, playerUtils, playerDataManager, logManager, getString, permissionLevels } = dependencies;
    const findPlayer = playerUtils.findPlayer;
    const prefix = config.prefix;

    // definition.description = getString("command.resetflags.description");
    // definition.permissionLevel = permissionLevels.admin;

    if (args.length < 1) {
        player.sendMessage(getString("command.resetflags.usage", { prefix: prefix }));
        return;
    }
    const targetPlayerName = args[0];
    const targetPlayer = findPlayer(targetPlayerName);

    if (!targetPlayer) {
        player.sendMessage(getString("common.error.playerNotFoundOnline", { playerName: targetPlayerName }));
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
        // prepareAndSavePlayerData might need dependencies if it logs or uses config
        await playerDataManager.prepareAndSavePlayerData(targetPlayer, dependencies);


        player.sendMessage(getString("command.resetflags.success", { targetName: targetPlayer.nameTag }));
        playerUtils.notifyAdmins(getString("command.resetflags.adminNotify", { targetName: targetPlayer.nameTag, adminName: player.nameTag }), dependencies, player, pData);
        logManager.addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'reset_flags', targetName: targetPlayer.nameTag, details: `Reset flags for ${targetPlayer.nameTag}` }, dependencies);

        playerUtils.debugLog(`[ResetFlagsCommand] Flags reset for ${targetPlayer.nameTag} by ${player.nameTag}.`, dependencies, pData.isWatched ? targetPlayer.nameTag : null);

    } else {
        player.sendMessage(getString("command.resetflags.failNoData", { targetName: targetPlayer.nameTag }));
    }
}
