/**
 * Defines the !addrank command for server owners to assign a manual rank to a player.
 */
import { permissionLevels } from '../core/rankManager.js'; // For defining command's own permission
import { rankDefinitions } from '../core/ranksConfig.js'; // To validate rankId and get tag prefix

export const definition = {
    name: "addrank",
    syntax: "!addrank <playername> <rankId>",
    description: "Assigns a manual rank to a player by adding the associated tag.",
    permissionLevel: permissionLevels.owner, // Only owners can assign ranks initially
    enabled: true,
};

export async function execute(player, args, dependencies) {
    const { config, playerUtils, playerDataManager, logManager, rankManager: depRankManager } = dependencies;

    if (args.length < 2) {
        player.sendMessage(`§cUsage: ${config.prefix}addrank <playername> <rankId>`);
        return;
    }

    const targetPlayerName = args[0];
    const rankIdToAssign = args[1].toLowerCase();

    const targetPlayer = playerUtils.findPlayer(targetPlayerName);
    if (!targetPlayer) {
        player.sendMessage(`§cPlayer "${targetPlayerName}" not found.`);
        return;
    }

    const rankDef = rankDefinitions.find(r => r.id.toLowerCase() === rankIdToAssign);
    if (!rankDef) {
        player.sendMessage(`§cRank ID "${rankIdToAssign}" is not a valid rank.`);
        return;
    }

    // Check if the rank is manually assignable via tags
    const manualTagCondition = rankDef.conditions.find(c => c.type === "manual_tag_prefix" && typeof c.prefix === 'string');
    if (!manualTagCondition) {
        player.sendMessage(`§cRank "${rankDef.name}" cannot be assigned using this command (not configured for manual tag assignment).`);
        return;
    }

    // Optional: Check if the command issuer has permission to assign this specific rank
    // For now, only owner (command's perm level) can run this.
    // Future: rankDef.assignableBy could be used here if command was lower perm.

    const rankTagToAdd = manualTagCondition.prefix + rankDef.id;

    if (targetPlayer.hasTag(rankTagToAdd)) {
        player.sendMessage(`§ePlayer ${targetPlayer.nameTag} already has the rank "${rankDef.name}".`);
        return;
    }

    try {
        targetPlayer.addTag(rankTagToAdd);
        // Force a refresh of rank and nametag
        depRankManager.updatePlayerNametag(targetPlayer, dependencies);

        player.sendMessage(`§aSuccessfully assigned rank "${rankDef.name}" to ${targetPlayer.nameTag}.`);
        targetPlayer.sendMessage(`§aYou have been assigned the rank: ${rankDef.name}.`);

        logManager.addLog({
            adminName: player.nameTag,
            actionType: 'add_rank',
            targetName: targetPlayer.nameTag,
            details: `Assigned rank: ${rankDef.name} (ID: ${rankDef.id}, Tag: ${rankTagToAdd})`
        }, dependencies);

        playerUtils.notifyAdmins(`§7[Admin] §e${player.nameTag}§7 assigned rank §a${rankDef.name}§7 to §e${targetPlayer.nameTag}.`, dependencies, player, null);

    } catch (e) {
        player.sendMessage(`§cAn error occurred while assigning the rank: ${e.message}`);
        console.error(`[AddRankCommand] Error assigning rank ${rankDef.id} to ${targetPlayer.nameTag}: ${e.stack || e}`);
        logManager.addLog({
            adminName: player.nameTag,
            actionType: 'error',
            context: 'addRankCommand',
            details: `Failed to assign rank ${rankDef.id} to ${targetPlayer.nameTag}: ${e.message}`
        }, dependencies);
    }
}
