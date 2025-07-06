/**
 * @file Defines the !addrank command for server administrators to assign a manual rank to a player.
 */
/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: 'addrank',
    syntax: '<playername> <rankId>',
    description: 'Assigns a manual rank to a player by adding the associated tag.',
    aliases: ['ar'],
    permissionLevel: 1, // admin
    enabled: true,
};

/**
 * Executes the !addrank command.
 * Assigns a specified rank to a target player if the rank is assignable and the issuer has permission.
 * @param {import('@minecraft/server').Player} player - The player issuing the command.
 * @param {string[]} args - Command arguments: <playername> <rankId>.
 * @param {import('../types.js').Dependencies} dependencies - Object containing dependencies.
 * @returns {Promise<void>}
 */
export async function execute(player, args, dependencies) {
    const { config, playerUtils, logManager, rankManager, getString } = dependencies;
    const adminName = player?.nameTag ?? 'UnknownAdmin';
    const prefix = config?.prefix ?? '!';

    if (args.length < 2) {
        player?.sendMessage(getString('command.addrank.usage', { prefix: prefix }));
        return;
    }

    const targetPlayerName = args[0];
    const rankIdToAssign = args[1].toLowerCase();

    const targetPlayer = playerUtils?.findPlayer(targetPlayerName);
    if (!targetPlayer) {
        player?.sendMessage(getString('command.addrank.playerNotFound', { playerName: targetPlayerName }));
        return;
    }

    const rankDef = rankManager?.getRankById(rankIdToAssign);
    if (!rankDef) {
        player?.sendMessage(getString('command.addrank.rankIdInvalid', { rankId: rankIdToAssign }));
        return;
    }

    const manualTagCondition = rankDef.conditions.find(c => c.type === 'manualTagPrefix' && typeof c.prefix === 'string');
    if (!manualTagCondition?.prefix) {
        player?.sendMessage(getString('command.addrank.rankNotManuallyAssignable', { rankName: rankDef.name }));
        return;
    }

    const issuerPermissionLevel = rankManager?.getPlayerPermissionLevel(player, dependencies);
    const assignableByPermission = typeof rankDef.assignableBy === 'number' ? rankDef.assignableBy : permissionLevels.owner;

    if (typeof issuerPermissionLevel !== 'number' || issuerPermissionLevel > assignableByPermission) {
        player?.sendMessage(getString('command.addrank.permissionDeniedAssign', { rankName: rankDef.name }));
        playerUtils?.debugLog(`[AddRankCommand] ${adminName} (Level ${issuerPermissionLevel ?? 'N/A'}) attempted to assign rank ${rankDef.id} (AssignableBy ${assignableByPermission}) but lacked permission.`, adminName, dependencies);
        return;
    }

    const rankTagToAdd = manualTagCondition.prefix + rankDef.id;

    if (targetPlayer.hasTag(rankTagToAdd)) {
        player?.sendMessage(getString('command.addrank.alreadyHasRank', { playerName: targetPlayer.nameTag, rankName: rankDef.name }));
        return;
    }

    try {
        targetPlayer.addTag(rankTagToAdd);
        if (rankManager?.updatePlayerNametag) {
            await rankManager.updatePlayerNametag(targetPlayer, dependencies);
        }


        player?.sendMessage(getString('command.addrank.assignSuccessToIssuer', { rankName: rankDef.name, playerName: targetPlayer.nameTag }));
        targetPlayer.sendMessage(getString('command.addrank.assignSuccessToTarget', { rankName: rankDef.name }));

        logManager?.addLog({
            adminName: adminName,
            actionType: 'rankAssigned',
            targetName: targetPlayer.nameTag,
            targetId: targetPlayer.id,
            details: `Assigned rank: ${rankDef.name} (ID: ${rankDef.id}, Tag: ${rankTagToAdd})`,
        }, dependencies);

        if (config?.notifyOnAdminUtilCommandUsage !== false) {
            const baseNotifyMsg = getString('command.addrank.notify.assigned', { adminName: adminName, rankName: rankDef.name, targetPlayerName: targetPlayer.nameTag });
            playerUtils?.notifyAdmins(baseNotifyMsg, dependencies, player, null);
        }

    } catch (e) {
        player?.sendMessage(getString('command.addrank.errorAssign', { errorMessage: e.message }));
        console.error(`[AddRankCommand CRITICAL] Error assigning rank ${rankDef.id} to ${targetPlayer.nameTag} by ${adminName}: ${e.stack || e}`);
        logManager?.addLog({
            adminName: adminName,
            actionType: 'errorRankAssign',
            context: 'AddRankCommand.execute',
            targetName: targetPlayer.nameTag,
            targetId: targetPlayer.id,
            details: `Failed to assign rank ${rankDef.id} to ${targetPlayer.nameTag}: ${e.message}`,
            errorStack: e.stack || e.toString(),
        }, dependencies);
    }
}
