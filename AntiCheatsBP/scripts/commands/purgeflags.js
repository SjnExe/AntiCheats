/**
 * @file Defines the !purgeflags command.
 * This command allows administrators to completely clear all flags,
 * violation history, and AutoMod state for a specified player.
 */
// Assuming permissionLevels is a static export for now.
import { permissionLevels } from '../core/rankManager.js';
// Import specific functions if they are directly used and clear.
// Otherwise, accessing via dependencies.playerDataManager is also fine.
import { getPlayerData, saveDirtyPlayerData, initializeDefaultPlayerData } from '../core/playerDataManager.js';

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: 'purgeflags',
    syntax: '<playername>', // Prefix handled by commandManager
    description: 'Admin command to completely purge all flags, violation history, and AutoMod state for a player.',
    permissionLevel: permissionLevels.admin, // Requires admin
    enabled: true,
};

/**
 * Executes the !purgeflags command.
 * @param {import('@minecraft/server').Player} player The player executing the command.
 * @param {string[]} args Command arguments: [playerName].
 * @param {import('../types.js').Dependencies} dependencies The dependencies object.
 */
export async function execute(player, args, dependencies) {
    const { config, playerUtils, logManager, currentTick, getString, mc } = dependencies;
    const adminName = player?.nameTag ?? 'UnknownAdmin';
    const prefix = config?.prefix ?? '!';

    if (args.length < 1) {
        playerUtils?.sendMessage(player, getString('command.purgeflags.usage', { prefix: prefix, syntax: definition.syntax }));
        return;
    }

    const targetPlayerName = args[0];
    // FindPlayer can find online players. Purging flags for offline players would require
    // a different mechanism to load/save their dynamic properties if not cached.
    const targetPlayer = playerUtils?.findPlayer(targetPlayerName, dependencies); // Pass dependencies if needed by findPlayer

    if (!targetPlayer || !targetPlayer.isValid()) { // Added isValid
        playerUtils?.sendMessage(player, getString('common.error.playerNotFoundOnline', { playerName: targetPlayerName }));
        // Note: Offline player flag purging is not implemented here.
        return;
    }

    const pData = getPlayerData(targetPlayer.id); // Use direct import or dependencies.playerDataManager.getPlayerData
    if (!pData) {
        playerUtils?.sendMessage(player, getString('command.purgeflags.noData', { playerName: targetPlayer.nameTag }));
        return;
    }

    const oldTotalFlags = pData.flags?.totalFlags ?? 0;

    // Re-initialize the flags part of pData to its default state.
    // initializeDefaultPlayerData creates a whole new pData object. We only want to reset parts of the existing one.
    const defaultPlayerDataForFlags = initializeDefaultPlayerData(targetPlayer, currentTick, dependencies);
    pData.flags = JSON.parse(JSON.stringify(defaultPlayerDataForFlags.flags)); // Deep copy default flags structure

    pData.lastFlagType = ''; // Reset last flag type
    pData.lastViolationDetailsMap = {}; // Reset violation details
    pData.automodState = {}; // Reset AutoMod state for this player

    // Reset any other check-specific violation tracking fields if they are not covered by flags reset
    // For example, if specific checks store their own counters or history in pData directly:
    // pData.someCheckViolationCount = 0;
    // pData.someCheckHistory = [];
    // This needs to be comprehensive based on what checks actually store in pData.
    // For now, focusing on the main flag structures.

    pData.isDirtyForSave = true;

    // Explicitly save the data now.
    const saveSuccess = await saveDirtyPlayerData(targetPlayer, dependencies); // Use direct import or dependencies.playerDataManager

    if (saveSuccess) {
        const messageToAdmin = getString('command.purgeflags.success.admin', { playerName: targetPlayer.nameTag, oldTotalFlags: oldTotalFlags.toString() });
        playerUtils?.sendMessage(player, messageToAdmin);
        playerUtils?.playSoundForEvent(player, "commandSuccess", dependencies);

        const messageToTarget = getString('command.purgeflags.success.target', { adminName: adminName });
        playerUtils?.sendMessage(targetPlayer, messageToTarget); // Inform the target player

        if (config?.notifyOnAdminUtilCommandUsage !== false) {
            const notifyMsg = getString('command.purgeflags.notify.purged', { adminName: adminName, targetPlayerName: targetPlayer.nameTag, oldTotalFlags: oldTotalFlags.toString() });
            playerUtils?.notifyAdmins(notifyMsg, dependencies, player, pData); // Pass admin as player context
        }

        logManager?.addLog({
            actionType: 'flagsPurged', // Standardized camelCase
            adminName: adminName,
            targetName: targetPlayer.nameTag,
            targetId: targetPlayer.id,
            details: `All flags, violation details, and automod state purged. Old total flags: ${oldTotalFlags}.`,
            context: 'PurgeFlagsCommand', // Consistent context
        }, dependencies);
        playerUtils?.debugLog(`Admin ${adminName} purged flags for ${targetPlayer.nameTag}. Old total: ${oldTotalFlags}.`, adminName, dependencies);

    } else {
        playerUtils?.sendMessage(player, getString('common.error.genericCommandError', { commandName: definition.name, errorMessage: "Failed to save purged data."}));
        playerUtils?.playSoundForEvent(player, "commandError", dependencies);
        playerUtils?.debugLog(`[PurgeFlagsCommand CRITICAL] Failed to save purged data for ${targetPlayer.nameTag} by ${adminName}.`, adminName, dependencies);
    }
}
