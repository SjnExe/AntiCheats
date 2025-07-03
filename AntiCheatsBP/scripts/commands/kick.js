/**
 * @file Defines the !kick command for administrators to remove a player from the server.
 */
import { permissionLevels } from '../core/rankManager.js'; // Assuming permissionLevels is correctly populated

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: 'kick', // Already camelCase
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
    const { config, playerUtils, logManager, playerDataManager, permissionLevels: depPermLevels, rankManager, getString } = dependencies;

    if (args.length < 1) {
        player.sendMessage(getString('command.kick.usage', { prefix: config.prefix }));
        return;
    }

    const targetPlayerName = args[0];
    const reason = args.slice(1).join(' ') || getString('common.value.noReasonProvided'); // Default reason

    const foundPlayer = playerUtils.findPlayer(targetPlayerName);

    if (!foundPlayer) {
        player.sendMessage(getString('common.error.playerNotFound', { playerName: targetPlayerName }));
        return;
    }

    if (foundPlayer.id === player.id) {
        player.sendMessage(getString('command.kick.cannotSelf'));
        return;
    }

    const targetPermissionLevel = rankManager.getPlayerPermissionLevel(foundPlayer, dependencies);
    const issuerPermissionLevel = rankManager.getPlayerPermissionLevel(player, dependencies);

    if (targetPermissionLevel <= depPermLevels.admin && issuerPermissionLevel > depPermLevels.owner) {
        player.sendMessage(getString('command.kick.noPermission'));
        return;
    }
    if (targetPermissionLevel <= depPermLevels.owner && issuerPermissionLevel > depPermLevels.owner) {
        player.sendMessage(getString('command.kick.noPermissionOwner'));
        return;
    }

    try {
        const kickMessageToTarget = getString('command.kick.targetMessage', { kickerName: player.nameTag, reason: reason });
        foundPlayer.kick(kickMessageToTarget);

        player.sendMessage(getString('command.kick.success', { playerName: foundPlayer.nameTag, reason: reason }));

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
        player.sendMessage(getString('command.kick.error', { playerName: targetPlayerName, errorMessage: e.message }));
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
