/**
 * @file AntiCheatsBP/scripts/commands/kick.js
 * Defines the !kick command for administrators to remove a player from the server.
 * @version 1.0.2
 */
import { permissionLevels } from '../core/rankManager.js';
import { getString } from '../core/i18n.js';

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: "kick",
    syntax: "!kick <playername> [reason]",
    description: "Kicks a player from the server.",
    permissionLevel: permissionLevels.admin,
    enabled: true,
};

/**
 * Executes the kick command.
 * @param {import('@minecraft/server').Player} player The player issuing the command.
 * @param {string[]} args The command arguments.
 * @param {import('../types.js').CommandDependencies} dependencies Command dependencies.
 */
export async function execute(player, args, dependencies) {
    const { config, playerUtils, addLog, findPlayer } = dependencies;

    if (args.length < 1) {
        player.sendMessage(getString('command.kick.usage', { prefix: config.prefix }));
        return;
    }
    const targetPlayerName = args[0];
    const reason = args.slice(1).join(" ") || getString('command.kick.defaultReason');

    const foundPlayer = findPlayer(targetPlayerName, playerUtils);

    if (foundPlayer) {
        if (foundPlayer.id === player.id) {
            player.sendMessage(getString('command.kick.self'));
            return;
        }
        try {
            const originalReason = reason;
            const kickMessageToTarget = getString('command.kick.targetNotification', { adminName: player.nameTag, reason: originalReason, prefix: config.prefix });
            foundPlayer.kick(kickMessageToTarget);

            player.sendMessage(getString('command.kick.success', { targetName: foundPlayer.nameTag, reason: originalReason }));

            if (playerUtils.notifyAdmins) {
                // Retrieve player data for potential additional context in notifications
                const targetPData = dependencies.playerDataManager ? dependencies.playerDataManager.getPlayerData(foundPlayer.id) : undefined;
                playerUtils.notifyAdmins(getString('command.kick.adminNotification', { targetName: foundPlayer.nameTag, adminName: player.nameTag, reason: originalReason }), player, targetPData);
            }
            if (addLog) {
                addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'kick', targetName: foundPlayer.nameTag, reason: originalReason });
            }
        } catch (e) {
            player.sendMessage(getString('command.kick.error', { targetName: targetPlayerName, error: e }));
            if (dependencies.config.enableDebugLogging && playerUtils.debugLog) {
                playerUtils.debugLog(`Error kicking player ${targetPlayerName}: ${e}`);
            }
        }
    } else {
        player.sendMessage(getString('command.kick.notFound', { targetName: targetPlayerName }));
    }
}
