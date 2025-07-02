/**
 * @file Defines the !addrank command for server administrators to assign a manual rank to a player.
 */
import { permissionLevels } from '../core/rankManager.js';
import { rankDefinitions } from '../core/ranksConfig.js';

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: 'addrank',
    syntax: '!addrank <playername> <rankId>',
    description: 'Assigns a manual rank to a player by adding the associated tag.',
    permissionLevel: permissionLevels.admin,
    enabled: true,
};

/**
 * Executes the !addrank command.
 * Assigns a specified rank to a target player if the rank is assignable and the issuer has permission.
 * @param {import('@minecraft/server').Player} player - The player issuing the command.
 * @param {string[]} args - Command arguments: <playername> <rankId>.
 * @param {import('../types.js').CommandDependencies} dependencies - Object containing dependencies like config, playerUtils, etc.
 * @returns {Promise<void>}
 */
export async function execute(player, args, dependencies) {
    const { config, playerUtils, logManager, rankManager: depRankManager, getString } = dependencies;

    if (args.length < 2) {
        player.sendMessage(getString('command.addrank.usage', { prefix: config.prefix }));
        return;
    }

    const targetPlayerName = args[0];
    const rankIdToAssign = args[1].toLowerCase();

    const targetPlayer = playerUtils.findPlayer(targetPlayerName);
    if (!targetPlayer) {
        player.sendMessage(getString('command.addrank.playerNotFound', { playerName: targetPlayerName }));
        return;
    }

    const rankDef = rankDefinitions.find(r => r.id.toLowerCase() === rankIdToAssign);
    if (!rankDef) {
        player.sendMessage(getString('command.addrank.rankIdInvalid', { rankId: rankIdToAssign }));
        return;
    }

    const manualTagCondition = rankDef.conditions.find(c => c.type === 'manual_tag_prefix' && typeof c.prefix === 'string');
    if (!manualTagCondition) {
        player.sendMessage(getString('command.addrank.rankNotManuallyAssignable', { rankName: rankDef.name }));
        return;
    }

    const issuerPermissionLevel = depRankManager.getPlayerPermissionLevel(player, dependencies);
    if (typeof rankDef.assignableBy === 'number' && issuerPermissionLevel > rankDef.assignableBy) {
        player.sendMessage(getString('command.addrank.permissionDeniedAssign', { rankName: rankDef.name }));
        playerUtils.debugLog(`[AddRankCommand] ${player.nameTag} (Level ${issuerPermissionLevel}) attempted to assign rank ${rankDef.id} (AssignableBy ${rankDef.assignableBy}) but lacked permission.`, player.nameTag, dependencies);
        return;
    }

    const rankTagToAdd = manualTagCondition.prefix + rankDef.id;

    if (targetPlayer.hasTag(rankTagToAdd)) {
        player.sendMessage(getString('command.addrank.alreadyHasRank', { playerName: targetPlayer.nameTag, rankName: rankDef.name }));
        return;
    }

    try {
        targetPlayer.addTag(rankTagToAdd);
        depRankManager.updatePlayerNametag(targetPlayer, dependencies);

        player.sendMessage(getString('command.addrank.assignSuccessToIssuer', { rankName: rankDef.name, playerName: targetPlayer.nameTag }));
        targetPlayer.sendMessage(getString('command.addrank.assignSuccessToTarget', { rankName: rankDef.name }));

        logManager.addLog({
            adminName: player.nameTag,
            actionType: 'addRank',
            targetName: targetPlayer.nameTag,
            details: `Assigned rank: ${rankDef.name} (ID: ${rankDef.id}, Tag: ${rankTagToAdd})`,
        }, dependencies);

        playerUtils.notifyAdmins(`§7[Admin] §e${player.nameTag}§7 assigned rank §a${rankDef.name}§7 to §e${targetPlayer.nameTag}.`, dependencies, player, null);

    } catch (e) {
        player.sendMessage(getString('command.addrank.errorAssign', { errorMessage: e.message }));
        console.error(`[AddRankCommand] Error assigning rank ${rankDef.id} to ${targetPlayer.nameTag}: ${e.stack || e}`);
        logManager.addLog({
            adminName: player.nameTag,
            actionType: 'error',
            context: 'addRankCommand',
            details: `Failed to assign rank ${rankDef.id} to ${targetPlayer.nameTag}: ${e.message}`,
        }, dependencies);
    }
}
