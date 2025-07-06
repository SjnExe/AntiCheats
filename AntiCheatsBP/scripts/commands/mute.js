/**
 * @file Defines the !mute command for administrators to prevent a player from sending chat messages.
 */
// Assuming permissionLevels is a static export for now.
import { permissionLevels } from '../core/rankManager.js';

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: 'mute',
    syntax: '<playername> [duration] [reason]', // Prefix handled by commandManager
    description: 'Mutes a player, preventing them from sending chat messages.',
    permissionLevel: permissionLevels.admin, // Default admin, can be adjusted
    enabled: true,
};

/**
 * Executes the !mute command.
 * Mutes a target player for a specified duration with an optional reason.
 * Can also be invoked by AutoMod.
 * @async
 * @param {import('@minecraft/server').Player | null} player - The player issuing the command, or null if system-invoked.
 * @param {string[]} args - Command arguments: <playername> [duration] [reason].
 * @param {import('../types.js').Dependencies} dependencies - Object containing dependencies.
 * @param {string} [invokedBy='PlayerCommand'] - How the command was invoked (e.g., 'PlayerCommand', 'AutoMod').
 * @param {boolean} [isAutoModAction=false] - Whether this mute is a direct result of an AutoMod action.
 * @param {string|null} [autoModCheckType=null] - If AutoMod, the checkType (camelCase) that triggered it.
 * @returns {Promise<void>}
 */
export async function execute(
    player,
    args,
    dependencies,
    invokedBy = 'PlayerCommand',
    isAutoModAction = false,
    autoModCheckType = null
) {
    const { config, playerUtils, playerDataManager, logManager, rankManager, permissionLevels: depPermLevels, getString } = dependencies;
    const issuerName = player?.nameTag ?? (invokedBy === 'AutoMod' ? 'AutoMod' : 'System');
    const prefix = config?.prefix ?? '!';

    if (args.length < 1) {
        const usageMessage = getString('command.mute.usage', { prefix: prefix });
        if (player) {
            player.sendMessage(usageMessage);
        } else {
            // System call error logging
            console.warn(`[MuteCommand WARNING] System call for mute missing arguments. Usage: ${prefix}${definition.name} ${definition.syntax}`);
            playerUtils?.debugLog('[MuteCommand WARNING] System call missing target player name.', null, dependencies);
        }
        return;
    }

    const targetPlayerName = args[0];
    // Determine default duration based on invoker
    const defaultDurationKey = invokedBy === 'AutoMod' ? 'automodDefaultMuteDuration' : 'manualMuteDefaultDuration';
    const fallbackDuration = invokedBy === 'AutoMod' ? '10m' : '1h';
    const defaultDuration = config?.[defaultDurationKey] ?? fallbackDuration;
    const durationString = args[1] || defaultDuration;

    let reason;
    if (invokedBy === 'AutoMod' && args.length <= 2 && autoModCheckType) {
        // If AutoMod and no explicit reason provided in args, use a template.
        reason = getString('command.mute.automodReason', { checkType: autoModCheckType });
    } else {
        reason = args.slice(2).join(' ').trim() ||
                 (invokedBy === 'AutoMod' ? getString('command.mute.automodReason', { checkType: autoModCheckType || 'violations' })
                                          : getString('command.mute.defaultReason'));
    }


    const foundPlayer = playerUtils?.findPlayer(targetPlayerName);

    if (!foundPlayer || !foundPlayer.isValid()) { // Added isValid
        const message = getString('common.error.playerNotFoundOnline', { playerName: targetPlayerName });
        if (player) {
            player.sendMessage(message);
        } else {
            console.warn(`[MuteCommand WARNING] Target player '${targetPlayerName}' not found or invalid (Invoked by ${issuerName}).`);
        }
        return;
    }

    if (player && foundPlayer.id === player.id) {
        player.sendMessage(getString('command.mute.cannotSelf'));
        return;
    }

    // Permission checks for player-invoked mutes
    if (invokedBy === 'PlayerCommand' && player) {
        const targetPermissionLevel = rankManager?.getPlayerPermissionLevel(foundPlayer, dependencies);
        const issuerPermissionLevel = rankManager?.getPlayerPermissionLevel(player, dependencies);
        const adminPerm = depPermLevels?.admin ?? 1; // Fallback permission level

        if (typeof targetPermissionLevel === 'number' && typeof issuerPermissionLevel === 'number') {
            // Prevent lower-ranked staff from muting higher-ranked or equally-ranked staff
            if (targetPermissionLevel <= issuerPermissionLevel && targetPermissionLevel <= adminPerm) {
                player.sendMessage(getString('command.mute.noPermission'));
                return;
            }
        } else {
            playerUtils?.debugLog(`[MuteCommand WARNING] Could not determine permission levels for mute check between ${issuerName} and ${targetPlayerName}. Proceeding with caution.`, issuerName, dependencies);
        }
    }

    const durationMs = playerUtils?.parseDuration(durationString);
    if (durationMs === null || (durationMs <= 0 && durationMs !== Infinity)) {
        const message = getString('command.mute.invalidDuration', { defaultDuration: defaultDuration });
        if (player) {
            player.sendMessage(message);
        } else {
            console.warn(`[MuteCommand WARNING] Invalid duration '${durationString}' (Invoked by ${issuerName}).`);
        }
        return;
    }

    try {
        const mutedByForRecord = isAutoModAction ? 'AutoMod' : issuerName;
        const muteAdded = playerDataManager?.addMute(
            foundPlayer,
            durationMs,
            reason,
            mutedByForRecord,
            isAutoModAction,
            autoModCheckType, // Already camelCase or null
            dependencies
        );

        if (muteAdded) {
            const muteInfo = playerDataManager?.getMuteInfo(foundPlayer, dependencies); // Re-fetch to get canonical info
            const actualReason = muteInfo?.reason ?? reason;
            const actualMutedBy = muteInfo?.bannedBy ?? mutedByForRecord; // Corrected to mutedBy from banInfo
            const durationTextUser = durationMs === Infinity ? getString('ban.duration.permanent') : playerUtils.formatDurationFriendly(durationMs); // User-friendly duration

            const targetNotificationMessage = durationMs === Infinity ?
                getString('command.mute.targetNotification.permanent', { reason: actualReason }) :
                getString('command.mute.targetNotification.timed', { durationString: durationTextUser, reason: actualReason });

            try {
                // Attempt to use ActionBar for less intrusive notification to the target
                foundPlayer.onScreenDisplay.setActionBar(targetNotificationMessage);
            } catch (e) {
                // Fallback to chat message if ActionBar fails (e.g., different UI context)
                playerUtils?.sendMessage(foundPlayer, targetNotificationMessage);
                playerUtils?.debugLog(`[MuteCommand INFO] Failed to set action bar for muted player ${foundPlayer.nameTag}, sent chat message instead. Error: ${e.message}`, issuerName, dependencies);
            }

            const successMessage = getString('command.mute.success', { playerName: foundPlayer.nameTag, durationText: durationTextUser, reason: actualReason });
            if (player) {
                player.sendMessage(successMessage);
                playerUtils?.playSoundForEvent(player, "commandSuccess", dependencies);
            } else {
                console.log(`[MuteCommand INFO] ${successMessage.replace(/§[a-f0-9]/g, '')}`); // Log for system/AutoMod
            }

            const targetPData = playerDataManager?.getPlayerData(foundPlayer.id);
            if (config?.notifyOnAdminUtilCommandUsage !== false || (isAutoModAction && config?.notifyOnAutoModAction !== false)) {
                const baseAdminNotifyMsg = getString('command.mute.notify.muted', { targetName: foundPlayer.nameTag, mutedBy: actualMutedBy, duration: durationTextUser, reason: actualReason });
                playerUtils?.notifyAdmins(baseAdminNotifyMsg, dependencies, player, targetPData);
            }

            logManager?.addLog({
                adminName: actualMutedBy,
                actionType: 'playerMuted', // Standardized camelCase
                targetName: foundPlayer.nameTag,
                targetId: foundPlayer.id,
                duration: durationMs === Infinity ? 'Permanent' : durationString, // Log original duration string
                reason: actualReason,
                isAutoMod: isAutoModAction,
                checkType: autoModCheckType,
            }, dependencies);
        } else {
            const failureMessage = getString('command.mute.failure', { playerName: foundPlayer.nameTag });
            if (player) {
                player.sendMessage(failureMessage);
                playerUtils?.playSoundForEvent(player, "commandError", dependencies);
            } else {
                console.warn(`[MuteCommand WARNING] ${failureMessage.replace(/§[a-f0-9]/g, '')} (Invoked by ${issuerName})`);
            }
        }
    } catch (e) {
        const errorMessage = getString('command.mute.error.generic', { playerName: foundPlayer.nameTag, errorMessage: e.message });
        if (player) {
            player.sendMessage(errorMessage);
            playerUtils?.playSoundForEvent(player, "commandError", dependencies);
        } else {
            console.error(`[MuteCommand CRITICAL] ${errorMessage.replace(/§[a-f0-9]/g, '')} (Invoked by ${issuerName})`);
        }
        playerUtils?.debugLog(`[MuteCommand CRITICAL] Unexpected error during mute command for ${foundPlayer.nameTag} by ${issuerName}: ${e.stack || e}`, issuerName, dependencies);
        logManager?.addLog({
            actionType: 'errorMuteCommand',
            context: 'MuteCommand.execute.unexpected',
            adminName: issuerName,
            targetName: foundPlayer.nameTag,
            targetId: foundPlayer.id,
            details: { errorMessage: e.message, reasonAttempted: reason, durationAttempted: durationString },
            errorStack: e.stack || e.toString(),
        }, dependencies);
    }
}
