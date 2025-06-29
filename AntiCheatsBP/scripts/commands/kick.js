/**
 * @file Defines the !kick command for administrators to remove a player from the server.
 */
import { permissionLevels } from '../core/rankManager.js';

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: 'kick',
    syntax: '!kick <playername> [reason]',
    description: 'Kicks a player from the server.',
    permissionLevel: permissionLevels.admin,
    enabled: true,
};

/**
 * Executes the !kick command.
 * Removes a specified player from the server with an optional reason.
 * @async
 * @param {import('@minecraft/server').Player} player - The player issuing the command.
 * @param {string[]} args - Command arguments: <playername> [reason].
 * @param {import('../types.js').CommandDependencies} dependencies - Object containing dependencies.
 * @returns {Promise<void>}
 */
export async function execute(player, args, dependencies) {
    const { config, playerUtils, logManager, playerDataManager, permissionLevels: depPermLevels, rankManager } = dependencies;

    if (args.length < 1) {
        player.sendMessage(`§cUsage: ${config.prefix}kick <playername> [reason]`);
        return;
    }

    const targetPlayerName = args[0];
    const reason = args.slice(1).join(' ') || 'Kicked by an administrator.';

    const foundPlayer = playerUtils.findPlayer(targetPlayerName);

    if (!foundPlayer) {
        player.sendMessage(`§cPlayer '${targetPlayerName}' not found.`);
        return;
    }

    if (foundPlayer.id === player.id) {
        player.sendMessage('§cYou cannot kick yourself.');
        return;
    }

    const targetPermissionLevel = rankManager.getPlayerPermissionLevel(foundPlayer, dependencies);
    const issuerPermissionLevel = rankManager.getPlayerPermissionLevel(player, dependencies);

    if (targetPermissionLevel <= depPermLevels.admin && issuerPermissionLevel > depPermLevels.owner) {
        player.sendMessage('§cYou do not have permission to kick this player.');
        return;
    }
    if (targetPermissionLevel <= depPermLevels.owner && issuerPermissionLevel > depPermLevels.owner) {
        player.sendMessage('§cOnly the server owner can kick another owner.');
        return;
    }

    try {
        const kickMessageToTarget = `§cYou have been kicked by ${player.nameTag}. Reason: ${reason}`;
        foundPlayer.kick(kickMessageToTarget);

        player.sendMessage(`§aKicked ${foundPlayer.nameTag}. Reason: ${reason}`);

        if (playerUtils.notifyAdmins) {
            const targetPData = playerDataManager.getPlayerData(foundPlayer.id);
            playerUtils.notifyAdmins(`§7[Admin] §e${foundPlayer.nameTag} §7was kicked by §e${player.nameTag}§7. Reason: §f${reason}`, dependencies, player, targetPData);
        }
        if (logManager?.addLog) {
            logManager.addLog({
                timestamp: Date.now(),
                adminName: player.nameTag,
                actionType: 'kick', // Standardized camelCase
                targetName: foundPlayer.nameTag,
                reason: reason,
            }, dependencies);
        }
    } catch (e) {
        player.sendMessage(`§cError kicking ${targetPlayerName}: ${e.message}`);
        console.error(`[KickCommand] Error kicking player ${targetPlayerName} by ${player.nameTag}: ${e.stack || e}`);
        if (logManager?.addLog) {
            logManager.addLog({
                adminName: player.nameTag,
                actionType: 'error',
                context: 'kickCommand.execution',
                details: `Failed to kick ${targetPlayerName}: ${e.stack || e}`,
            }, dependencies);
        }
    }
}
