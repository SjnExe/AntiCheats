/**
 * @file Defines the !unwatch command for administrators to stop watching a player.
 */
import { permissionLevels } from '../core/rankManager.js';

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: 'unwatch',
    syntax: '<playername>',
    description: 'Stops watching a player, reducing detailed logging for them.',
    permissionLevel: permissionLevels.admin,
    enabled: true,
};

/**
 * Executes the !unwatch command.
 * Sets the `isWatched` flag to false for the target player's AntiCheat data.
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
        player.sendMessage(getString('command.unwatch.usage', { prefix: prefix, syntax: definition.syntax }));
        return;
    }

    const targetPlayerName = args[0];

    const targetPlayer = playerUtils.validateCommandTarget(player, targetPlayerName, dependencies, { commandName: 'unwatch' });
    if (!targetPlayer) {
        return;
    }

    const pData = playerDataManager?.getPlayerData(targetPlayer.id);
    if (!pData) {
        player.sendMessage(getString('command.unwatch.noData', { playerName: targetPlayer.nameTag }));
        return;
    }

    if (!pData.isWatched) {
        player.sendMessage(getString('command.unwatch.notWatched', { playerName: targetPlayer.nameTag }));
        return;
    }

    pData.isWatched = false;
    pData.isDirtyForSave = true;

    await playerDataManager?.saveDirtyPlayerData(targetPlayer, dependencies);

    player.sendMessage(getString('command.unwatch.success.admin', { playerName: targetPlayer.nameTag }));
    targetPlayer.sendMessage(getString('command.unwatch.success.target', { adminName: adminName }));
    playerUtils?.playSoundForEvent(player, "commandSuccess", dependencies);

    logManager?.addLog({
        adminName: adminName,
        actionType: 'playerUnwatched',
        targetName: targetPlayer.nameTag,
        targetId: targetPlayer.id,
        details: `Player ${targetPlayer.nameTag} is no longer being watched by ${adminName}.`,
    }, dependencies);

    playerUtils?.debugLog(`Admin ${adminName} stopped watching player ${targetPlayer.nameTag}.`, adminName, dependencies);
}
