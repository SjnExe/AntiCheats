/**
 * @file Defines the !ban command for administrators to ban players.
 */
// Assuming permissionLevels is a static export for now.
// If it becomes dynamic via rankManager, it should be accessed from dependencies.rankManager.permissionLevels.
import { permissionLevels } from '../core/rankManager.js';

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: 'ban',
    syntax: '<playername> [duration] [reason]', // Prefix handled by commandManager
    description: 'Bans a player for a specified duration (e.g., 7d, 2h, 30m, perm).',
    permissionLevel: permissionLevels.admin,
    enabled: true,
};

/**
 * Executes the ban command.
 * @async
 * @param {import('@minecraft/server').Player | null} player - The player issuing the command, or null if system-invoked.
 * @param {string[]} args - The command arguments: <playername> [duration] [reason].
 * @param {import('../types.js').Dependencies} dependencies - Command dependencies.
 * @param {string} [invokedBy='PlayerCommand'] - How the command was invoked (e.g., 'PlayerCommand', 'AutoMod').
 * @param {boolean} [isAutoModAction=false] - Whether this ban is a direct result of an AutoMod action.
 * @param {string|null} [autoModCheckType=null] - If by AutoMod, the checkType (camelCase) that triggered it.
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
    const { config, playerUtils, playerDataManager, logManager, rankManager, getString } = dependencies;
    const issuerName = player?.nameTag ?? (invokedBy === 'AutoMod' ? 'AutoMod' : 'System');
    const prefix = config?.prefix ?? '!';

    // Args: <playername> [duration] [reason]
    // Reason starts at index 2. Playername is args[0], duration is args[1].
    const parsedArgs = playerUtils.parsePlayerAndReasonArgs(args, 2, 'command.ban.defaultReason', dependencies);
    const targetPlayerName = parsedArgs.targetPlayerName;
    let reason = parsedArgs.reason; // Default reason from parsePlayerAndReasonArgs

    if (!targetPlayerName) { // Check if targetPlayerName is undefined (i.e. args[0] was missing)
        const usageMessage = getString('command.ban.usage', { prefix: prefix });
        if (player) {
            player.sendMessage(usageMessage);
        } else {
            console.warn(`[BanCommand.execute] System call missing arguments. Usage: ${prefix}${definition.name} ${definition.syntax}`);
            playerUtils?.debugLog('[BanCommand.execute] System call missing target player name.', null, dependencies);
        }
        return;
    }

    const durationString = args[1] || 'perm'; // Default to 'perm' if duration not specified

    // Override reason if invoked by AutoMod and specific conditions are met
    if (invokedBy === 'AutoMod') {
        if (args.length <= 2 || !args.slice(2).join(' ').trim()) { // If no explicit reason provided in args[2+] for automod
            reason = getString('command.ban.automodReason', { checkType: autoModCheckType || 'violations' });
        }
        // If args.length > 2, parsedArgs.reason would have already captured it.
    }
    // If not AutoMod, parsedArgs.reason (with its default) is already set correctly.

    const targetOnlinePlayer = playerUtils.validateCommandTarget(player, targetPlayerName, dependencies, { commandName: 'ban' });
    if (!targetOnlinePlayer) {
        // If player is null (system invocation), validateCommandTarget doesn't send a message.
        // We might need specific handling for system calls if target isn't found.
        if (!player) {
             console.warn(`[BanCommand.execute] System call: Target player '${targetPlayerName}' not found or invalid.`);
        }
        return; // validateCommandTarget already sent a message to the player if applicable
    }

    // Permission checks
    if (invokedBy === 'PlayerCommand' && player) { // Ensure player is not null for permission check
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
        targetOnlinePlayer, // Pass the Player object
        durationMs,
        reason,
        bannedByForRecord,
        isAutoModAction,
        autoModCheckType, // Already camelCase or null
        dependencies
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
            getString('command.ban.kickMessage.duration', { durationDisplay: durationDisplay }),
        ];
        if (config?.discordLink && config.discordLink.trim() !== '' && !config.discordLink.includes('example.com')) { // Check for placeholder
            kickMessageParts.push(getString('command.ban.kickMessage.appeal', { discordLink: config.discordLink }));
        }
        const kickMessage = kickMessageParts.join('\n');

        try {
            // Kick should happen after ban is successfully recorded
            targetOnlinePlayer.kick(kickMessage);
        } catch (e) {
            playerUtils?.debugLog(`[BanCommand.execute WARNING] Failed to kick ${targetOnlinePlayer.nameTag} after ban (may have disconnected): ${e.message}`, issuerName, dependencies);
            // Ban was still applied.
        }

        const successMessage = getString('command.ban.success', { playerName: targetOnlinePlayer.nameTag, durationString: durationDisplay, reason: actualReason });
        if (player) {
            player.sendMessage(successMessage);
            playerUtils.playSoundForEvent(player, "commandSuccess", dependencies);
        } else { // System or AutoMod invocation
            console.log(`[BanCommand.execute] ${successMessage.replace(/§[a-f0-9]/g, '')}`);
        }

        const targetPData = playerDataManager?.getPlayerData(targetOnlinePlayer.id);
        if (config?.notifyOnAdminUtilCommandUsage !== false || (isAutoModAction && config?.notifyOnAutoModAction !== false)) {
            const baseAdminNotifyMsg = getString('command.ban.notify.banned', { bannedBy: actualBannedBy, targetName: targetOnlinePlayer.nameTag, durationDisplay: durationDisplay, reason: actualReason });
            playerUtils?.notifyAdmins(baseAdminNotifyMsg, dependencies, player, targetPData);
        }

        logManager?.addLog({
            adminName: actualBannedBy,
            actionType: 'playerBanned',
            targetName: targetOnlinePlayer.nameTag,
            targetId: targetOnlinePlayer.id,
            duration: durationMs === Infinity ? 'Permanent' : durationString, // Log original duration string for readability
            reason: actualReason,
            isAutoMod: isAutoModAction,
            checkType: autoModCheckType,
        }, dependencies);

    } else {
        const failureMessage = getString('command.ban.failure', { playerName: targetOnlinePlayer.nameTag });
        if (player) {
            player.sendMessage(failureMessage);
            playerUtils.playSoundForEvent(player, "commandError", dependencies);
        } else {
            console.warn(`[BanCommand.execute] ${failureMessage.replace(/§[a-f0-9]/g, '')} (Invoked by ${issuerName})`);
        }
    }
}
