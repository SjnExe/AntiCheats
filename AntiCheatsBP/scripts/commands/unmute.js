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
    const { config, playerUtils, playerDataManager, logManager, permissionLevels } = dependencies; // getString removed

    if (definition.permissionLevel === null) {
        definition.permissionLevel = permissionLevels.admin;
    }
    // definition.description = "Allows an admin to unmute a player."; // Static or resolved by help

    const prefix = config.prefix;

    if (args.length < 1) {
        // Placeholder "command.unmute.usage" -> "§cUsage: {prefix}unmute <playername>"
        player.sendMessage(`§cUsage: ${prefix}unmute <playername>`);
        return;
    }
    const targetPlayerName = args[0];
    const foundPlayer = playerUtils.findPlayer(targetPlayerName);

    if (!foundPlayer) {
        // "common.error.playerNotFoundOnline" -> "§cPlayer '{playerName}' not found or is not online."
        player.sendMessage(`§cPlayer '${targetPlayerName}' not found or is not online.`);
        return;
    }

    try {
        const oldMuteInfo = playerDataManager.getMuteInfo(foundPlayer, dependencies);

        if (!oldMuteInfo) {
            // Placeholder "command.unmute.error.notMuted" -> "§ePlayer \"{targetName}\" is not currently muted."
            player.sendMessage(`§ePlayer "${foundPlayer.nameTag}" is not currently muted.`);
            return;
        }

        const unmuted = playerDataManager.removeMute(foundPlayer, dependencies);

        if (unmuted) {
            try {
                // Placeholder "command.unmute.targetNotification" -> "§aYou have been unmuted."
                foundPlayer.onScreenDisplay.setActionBar("§aYou have been unmuted.");
            } catch (e) {
                if (config.enableDebugLogging && playerUtils.debugLog) {
                    playerUtils.debugLog(`[UnmuteCommand] Failed to set action bar for unmuted player ${foundPlayer.nameTag}: ${e.stack || e}`, player.nameTag, dependencies);
                }
            }
            // Placeholder "command.unmute.success" -> "§aSuccessfully unmuted {targetName}."
            player.sendMessage(`§aSuccessfully unmuted ${foundPlayer.nameTag}.`);
            if (playerUtils.notifyAdmins) {
                const targetPData = playerDataManager.getPlayerData(foundPlayer.id);
                // Placeholder "command.unmute.adminNotify" -> "§7[Admin] §e{adminName}§7 unmuted §e{targetName}."
                playerUtils.notifyAdmins(`§7[Admin] §e${player.nameTag}§7 unmuted §e${foundPlayer.nameTag}.`, player, targetPData);
            }
            if (logManager?.addLog) {
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
                await playerDataManager.clearFlagsForCheckType(foundPlayer, oldMuteInfo.triggeringCheckType, dependencies);
                // Placeholder "command.unmute.automodFlagClear" -> "§7Flags for check type '{checkType}' were cleared for {targetName} due to unmute from AutoMod action."
                const message = `§7Flags for check type '${oldMuteInfo.triggeringCheckType}' were cleared for ${foundPlayer.nameTag} due to unmute from AutoMod action.`;
                player.sendMessage(message);
                const targetPDataForFlagClearLog = playerDataManager.getPlayerData(foundPlayer.id);
                if (config.enableDebugLogging && playerUtils.debugLog) {
                    playerUtils.debugLog(`[UnmuteCommand] ${message.replace(/§[a-f0-9]/g, '')}`, targetPDataForFlagClearLog?.isWatched ? foundPlayer.nameTag : null, dependencies);
                }
                if (playerUtils.notifyAdmins) {
                    // Placeholder "command.unmute.automodFlagClearAdminNotify" -> "§7[Admin] Flags for check type '{checkType}' were cleared for {targetName} by {adminName} (AutoMod unmute)."
                    playerUtils.notifyAdmins(`§7[Admin] Flags for check type '${oldMuteInfo.triggeringCheckType}' were cleared for ${foundPlayer.nameTag} by ${player.nameTag} (AutoMod unmute).`, player, targetPDataForFlagClearLog);
                }
            }
        } else {
            // Placeholder "command.unmute.fail" -> "§cFailed to unmute {targetName}."
            player.sendMessage(`§cFailed to unmute ${foundPlayer.nameTag}.`);
        }
    } catch (e) {
        // "common.error.generic" -> "§cAn unexpected error occurred."
        player.sendMessage(`§cAn unexpected error occurred.: ${e.message}`);
        console.error(`[UnmuteCommand] Unexpected error for ${foundPlayer?.nameTag || targetPlayerName} by ${player.nameTag}: ${e.stack || e}`);
        logManager?.addLog?.({ actionType: 'error', details: `[UnmuteCommand] Failed to unmute ${foundPlayer?.nameTag || targetPlayerName}: ${e.stack || e}`});
    }
}
