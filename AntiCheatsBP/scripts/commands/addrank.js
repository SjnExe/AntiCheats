/**
 * @file Defines the !addrank command for server administrators to assign a manual rank to a player.
 */
import { permissionLevels } from '../core/rankManager.js'; // Assuming permissionLevels is still exported if needed here.
import { rankDefinitions } from '../core/ranksConfig.js'; // Direct import, rankManager methods are preferred for logic.

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: 'addrank', // camelCase name
    syntax: '!addrank <playername> <rankId>',
    description: 'Assigns a manual rank to a player by adding the associated tag.',
    permissionLevel: permissionLevels.admin, // Uses the direct export; ensure this is intended.
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
    const { config, playerUtils, logManager, rankManager, getString } = dependencies; // Use rankManager from dependencies
    const adminName = player?.nameTag ?? 'UnknownAdmin';

    if (args.length < 2) {
        player?.sendMessage(getString('command.addrank.usage', { prefix: config?.prefix }));
        return;
    }

    const targetPlayerName = args[0];
    const rankIdToAssign = args[1].toLowerCase(); // Ensure rankId is lowerCase for matching

    const targetPlayer = playerUtils?.findPlayer(targetPlayerName);
    if (!targetPlayer) {
        player?.sendMessage(getString('command.addrank.playerNotFound', { playerName: targetPlayerName }));
        return;
    }

    // Use rankManager.getRankById for consistent rank lookup (handles lowercase automatically)
    const rankDef = rankManager?.getRankById(rankIdToAssign);
    if (!rankDef) {
        player?.sendMessage(getString('command.addrank.rankIdInvalid', { rankId: rankIdToAssign }));
        return;
    }

    const manualTagCondition = rankDef.conditions.find(c => c.type === 'manualTagPrefix' && typeof c.prefix === 'string');
    if (!manualTagCondition?.prefix) { // Check if prefix exists
        player?.sendMessage(getString('command.addrank.rankNotManuallyAssignable', { rankName: rankDef.name }));
        return;
    }

    const issuerPermissionLevel = rankManager?.getPlayerPermissionLevel(player, dependencies);
    if (typeof rankDef.assignableBy === 'number' && issuerPermissionLevel > rankDef.assignableBy) {
        player?.sendMessage(getString('command.addrank.permissionDeniedAssign', { rankName: rankDef.name }));
        playerUtils?.debugLog(`[AddRankCommand] ${adminName} (Level ${issuerPermissionLevel}) attempted to assign rank ${rankDef.id} (AssignableBy ${rankDef.assignableBy}) but lacked permission.`, adminName, dependencies);
        return;
    }

    const rankTagToAdd = manualTagCondition.prefix + rankDef.id; // rankDef.id is already lowercase from getRankById

    if (targetPlayer.hasTag(rankTagToAdd)) {
        player?.sendMessage(getString('command.addrank.alreadyHasRank', { playerName: targetPlayer.nameTag, rankName: rankDef.name }));
        return;
    }

    try {
        targetPlayer.addTag(rankTagToAdd);
        await rankManager?.updatePlayerNametag(targetPlayer, dependencies); // Ensure await if it becomes async

        player?.sendMessage(getString('command.addrank.assignSuccessToIssuer', { rankName: rankDef.name, playerName: targetPlayer.nameTag }));
        targetPlayer.sendMessage(getString('command.addrank.assignSuccessToTarget', { rankName: rankDef.name }));

        logManager?.addLog({
            adminName: adminName,
            actionType: 'addRank', // camelCase
            targetName: targetPlayer.nameTag,
            details: `Assigned rank: ${rankDef.name} (ID: ${rankDef.id}, Tag: ${rankTagToAdd})`,
        }, dependencies);

        if (dependencies.config.notifications?.notifyOnAdminUtilCommandUsage !== false) { // Default true
            const baseNotifyMsg = `§e${adminName}§r assigned rank §a${rankDef.name}§r to §e${targetPlayer.nameTag}§r.`;
            playerUtils?.notifyAdmins(baseNotifyMsg, dependencies, player, null); // Passing admin player as 'player' for context
        }

    } catch (e) {
        player?.sendMessage(getString('command.addrank.errorAssign', { errorMessage: e.message }));
        console.error(`[AddRankCommand] Error assigning rank ${rankDef.id} to ${targetPlayer.nameTag} by ${adminName}: ${e.stack || e}`);
        logManager?.addLog({
            adminName: adminName,
            actionType: 'errorAddRank', // More specific error actionType
            context: 'AddRankCommand.execute',
            details: `Failed to assign rank ${rankDef.id} to ${targetPlayer.nameTag}: ${e.message}`,
            error: e.stack || e.message,
        }, dependencies);
    }
}
