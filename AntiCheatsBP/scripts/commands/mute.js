/**
 * @file Defines the !mute command for administrators to prevent a player from sending chat messages.
 */
import { permissionLevels } from '../core/rankManager.js';

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: 'mute',
    syntax: '!mute <playername> [duration] [reason]',
    description: 'Mutes a player, preventing them from sending chat messages.',
    permissionLevel: permissionLevels.admin,
    enabled: true,
};

/**
 * Executes the !mute command.
 * Mutes a target player for a specified duration with an optional reason.
 * Can also be invoked by AutoMod.
 * @async
 * @param {import('@minecraft/server').Player | null} player - The player issuing the command, or null if system-invoked.
 * @param {string[]} args - Command arguments: <playername> [duration] [reason].
 * @param {import('../types.js').CommandDependencies} dependencies - Object containing dependencies.
 * @param {string} [invokedBy='PlayerCommand'] - How the command was invoked (e.g., 'PlayerCommand', 'AutoMod').
 * @param {boolean} [isAutoModAction=false] - Whether this mute is a direct result of an AutoMod action.
 * @param {string|null} [autoModCheckType=null] - If AutoMod, the checkType that triggered it.
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

    if (args.length < 1) {
        const usageMessage = getString('command.mute.usage', { prefix: config.prefix });
        if (player) {
            player.sendMessage(usageMessage);
        } else {
            console.warn(getString('command.mute.systemNoArgs'));
            playerUtils.debugLog(getString('command.mute.systemNoTarget'), null, dependencies);
        }
        return;
    }

    const targetPlayerName = args[0];
    const defaultDuration = invokedBy === 'AutoMod' ? (config.automodDefaultMuteDuration || '10m') : (config.manualMuteDefaultDuration || '1h');
    const durationString = args[1] || defaultDuration;

    let reason;
    if (invokedBy === 'AutoMod' && args.length <= 2) {
        reason = getString('command.mute.automodReason', { checkType: autoModCheckType || 'violations' });
    } else {
        reason = args.slice(2).join(' ') || (invokedBy === 'AutoMod' ? getString('command.mute.automodReason', { checkType: autoModCheckType || 'violations' }) : getString('command.mute.defaultReason'));
    }

    const foundPlayer = playerUtils.findPlayer(targetPlayerName);

    if (!foundPlayer) {
        const message = getString('command.mute.playerNotFound', { playerName: targetPlayerName });
        if (player) {
            player.sendMessage(message);
        } else {
            console.warn(`[MuteCommand] ${message} (Invoked by ${invokedBy})`);
        }
        return;
    }

    if (player && foundPlayer.id === player.id) {
        player.sendMessage(getString('command.mute.cannotSelf'));
        return;
    }

    if (invokedBy === 'PlayerCommand' && player) {
        const targetPermissionLevel = rankManager.getPlayerPermissionLevel(foundPlayer, dependencies);
        const issuerPermissionLevel = rankManager.getPlayerPermissionLevel(player, dependencies);
        if (targetPermissionLevel <= issuerPermissionLevel && player.id !== foundPlayer.id && targetPermissionLevel <= depPermLevels.admin) {
            player.sendMessage(getString('command.mute.noPermission'));
            return;
        }
    }

    const durationMs = playerUtils.parseDuration(durationString);
    if (durationMs === null || (durationMs <= 0 && durationMs !== Infinity)) {
        const message = getString('command.mute.invalidDuration', { defaultDuration: defaultDuration });
        if (player) {
            player.sendMessage(message);
        } else {
            console.warn(`[MuteCommand] ${message} (Invoked by ${invokedBy})`);
        }
        return;
    }

    try {
        const mutedBy = invokedBy === 'AutoMod' ? 'AutoMod' : (player ? player.nameTag : 'System');
        const muteAdded = playerDataManager.addMute(
            foundPlayer,
            durationMs,
            reason,
            mutedBy,
            isAutoModAction,
            autoModCheckType,
            dependencies
        );

        if (muteAdded) {
            const muteInfo = playerDataManager.getMuteInfo(foundPlayer, dependencies);
            const actualReason = muteInfo ? muteInfo.reason : reason;
            const actualMutedBy = muteInfo ? muteInfo.mutedBy : mutedBy;
            const durationText = durationMs === Infinity ? getString('ban.duration.permanent') : durationString;

            let targetNotificationMessage = durationMs === Infinity ?
                getString('command.mute.targetNotification.permanent', { reason: actualReason }) :
                getString('command.mute.targetNotification.timed', { durationString: durationString, reason: actualReason });
            try {
                foundPlayer.onScreenDisplay.setActionBar(targetNotificationMessage);
            } catch (e) {
                if (config.enableDebugLogging && playerUtils.debugLog) {
                    playerUtils.debugLog(`Failed to set action bar for muted player ${foundPlayer.nameTag}: ${e.message}`, (player ? player.nameTag : 'System'), dependencies);
                }
            }

            const successMessage = getString('command.mute.success', { playerName: foundPlayer.nameTag, durationText: durationText, reason: actualReason });
            if (player) {
                player.sendMessage(successMessage);
            } else {
                console.log(successMessage.replace(/§[a-f0-9]/g, ''));
            }

            if (playerUtils.notifyAdmins) {
                const targetPData = playerDataManager.getPlayerData(foundPlayer.id);
                const baseAdminNotifyMsg = getString('command.mute.notify.muted', { targetName: foundPlayer.nameTag, mutedBy: actualMutedBy, duration: durationText, reason: actualReason });
                playerUtils.notifyAdmins(baseAdminNotifyMsg, dependencies, player, targetPData);
            }
            if (logManager?.addLog) {
                logManager.addLog({
                    timestamp: Date.now(),
                    adminName: actualMutedBy,
                    actionType: 'mute',
                    targetName: foundPlayer.nameTag,
                    duration: durationString,
                    reason: actualReason,
                    isAutoMod: isAutoModAction,
                    checkType: autoModCheckType,
                }, dependencies);
            }
        } else {
            const failureMessage = getString('command.mute.failure', { playerName: foundPlayer.nameTag });
            if (player) {
                player.sendMessage(failureMessage);
            } else {
                console.warn(failureMessage.replace(/§[a-f0-9]/g, ''));
            }
        }
    } catch (e) {
        const errorMessage = getString('command.mute.error.generic', { playerName: foundPlayer.nameTag, errorMessage: e.message });
        if (player) {
            player.sendMessage(errorMessage);
        } else {
            console.error(errorMessage.replace(/§[a-f0-9]/g, ''));
        }
        if (config.enableDebugLogging && playerUtils.debugLog) {
            playerUtils.debugLog(`Unexpected error during mute command for ${foundPlayer.nameTag} by ${player ? player.nameTag : invokedBy}: ${e.stack || e}`, (player ? player.nameTag : 'System'), dependencies);
        }
        logManager.addLog({
            actionType: 'error',
            context: 'muteCommand.execution',
            details: `Failed to mute ${foundPlayer.nameTag}: ${e.stack || e}`,
        }, dependencies);
    }
}
