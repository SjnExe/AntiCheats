/** @type {import('../../types.js').CommandDefinition} */
export const definition = {
    name: 'resetflags',
    syntax: '!resetflags <playerName>',
    description: 'Clears a player\'s AntiCheat flags and violation data.',
    permissionLevel: 1, // admin
};

/**
 * Executes the resetflags command.
 * @param {import('@minecraft/server').Player} player
 * @param {string[]} args
 * @param {import('../../types.js').CommandDependencies} dependencies
 */
export async function execute(player, args, dependencies) {
    const { config, playerUtils, playerDataManager, logManager, getString } = dependencies;
    const findPlayer = playerUtils.findPlayer;
    const prefix = config.prefix;

    if (args.length < 1) {
        player.sendMessage(getString('command.resetflags.usage', { prefix }));
        return;
    }
    const targetPlayerName = args[0];
    const targetPlayer = findPlayer(targetPlayerName);

    if (!targetPlayer) {
        player.sendMessage(getString('common.error.playerNotFoundOnline', { playerName: targetPlayerName }));
        return;
    }

    const pData = playerDataManager.getPlayerData(targetPlayer.id);
    if (pData) {
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
            pData.flags = { totalFlags: 0 };
        }
        pData.lastFlagType = '';

        pData.consecutiveOffGroundTicks = 0;
        pData.fallDistance = 0;
        pData.consecutiveOnGroundSpeedingTicks = 0;
        pData.attackEvents = [];
        pData.blockBreakEvents = [];
        pData.recentHits = [];
        pData.recentPlaceTimestamps = [];

        pData.isAttemptingBlockBreak = false;
        pData.switchedToOptimalToolForBreak = false;
        pData.optimalToolSlotForLastBreak = null;
        pData.lastBreakCompleteTick = 0;

        pData.breakStartTimeMs = 0;
        pData.breakStartTickGameTime = 0;
        pData.expectedBreakDurationTicks = 0;

        pData.consecutivePillarBlocks = 0;
        pData.lastPillarTick = 0;
        pData.currentPillarX = null;
        pData.currentPillarZ = null;
        pData.consecutiveDownwardBlocks = 0;
        pData.lastDownwardScaffoldTick = 0;
        pData.lastDownwardScaffoldBlockLocation = null;

        pData.isDirtyForSave = true;
        await playerDataManager.prepareAndSavePlayerData(targetPlayer, dependencies);

        player.sendMessage(getString('command.resetflags.success', { playerName: targetPlayer.nameTag }));
        if (dependencies.config.notifications?.notifyOnAdminUtilCommandUsage !== false) {
            const baseNotifyMsg = getString('command.resetflags.notify.reset', { adminName: player.nameTag, targetPlayerName: targetPlayer.nameTag });
            playerUtils.notifyAdmins(baseNotifyMsg, dependencies, player, pData);
        }
        logManager.addLog({
            timestamp: Date.now(),
            adminName: player.nameTag,
            actionType: 'resetFlags',
            targetName: targetPlayer.nameTag,
            details: `Reset flags and violation data for ${targetPlayer.nameTag}`,
        }, dependencies);

        playerUtils.debugLog(`[ResetFlagsCommand] Flags reset for ${targetPlayer.nameTag} by ${player.nameTag}.`, pData.isWatched ? targetPlayer.nameTag : null, dependencies);

    } else {
        player.sendMessage(getString('command.resetflags.noData', { playerName: targetPlayer.nameTag }));
        logManager.addLog({
            timestamp: Date.now(),
            actionType: 'errorResetFlagsNoPData',
            context: 'ResetFlagsCommand.execute',
            details: `Attempted to reset flags for ${targetPlayer.nameTag}, but no player data was found. Issuer: ${player.nameTag}`,
        }, dependencies);
    }
}
