/**
 * @file Defines the !purgeflags command.
 * This command allows administrators to completely clear all flags,
 * violation history, and AutoMod state for a specified player.
 */
import { getPlayerData, saveDirtyPlayerData, initializeDefaultPlayerData, scheduleFlagPurge } from '../core/playerDataManager.js';

/** @type {import('../types.js').CommandDefinition} */
export const definition = {
    name: 'purgeflags',
    syntax: '<playername>',
    description: 'Admin command to purge flags, violation history, and AutoMod state for a player. Works for online players immediately and queues for offline players (pending full offline processing).',
    aliases: ['pf'],
    permissionLevel: 1, // admin
    enabled: true,
};

/**
 * Executes the !purgeflags command.
 * For online players, it immediately purges their flags and associated data.
 * For offline players, it currently logs the attempt and informs the admin that
 * full offline processing is pending (e.g., will be handled on next join).
 * @param {import('@minecraft/server').Player} player The player executing the command.
 * @param {string[]} args Command arguments: [playerName].
 * @param {import('../types.js').Dependencies} dependencies The dependencies object.
 */
export async function execute(player, args, dependencies) {
    const { config, playerUtils, logManager, currentTick, getString } = dependencies; // Removed mc
    const adminName = player?.nameTag ?? 'UnknownAdmin';
    const prefix = config?.prefix ?? '!';
    const usageMessage = `§cUsage: ${prefix}${definition.syntax}`;

    if (args.length < 1) {
        playerUtils?.sendMessage(player, usageMessage);
        return;
    }

    const targetPlayerName = args[0];
    const targetPlayerOnline = playerUtils?.findPlayer(targetPlayerName, dependencies);

    if (targetPlayerOnline && targetPlayerOnline.isValid()) {
        // Player is online, proceed with existing logic
        const pData = getPlayerData(targetPlayerOnline.id);
        if (!pData) {
            playerUtils?.sendMessage(player, getString('command.purgeflags.noData', { playerName: targetPlayerOnline.nameTag }));
            return;
        }

        const oldTotalFlags = pData.flags?.totalFlags ?? 0;

        // Create default flag structure (assuming initializeDefaultPlayerData can be called with an online player)
        const defaultPlayerDataForFlags = initializeDefaultPlayerData(targetPlayerOnline, currentTick, dependencies);
        pData.flags = JSON.parse(JSON.stringify(defaultPlayerDataForFlags.flags));
        pData.lastFlagType = '';
        pData.lastViolationDetailsMap = {};
        pData.automodState = {};
        pData.isDirtyForSave = true;

        const saveSuccess = await saveDirtyPlayerData(targetPlayerOnline, dependencies);

        if (saveSuccess) {
            const messageToAdmin = getString('command.purgeflags.success.admin', { playerName: targetPlayerOnline.nameTag, oldTotalFlags: oldTotalFlags.toString() });
            playerUtils?.sendMessage(player, messageToAdmin);
            playerUtils?.playSoundForEvent(player, 'commandSuccess', dependencies);

            const messageToTarget = getString('command.purgeflags.success.target', { adminName });
            playerUtils?.sendMessage(targetPlayerOnline, messageToTarget);

            if (config?.notifyOnAdminUtilCommandUsage !== false) {
                const notifyMsg = getString('command.purgeflags.notify.purged', { adminName, targetPlayerName: targetPlayerOnline.nameTag, oldTotalFlags: oldTotalFlags.toString() });
                playerUtils?.notifyAdmins(notifyMsg, dependencies, player, pData);
            }

            logManager?.addLog({
                actionType: 'flagsPurgedOnline',
                adminName,
                targetName: targetPlayerOnline.nameTag,
                targetId: targetPlayerOnline.id,
                details: `All flags, violation details, and automod state purged for online player. Old total flags: ${oldTotalFlags}.`,
                context: 'PurgeFlagsCommand',
            }, dependencies);
            playerUtils?.debugLog(`Admin ${adminName} purged flags for online player ${targetPlayerOnline.nameTag}. Old total: ${oldTotalFlags}.`, adminName, dependencies);

        } else {
            playerUtils?.sendMessage(player, getString('common.error.genericCommandError', { commandName: definition.name, errorMessage: 'Failed to save purged data for online player.' }));
            playerUtils?.playSoundForEvent(player, 'commandError', dependencies);
            playerUtils?.debugLog(`[PurgeFlagsCommand CRITICAL] Failed to save purged data for online player ${targetPlayerOnline.nameTag} by ${adminName}.`, adminName, dependencies);
        }
    } else {
        // Player is not online, attempt to handle as offline player
        // This is where the new logic for offline players would go.
        // For now, we'll add a message indicating this functionality is pending
        // or will be handled by a deferred mechanism.

        // Placeholder: Assume we need a way to get the player's ID if they are offline,
        // perhaps from a name history or by trusting the input name if it's unique.
        // This part is complex and depends on how playerDataManager can be extended.

        // Player is not online, schedule the purge for when they next join.
        const scheduleSuccess = await scheduleFlagPurge(targetPlayerName, dependencies);

        if (scheduleSuccess) {
            playerUtils?.sendMessage(player, getString('command.purgeflags.offlinePlayerScheduled', { playerName: targetPlayerName }));
            playerUtils?.playSoundForEvent(player, 'commandSuccess', dependencies); // Use success sound for scheduling
            logManager?.addLog({
                actionType: 'flagsPurgeScheduledOffline',
                adminName,
                targetName: targetPlayerName,
                details: `Flag purge scheduled for offline player ${targetPlayerName}. Will be processed on next join.`,
                context: 'PurgeFlagsCommand',
            }, dependencies);
            playerUtils?.debugLog(`Admin ${adminName} scheduled flag purge for offline player ${targetPlayerName}.`, adminName, dependencies);
        } else {
            playerUtils?.sendMessage(player, getString('common.error.genericCommandError', { commandName: definition.name, errorMessage: `Failed to schedule flag purge for offline player ${targetPlayerName}.` }));
            playerUtils?.playSoundForEvent(player, 'commandError', dependencies);
            playerUtils?.debugLog(`[PurgeFlagsCommand CRITICAL] Failed to schedule flag purge for ${targetPlayerName} by ${adminName}.`, adminName, dependencies);
        }
    }
}
