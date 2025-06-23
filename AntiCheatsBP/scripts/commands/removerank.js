/**
 * Defines the !removerank command for server owners to remove a manual rank from a player.
 */
import { permissionLevels } from '../core/rankManager.js'; // For defining command's own permission
import { rankDefinitions } from '../core/ranksConfig.js'; // To validate rankId and get tag prefix

export const definition = {
    name: "removerank",
    syntax: "!removerank <playername> <rankId>",
    description: "Removes a manually assigned rank from a player by removing the associated tag.",
    permissionLevel: permissionLevels.admin, // Base permission: Admin
    enabled: true,
};

export async function execute(player, args, dependencies) {
    const { config, playerUtils, playerDataManager, logManager, rankManager: depRankManager, getString } = dependencies;

    if (args.length < 2) {
        player.sendMessage(`§cUsage: ${config.prefix}removerank <playername> <rankId>`);
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

    const manualTagCondition = rankDef.conditions.find(c => c.type === "manual_tag_prefix" && typeof c.prefix === 'string');
    if (!manualTagCondition) {
        player.sendMessage(`§cRank "${rankDef.name}" is not one that can be removed using this command (not managed by manual tags).`);
        return;
    }

    // Check if the command issuer has permission to manage this specific rank
    const issuerPermissionLevel = depRankManager.getPlayerPermissionLevel(player, dependencies);
    if (typeof rankDef.assignableBy === 'number' && issuerPermissionLevel > rankDef.assignableBy) {
        player.sendMessage(getString("commands.generic.permissionDeniedRankAction", {rankName: rankDef.name, action: "remove"}));
        playerUtils.debugLog(`[RemoveRankCommand] ${player.nameTag} (Level ${issuerPermissionLevel}) attempted to remove rank ${rankDef.id} (AssignableBy ${rankDef.assignableBy}) but lacked permission.`, player.nameTag, dependencies);
        return;
    }

    const rankTagToRemove = manualTagCondition.prefix + rankDef.id;

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
            adminName: player.nameTag,
            actionType: 'remove_rank',
            targetName: targetPlayer.nameTag,
            details: `Removed rank: ${rankDef.name} (ID: ${rankDef.id}, Tag: ${rankTagToRemove})`
        }, dependencies);

        playerUtils.notifyAdmins(`§7[Admin] §e${player.nameTag}§7 removed rank §a${rankDef.name}§7 from §e${targetPlayer.nameTag}.`, dependencies, player, null);

    } catch (e) {
        player.sendMessage(`§cAn error occurred while removing the rank: ${e.message}`);
        console.error(`[RemoveRankCommand] Error removing rank ${rankDef.id} from ${targetPlayer.nameTag}: ${e.stack || e}`);
        logManager.addLog({
            adminName: player.nameTag,
            actionType: 'error',
            context: 'removeRankCommand',
            details: `Failed to remove rank ${rankDef.id} from ${targetPlayer.nameTag}: ${e.message}`
        }, dependencies);
    }
}
