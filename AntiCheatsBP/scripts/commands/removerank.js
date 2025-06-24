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
    description: 'Removes a manually assigned rank from a player.', // Hardcoded string
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
    const { config, playerUtils, playerDataManager, logManager, rankManager: depRankManager } = dependencies;

    if (args.length < 2) {
        player.sendMessage(`§cUsage: ${config.prefix}removerank <playerName> <rankId>`);
        return;
    }

    const targetPlayerName = args[0];
    const rankIdToRemove = args[1].toLowerCase();

    const targetPlayer = playerUtils.findPlayer(targetPlayerName);
    if (!targetPlayer) {
        player.sendMessage(`§cPlayer "${targetPlayerName}" not found.`);
        return;
    }

    const rankDef = rankDefinitions.find(r => r.id.toLowerCase() === rankIdToRemove);
    if (!rankDef) {
        player.sendMessage(`§cRank ID "${rankIdToRemove}" is not a valid rank.`);
        return;
    }

    const manualTagCondition = rankDef.conditions.find(c => c.type === 'manual_tag_prefix' && typeof c.prefix === 'string');
    if (!manualTagCondition) {
        player.sendMessage(`§cRank "${rankDef.name}" cannot be removed with this command (it is not managed by manual tags).`); // Clarified message
        return;
    }

    // Check if the command issuer has permission to manage this specific rank
    const issuerPermissionLevel = depRankManager.getPlayerPermissionLevel(player, dependencies);
    if (typeof rankDef.assignableBy === 'number' && issuerPermissionLevel > rankDef.assignableBy) {
        // Hardcoded string, replacing getString("commands.generic.permissionDeniedRankAction", ...)
        player.sendMessage(`§cYou do not have permission to remove the rank "${rankDef.name}".`);
        playerUtils.debugLog(`[RemoveRankCommand] ${player.nameTag} (Level ${issuerPermissionLevel}) attempted to remove rank ${rankDef.id} (AssignableBy ${rankDef.assignableBy}) but lacked permission.`, player.nameTag, dependencies);
        return;
    }

    const rankTagToRemove = `${manualTagCondition.prefix}${rankDef.id}`; // Template literal

    if (!targetPlayer.hasTag(rankTagToRemove)) {
        player.sendMessage(`§ePlayer ${targetPlayer.nameTag} does not currently have the rank "${rankDef.name}" (missing tag: ${rankTagToRemove}).`);
        return;
    }

    try {
        targetPlayer.removeTag(rankTagToRemove);
        // Force a refresh of rank and nametag
        depRankManager.updatePlayerNametag(targetPlayer, dependencies);

        player.sendMessage(`§aSuccessfully removed rank "${rankDef.name}" from ${targetPlayer.nameTag}.`);
        targetPlayer.sendMessage(`§eYour rank "${rankDef.name}" has been removed.`);

        logManager.addLog({
            timestamp: Date.now(), // Added timestamp
            adminName: player.nameTag,
            actionType: 'remove_rank',
            targetName: targetPlayer.nameTag,
            details: `Removed rank: ${rankDef.name} (ID: ${rankDef.id}, Tag: ${rankTagToRemove})`,
        }, dependencies);

        playerUtils.notifyAdmins(`§7[Admin] §e${player.nameTag}§7 removed rank §a${rankDef.name}§7 from §e${targetPlayer.nameTag}.`, dependencies, player, null);

    } catch (error) { // Changed 'e' to 'error'
        player.sendMessage(`§cAn error occurred while removing the rank: ${error.message}`);
        console.error(`[RemoveRankCommand] Error removing rank ${rankDef.id} from ${targetPlayer.nameTag}: ${error.stack || error}`);
        logManager.addLog({
            timestamp: Date.now(), // Added timestamp
            adminName: player.nameTag,
            actionType: 'error',
            context: 'RemoveRankCommandExecute', // Added context
            details: `Failed to remove rank ${rankDef.id} from ${targetPlayer.nameTag}: ${error.message}`,
        }, dependencies);
    }
}
