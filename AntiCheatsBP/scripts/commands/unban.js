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
    const { config, playerUtils, playerDataManager, logManager, permissionLevels, getString } = dependencies;

    // Set definition properties from dependencies
    definition.permissionLevel = permissionLevels.admin;
    // Ensure description is resolved only once if it's a key
    if (typeof definition.description === 'string' && !definition.description.startsWith("§")) {
       definition.description = getString(definition.description);
    }

    const prefix = config.prefix;

    if (args.length < 1) {
        player.sendMessage(getString("command.unban.usage", { prefix: prefix }));
        return;
    }
    const targetPlayerName = args[0];
    const foundPlayer = playerUtils.findPlayer(targetPlayerName); // Use playerUtils from dependencies

    if (!foundPlayer) {
        player.sendMessage(getString("command.unban.error.offlineNotSupported", { targetName: targetPlayerName }));
        if (config.enableDebugLogging && playerUtils.debugLog) {
            playerUtils.debugLog(`[UnbanCommand] Unban attempt for offline player ${targetPlayerName} by ${player.nameTag}. This version primarily handles online players.`, player.nameTag, dependencies);
        }
        return;
    }

    try {
        // Calls to playerDataManager functions now pass 'dependencies'
        const oldBanInfo = playerDataManager.getBanInfo(foundPlayer, dependencies);

        if (!oldBanInfo) {
            player.sendMessage(getString("command.unban.error.notBanned", { targetName: foundPlayer.nameTag }));
            return;
        }

        const unbanned = playerDataManager.removeBan(foundPlayer, dependencies);

        if (unbanned) {
            player.sendMessage(getString("command.unban.success", { targetName: foundPlayer.nameTag }));
            if (playerUtils.notifyAdmins) {
                const targetPData = playerDataManager.getPlayerData(foundPlayer.id); // For context
                playerUtils.notifyAdmins(getString("command.unban.adminNotify", { targetName: foundPlayer.nameTag, adminName: player.nameTag }), player, targetPData);
            }
            if (logManager?.addLog) { // Use logManager from dependencies
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
                // Use playerDataManager from dependencies
                await playerDataManager.clearFlagsForCheckType(foundPlayer, oldBanInfo.triggeringCheckType, dependencies);
                const message = getString("command.unban.automodFlagClear", { checkType: oldBanInfo.triggeringCheckType, targetName: foundPlayer.nameTag });
                player.sendMessage(message);
                const targetPDataForFlagClearLog = playerDataManager.getPlayerData(foundPlayer.id);
                if (config.enableDebugLogging && playerUtils.debugLog) {
                    playerUtils.debugLog(`[UnbanCommand] ${message.replace(/§[a-f0-9]/g, '')}`, targetPDataForFlagClearLog?.isWatched ? foundPlayer.nameTag : null, dependencies);
                }
                if (playerUtils.notifyAdmins) {
                    playerUtils.notifyAdmins(getString("command.unban.automodFlagClearAdminNotify", { checkType: oldBanInfo.triggeringCheckType, targetName: foundPlayer.nameTag, adminName: player.nameTag }), player, targetPDataForFlagClearLog);
                }
            }

        } else {
            player.sendMessage(getString("command.unban.fail", { targetName: foundPlayer.nameTag }));
        }
    } catch (e) {
        player.sendMessage(getString("common.error.generic") + `: ${e.message}`); // Provide e.message
        // Standardized error logging
        console.error(`[UnbanCommand] Unexpected error for ${foundPlayer?.nameTag || targetPlayerName} by ${player.nameTag}: ${e.stack || e}`);
        logManager?.addLog?.({ actionType: 'error', details: `[UnbanCommand] Failed to unban ${foundPlayer?.nameTag || targetPlayerName}: ${e.stack || e}`});
    }
}
