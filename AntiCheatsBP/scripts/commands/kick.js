/**
 * @file AntiCheatsBP/scripts/commands/kick.js
 * Defines the !kick command for administrators to remove a player from the server.
 * @version 1.0.2
 */
// Imports for permissionLevels and getString are removed, they will come from dependencies.

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
    const { config, playerUtils, logManager, playerDataManager, permissionLevels, getString } = dependencies;

    if (args.length < 1) {
        player.sendMessage(getString('command.kick.usage', { prefix: config.prefix })); // getString from dependencies
        return;
    }
    const targetPlayerName = args[0];
    const reason = args.slice(1).join(" ") || getString('command.kick.defaultReason'); // getString from dependencies

    const foundPlayer = playerUtils.findPlayer(targetPlayerName); // Use playerUtils.findPlayer

    if (foundPlayer) {
        if (foundPlayer.id === player.id) {
            player.sendMessage(getString('command.kick.self')); // getString from dependencies
            return;
        }

        // It's good practice to check permissions before attempting to kick
        const targetPermissionLevel = playerUtils.getPlayerPermissionLevel(foundPlayer);
        const issuerPermissionLevel = playerUtils.getPlayerPermissionLevel(player);

        if (targetPermissionLevel <= permissionLevels.admin && issuerPermissionLevel > permissionLevels.owner) {
            player.sendMessage(getString('command.ban.permissionInsufficient')); // Re-use ban string or create a new one
            return;
        }
         if (targetPermissionLevel <= permissionLevels.owner && issuerPermissionLevel > permissionLevels.owner) {
            player.sendMessage(getString('command.ban.ownerByNonOwner'));  // Re-use ban string or create a new one
            return;
        }
        if (targetPermissionLevel === permissionLevels.owner && issuerPermissionLevel === permissionLevels.owner && player.id !== foundPlayer.id) {
             player.sendMessage(getString('command.ban.ownerByOwner')); // Re-use ban string or create a new one
            return;
        }

        try {
            const originalReason = reason;
            const kickMessageToTarget = getString('command.kick.targetNotification', { adminName: player.nameTag, reason: originalReason, prefix: config.prefix }); // getString from dependencies
            foundPlayer.kick(kickMessageToTarget);

            player.sendMessage(getString('command.kick.success', { targetName: foundPlayer.nameTag, reason: originalReason })); // getString from dependencies

            if (playerUtils.notifyAdmins) {
                const targetPData = playerDataManager.getPlayerData(foundPlayer.id); // playerDataManager from dependencies
                playerUtils.notifyAdmins(getString('command.kick.adminNotification', { targetName: foundPlayer.nameTag, adminName: player.nameTag, reason: originalReason }), player, targetPData); // getString from dependencies
            }
            if (logManager?.addLog) { // use logManager.addLog
                logManager.addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'kick', targetName: foundPlayer.nameTag, reason: originalReason });
            }
        } catch (e) {
            player.sendMessage(getString('command.kick.error', { targetName: targetPlayerName, error: e.message })); // getString from dependencies, provide e.message
            // Standardized error logging
            console.error(`[KickCommand] Error kicking player ${targetPlayerName}: ${e.stack || e}`);
            // Optionally add to logManager as well if persistent tracking of such errors is desired
            logManager?.addLog?.({ actionType: 'error', details: `[KickCommand] Failed to kick ${targetPlayerName}: ${e.stack || e}` });
        }
    } else {
        player.sendMessage(getString('command.kick.notFound', { targetName: targetPlayerName })); // getString from dependencies
    }
}
