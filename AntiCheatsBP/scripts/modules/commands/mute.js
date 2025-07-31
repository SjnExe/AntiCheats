/** @type {import('../types.js').CommandDefinition} */
export const definition = {
    name: 'mute',
    syntax: '<playername> [duration] [reason]',
    description: 'Mutes a player, preventing them from sending chat messages.',
    permissionLevel: 1, // admin
};

/**
 * Executes the mute command.
 * @param {import('@minecraft/server').Player | null} player
 * @param {string[]} args
 * @param {import('../types.js').Dependencies} dependencies
 * @param {string} [invokedBy]
 * @param {boolean} [isAutoModAction]
 * @param {string|null} [autoModCheckType]
 */
export function execute(
    player,
    args,
    dependencies,
    invokedBy = 'PlayerCommand',
    isAutoModAction = false,
    autoModCheckType = null,
) {
    const { config, playerUtils, playerDataManager, logManager, rankManager, getString } = dependencies;
    const issuerName = player?.nameTag ?? (invokedBy === 'AutoMod' ? 'AutoMod' : 'System');
    const prefix = config?.prefix ?? '!';

    const parsedArgs = playerUtils.parsePlayerAndReasonArgs(args, 2, 'command.mute.defaultReason', dependencies);
    const targetPlayerName = parsedArgs.targetPlayerName;
    let reason = parsedArgs.reason;
    const usageMessage = `§cUsage: ${prefix}mute <playername> [duration] [reason]`;

    if (!targetPlayerName) {
        if (player) {
            player.sendMessage(usageMessage);
        } else {
            console.warn(`[MuteCommand WARNING] System call for mute missing arguments. Usage: ${prefix}${definition.name} ${definition.syntax}`);
            playerUtils?.debugLog('[MuteCommand WARNING] System call missing target player name.', null, dependencies);
        }
        return;
    }

    const defaultDurationKey = invokedBy === 'AutoMod' ? 'automodDefaultMuteDuration' : 'manualMuteDefaultDuration';
    const fallbackDuration = invokedBy === 'AutoMod' ? '10m' : '1h';
    const defaultDuration = config?.[defaultDurationKey] ?? fallbackDuration;
    const durationString = args[1] || defaultDuration;

    if (invokedBy === 'AutoMod') {
        if (args.length <= 2 || !args.slice(2).join(' ').trim()) {
            reason = getString('command.mute.automodReason', { checkType: autoModCheckType || 'violations' });
        }
    }

    const foundPlayer = playerUtils.validateCommandTarget(player, targetPlayerName, dependencies, { commandName: 'mute' });
    if (!foundPlayer) {
        if (!player) {
            console.warn(`[MuteCommand.execute] System call: Target player '${targetPlayerName}' not found or invalid.`);
        }
        return;
    }

    if (invokedBy === 'PlayerCommand' && player) {
        const permCheck = rankManager.canAdminActionTarget(player, foundPlayer, 'mute', dependencies);
        if (!permCheck.allowed) {
            const messageKey = permCheck.messageKey || 'command.mute.noPermission';
            player.sendMessage(getString(messageKey, permCheck.messageParams));
            return;
        }
    }

    const durationMs = playerUtils?.parseDuration(durationString);
    if (durationMs === null || (durationMs <= 0 && durationMs !== Infinity)) {
        const message = getString('command.mute.invalidDuration', { defaultDuration });
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
            autoModCheckType,
            dependencies,
        );

        if (muteAdded) {
            const muteInfo = playerDataManager?.getMuteInfo(foundPlayer, dependencies);
            const actualReason = muteInfo?.reason ?? reason;
            const actualMutedBy = muteInfo?.bannedBy ?? mutedByForRecord;
            const durationTextUser = durationMs === Infinity ? getString('ban.duration.permanent') : playerUtils.formatDurationFriendly(durationMs);

            const targetNotificationMessage = durationMs === Infinity ?
                getString('command.mute.targetNotification.permanent', { reason: actualReason }) :
                getString('command.mute.targetNotification.timed', { durationString: durationTextUser, reason: actualReason });

            try {
                foundPlayer.onScreenDisplay.setActionBar(targetNotificationMessage);
            } catch (e) {
                playerUtils?.sendMessage(foundPlayer, targetNotificationMessage);
                playerUtils?.debugLog(`[MuteCommand INFO] Failed to set action bar for muted player ${foundPlayer.nameTag}, sent chat message instead. Error: ${e.message}`, issuerName, dependencies);
            }

            const successMessage = getString('command.mute.success', { playerName: foundPlayer.nameTag, durationText: durationTextUser, reason: actualReason });
            if (player) {
                player.sendMessage(successMessage);
                playerUtils?.playSoundForEvent(player, 'commandSuccess', dependencies);
            }

            const targetPData = playerDataManager?.getPlayerData(foundPlayer.id);
            if (config?.notifyOnAdminUtilCommandUsage !== false || (isAutoModAction && config?.notifyOnAutoModAction !== false)) {
                const baseAdminNotifyMsg = getString('command.mute.notify.muted', { targetName: foundPlayer.nameTag, mutedBy: actualMutedBy, duration: durationTextUser, reason: actualReason });
                playerUtils?.notifyAdmins(baseAdminNotifyMsg, dependencies, player, targetPData);
            }

            logManager?.addLog({
                adminName: actualMutedBy,
                actionType: 'playerMuted',
                targetName: foundPlayer.nameTag,
                targetId: foundPlayer.id,
                duration: durationMs === Infinity ? 'Permanent' : durationString,
                reason: actualReason,
                isAutoMod: isAutoModAction,
                checkType: autoModCheckType,
            }, dependencies);
        } else {
            const failureMessage = getString('command.mute.failure', { playerName: foundPlayer.nameTag });
            if (player) {
                player.sendMessage(failureMessage);
                playerUtils?.playSoundForEvent(player, 'commandError', dependencies);
            } else {
                console.warn(`[MuteCommand WARNING] ${failureMessage.replace(/§[a-f0-9]/g, '')} (Invoked by ${issuerName})`);
            }
        }
    } catch (e) {
        const errorMessage = getString('command.mute.error.generic', { playerName: foundPlayer.nameTag, errorMessage: e.message });
        if (player) {
            player.sendMessage(errorMessage);
            playerUtils?.playSoundForEvent(player, 'commandError', dependencies);
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
