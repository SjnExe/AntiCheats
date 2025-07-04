/**
 * @file Defines the !removerank command for server administrators to remove a manual rank from a player.
 */

import { permissionLevels } from '../core/rankManager.js';
import { rankDefinitions } from '../core/ranksConfig.js';

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: 'removerank',
    syntax: '!removerank <playerName> <rankId>',
    description: 'Removes a manually assigned rank from a player.',
    permissionLevel: permissionLevels.admin,
    enabled: true,
};

/**
 * Executes the removerank command.
 * @param {import('@minecraft/server').Player} player The player executing the command.
 * @param {string[]} args Command arguments: [playerName, rankId].
 * @param {import('../types.js').Dependencies} dependencies The dependencies object.
 */
export async function execute(player, args, dependencies) {
    const { config, playerUtils, logManager, rankManager: depRankManager, getString } = dependencies;

    if (args.length < 2) {
        player.sendMessage(getString('command.removerank.usage', { prefix: config.prefix }));
        return;
    }

    const targetPlayerName = args[0];
    const rankIdToRemove = args[1].toLowerCase();

    const targetPlayer = playerUtils.findPlayer(targetPlayerName);
    if (!targetPlayer) {
        player.sendMessage(getString('common.error.playerNotFound', { playerName: targetPlayerName }));
        return;
    }

    const rankDef = rankDefinitions.find(r => r.id.toLowerCase() === rankIdToRemove);
    if (!rankDef) {
        player.sendMessage(getString('command.removerank.rankIdInvalid', { rankId: rankIdToRemove }));
        return;
    }

    const manualTagCondition = rankDef.conditions.find(c => c.type === 'manual_tag_prefix' && typeof c.prefix === 'string');
    if (!manualTagCondition) {
        player.sendMessage(getString('command.removerank.notManuallyManaged', { rankName: rankDef.name }));
        return;
    }

    const issuerPermissionLevel = depRankManager.getPlayerPermissionLevel(player, dependencies);
    if (typeof rankDef.assignableBy === 'number' && issuerPermissionLevel > rankDef.assignableBy) {
        player.sendMessage(getString('command.removerank.permissionDenied', { rankName: rankDef.name }));
        playerUtils.debugLog(`[RemoveRankCommand] ${player.nameTag} (Level ${issuerPermissionLevel}) attempted to remove rank ${rankDef.id} (AssignableBy ${rankDef.assignableBy}) but lacked permission.`, player.nameTag, dependencies);
        return;
    }

    const rankTagToRemove = `${manualTagCondition.prefix}${rankDef.id}`;

    if (!targetPlayer.hasTag(rankTagToRemove)) {
        player.sendMessage(getString('command.removerank.notHasRank', { playerName: targetPlayer.nameTag, rankName: rankDef.name, rankTag: rankTagToRemove }));
        return;
    }

    try {
        targetPlayer.removeTag(rankTagToRemove);
        // Force a refresh of rank and nametag
        depRankManager.updatePlayerNametag(targetPlayer, dependencies);

        player.sendMessage(getString('command.removerank.success.issuer', { rankName: rankDef.name, playerName: targetPlayer.nameTag }));
        targetPlayer.sendMessage(getString('command.removerank.success.target', { rankName: rankDef.name }));

        logManager.addLog({
            adminName: player.nameTag,
            actionType: 'removeRank',
            targetName: targetPlayer.nameTag,
            details: `Removed rank: ${rankDef.name} (ID: ${rankDef.id}, Tag: ${rankTagToRemove})`,
        }, dependencies);

        if (dependencies.config.notifications?.notifyOnAdminUtilCommandUsage !== false) { // Default true
            const baseNotifyMsg = `§e${player.nameTag}§r removed rank §a${rankDef.name}§r from §e${targetPlayer.nameTag}§r.`;
            playerUtils.notifyAdmins(baseNotifyMsg, dependencies, player, null);
        }

    } catch (error) {
        player.sendMessage(getString('command.removerank.error.generic', { errorMessage: error.message }));
        console.error(`[RemoveRankCommand] Error removing rank ${rankDef.id} from ${targetPlayer.nameTag}: ${error.stack || error}`);
        logManager.addLog({
            adminName: player.nameTag,
            actionType: 'error',
            context: 'RemoveRankCommandExecute',
            details: `Failed to remove rank ${rankDef.id} from ${targetPlayer.nameTag}: ${error.message}`,
        }, dependencies);
    }
}
