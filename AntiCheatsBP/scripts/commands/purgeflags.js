/**
 * @file Defines the !purgeflags command.
 * This command allows administrators to completely clear all flags,
 * violation history, and AutoMod state for a specified player.
 */
import { permissionLevels } from '../core/rankManager.js';
import { initializeDefaultPlayerData, getPlayerData, saveDirtyPlayerData } from '../core/playerDataManager.js';

export const definition = {
    name: 'purgeflags',
    syntax: '!purgeflags <playername>',
    description: 'Admin command to completely purge all flags, violation history, and AutoMod state for a player.',
    permissionLevel: permissionLevels.admin,
    enabled: true,
};

export async function execute(player, args, dependencies) {
    const { config, playerUtils, logManager, currentTick, getString } = dependencies;
    const adminName = player.nameTag;

    if (args.length < 1) {
        playerUtils.sendMessage(player, getString('command.purgeflags.usage', { prefix: config.prefix, syntax: definition.syntax }));
        return;
    }

    const targetPlayerName = args[0];
    const targetPlayer = playerUtils.findPlayerByNameTag(targetPlayerName, dependencies.mc.world.getAllPlayers());

    if (!targetPlayer) {
        playerUtils.sendMessage(player, getString('command.purgeflags.playerNotFound', { playerName: targetPlayerName }));
        // TODO: Implement offline player flag purging if necessary by modifying dynamic properties directly.
        // This would require careful handling of data loading/saving for offline players.
        // For now, this command only works for online players.
        return;
    }

    const pData = getPlayerData(targetPlayer.id);
    if (!pData) {
        playerUtils.sendMessage(player, getString('command.purgeflags.noData', { playerName: targetPlayer.nameTag }));
        return;
    }

    const oldTotalFlags = pData.flags.totalFlags || 0;

    const defaultFlags = initializeDefaultPlayerData(targetPlayer, currentTick, dependencies).flags;
    pData.flags = JSON.parse(JSON.stringify(defaultFlags)); // Deep copy to avoid reference issues

    pData.lastFlagType = '';
    pData.lastViolationDetailsMap = {};
    pData.automodState = {};

    pData.isDirtyForSave = true;

    // Explicitly save the data now, though the main loop would eventually pick it up.
    // This ensures the change is immediate if an admin inspects right after.
    await saveDirtyPlayerData(targetPlayer, dependencies);

    const messageToAdmin = getString('command.purgeflags.success.admin', { playerName: targetPlayer.nameTag, oldTotalFlags: oldTotalFlags.toString() });
    playerUtils.sendMessage(player, messageToAdmin);

    const messageToTarget = getString('command.purgeflags.success.target', { adminName: adminName });
    playerUtils.sendMessage(targetPlayer, messageToTarget);

    if (dependencies.config.notifications?.notifyOnAdminUtilCommandUsage !== false) {
        const notifyMsg = getString('command.purgeflags.notify.purged', { adminName: adminName, targetPlayerName: targetPlayer.nameTag, oldTotalFlags: oldTotalFlags.toString() });
        playerUtils.notifyAdmins(notifyMsg, dependencies, player, pData);
    }

    logManager.addLog({
        actionType: 'commandPurgeFlags',
        adminName: adminName,
        targetName: targetPlayer.nameTag,
        targetId: targetPlayer.id,
        details: `All flags, violation details, and automod state purged. Old total flags: ${oldTotalFlags}.`,
        context: 'PurgeFlagsCommand',
    }, dependencies);

    playerUtils.debugLog(`Admin ${adminName} purged flags for ${targetPlayer.nameTag}. Old total: ${oldTotalFlags}.`, adminName, dependencies);
}
