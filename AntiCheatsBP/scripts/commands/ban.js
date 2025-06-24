/**
 * @file Defines the !ban command for administrators to ban players.
 */
import { permissionLevels } from '../core/rankManager.js'; // For command definition
// No direct mc import needed if types are from JSDoc and dependencies

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: 'ban',
    syntax: '!ban <playername> [duration] [reason]',
    description: 'Bans a player for a specified duration (e.g., 7d, 2h, perm).',
    permissionLevel: permissionLevels.admin, // Assuming permissionLevels.admin is defined and exported by rankManager
    enabled: true,
};

/**
 * Executes the ban command.
 * @async
 * @param {import('@minecraft/server').Player | null} player - The player issuing the command, or null if system-invoked.
 * @param {string[]} args - The command arguments: <playername> [duration] [reason].
 * @param {import('../types.js').CommandDependencies} dependencies - Command dependencies.
 * @param {string} [invokedBy='PlayerCommand'] - How the command was invoked (e.g., 'PlayerCommand', 'AutoMod').
 * @param {boolean} [isAutoModAction=false] - Whether this ban is a direct result of an AutoMod action.
 * @param {string|null} [autoModCheckType=null] - If isAutoModAction, the checkType that triggered it.
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
    const { config, playerUtils, playerDataManager, logManager, permissionLevels: depPermLevels, rankManager, getString } = dependencies;

    if (args.length < 1) {
        const usageMessage = `§cUsage: ${config.prefix}ban <playername> [duration] [reason]`;
        if (player) {
            player.sendMessage(usageMessage);
        } else {
            // System call without enough args
            console.warn('[BanCommand] Ban command called by system without sufficient arguments.');
            playerUtils.debugLog('[BanCommand] System call missing target player name.', null, dependencies);
        }
        return;
    }

    const targetPlayerName = args[0];
    const durationString = args[1] || 'perm'; // Default to permanent if duration not specified

    let reason;
    if (invokedBy === 'AutoMod') {
        reason = args.length > 2 ? args.slice(2).join(' ') : getString('ban.automodReasonDefault', { checkType: autoModCheckType || 'violations' });
    } else {
        reason = args.slice(2).join(' ') || getString('ban.adminReasonDefault', 'Banned by an administrator.');
    }

    const foundPlayer = playerUtils.findPlayer(targetPlayerName);

    if (!foundPlayer) {
        const message = getString('common.error.playerNotFound', { playerName: targetPlayerName });
        if (player) {
            player.sendMessage(message);
        } else {
            console.warn(`[BanCommand] ${message} (Invoked by ${invokedBy})`);
        }
        return;
    }

    if (player && foundPlayer.id === player.id) {
        player.sendMessage(getString('ban.error.cannotBanSelf'));
        return;
    }

    // Permission check if invoked by a player
    if (invokedBy === 'PlayerCommand' && player) {
        const targetPermissionLevel = rankManager.getPlayerPermissionLevel(foundPlayer, dependencies);
        const issuerPermissionLevel = rankManager.getPlayerPermissionLevel(player, dependencies);

        // Prevent non-owners from banning admins/owners, and owners from banning other owners directly via command
        if (targetPermissionLevel <= depPermLevels.admin && issuerPermissionLevel > depPermLevels.owner) {
            player.sendMessage(getString('commands.generic.permissionDeniedTarget', { targetRole: 'admin/owner' }));
            return;
        }
        if (targetPermissionLevel <= depPermLevels.owner && issuerPermissionLevel > depPermLevels.owner) { // Stricter for owner
            player.sendMessage(getString('commands.generic.permissionDeniedTarget', { targetRole: 'owner' }));
            return;
        }
        // A specific rule for owner vs owner, if desired (often handled by above checks already)
        if (targetPermissionLevel === depPermLevels.owner && issuerPermissionLevel === depPermLevels.owner && player.id !== foundPlayer.id) {
            player.sendMessage(getString('ban.error.ownerCannotBanOwner'));
            return;
        }
    }

    const durationMs = playerUtils.parseDuration(durationString);
    if (durationMs === null || (durationMs <= 0 && durationMs !== Infinity)) {
        const message = getString('common.error.invalidDurationFormat', { example: '7d, 2h, 30m, or perm' });
        if (player) {
            player.sendMessage(message);
        } else {
            console.warn(`[BanCommand] ${message} (Invoked by ${invokedBy})`);
        }
        return;
    }

    const bannedBy = invokedBy === 'AutoMod' ? 'AutoMod' : (player ? player.nameTag : 'System');

    const banAdded = playerDataManager.addBan(
        foundPlayer,
        durationMs,
        reason,
        bannedBy,
        isAutoModAction,
        autoModCheckType,
        dependencies
    );

    if (banAdded) {
        const banInfo = playerDataManager.getBanInfo(foundPlayer, dependencies); // Re-fetch to get potentially processed info
        const actualReason = banInfo ? banInfo.reason : reason;
        const actualBannedBy = banInfo ? banInfo.bannedBy : bannedBy;
        const unbanTime = banInfo ? banInfo.unbanTime : (Date.now() + durationMs); // Ensure unbanTime is defined

        const durationDisplay = durationMs === Infinity ? getString('ban.duration.permanent') : getString('ban.duration.expires', { expiryDate: new Date(unbanTime).toLocaleString() });

        const kickMessageParts = [
            getString('ban.kickMessage.header'),
            getString('ban.kickMessage.reason', { reason: actualReason }),
            getString('ban.kickMessage.bannedBy', { adminName: actualBannedBy }),
            durationDisplay,
        ];
        if (config.discordLink && config.discordLink.trim() !== '' && config.discordLink !== 'https://discord.gg/example') {
            kickMessageParts.push(getString('ban.kickMessage.discord', { discordLink: config.discordLink }));
        }
        const kickMessage = kickMessageParts.join('\n');

        try {
            foundPlayer.kick(kickMessage);
        } catch (e) {
            playerUtils.debugLog(`[BanCommand] Attempted to kick banned player ${foundPlayer.nameTag} but they might have already disconnected: ${e.message}`, player ? player.nameTag : 'System', dependencies);
        }

        const successMessage = getString('ban.success', { playerName: foundPlayer.nameTag, duration: durationString, reason: actualReason });
        if (player) {
            player.sendMessage(successMessage);
        } else {
            console.log(successMessage.replace(/§[a-f0-9]/g, '')); // Strip color codes for console
        }

        if (playerUtils.notifyAdmins) {
            const targetPData = playerDataManager.getPlayerData(foundPlayer.id); // For watched status context
            const adminNotifyMsg = getString('ban.adminNotification', {
                targetName: foundPlayer.nameTag,
                adminName: actualBannedBy,
                duration: durationString,
                reason: actualReason,
            });
            playerUtils.notifyAdmins(adminNotifyMsg, dependencies, player, targetPData);
        }
        if (logManager?.addLog) {
            logManager.addLog({
                timestamp: Date.now(),
                adminName: actualBannedBy,
                actionType: 'ban', // Standardized actionType
                targetName: foundPlayer.nameTag,
                duration: durationString,
                reason: actualReason,
                isAutoMod: isAutoModAction,
                checkType: autoModCheckType,
            }, dependencies);
        }
    } else {
        const failureMessage = getString('ban.error.failedToBan', { playerName: foundPlayer.nameTag });
        if (player) {
            player.sendMessage(failureMessage);
        } else {
            console.warn(failureMessage.replace(/§[a-f0-9]/g, ''));
        }
    }
}
