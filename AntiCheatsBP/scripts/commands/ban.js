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
    // Use 'System' if player is null and invokedBy is not detailed enough (e.g. for AutoMod).
    const issuerName = player?.nameTag ?? (invokedBy === 'AutoMod' ? 'AutoMod' : 'System');
    const prefix = config?.prefix ?? '!';

    if (args.length < 1) {
        const usageMessage = getString('command.ban.usage', { prefix: prefix });
        if (player) {
            player.sendMessage(usageMessage);
        } else {
            console.warn(`[BanCommand.execute] System call missing arguments. Usage: ${prefix}${definition.name} ${definition.syntax}`);
            playerUtils?.debugLog('[BanCommand.execute] System call missing target player name.', null, dependencies);
        }
        return;
    }

    const targetPlayerName = args[0];
    const durationString = args[1] || 'perm'; // Default to 'perm' if duration not specified

    let reason;
    if (invokedBy === 'AutoMod') {
        // AutoMod reason might be more structured or come from rule parameters.
        // For now, using a generic template if specific reason isn't passed in args[2+].
        reason = args.length > 2 ? args.slice(2).join(' ') : getString('command.ban.automodReason', { checkType: autoModCheckType || 'violations'});
    } else {
        reason = args.slice(2).join(' ') || getString('command.ban.defaultReason') || 'Banned by an administrator.';
    }

    // Find player can find online or offline if data exists, but for banning, typically target online.
    // However, the command should support banning offline players if their data exists.
    // For now, let's assume findOnlinePlayerOrOfflineData approach.
    // const targetPlayer = playerUtils?.findPlayer(targetPlayerName, true); // true for allow offline if data exists
    // For simplicity and to ensure we can kick, let's first try finding online player.
    const targetOnlinePlayer = playerUtils?.findPlayer(targetPlayerName); // Finds online player

    if (!targetOnlinePlayer) {
        // TODO: Implement offline banning if desired, by fetching/creating pData for an offline player.
        // For now, require player to be findable (usually online, or if findOfflineData is implemented).
        const message = getString('command.ban.playerNotFound', { playerName: targetPlayerName });
        if (player) {
            player.sendMessage(message);
        } else {
            console.warn(`[BanCommand.execute] Target player '${targetPlayerName}' not found (Invoked by ${issuerName}).`);
        }
        return;
    }

    if (player && targetOnlinePlayer.id === player.id) {
        player.sendMessage(getString('command.ban.cannotBanSelf'));
        return;
    }

    // Permission checks
    if (invokedBy === 'PlayerCommand' && player) {
        const targetPermissionLevel = rankManager?.getPlayerPermissionLevel(targetOnlinePlayer, dependencies);
        const issuerPermissionLevel = rankManager?.getPlayerPermissionLevel(player, dependencies);
        const ownerPerm = dependencies.permissionLevels?.owner ?? 0; // Use loaded permission levels
        const adminPerm = dependencies.permissionLevels?.admin ?? 1;

        // Admins cannot ban Owners. Only Owners can ban Admins (if not themselves).
        if (typeof targetPermissionLevel === 'number' && typeof issuerPermissionLevel === 'number') {
            if (targetPermissionLevel <= ownerPerm && issuerPermissionLevel > ownerPerm) { // Target is Owner, issuer is not Owner
                 player.sendMessage(getString('command.ban.permissionDeniedOwner'));
                 return;
            }
            if (targetPermissionLevel <= adminPerm && targetPermissionLevel > ownerPerm && /* Target is Admin but not Owner */
                issuerPermissionLevel > ownerPerm /* Issuer is not Owner */ ) {
                player.sendMessage(getString('command.ban.permissionDeniedAdminOwner')); // More generic "cannot ban admin/owner"
                return;
            }
            if (targetPermissionLevel <= ownerPerm && issuerPermissionLevel <= ownerPerm && player.id !== targetOnlinePlayer.id) {
                // This case might be complex: owner trying to ban another owner.
                // For safety, one might disallow this via command and require manual DB edit or specific "super owner" logic.
                // player.sendMessage(getString('command.ban.ownerCannotBanOwner'));
                // return;
                // Allowing for now, assuming owner vs owner is a rare case handled by server policy.
            }
        } else {
            playerUtils?.debugLog(`[BanCommand.execute WARNING] Could not determine permission levels for ban check between ${issuerName} and ${targetOnlinePlayer.nameTag}. Proceeding with caution.`, issuerName, dependencies);
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
