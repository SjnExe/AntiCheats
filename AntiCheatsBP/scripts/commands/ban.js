/**
 * @file Defines the !ban command for administrators to ban players.
 */
/** @type {import('../types.js').CommandDefinition} */
export const definition = {
    name: 'ban',
    syntax: '<playername> [duration] [reason]',
    description: 'Bans a player for a specified duration (e.g., 7d, 2h, 30m, perm).',
    aliases: ['b'],
    permissionLevel: 1, // admin
    enabled: true,
};

/**
 * Executes the ban command.
 * @async
 * @param {import('@minecraft/server').Player | null} player - The player issuing the command, or null if system-invoked.
 * @param {string[]} args - The command arguments: <playername> [duration] [reason].
 * @param {import('../types.js').Dependencies} dependencies - Command dependencies.
 * @param {string} [invokedBy] - How the command was invoked (e.g., 'PlayerCommand', 'AutoMod').
 * @param {boolean} [isAutoModAction] - Whether this ban is a direct result of an AutoMod action.
 * @param {string|null} [autoModCheckType] - If by AutoMod, the checkType (camelCase) that triggered it.
 * @returns {void}
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

    const parsedArgs = playerUtils.parsePlayerAndReasonArgs(args, 2, 'command.ban.defaultReason', dependencies);
    const targetPlayerName = parsedArgs.targetPlayerName;
    let reason = parsedArgs.reason;

    if (!targetPlayerName) {
        const usageMessage = getString('command.ban.usage', { prefix });
        if (player) {
            player.sendMessage(usageMessage);
        } else {
            console.warn(`[BanCommand.execute] System call missing arguments. Usage: ${prefix}${definition.name} ${definition.syntax}`);
            playerUtils?.debugLog('[BanCommand.execute] System call missing target player name.', null, dependencies);
        }
        return;
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

    const banAdded = playerDataManager?.addBan(
        targetOnlinePlayer,
        durationMs,
        reason,
        bannedByForRecord,
        isAutoModAction,
        autoModCheckType,
        dependencies,
    );

    if (banAdded) {
        const banInfo = playerDataManager?.getBanInfo(targetOnlinePlayer, dependencies);
        const actualReason = banInfo?.reason ?? reason;
        const actualBannedBy = banInfo?.bannedBy ?? bannedByForRecord;
        const unbanTime = banInfo?.unbanTime ?? (Date.now() + durationMs);

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
        } else {
            console.log(`[BanCommand.execute] ${successMessage.replace(/§[a-f0-9]/g, '')}`);
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
