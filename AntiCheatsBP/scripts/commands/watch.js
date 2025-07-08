/**
 * @file Defines the !watch command for administrators to manage detailed logging for a specific player.
 */
/** @type {import('../types.js').CommandDefinition} */
export const definition = {
    name: 'watch',
    syntax: '<playername> [on|off|toggle]',
    description: 'Manages watch status for a player. Toggles if no state [on|off] is specified.',
    aliases: ['w'],
    permissionLevel: 1, // admin
    enabled: true,
};

/**
 * Executes the !watch command.
 * Sets the `isWatched` flag for the target player's AntiCheat data based on the provided action or toggles it.
 * @async
 * @param {import('@minecraft/server').Player} player - The player issuing the command.
 * @param {string[]} args - Command arguments: <playername> [on|off|toggle].
 * @param {import('../types.js').Dependencies} dependencies - Object containing dependencies.
 * @returns {Promise<void>}
 */
export async function execute(player, args, dependencies) {
    const { config, playerUtils, playerDataManager, logManager, getString } = dependencies;
    const adminName = player?.nameTag ?? 'UnknownAdmin';
    const prefix = config?.prefix ?? '!';

    if (args.length < 1) {
        player.sendMessage(getString('command.watch.usage', { prefix, syntax: definition.syntax }));
        return;
    }

    const targetPlayerName = args[0];
    const actionArg = args[1]?.toLowerCase() || 'toggle';

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
            adminName,
            targetName: targetPlayer.nameTag,
            targetId: targetPlayer.id,
            details: 'Attempted to manage watch status for player, but no pData found.',
        }, dependencies);
        return;
    }

    const currentWatchState = pData.isWatched;
    let newWatchState;

    switch (actionArg) {
        case 'on':
            newWatchState = true;
            break;
        case 'off':
            newWatchState = false;
            break;
        case 'toggle':
            newWatchState = !currentWatchState;
            break;
        default:
            player.sendMessage(getString('command.watch.invalidAction', { action: actionArg, prefix, syntax: definition.syntax }));
            return;
    }

    if (newWatchState === currentWatchState) {
        const messageKey = newWatchState ? 'command.watch.alreadyWatched' : 'command.unwatch.notWatched'; // Reusing unwatch string
        player.sendMessage(getString(messageKey, { playerName: targetPlayer.nameTag }));
        return;
    }

    pData.isWatched = newWatchState;
    pData.isDirtyForSave = true;

    await playerDataManager?.saveDirtyPlayerData(targetPlayer, dependencies);

    if (newWatchState) {
        player.sendMessage(getString('command.watch.success.admin', { playerName: targetPlayer.nameTag }));
        targetPlayer.sendMessage(getString('command.watch.success.target', { adminName }));
        playerUtils?.playSoundForEvent(player, 'commandSuccess', dependencies);
        logManager?.addLog({
            adminName,
            actionType: 'playerWatched',
            targetName: targetPlayer.nameTag,
            targetId: targetPlayer.id,
            details: `Player ${targetPlayer.nameTag} is now being watched by ${adminName}.`,
        }, dependencies);
        playerUtils?.debugLog(`Admin ${adminName} started watching player ${targetPlayer.nameTag}.`, adminName, dependencies);
    } else {
        player.sendMessage(getString('command.unwatch.success.admin', { playerName: targetPlayer.nameTag })); // Reusing unwatch string
        targetPlayer.sendMessage(getString('command.unwatch.success.target', { adminName })); // Reusing unwatch string
        playerUtils?.playSoundForEvent(player, 'commandSuccess', dependencies);
        logManager?.addLog({
            adminName,
            actionType: 'playerUnwatched',
            targetName: targetPlayer.nameTag,
            targetId: targetPlayer.id,
            details: `Player ${targetPlayer.nameTag} is no longer being watched by ${adminName}.`,
        }, dependencies);
        playerUtils?.debugLog(`Admin ${adminName} stopped watching player ${targetPlayer.nameTag}.`, adminName, dependencies);
    }
}
