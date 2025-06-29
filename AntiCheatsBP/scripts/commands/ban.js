/**
 * @file Defines the !ban command for administrators to ban players.
 */
import { permissionLevels } from '../core/rankManager.js';

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: 'ban',
    syntax: '!ban <playername> [duration] [reason]',
    description: 'Bans a player for a specified duration (e.g., 7d, 2h, perm).',
    permissionLevel: permissionLevels.admin,
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
    const { config, playerUtils, playerDataManager, logManager, permissionLevels: depPermLevels, rankManager } = dependencies;

    if (args.length < 1) {
        const usageMessage = `§cUsage: ${config.prefix}ban <playername> [duration] [reason]`;
        if (player) {
            player.sendMessage(usageMessage);
        } else {
            console.warn('[BanCommand] Ban command called by system without sufficient arguments.');
            playerUtils.debugLog('[BanCommand] System call missing target player name.', null, dependencies);
        }
        return;
    }

    const targetPlayerName = args[0];
    const durationString = args[1] || 'perm';

    let reason;
    if (invokedBy === 'AutoMod') {
        reason = args.length > 2 ? args.slice(2).join(' ') : `Banned due to ${autoModCheckType || 'violations'}.`;
    } else {
        reason = args.slice(2).join(' ') || 'Banned by an administrator.';
    }

    const foundPlayer = playerUtils.findPlayer(targetPlayerName);

    if (!foundPlayer) {
        const message = `§cPlayer '${targetPlayerName}' not found.`;
        if (player) {
            player.sendMessage(message);
        } else {
            console.warn(`[BanCommand] ${message} (Invoked by ${invokedBy})`);
        }
        return;
    }

    if (player && foundPlayer.id === player.id) {
        player.sendMessage('§cYou cannot ban yourself.');
        return;
    }

    if (invokedBy === 'PlayerCommand' && player) {
        const targetPermissionLevel = rankManager.getPlayerPermissionLevel(foundPlayer, dependencies);
        const issuerPermissionLevel = rankManager.getPlayerPermissionLevel(player, dependencies);

        if (targetPermissionLevel <= depPermLevels.admin && issuerPermissionLevel > depPermLevels.owner) {
            player.sendMessage('§cYou do not have permission to ban an admin or owner.');
            return;
        }
        if (targetPermissionLevel <= depPermLevels.owner && issuerPermissionLevel > depPermLevels.owner) {
            player.sendMessage('§cYou do not have permission to ban an owner.');
            return;
        }
        if (targetPermissionLevel === depPermLevels.owner && issuerPermissionLevel === depPermLevels.owner && player.id !== foundPlayer.id) {
            player.sendMessage('§cOwners cannot ban other owners through this command.');
            return;
        }
    }

    const durationMs = playerUtils.parseDuration(durationString);
    if (durationMs === null || (durationMs <= 0 && durationMs !== Infinity)) {
        const message = '§cInvalid duration format. Use: 7d, 2h, 30m, or perm.';
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
        const banInfo = playerDataManager.getBanInfo(foundPlayer, dependencies);
        const actualReason = banInfo ? banInfo.reason : reason;
        const actualBannedBy = banInfo ? banInfo.bannedBy : bannedBy;
        const unbanTime = banInfo ? banInfo.unbanTime : (Date.now() + durationMs);

        const durationDisplay = durationMs === Infinity ? 'Permanent' : `Expires: ${new Date(unbanTime).toLocaleString()}`;

        const kickMessageParts = [
            '§cYou have been banned from the server.',
            `§eReason: §f${actualReason}`,
            `§eBanned by: §f${actualBannedBy}`,
            `§eDuration: §f${durationDisplay}`,
        ];
        if (config.discordLink && config.discordLink.trim() !== '' && config.discordLink !== 'https://discord.gg/example') {
            kickMessageParts.push(`§eAppeal on Discord: §9${config.discordLink}`);
        }
        const kickMessage = kickMessageParts.join('\n');

        try {
            foundPlayer.kick(kickMessage);
        } catch (e) {
            playerUtils.debugLog(`[BanCommand] Attempted to kick banned player ${foundPlayer.nameTag} but they might have already disconnected: ${e.message}`, player ? player.nameTag : 'System', dependencies);
        }

        const successMessage = `§aSuccessfully banned ${foundPlayer.nameTag} for ${durationString}. Reason: ${actualReason}`;
        if (player) {
            player.sendMessage(successMessage);
        } else {
            console.log(successMessage.replace(/§[a-f0-9]/g, ''));
        }

        if (playerUtils.notifyAdmins) {
            const targetPData = playerDataManager.getPlayerData(foundPlayer.id);
            const adminNotifyMsg = `§7[Admin] §e${actualBannedBy}§7 banned §e${foundPlayer.nameTag}§7 for ${durationString}. Reason: ${actualReason}`;
            playerUtils.notifyAdmins(adminNotifyMsg, dependencies, player, targetPData);
        }
        if (logManager?.addLog) {
            logManager.addLog({
                timestamp: Date.now(),
                adminName: actualBannedBy,
                actionType: 'ban',
                targetName: foundPlayer.nameTag,
                duration: durationString,
                reason: actualReason,
                isAutoMod: isAutoModAction,
                checkType: autoModCheckType,
            }, dependencies);
        }
    } else {
        const failureMessage = `§cFailed to ban ${foundPlayer.nameTag}. They might already be banned or an error occurred.`;
        if (player) {
            player.sendMessage(failureMessage);
        } else {
            console.warn(failureMessage.replace(/§[a-f0-9]/g, ''));
        }
    }
}
