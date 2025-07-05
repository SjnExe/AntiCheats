/**
 * @file Defines the !ban command for administrators to ban players.
 */
import { permissionLevels } from '../core/rankManager.js';

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: 'ban', // Already camelCase
    syntax: '!ban <playername> [duration] [reason]',
    description: 'Bans a player for a specified duration (e.g., 7d, 2h, perm).',
    permissionLevel: permissionLevels.admin, // Assuming permissionLevels is correctly populated
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
 * @param {string|null} [autoModCheckType=null] - If by AutoMod, the checkType (camelCase) that triggered it.
 * @returns {Promise<void>}
 */
export async function execute(
    player,
    args,
    dependencies,
    invokedBy = 'PlayerCommand',
    isAutoModAction = false,
    autoModCheckType = null // Should be camelCase if provided
) {
    const { config, playerUtils, playerDataManager, logManager, permissionLevels: depPermLevels, rankManager, getString } = dependencies;
    const issuerName = player?.nameTag ?? invokedBy; // Use invokedBy if player is null (system call)

    if (args.length < 1) {
        const usageMessage = getString('command.ban.usage', { prefix: config?.prefix });
        if (player) {
            player.sendMessage(usageMessage);
        } else {
            console.warn(`[BanCommand.execute] System call missing arguments. Usage: ${usageMessage}`);
            playerUtils?.debugLog('[BanCommand.execute] System call missing target player name.', null, dependencies);
        }
        return;
    }

    const targetPlayerName = args[0];
    const durationString = args[1] || 'perm'; // Default to 'perm'

    let reason;
    if (invokedBy === 'AutoMod') {
        reason = args.length > 2 ? args.slice(2).join(' ') : `Banned due to ${autoModCheckType || 'violations'}.`;
    } else {
        reason = args.slice(2).join(' ') || getString('command.ban.defaultReason') || 'Banned by an administrator.';
    }

    const foundPlayer = playerUtils?.findPlayer(targetPlayerName);

    if (!foundPlayer) {
        const message = getString('command.ban.playerNotFound', { playerName: targetPlayerName });
        if (player) {
            player.sendMessage(message);
        } else {
            console.warn(`[BanCommand.execute] Target ${targetPlayerName} not found (Invoked by ${invokedBy}).`);
        }
        return;
    }

    if (player && foundPlayer.id === player.id) {
        player.sendMessage(getString('command.ban.cannotBanSelf'));
        return;
    }

    // Permission checks
    if (invokedBy === 'PlayerCommand' && player) {
        const targetPermissionLevel = rankManager?.getPlayerPermissionLevel(foundPlayer, dependencies);
        const issuerPermissionLevel = rankManager?.getPlayerPermissionLevel(player, dependencies);

        if (targetPermissionLevel <= depPermLevels.admin && issuerPermissionLevel > depPermLevels.owner) {
            player.sendMessage(getString('command.ban.permissionDeniedAdminOwner'));
            return;
        }
        if (targetPermissionLevel <= depPermLevels.owner && issuerPermissionLevel > depPermLevels.owner) {
            player.sendMessage(getString('command.ban.permissionDeniedOwner'));
            return;
        }
        // Prevent owner from banning owner via this command as a safeguard, though permission system might already handle.
        if (targetPermissionLevel === depPermLevels.owner && issuerPermissionLevel === depPermLevels.owner && player.id !== foundPlayer.id) {
            player.sendMessage(getString('command.ban.ownerCannotBanOwner'));
            return;
        }
    }

    const durationMs = playerUtils?.parseDuration(durationString);
    if (durationMs === null || (durationMs <= 0 && durationMs !== Infinity)) {
        const message = getString('command.ban.invalidDuration');
        if (player) {
            player.sendMessage(message);
        } else {
            console.warn(`[BanCommand.execute] Invalid duration '${durationString}' (Invoked by ${invokedBy}).`);
        }
        return;
    }

    const bannedByForRecord = invokedBy === 'AutoMod' ? 'AutoMod' : (player?.nameTag ?? 'System');

    const banAdded = await playerDataManager?.addBan( // Ensure await if addBan can be async
        foundPlayer,
        durationMs,
        reason,
        bannedByForRecord,
        isAutoModAction,
        autoModCheckType, // Already expected to be camelCase or null
        dependencies
    );

    if (banAdded) {
        const banInfo = playerDataManager?.getBanInfo(foundPlayer, dependencies); // Re-fetch to get the stored info
        const actualReason = banInfo?.reason ?? reason;
        const actualBannedBy = banInfo?.bannedBy ?? bannedByForRecord;
        const unbanTime = banInfo?.unbanTime ?? (Date.now() + durationMs); // Fallback, though banInfo should exist

        const durationDisplay = durationMs === Infinity ? getString('ban.duration.permanent') : getString('ban.duration.expires', { expiryDate: new Date(unbanTime).toLocaleString() });

        const kickMessageParts = [
            getString('command.ban.kickMessage.header'),
            getString('command.ban.kickMessage.reason', { reason: actualReason }),
            getString('command.ban.kickMessage.bannedBy', { bannedBy: actualBannedBy }),
            getString('command.ban.kickMessage.duration', { durationDisplay: durationDisplay }),
        ];
        if (config?.discordLink && config.discordLink.trim() !== '' && config.discordLink !== 'https://discord.gg/example') {
            kickMessageParts.push(getString('command.ban.kickMessage.appeal', { discordLink: config.discordLink }));
        }
        const kickMessage = kickMessageParts.join('\n');

        try {
            await foundPlayer.kick(kickMessage);
        } catch (e) {
            playerUtils?.debugLog(`[BanCommand.execute] Failed to kick ${foundPlayer.nameTag} (may have disconnected): ${e.message}`, issuerName, dependencies);
        }

        const successMessage = getString('command.ban.success', { playerName: foundPlayer.nameTag, durationString: durationDisplay, reason: actualReason });
        if (player) {
            player.sendMessage(successMessage);
        } else {
            console.log(`[BanCommand.execute] ${successMessage.replace(/§[a-f0-9]/g, '')}`); // Log for system/AutoMod
        }

        const targetPData = playerDataManager?.getPlayerData(foundPlayer.id); // For admin notification context
        // Standardized message, relying on notifyAdmins for prefix and potential admin player context
        const baseAdminNotifyMsg = getString('command.ban.notify.banned', { bannedBy: actualBannedBy, targetName: foundPlayer.nameTag, durationDisplay: durationDisplay, reason: actualReason });
        playerUtils?.notifyAdmins(baseAdminNotifyMsg, dependencies, player, targetPData);

        logManager?.addLog({
            timestamp: Date.now(), // Can be omitted if addLog defaults it
            adminName: actualBannedBy,
            actionType: 'playerBanned', // Standardized camelCase
            targetName: foundPlayer.nameTag,
            targetId: foundPlayer.id, // Add targetId
            duration: durationString, // Store original string for readability
            reason: actualReason,
            isAutoMod: isAutoModAction,
            checkType: autoModCheckType, // Will be null if not automod
        }, dependencies);
    } else {
        const failureMessage = getString('command.ban.failure', { playerName: foundPlayer.nameTag });
        if (player) {
            player.sendMessage(failureMessage);
        } else {
            console.warn(`[BanCommand.execute] ${failureMessage.replace(/§[a-f0-9]/g, '')} (Invoked by ${invokedBy})`);
            if (player) playerUtils.playSoundForEvent(player, "commandError", dependencies);
        }
        // If banAdded was true, it implies success from player's perspective of command execution
        if (player && banAdded) playerUtils.playSoundForEvent(player, "commandSuccess", dependencies);

    } catch (e) { // General catch for unexpected errors in the command's flow
        const genericErrorMsg = getString('command.ban.error.generic', { errorMessage: e.message });
        if (player) {
            player.sendMessage(genericErrorMsg);
            playerUtils.playSoundForEvent(player, "commandError", dependencies);
        } else {
            console.error(`[BanCommand.execute] System call error: ${genericErrorMsg.replace(/§[a-f0-9]/g, '')} - ${e.stack || e}`);
        }
        logManager?.addLog({
            actionType: 'errorBanCommand',
            context: 'ban.execute.unexpected',
            adminName: issuerName,
            details: {
                targetPlayerName: targetPlayerName,
                errorMessage: e.message,
                stack: e.stack
            }
        }, dependencies);
    }
}
