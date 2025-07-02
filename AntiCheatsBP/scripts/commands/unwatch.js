/**
 * @file Defines the !unwatch command.
 * This command allows administrators to remove a player from the "watchlist",
 * disabling more detailed debug logging for that player.
 */
import { permissionLevels } from '../core/rankManager.js';
import { getPlayerData, saveDirtyPlayerData } from '../core/playerDataManager.js';

/** @type {import('../types.js').CommandDefinition} */
export const definition = {
    name: 'unwatch',
    syntax: '!unwatch <playername>',
    description: 'Removes a player from the watchlist.',
    permissionLevel: permissionLevels.admin,
    enabled: true,
};

export async function execute(player, args, dependencies) {
    const { config, playerUtils, logManager, getString } = dependencies;
    const adminName = player.nameTag;

    if (args.length < 1) {
        playerUtils.sendMessage(player, getString('command.unwatch.usage', { prefix: config.prefix, syntax: definition.syntax }));
        return;
    }

    const targetPlayerName = args[0];
    const targetPlayer = playerUtils.findPlayerByNameTag(targetPlayerName, dependencies.mc.world.getAllPlayers());

    if (!targetPlayer) {
        playerUtils.sendMessage(player, getString('command.unwatch.playerNotFound', { playerName: targetPlayerName }));
        return;
    }

    const pData = getPlayerData(targetPlayer.id);
    if (!pData) {
        playerUtils.sendMessage(player, getString('command.unwatch.noData', { playerName: targetPlayer.nameTag }));
        return;
    }

    if (!pData.isWatched) {
        playerUtils.sendMessage(player, getString('command.unwatch.notWatched', { playerName: targetPlayer.nameTag }));
        return;
    }

    pData.isWatched = false;
    pData.isDirtyForSave = true;

    await saveDirtyPlayerData(targetPlayer, dependencies);

    const messageToAdmin = getString('command.unwatch.success.admin', { playerName: targetPlayer.nameTag });
    playerUtils.sendMessage(player, messageToAdmin);

    const messageToTarget = getString('command.unwatch.success.target', { adminName: adminName });
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
