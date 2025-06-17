/**
 * @file AntiCheatsBP/scripts/commands/unmute.js
 * Defines the !unmute command for administrators to allow a previously muted player to chat again.
 * @version 1.0.2
 */
// Imports for permissionLevels, clearFlagsForCheckType, and getString are removed.
// They will be accessed via the dependencies object.

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: "unmute",
    syntax: "!unmute <playername>",
    description: "command.unmute.description", // Key to be resolved by getString from dependencies
    permissionLevel: null, // Will be set from dependencies.permissionLevels.admin in execute
    enabled: true,
};

/**
 * Executes the unmute command.
 * @param {import('@minecraft/server').Player} player The player issuing the command.
 * @param {string[]} args The command arguments.
 * @param {import('../types.js').CommandDependencies} dependencies Command dependencies.
 */
export async function execute(player, args, dependencies) {
    const { config, playerUtils, playerDataManager, logManager, permissionLevels, getString } = dependencies;

    // Set definition properties from dependencies
    definition.permissionLevel = permissionLevels.admin;
    // Ensure description is resolved only once if it's a key (e.g. if execute is called multiple times)
    if (typeof definition.description === 'string' && !definition.description.startsWith("§")) {
       definition.description = getString(definition.description);
    }

    const prefix = config.prefix;

    if (args.length < 1) {
        player.sendMessage(getString("command.unmute.usage", { prefix: prefix }));
        return;
    }
    const targetPlayerName = args[0];
    const foundPlayer = playerUtils.findPlayer(targetPlayerName); // Use playerUtils from dependencies

    if (!foundPlayer) {
        player.sendMessage(getString("common.error.playerNotFoundOnline", { playerName: targetPlayerName }));
        return;
    }

    try {
        // Calls to playerDataManager functions now pass 'dependencies'
        const oldMuteInfo = playerDataManager.getMuteInfo(foundPlayer, dependencies);

        if (!oldMuteInfo) {
            player.sendMessage(getString("command.unmute.error.notMuted", { targetName: foundPlayer.nameTag }));
            return;
        }

        const unmuted = playerDataManager.removeMute(foundPlayer, dependencies);

        if (unmuted) {
            try {
                foundPlayer.onScreenDisplay.setActionBar(getString("command.unmute.targetNotification"));
            } catch (e) {
                if (config.enableDebugLogging && playerUtils.debugLog) {
                    playerUtils.debugLog(`[UnmuteCommand] Failed to set action bar for unmuted player ${foundPlayer.nameTag}: ${e.stack || e}`, player.nameTag);
                }
            }
            player.sendMessage(getString("command.unmute.success", { targetName: foundPlayer.nameTag }));
            if (playerUtils.notifyAdmins) {
                const targetPData = playerDataManager.getPlayerData(foundPlayer.id); // For context
                playerUtils.notifyAdmins(getString("command.unmute.adminNotify", { targetName: foundPlayer.nameTag, adminName: player.nameTag }), player, targetPData);
            }
            if (logManager?.addLog) { // Use logManager from dependencies
                logManager.addLog({
                    timestamp: Date.now(),
                    adminName: player.nameTag,
                    actionType: 'unmute',
                    targetName: foundPlayer.nameTag,
                    reason: oldMuteInfo.reason,
                    details: `Original mute by: ${oldMuteInfo.mutedBy}, AutoMod: ${oldMuteInfo.isAutoMod}, Check: ${oldMuteInfo.triggeringCheckType || 'N/A'}`
                });
            }

            if (oldMuteInfo.isAutoMod && oldMuteInfo.triggeringCheckType) {
                // Use playerDataManager from dependencies
                await playerDataManager.clearFlagsForCheckType(foundPlayer, oldMuteInfo.triggeringCheckType, dependencies);
                const message = getString("command.unmute.automodFlagClear", { checkType: oldMuteInfo.triggeringCheckType, targetName: foundPlayer.nameTag });
                player.sendMessage(message);
                const targetPDataForFlagClearLog = playerDataManager.getPlayerData(foundPlayer.id);
                if (config.enableDebugLogging && playerUtils.debugLog) {
                    playerUtils.debugLog(`[UnmuteCommand] ${message.replace(/§[a-f0-9]/g, '')}`, targetPDataForFlagClearLog?.isWatched ? foundPlayer.nameTag : null);
                }
                if (playerUtils.notifyAdmins) {
                    playerUtils.notifyAdmins(getString("command.unmute.automodFlagClearAdminNotify", { checkType: oldMuteInfo.triggeringCheckType, targetName: foundPlayer.nameTag, adminName: player.nameTag }), player, targetPDataForFlagClearLog);
                }
            }
        } else {
            player.sendMessage(getString("command.unmute.fail", { targetName: foundPlayer.nameTag }));
        }
    } catch (e) {
        player.sendMessage(getString("common.error.generic") + `: ${e.message}`); // Provide e.message for user
        // Standardized error logging
        console.error(`[UnmuteCommand] Unexpected error for ${foundPlayer?.nameTag || targetPlayerName} by ${player.nameTag}: ${e.stack || e}`);
        logManager?.addLog?.({ actionType: 'error', details: `[UnmuteCommand] Failed to unmute ${foundPlayer?.nameTag || targetPlayerName}: ${e.stack || e}`});
    }
}
