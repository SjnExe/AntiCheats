/**
 * @file AntiCheatsBP/scripts/commands/unban.js
 * Defines the !unban command for administrators to remove a ban from a player.
 * Note: Current version primarily supports unbanning players who are online.
 * @version 1.0.2
 */
// Imports for permissionLevels, clearFlagsForCheckType, and getString are removed.
// They will be accessed via the dependencies object.

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: "unban",
    syntax: "!unban <playername>",
    description: "command.unban.description", // Key to be resolved by getString from dependencies
    permissionLevel: null, // Will be set from dependencies.permissionLevels.admin in execute
    enabled: true,
};

/**
 * Executes the unban command.
 * @param {import('@minecraft/server').Player} player The player issuing the command.
 * @param {string[]} args The command arguments.
 * @param {import('../types.js').CommandDependencies} dependencies Command dependencies.
 */
export async function execute(player, args, dependencies) {
    const { config, playerUtils, playerDataManager, logManager, permissionLevels } = dependencies; // getString removed

    if (definition.permissionLevel === null) {
        definition.permissionLevel = permissionLevels.admin;
    }
    // Description is static or resolved by help command
    // definition.description = "Unbans a player, allowing them to rejoin the server.";


    const prefix = config.prefix;

    if (args.length < 1) {
        // Placeholder "command.unban.usage" -> "§cUsage: {prefix}unban <playername>"
        player.sendMessage(`§cUsage: ${prefix}unban <playername>`);
        return;
    }
    const targetPlayerName = args[0];
    const foundPlayer = playerUtils.findPlayer(targetPlayerName);

    if (!foundPlayer) {
        // Placeholder "command.unban.error.offlineNotSupported" -> "§cCannot unban offline player \"{targetName}\". Player must be online or unbanned via console/external tool."
        player.sendMessage(`§cCannot unban offline player "${targetPlayerName}". Player must be online or unbanned via console/external tool.`);
        if (config.enableDebugLogging && playerUtils.debugLog) {
            playerUtils.debugLog(`[UnbanCommand] Unban attempt for offline player ${targetPlayerName} by ${player.nameTag}. This version primarily handles online players.`, player.nameTag, dependencies);
        }
        return;
    }

    try {
        const oldBanInfo = playerDataManager.getBanInfo(foundPlayer, dependencies);

        if (!oldBanInfo) {
            // Placeholder "command.unban.error.notBanned" -> "§ePlayer \"{targetName}\" is not currently banned."
            player.sendMessage(`§ePlayer "${foundPlayer.nameTag}" is not currently banned.`);
            return;
        }

        const unbanned = playerDataManager.removeBan(foundPlayer, dependencies);

        if (unbanned) {
            // Placeholder "command.unban.success" -> "§aSuccessfully unbanned {targetName}."
            player.sendMessage(`§aSuccessfully unbanned ${foundPlayer.nameTag}.`);
            if (playerUtils.notifyAdmins) {
                const targetPData = playerDataManager.getPlayerData(foundPlayer.id);
                // Placeholder "command.unban.adminNotify" -> "§7[Admin] §e{adminName}§7 unbanned §e{targetName}."
                playerUtils.notifyAdmins(`§7[Admin] §e${player.nameTag}§7 unbanned §e${foundPlayer.nameTag}.`, player, targetPData);
            }
            if (logManager?.addLog) {
                logManager.addLog({
                    timestamp: Date.now(),
                    adminName: player.nameTag,
                    actionType: 'unban',
                    targetName: foundPlayer.nameTag,
                    reason: oldBanInfo.reason,
                    details: `Original ban by: ${oldBanInfo.bannedBy}, AutoMod: ${oldBanInfo.isAutoMod}, Check: ${oldBanInfo.triggeringCheckType || 'N/A'}`
                });
            }

            if (oldBanInfo.isAutoMod && oldBanInfo.triggeringCheckType) {
                await playerDataManager.clearFlagsForCheckType(foundPlayer, oldBanInfo.triggeringCheckType, dependencies);
                // Placeholder "command.unban.automodFlagClear" -> "§7Flags for check type '{checkType}' were cleared for {targetName} due to unban from AutoMod action."
                const message = `§7Flags for check type '${oldBanInfo.triggeringCheckType}' were cleared for ${foundPlayer.nameTag} due to unban from AutoMod action.`;
                player.sendMessage(message);
                const targetPDataForFlagClearLog = playerDataManager.getPlayerData(foundPlayer.id);
                if (config.enableDebugLogging && playerUtils.debugLog) {
                    playerUtils.debugLog(`[UnbanCommand] ${message.replace(/§[a-f0-9]/g, '')}`, targetPDataForFlagClearLog?.isWatched ? foundPlayer.nameTag : null, dependencies);
                }
                if (playerUtils.notifyAdmins) {
                    // Placeholder "command.unban.automodFlagClearAdminNotify" -> "§7[Admin] Flags for check type '{checkType}' were cleared for {targetName} by {adminName} (AutoMod unban)."
                    playerUtils.notifyAdmins(`§7[Admin] Flags for check type '${oldBanInfo.triggeringCheckType}' were cleared for ${foundPlayer.nameTag} by ${player.nameTag} (AutoMod unban).`, player, targetPDataForFlagClearLog);
                }
            }

        } else {
            // Placeholder "command.unban.fail" -> "§cFailed to unban {targetName}."
            player.sendMessage(`§cFailed to unban ${foundPlayer.nameTag}.`);
        }
    } catch (e) {
        // "common.error.generic" -> "§cAn unexpected error occurred."
        player.sendMessage(`§cAn unexpected error occurred.: ${e.message}`);
        console.error(`[UnbanCommand] Unexpected error for ${foundPlayer?.nameTag || targetPlayerName} by ${player.nameTag}: ${e.stack || e}`);
        logManager?.addLog?.({ actionType: 'error', details: `[UnbanCommand] Failed to unban ${foundPlayer?.nameTag || targetPlayerName}: ${e.stack || e}`});
    }
}
