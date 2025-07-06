/**
 * @file Defines the !watch command for administrators to enable detailed logging for a specific player.
 */
import { permissionLevels } from '../core/rankManager.js';

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: 'watch',
    syntax: '<playername>',
    description: 'Enables detailed logging for a specific player. Use with caution, can generate many logs.',
    permissionLevel: permissionLevels.admin,
    enabled: true,
};

/**
 * Executes the !watch command.
 * Sets the `isWatched` flag to true for the target player's AntiCheat data.
 * @async
 * @param {import('@minecraft/server').Player} player - The player issuing the command.
 * @param {string[]} args - Command arguments: [playername].
 * @param {import('../types.js').Dependencies} dependencies - Object containing dependencies.
 * @returns {Promise<void>}
 */
export async function execute(player, args, dependencies) {
    const { config, playerUtils, playerDataManager, logManager, getString } = dependencies;
    const adminName = player?.nameTag ?? 'UnknownAdmin';
    const prefix = config?.prefix ?? '!';

    if (args.length < 1) {
        player.sendMessage(getString('command.watch.usage', { prefix: prefix, syntax: definition.syntax }));
        return;
    }

    const targetPlayerName = args[0];

    const targetPlayer = playerUtils.validateCommandTarget(player, targetPlayerName, dependencies, { commandName: 'watch' });
    if (!targetPlayer) {
        return;
    }

    const pData = playerDataManager?.getPlayerData(targetPlayer.id);
    if (!pData) {
        player.sendMessage(getString('command.watch.noData', { playerName: targetPlayer.nameTag }));
        logManager?.addLog({
            actionType: 'errorWatchCommandNoPData',
            context: 'WatchCommand.execute',
            adminName: adminName,
            targetName: targetPlayer.nameTag,
            targetId: targetPlayer.id,
            details: `Attempted to watch player, but no pData found.`,
        }, dependencies);
        return;
    }

    if (pData.isWatched) {
        player.sendMessage(getString('command.watch.alreadyWatched', { playerName: targetPlayer.nameTag }));
        return;
    }

    pData.isWatched = true;
    pData.isDirtyForSave = true;

    await playerDataManager?.saveDirtyPlayerData(targetPlayer, dependencies);

    player.sendMessage(getString('command.watch.success.admin', { playerName: targetPlayer.nameTag }));
    targetPlayer.sendMessage(getString('command.watch.success.target', { adminName: adminName }));
    playerUtils?.playSoundForEvent(player, "commandSuccess", dependencies);

    logManager?.addLog({
        adminName: adminName,
        actionType: 'playerWatched',
        targetName: targetPlayer.nameTag,
        targetId: targetPlayer.id,
        details: `Player ${targetPlayer.nameTag} is now being watched by ${adminName}.`,
    }, dependencies);

    playerUtils?.debugLog(`Admin ${adminName} started watching player ${targetPlayer.nameTag}.`, adminName, dependencies);
}
