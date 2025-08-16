/** @type {import('../../types.js').CommandDefinition} */
export const definition = {
    name: 'rank',
    syntax: '<add|remove> <playername> <rankId>',
    description: 'Manages player ranks.',
    permissionLevel: 1, // admin
};

/**
 * Executes the rank command.
 * @param {import('@minecraft/server').Player} player
 * @param {string[]} args
 * @param {import('../../types.js').Dependencies} dependencies
 */
export async function execute(player, args, dependencies) {
    const { config, playerUtils, logManager, rankManager, getString } = dependencies;
    const prefix = config?.prefix ?? '!';
    const usageMessage = `§cUsage: ${prefix}rank <add|remove> <playername> <rankId>`;

    if (args.length < 3) {
        player?.sendMessage(usageMessage);
        return;
    }

    const subcommand = args[0].toLowerCase();
    const targetPlayerName = args[1];
    const rankId = args[2].toLowerCase();

    if (subcommand !== 'add' && subcommand !== 'remove') {
        player?.sendMessage(usageMessage);
        return;
    }

    const targetPlayer = playerUtils?.findPlayer(targetPlayerName);
    if (!targetPlayer) {
        player?.sendMessage(getString('command.addrank.playerNotFound', { playerName: targetPlayerName }));
        return;
    }

    const rankDef = rankManager?.getRankById(rankId);
    if (!rankDef) {
        player?.sendMessage(getString('command.addrank.rankIdInvalid', { rankId: rankId }));
        return;
    }

    const manualTagCondition = rankDef.conditions.find(c => c.type === 'manualTagPrefix' && typeof c.prefix === 'string');
    if (!manualTagCondition?.prefix) {
        player?.sendMessage(getString('command.addrank.rankNotManuallyAssignable', { rankName: rankDef.name }));
        return;
    }

    const issuerPermissionLevel = rankManager?.getPlayerPermissionLevel(player, dependencies);
    const assignableByPermission = typeof rankDef.assignableBy === 'number' ? rankDef.assignableBy : dependencies.permissionLevels.owner;

    if (typeof issuerPermissionLevel !== 'number' || issuerPermissionLevel > assignableByPermission) {
        player?.sendMessage(getString('command.addrank.permissionDeniedAssign', { rankName: rankDef.name }));
        return;
    }

    const rankTag = manualTagCondition.prefix + rankDef.id;
    const adminName = player?.nameTag ?? 'UnknownAdmin';

    if (subcommand === 'add') {
        if (targetPlayer.hasTag(rankTag)) {
            player?.sendMessage(getString('command.addrank.alreadyHasRank', { playerName: targetPlayer.nameTag, rankName: rankDef.name }));
            return;
        }

        try {
            targetPlayer.addTag(rankTag);
            if (rankManager?.updatePlayerNametag) {
                await rankManager.updatePlayerNametag(targetPlayer, dependencies);
            }

            player?.sendMessage(getString('command.addrank.assignSuccessToIssuer', { rankName: rankDef.name, playerName: targetPlayer.nameTag }));
            targetPlayer.sendMessage(getString('command.addrank.assignSuccessToTarget', { rankName: rankDef.name }));

            logManager?.addLog({
                adminName,
                actionType: 'rankAssigned',
                targetName: targetPlayer.nameTag,
                targetId: targetPlayer.id,
                details: `Assigned rank: ${rankDef.name} (ID: ${rankDef.id}, Tag: ${rankTag})`,
            }, dependencies);

            if (config?.notifyOnAdminUtilCommandUsage !== false) {
                const baseNotifyMsg = getString('command.addrank.notify.assigned', { adminName, rankName: rankDef.name, targetPlayerName: targetPlayer.nameTag });
                playerUtils?.notifyAdmins(baseNotifyMsg, dependencies, player, null);
            }
        } catch (e) {
            player?.sendMessage(getString('command.addrank.errorAssign', { errorMessage: e.message }));
            console.error(`[RankCommand CRITICAL] Error assigning rank ${rankDef.id} to ${targetPlayer.nameTag} by ${adminName}: ${e.stack || e}`);
        }
    } else {
        if (!targetPlayer.hasTag(rankTag)) {
            player.sendMessage(getString('command.removerank.notHasRank', { playerName: targetPlayer.nameTag, rankName: rankDef.name, rankTag: rankTag }));
            return;
        }

        try {
            const removed = targetPlayer.removeTag(rankTag);
            if (!removed) {
                throw new Error('Failed to remove tag from player entity.');
            }

            if (rankManager?.updatePlayerNametag) {
                await rankManager.updatePlayerNametag(targetPlayer, dependencies);
            }

            player.sendMessage(getString('command.removerank.success.issuer', { rankName: rankDef.name, playerName: targetPlayer.nameTag }));
            targetPlayer.sendMessage(getString('command.removerank.success.target', { rankName: rankDef.name }));

            logManager?.addLog({
                adminName,
                actionType: 'rankRemoved',
                targetName: targetPlayer.nameTag,
                targetId: targetPlayer.id,
                details: `Removed rank: ${rankDef.name} (ID: ${rankDef.id}, Tag: ${rankTag})`,
            }, dependencies);

            if (config?.notifyOnAdminUtilCommandUsage !== false) {
                const baseNotifyMsg = getString('command.removerank.notify.removedRank', { adminName, rankName: rankDef.name, targetPlayerName: targetPlayer.nameTag });
                playerUtils?.notifyAdmins(baseNotifyMsg, dependencies, player, null);
            }
        } catch (error) {
            player.sendMessage(getString('command.removerank.error.generic', { errorMessage: error.message }));
            console.error(`[RankCommand CRITICAL] Error removing rank ${rankDef.id} from ${targetPlayer.nameTag} by ${adminName}: ${error.stack || error}`);
        }
    }
}
