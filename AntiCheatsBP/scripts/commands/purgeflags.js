/**
 * @file Defines the !purgeflags command.
 * This command allows administrators to completely clear all flags,
 * violation history, and AutoMod state for a specified player.
 */
import { getPlayerData, saveDirtyPlayerData, initializeDefaultPlayerData } from '../core/playerDataManager.js';

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: 'purgeflags',
    syntax: '<playername>',
    description: 'Admin command to completely purge all flags, violation history, and AutoMod state for a player.',
    aliases: ['pf'],
    permissionLevel: 1, // admin
    enabled: true,
};

/**
 * Executes the !purgeflags command.
 *
 * @param {import('@minecraft/server').Player} player The player executing the command.
 * @param {string[]} args Command arguments: [playerName].
 * @param {import('../types.js').Dependencies} dependencies The dependencies object.
 */
export async function execute(player, args, dependencies) {
    const { config, playerUtils, logManager, currentTick, getString } = dependencies; // Removed mc
    const adminName = player?.nameTag ?? 'UnknownAdmin';
    const prefix = config?.prefix ?? '!';

    if (args.length < 1) {
        playerUtils?.sendMessage(player, getString('command.purgeflags.usage', { prefix: prefix, syntax: definition.syntax }));
        return;
    }

    const targetPlayerName = args[0];
    const targetPlayer = playerUtils?.findPlayer(targetPlayerName, dependencies);

    if (!targetPlayer || !targetPlayer.isValid()) {
        playerUtils?.sendMessage(player, getString('common.error.playerNotFoundOnline', { playerName: targetPlayerName }));
        return;
    }

    const pData = getPlayerData(targetPlayer.id);
    if (!pData) {
        playerUtils?.sendMessage(player, getString('command.purgeflags.noData', { playerName: targetPlayer.nameTag }));
        return;
    }

    const oldTotalFlags = pData.flags?.totalFlags ?? 0;

    const defaultPlayerDataForFlags = initializeDefaultPlayerData(targetPlayer, currentTick, dependencies);
    pData.flags = JSON.parse(JSON.stringify(defaultPlayerDataForFlags.flags));

    pData.lastFlagType = '';
    pData.lastViolationDetailsMap = {};
    pData.automodState = {};

    pData.isDirtyForSave = true;

    const saveSuccess = await saveDirtyPlayerData(targetPlayer, dependencies);

    if (saveSuccess) {
        const messageToAdmin = getString('command.purgeflags.success.admin', { playerName: targetPlayer.nameTag, oldTotalFlags: oldTotalFlags.toString() });
        playerUtils?.sendMessage(player, messageToAdmin);
        playerUtils?.playSoundForEvent(player, 'commandSuccess', dependencies);

        const messageToTarget = getString('command.purgeflags.success.target', { adminName: adminName });
        playerUtils?.sendMessage(targetPlayer, messageToTarget);

        if (config?.notifyOnAdminUtilCommandUsage !== false) {
            const notifyMsg = getString('command.purgeflags.notify.purged', { adminName: adminName, targetPlayerName: targetPlayer.nameTag, oldTotalFlags: oldTotalFlags.toString() });
            playerUtils?.notifyAdmins(notifyMsg, dependencies, player, pData);
        }

        logManager?.addLog({
            actionType: 'flagsPurged',
            adminName: adminName,
            targetName: targetPlayer.nameTag,
            targetId: targetPlayer.id,
            details: `All flags, violation details, and automod state purged. Old total flags: ${oldTotalFlags}.`,
            context: 'PurgeFlagsCommand',
        }, dependencies);
        playerUtils?.debugLog(`Admin ${adminName} purged flags for ${targetPlayer.nameTag}. Old total: ${oldTotalFlags}.`, adminName, dependencies);

    }
    else {
        playerUtils?.sendMessage(player, getString('common.error.genericCommandError', { commandName: definition.name, errorMessage: 'Failed to save purged data.' }));
        playerUtils?.playSoundForEvent(player, 'commandError', dependencies);
        playerUtils?.debugLog(`[PurgeFlagsCommand CRITICAL] Failed to save purged data for ${targetPlayer.nameTag} by ${adminName}.`, adminName, dependencies);
    }
}
