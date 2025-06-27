/**
 * @file Defines the !unwatch command.
 * This command allows administrators to remove a player from the "watchlist",
 * disabling more detailed debug logging for that player.
 */
import { permissionLevels } from '../core/rankManager.js';
import { getPlayerData, saveDirtyPlayerData } from '../core/playerDataManager.js';

export const definition = {
    name: 'unwatch',
    syntax: '!unwatch <playername>',
    description: 'Removes a player from the watchlist.',
    permissionLevel: permissionLevels.admin,
    enabled: true,
};

export async function execute(player, args, dependencies) {
    const { config, playerUtils, logManager } = dependencies;
    const adminName = player.nameTag;

    if (args.length < 1) {
        playerUtils.sendMessage(player, `§cUsage: ${config.prefix}${definition.syntax}`);
        return;
    }

    const targetPlayerName = args[0];
    const targetPlayer = playerUtils.findPlayerByNameTag(targetPlayerName, dependencies.mc.world.getAllPlayers());

    if (!targetPlayer) {
        playerUtils.sendMessage(player, `§cPlayer "${targetPlayerName}" not found or is not online.`);
        return;
    }

    const pData = getPlayerData(targetPlayer.id);
    if (!pData) {
        playerUtils.sendMessage(player, `§cCould not retrieve data for player "${targetPlayer.nameTag}".`);
        return;
    }

    if (!pData.isWatched) {
        playerUtils.sendMessage(player, `§ePlayer "${targetPlayer.nameTag}" is not currently being watched.`);
        return;
    }

    pData.isWatched = false;
    pData.isDirtyForSave = true;

    await saveDirtyPlayerData(targetPlayer, dependencies);

    const messageToAdmin = `§aPlayer "${targetPlayer.nameTag}" is no longer being watched.`;
    playerUtils.sendMessage(player, messageToAdmin);

    const messageToTarget = `§eYou are no longer being watched by an administrator (${adminName}).`;
    playerUtils.sendMessage(targetPlayer, messageToTarget);

    logManager.addLog({
        actionType: 'commandUnwatchPlayer',
        adminName: adminName,
        targetName: targetPlayer.nameTag,
        targetId: targetPlayer.id,
        details: `Player removed from watchlist.`,
        context: 'UnwatchCommand',
    }, dependencies);

    playerUtils.debugLog(`Admin ${adminName} stopped watching ${targetPlayer.nameTag}.`, adminName, dependencies);
}
