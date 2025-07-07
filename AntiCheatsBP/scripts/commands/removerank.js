/**
 * @file Defines the !removerank command for server administrators to remove a manual rank from a player.
 */
/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: 'removerank',
    syntax: '<playerName> <rankId>',
    description: 'Removes a manually assigned rank from a player by removing the associated tag.',
    aliases: ['rr'],
    permissionLevel: 1, // admin
    enabled: true,
};

/**
 * Executes the removerank command.
 *
 * @async
 * @param {import('@minecraft/server').Player} player The player executing the command.
 * @param {string[]} args Command arguments: [playerName, rankId].
 * @param {import('../types.js').Dependencies} dependencies The dependencies object.
 * @returns {Promise<void>}
 */
export async function execute(player, args, dependencies) {
    const { config, playerUtils, logManager, rankManager: depRankManager, getString } = dependencies;
    const adminName = player?.nameTag ?? 'UnknownAdmin';
    const prefix = config?.prefix ?? '!';

    if (args.length < 2) {
        player.sendMessage(getString('command.removerank.usage', { prefix: prefix }));
        return;
    }

    const targetPlayerName = args[0];
    const rankIdToRemove = args[1].toLowerCase();

    const targetPlayer = playerUtils?.findPlayer(targetPlayerName);
    if (!targetPlayer || !targetPlayer.isValid()) {
        player.sendMessage(getString('common.error.playerNotFoundOnline', { playerName: targetPlayerName }));
        return;
    }

    const rankDef = depRankManager?.getRankById(rankIdToRemove);
    if (!rankDef) {
        player.sendMessage(getString('command.removerank.rankIdInvalid', { rankId: rankIdToRemove }));
        return;
    }

    const manualTagCondition = rankDef.conditions.find(c => c.type === 'manualTagPrefix' && typeof c.prefix === 'string');
    if (!manualTagCondition?.prefix) {
        player.sendMessage(getString('command.removerank.notManuallyManaged', { rankName: rankDef.name }));
        return;
    }

    const issuerPermissionLevel = depRankManager?.getPlayerPermissionLevel(player, dependencies);
    const assignableByPermission = typeof rankDef.assignableBy === 'number' ? rankDef.assignableBy : dependencies.permissionLevels.owner;

    if (typeof issuerPermissionLevel !== 'number' || issuerPermissionLevel > assignableByPermission) {
        player.sendMessage(getString('command.removerank.permissionDenied', { rankName: rankDef.name }));
        playerUtils?.debugLog(`[RemoveRankCommand] ${adminName} (Level ${issuerPermissionLevel ?? 'N/A'}) attempted to remove rank ${rankDef.id} (RemovableBy ${assignableByPermission}) but lacked permission.`, adminName, dependencies);
        return;
    }

    const rankTagToRemove = manualTagCondition.prefix + rankDef.id;

    if (!targetPlayer.hasTag(rankTagToRemove)) {
        player.sendMessage(getString('command.removerank.notHasRank', { playerName: targetPlayer.nameTag, rankName: rankDef.name, rankTag: rankTagToRemove }));
        return;
    }

    try {
        const removed = targetPlayer.removeTag(rankTagToRemove);
        if (!removed) {
            throw new Error('Failed to remove tag from player entity.');
        }

        if (depRankManager?.updatePlayerNametag) {
            await depRankManager.updatePlayerNametag(targetPlayer, dependencies);
        }


        player.sendMessage(getString('command.removerank.success.issuer', { rankName: rankDef.name, playerName: targetPlayer.nameTag }));
        targetPlayer.sendMessage(getString('command.removerank.success.target', { rankName: rankDef.name }));
        playerUtils?.playSoundForEvent(player, 'commandSuccess', dependencies);

        logManager?.addLog({
            adminName: adminName,
            actionType: 'rankRemoved',
            targetName: targetPlayer.nameTag,
            targetId: targetPlayer.id,
            details: `Removed rank: ${rankDef.name} (ID: ${rankDef.id}, Tag: ${rankTagToRemove})`,
        }, dependencies);

        if (config?.notifyOnAdminUtilCommandUsage !== false) {
            const baseNotifyMsg = getString('command.removerank.notify.removedRank', { adminName: adminName, rankName: rankDef.name, targetPlayerName: targetPlayer.nameTag });
            playerUtils?.notifyAdmins(baseNotifyMsg, dependencies, player, null);
        }

    }
    catch (error) {
        player.sendMessage(getString('command.removerank.error.generic', { errorMessage: error.message }));
        console.error(`[RemoveRankCommand CRITICAL] Error removing rank ${rankDef.id} from ${targetPlayer.nameTag} by ${adminName}: ${error.stack || error}`);
        playerUtils?.playSoundForEvent(player, 'commandError', dependencies);
        logManager?.addLog({
            adminName: adminName,
            actionType: 'errorRankRemove',
            context: 'RemoveRankCommand.execute',
            targetName: targetPlayer.nameTag,
            targetId: targetPlayer.id,
            details: `Failed to remove rank ${rankDef.id} from ${targetPlayer.nameTag}: ${error.message}`,
            errorStack: error.stack || error.toString(),
        }, dependencies);
    }
}
