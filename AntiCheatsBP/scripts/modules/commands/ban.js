import { CommandError } from '../../types.js';

/** @type {import('../../../types.js').CommandDefinition} */
export const definition = {
    name: 'ban',
    syntax: '<playername> [duration] [reason]',
    description: 'Bans a player for a specified duration (e.g., 7d, 2h, 30m, perm).',
    permissionLevel: 1, // admin
};

/**
 * Executes the ban command.
 * @param {import('@minecraft/server').Player | null} player
 * @param {string[]} args
 * @param {import('../../types.js').Dependencies} dependencies
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
    const usageMessage = `§cUsage: ${prefix}ban <playername> [duration] [reason]`;

    const parsedArgs = playerUtils.parsePlayerAndReasonArgs(args, 2, 'command.ban.defaultReason', dependencies);
    const targetPlayerName = parsedArgs.targetPlayerName;
    let reason = parsedArgs.reason;

    if (!targetPlayerName) {
        throw new CommandError(usageMessage);
    }

    const durationString = args[1] || 'perm';

    if (invokedBy === 'AutoMod') {
        if (args.length <= 2 || !args.slice(2).join(' ').trim()) {
            reason = getString('command.ban.automodReason', { checkType: autoModCheckType || 'violations' });
        }
    }

    const targetOnlinePlayer = playerUtils.validateCommandTarget(player, targetPlayerName, dependencies, { commandName: 'ban' });
    if (!targetOnlinePlayer) {
        if (!player) {
            console.warn(`[BanCommand.execute] System call: Target player '${targetPlayerName}' not found or invalid.`);
        }
        return;
    }

    if (invokedBy === 'PlayerCommand' && player) {
        const permCheck = rankManager.canAdminActionTarget(player, targetOnlinePlayer, 'ban', dependencies);
        if (!permCheck.allowed) {
            player.sendMessage(getString(permCheck.messageKey || 'command.ban.noPermission', permCheck.messageParams));
            return;
        }
    }

    const durationMs = playerUtils?.parseDuration(durationString);
    if (durationMs === null || (durationMs <= 0 && durationMs !== Infinity)) {
        const message = getString('command.ban.invalidDuration');
        if (player) {
            player.sendMessage(message);
        } else {
            console.warn(`[BanCommand.execute] Invalid duration '${durationString}' (Invoked by ${issuerName}).`);
        }
        return;
    }

    const bannedByForRecord = isAutoModAction ? 'AutoMod' : issuerName;

    const targetPData = playerDataManager.getPlayerData(targetOnlinePlayer.id);
    if (!targetPData) {
        // This should ideally not happen if the player is online, but as a safeguard:
        throw new CommandError(getString('command.ban.error.noPlayerData', { playerName: targetOnlinePlayer.nameTag }));
    }

    const banAdded = playerDataManager.addPlayerStateRestriction(
        targetOnlinePlayer,
        targetPData,
        'ban',
        durationMs,
        reason,
        bannedByForRecord,
        isAutoModAction,
        autoModCheckType,
        dependencies,
    );

    if (banAdded) {
        const banInfo = targetPData.banInfo;
        const actualReason = banInfo?.reason ?? reason;
        const actualBannedBy = banInfo?.bannedBy ?? bannedByForRecord;
        const unbanTime = banInfo?.expiryTimestamp ?? (Date.now() + durationMs);

        const durationDisplay = durationMs === Infinity ? getString('ban.duration.permanent') : getString('ban.duration.expires', { expiryDate: new Date(unbanTime).toLocaleString() });

        const kickMessageParts = [
            getString('command.ban.kickMessage.header'),
            getString('command.ban.kickMessage.reason', { reason: actualReason }),
            getString('command.ban.kickMessage.bannedBy', { bannedBy: actualBannedBy }),
            getString('command.ban.kickMessage.duration', { durationDisplay }),
        ];
        if (config?.discordLink && config.discordLink.trim() !== '' && !config.discordLink.includes('example.com')) {
            kickMessageParts.push(getString('command.ban.kickMessage.appeal', { discordLink: config.discordLink }));
        }
        const kickMessage = kickMessageParts.join('\n');

        try {
            targetOnlinePlayer.kick(kickMessage);
        } catch (e) {
            playerUtils?.debugLog(`[BanCommand.execute WARNING] Failed to kick ${targetOnlinePlayer.nameTag} after ban (may have disconnected): ${e.message}`, issuerName, dependencies);
        }

        const successMessage = getString('command.ban.success', { playerName: targetOnlinePlayer.nameTag, durationString: durationDisplay, reason: actualReason });
        if (player) {
            player.sendMessage(successMessage);
            playerUtils.playSoundForEvent(player, 'commandSuccess', dependencies);
        }

        const targetPData = playerDataManager?.getPlayerData(targetOnlinePlayer.id);
        if (config?.notifyOnAdminUtilCommandUsage !== false || (isAutoModAction && config?.notifyOnAutoModAction !== false)) {
            const baseAdminNotifyMsg = getString('command.ban.notify.banned', { bannedBy: actualBannedBy, targetName: targetOnlinePlayer.nameTag, durationDisplay, reason: actualReason });
            playerUtils?.notifyAdmins(baseAdminNotifyMsg, dependencies, player, targetPData);
        }

        logManager?.addLog({
            adminName: actualBannedBy,
            actionType: 'playerBanned',
            targetName: targetOnlinePlayer.nameTag,
            targetId: targetOnlinePlayer.id,
            duration: durationMs === Infinity ? 'Permanent' : durationString,
            reason: actualReason,
            isAutoMod: isAutoModAction,
            checkType: autoModCheckType,
        }, dependencies);

    } else {
        const failureMessage = getString('command.ban.failure', { playerName: targetOnlinePlayer.nameTag });
        if (player) {
            player.sendMessage(failureMessage);
            playerUtils.playSoundForEvent(player, 'commandError', dependencies);
        } else {
            console.warn(`[BanCommand.execute] ${failureMessage.replace(/§[a-f0-9]/g, '')} (Invoked by ${issuerName})`);
        }
    }
}
