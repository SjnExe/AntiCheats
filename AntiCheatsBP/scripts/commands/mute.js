/**
 * @file AntiCheatsBP/scripts/commands/mute.js
 * Defines the !mute command for administrators to prevent a player from sending chat messages.
 * @version 1.0.2
 */
// permissionLevels and getString will be accessed via dependencies.

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: "mute",
    syntax: "!mute <playername> [duration] [reason]",
    description: "command.mute.description", // Key for localization
    permissionLevel: null, // To be set from dependencies.permissionLevels.admin
    enabled: true,
};

/**
 * Executes the mute command.
 * @param {import('@minecraft/server').Player | null} player The player issuing the command, or null if system-invoked.
 * @param {string[]} args The command arguments.
 * @param {import('../types.js').CommandDependencies} dependencies Command dependencies.
 * @param {string} [invokedBy="PlayerCommand"] How the command was invoked.
 * @param {boolean} [isAutoModAction=false] Whether this is an AutoMod action.
 * @param {string|null} [autoModCheckType=null] If AutoMod, the check type.
 */
export async function execute(
    player, // Can be null
    args,
    dependencies,
    invokedBy = "PlayerCommand",
    isAutoModAction = false,
    autoModCheckType = null
) {
    const { config, playerUtils, playerDataManager, logManager, rankManager, permissionLevels, getString } = dependencies;

    // Ensure definition properties are set if not already by a command loader
    if (definition.permissionLevel === null) {
        definition.permissionLevel = permissionLevels.admin;
    }
    // definition.description = getString(definition.description); // Localization handled by help command

    if (args.length < 1) {
        const usageMessage = getString('command.mute.usage', { prefix: config.prefix });
        if (player) {
            player.sendMessage(usageMessage);
        } else {
            console.warn("Mute command called without player and insufficient args by system.");
        }
        return;
    }
    const targetPlayerName = args[0];
    const defaultDuration = invokedBy === "AutoMod" ? "10m" : "1h";
    const durationString = args[1] || defaultDuration;

    let reason;
    if (invokedBy === "AutoMod" && args.length <= 2) {
        reason = `AutoMod action for ${autoModCheckType || 'violations'}.`; // System reason
    } else {
        reason = args.slice(2).join(" ") || (invokedBy === "AutoMod" ? `AutoMod action for ${autoModCheckType || 'violations'}.` : getString("command.mute.defaultAdminReason"));
    }

    const foundPlayer = playerUtils.findPlayer(targetPlayerName); // Use playerUtils.findPlayer

    if (!foundPlayer) {
        const message = getString('command.mute.notFound', { targetName: targetPlayerName });
        if (player) {
            player.sendMessage(message);
        } else {
            console.warn(message);
        }
        return;
    }

    if (player && foundPlayer.id === player.id) {
        player.sendMessage(getString('command.mute.self'));
        return;
    }

    if (invokedBy === "PlayerCommand" && player) {
        // Use rankManager from dependencies
        const targetPermissionLevel = rankManager.getPlayerPermissionLevel(foundPlayer, dependencies);
        const issuerPermissionLevel = rankManager.getPlayerPermissionLevel(player, dependencies);
        if (targetPermissionLevel <= issuerPermissionLevel && player.id !== foundPlayer.id && targetPermissionLevel <= permissionLevels.admin) { // Prevent admin muting higher/equal admins
            player.sendMessage(getString('command.mute.permissionInsufficient'));
            return;
        }
    }

    const durationMs = playerUtils.parseDuration(durationString); // Use playerUtils.parseDuration
    if (durationMs === null || (durationMs <= 0 && durationMs !== Infinity)) {
        const message = getString('command.mute.invalidDuration', { defaultDuration: defaultDuration });
        if (player) {
            player.sendMessage(message);
        } else {
            console.warn(message + ` (Invoked by ${invokedBy})`);
        }
        return;
    }

    try {
        const mutedBy = invokedBy === "AutoMod" ? "AutoMod" : (player ? player.nameTag : "System");
        const muteAdded = playerDataManager.addMute(
            foundPlayer,
            durationMs,
            reason,
            mutedBy,
            isAutoModAction,
            autoModCheckType,
            dependencies // Pass dependencies to addMute
        );

        if (muteAdded) {
            const muteInfo = playerDataManager.getMuteInfo(foundPlayer, dependencies); // Pass dependencies
            const actualReason = muteInfo ? muteInfo.reason : reason;
            const actualMutedBy = muteInfo ? muteInfo.mutedBy : mutedBy;
            const durationText = durationMs === Infinity ? getString("common.value.permanent") : getString("command.mute.durationFor", { duration: durationString });


            let targetNotificationKey = durationMs === Infinity ? 'command.mute.targetNotification.permanent' : 'command.mute.targetNotification.timed';
            try {
                foundPlayer.onScreenDisplay.setActionBar(getString(targetNotificationKey, { durationString: durationString, reason: actualReason }));
            } catch (e) {
                if (config.enableDebugLogging && playerUtils.debugLog) {
                    playerUtils.debugLog(`Failed to set action bar for muted player ${foundPlayer.nameTag}: ${e}`, dependencies, player ? player.nameTag : "System");
                }
            }

            const successMessage = getString('command.mute.success', { targetName: foundPlayer.nameTag, durationText: durationText, reason: actualReason });
            if (player) {
                player.sendMessage(successMessage);
            } else {
                console.log(successMessage.replace(/§[a-f0-9]/g, ''));
            }

            if (playerUtils.notifyAdmins) {
                const targetPData = playerDataManager.getPlayerData(foundPlayer.id); // For context
                playerUtils.notifyAdmins(getString('command.mute.adminNotification', { targetName: foundPlayer.nameTag, durationText: durationText, mutedBy: actualMutedBy, reason: actualReason }), dependencies, player, targetPData);
            }
            if (logManager && logManager.addLog) { // Use logManager.addLog
                logManager.addLog({
                    timestamp: Date.now(),
                    adminName: actualMutedBy,
                    actionType: 'mute',
                    targetName: foundPlayer.nameTag,
                    duration: durationString,
                    reason: actualReason,
                    isAutoMod: isAutoModAction,
                    checkType: autoModCheckType
                }, dependencies);
            }
        } else {
            const failureMessage = getString('command.mute.fail', { targetName: foundPlayer.nameTag });
            if (player) {
                player.sendMessage(failureMessage);
            } else {
                console.warn(failureMessage.replace(/§[a-f0-9]/g, ''));
            }
        }
    } catch (e) {
        const errorMessage = getString('command.mute.error', { targetName: foundPlayer.nameTag, error: e });
        if (player) {
            player.sendMessage(errorMessage);
        } else {
            console.error(errorMessage.replace(/§[a-f0-9]/g, ''));
        }
        if (config.enableDebugLogging && playerUtils.debugLog) {
            playerUtils.debugLog(`Unexpected error during mute command for ${foundPlayer.nameTag} by ${player ? player.nameTag : invokedBy}: ${e}`, player ? player.nameTag : "System", dependencies);
        }
    }
}
