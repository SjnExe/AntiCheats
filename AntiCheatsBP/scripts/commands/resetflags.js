/**
 * @file AntiCheatsBP/scripts/commands/resetflags.js
 * Defines the !resetflags command for administrators to clear a player's accumulated AntiCheat flags
 * and associated violation tracking data. Also aliased by !clearwarnings.
 * @version 1.0.1
 */
import { permissionLevels } from '../core/rankManager.js';
import { getString } from '../../core/i18n.js'; // Import getString

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: "resetflags",
    syntax: "!resetflags <playername>", // Localized usage will be based on this name
    description: getString("command.resetflags.description"),
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
    const prefix = config.prefix;

    if (args.length < 1) {
        // Use definition.name so if the command name changes, usage message is correct
        player.sendMessage(getString("command.resetflags.usage", { prefix: prefix }));
        return;
    }
    const targetPlayerName = args[0];
    const targetPlayer = findPlayer(targetPlayerName, playerUtils);

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
        playerDataManager.prepareAndSavePlayerData(targetPlayer);

        // The command calling itself (resetflags or clearwarnings) determines the log and admin notification
        const commandCalled = player.isOp() ? definition.name : "clearwarnings"; // A simple way to check, assuming !cw might be used by non-ops with perms
                                                                                // This is a simplification; commandManager would ideally pass how it was invoked.
                                                                                // For now, we'll use resetflags keys for notifications from this file.
                                                                                // If specific clearwarnings messages are needed here, commandManager needs to pass alias info.

        player.sendMessage(getString("command.resetflags.success", { targetName: targetPlayer.nameTag }));
        if (playerUtils.notifyAdmins) {
            playerUtils.notifyAdmins(getString("command.resetflags.adminNotify", { targetName: targetPlayer.nameTag, adminName: player.nameTag }), player, pData);
        }
        if (addLog) {
            addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'reset_flags', targetName: targetPlayer.nameTag, details: `Reset flags for ${targetPlayer.nameTag}` });
        }
        if (playerUtils.debugLog) {
            playerUtils.debugLog(`Flags reset for ${targetPlayer.nameTag} by ${player.nameTag}.`, player.nameTag);
        }
    } else {
        player.sendMessage(getString("command.resetflags.failNoData", { targetName: targetPlayer.nameTag }));
    }
}
