/**
 * @file Defines the !watch command.
 * This command allows administrators to add a player to the "watchlist",
 * enabling more detailed debug logging for that player.
 */
import { permissionLevels } from '../core/rankManager.js';
import { getPlayerData, saveDirtyPlayerData } from '../core/playerDataManager.js';

/** @type {import('../types.js').CommandDefinition} */
export const definition = {
    name: 'watch',
    syntax: '!watch <playername>',
    description: 'Adds a player to the watchlist for detailed logging.',
    permissionLevel: permissionLevels.admin,
    enabled: true,
};

export async function execute(player, args, dependencies) {
    const { config, playerUtils, logManager, getString } = dependencies;
    const adminName = player.nameTag;

    if (args.length < 1) {
        playerUtils.sendMessage(player, getString('command.watch.usage', { prefix: config.prefix, syntax: definition.syntax }));
        return;
    }

    const targetPlayerName = args[0];
    const targetPlayer = playerUtils.findPlayerByNameTag(targetPlayerName, dependencies.mc.world.getAllPlayers());

    if (!targetPlayer) {
        playerUtils.sendMessage(player, getString('command.watch.playerNotFound', { playerName: targetPlayerName }));
        return;
    }

    const pData = getPlayerData(targetPlayer.id);
    if (!pData) {
        playerUtils.sendMessage(player, getString('command.watch.noData', { playerName: targetPlayer.nameTag }));
        return;
    }

    if (pData.isWatched) {
        playerUtils.sendMessage(player, getString('command.watch.alreadyWatched', { playerName: targetPlayer.nameTag }));
        return;
    }

    pData.isWatched = true;
    pData.isDirtyForSave = true;

    await saveDirtyPlayerData(targetPlayer, dependencies);

    const messageToAdmin = getString('command.watch.success.admin', { playerName: targetPlayer.nameTag });
    playerUtils.sendMessage(player, messageToAdmin);

    const messageToTarget = getString('command.watch.success.target', { adminName: adminName });
    playerUtils.sendMessage(targetPlayer, messageToTarget);

    logManager.addLog({
        actionType: 'commandWatchPlayer',
        adminName: adminName,
        targetName: targetPlayer.nameTag,
        targetId: targetPlayer.id,
        details: `Player added to watchlist.`,
        context: 'WatchCommand',
    }, dependencies);

    playerUtils.debugLog(`Admin ${adminName} started watching ${targetPlayer.nameTag}.`, adminName, dependencies);
}
