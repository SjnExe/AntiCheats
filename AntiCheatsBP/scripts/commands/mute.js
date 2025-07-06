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

    // Args: <playername> [duration] [reason]
    // Reason starts at index 2. Playername is args[0], duration is args[1].
    const parsedArgs = playerUtils.parsePlayerAndReasonArgs(args, 2, 'command.mute.defaultReason', dependencies);
    const targetPlayerName = parsedArgs.targetPlayerName;
    let reason = parsedArgs.reason; // Default reason from parsePlayerAndReasonArgs

    if (!targetPlayerName) {
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

    // Determine default duration based on invoker
    const defaultDurationKey = invokedBy === 'AutoMod' ? 'automodDefaultMuteDuration' : 'manualMuteDefaultDuration';
    const fallbackDuration = invokedBy === 'AutoMod' ? '10m' : '1h';
    const defaultDuration = config?.[defaultDurationKey] ?? fallbackDuration;
    const durationString = args[1] || defaultDuration;

    // Override reason if invoked by AutoMod and specific conditions are met
    if (invokedBy === 'AutoMod') {
        if (args.length <= 2 || !args.slice(2).join(' ').trim()) { // If no explicit reason provided in args[2+] for automod
            reason = getString('command.mute.automodReason', { checkType: autoModCheckType || 'violations' });
        }
        // If args.length > 2, parsedArgs.reason would have already captured it.
    }
    // If not AutoMod, parsedArgs.reason (with its default) is already set correctly.

    const foundPlayer = playerUtils.validateCommandTarget(player, targetPlayerName, dependencies, { commandName: 'mute' });
    if (!foundPlayer) {
        // If player is null (system invocation), validateCommandTarget doesn't send a message.
        if (!player) {
            console.warn(`[MuteCommand.execute] System call: Target player '${targetPlayerName}' not found or invalid.`);
        }
        return; // validateCommandTarget already sent a message to the player if applicable
    }

    // Permission checks for player-invoked mutes
    if (invokedBy === 'PlayerCommand' && player) { // Ensure player is not null for permission check
        const permCheck = rankManager.canAdminActionTarget(player, foundPlayer, 'mute', dependencies);
        if (!permCheck.allowed) {
            // A more specific message for mute if target is same/higher rank (but not owner/admin, which canAdminActionTarget handles)
            // For now, canAdminActionTarget provides generic keys. If more specific needed, enhance canAdminActionTarget or add logic here.
            const messageKey = permCheck.messageKey || 'command.mute.noPermission';
            player.sendMessage(getString(messageKey, permCheck.messageParams));
            return;
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
