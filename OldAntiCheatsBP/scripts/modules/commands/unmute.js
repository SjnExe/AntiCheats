/** @type {import('../../types.js').CommandDefinition} */
export const definition = {
    name: 'unmute',
    syntax: '<playername>',
    description: 'Unmutes a player, allowing them to chat.',
    permissionLevel: 1, // admin
};

/**
 * Executes the unmute command.
 * @param {import('@minecraft/server').Player} player
 * @param {string[]} args
 * @param {import('../../types.js').Dependencies} dependencies
 * @param {string} [invokedBy]
 * @param {boolean} [isAutoModAction]
 * @param {string | null} [autoModCheckType]
 * @param {string | null} [programmaticUnmuteReason]
 */
export function execute(
    player,
    args,
    dependencies,
    invokedBy = 'PlayerCommand',
    isAutoModAction = false,
    autoModCheckType = null,
    programmaticUnmuteReason = null,
) {
    const { config, playerUtils, playerDataManager, logManager, getString } = dependencies;
    const issuerName = player?.nameTag ?? (invokedBy === 'AutoMod' ? 'AutoMod' : 'System');
    const prefix = config?.prefix ?? '!';

    const targetPlayerName = args[0];

    if (!targetPlayerName) {
        const usageMessage = getString('command.unmute.usage', { prefix });
        if (player) {
            player.sendMessage(usageMessage);
        } else {
            console.warn(`[UnmuteCommand.execute] System call missing target player name. Usage: ${prefix}${definition.name} ${definition.syntax}`);
        }
        return;
    }

    let targetOnlinePlayer;

    if (invokedBy === 'PlayerCommand' && player) {
        targetOnlinePlayer = playerUtils.validateCommandTarget(player, targetPlayerName, dependencies, { commandName: 'unmute', requireOnline: true });
        if (!targetOnlinePlayer) {
            return;
        }
    } else {
        targetOnlinePlayer = playerUtils.findPlayer(targetPlayerName);
        if (!targetOnlinePlayer || !targetOnlinePlayer.isValid()) {
            console.warn(`[UnmuteCommand.execute] ${issuerName} call: Target player '${targetPlayerName}' not found online. Offline unmute may require playerDataManager enhancements.`);
            if (invokedBy !== 'PlayerCommand') {
                logManager?.addLog({
                    actionType: 'error.cmd.unmute.targetOffline',
                    context: 'UnmuteCommand.execute',
                    adminName: issuerName,
                    targetName: targetPlayerName,
                    details: { errorCode: 'CMD_TARGET_OFFLINE', message: `${issuerName} attempt to unmute offline player.` },
                }, dependencies);
            }
            return;
        }
    }

    const targetPData = playerDataManager?.getPlayerData(targetOnlinePlayer.id);

    if (!targetPData) {
        const failureMsg = `${getString('command.unmute.failure', { playerName: targetOnlinePlayer.nameTag }) } (No data)`;
        if (player && player.isValid()) {
            player.sendMessage(failureMsg);
        } else {
            console.warn(`[UnmuteCommand.execute] ${issuerName} call: ${failureMsg}`);
        }
        playerUtils?.debugLog(`[UnmuteCommand] No pData found for online player ${targetOnlinePlayer.nameTag}. Cannot verify mute status or unmute.`, issuerName, dependencies);
        return;
    }

    const muteInfo = targetPData.muteInfo;

    if (!muteInfo) {
        const notMutedMsg = getString('command.unmute.notMuted', { playerName: targetOnlinePlayer.nameTag });
        if (player) {
            player.sendMessage(notMutedMsg);
        } else {
            // For system calls, this might be normal if a race condition occurred or state changed.
            playerUtils?.debugLog(`[UnmuteCommand] ${issuerName} call: Target ${targetOnlinePlayer.nameTag} was not muted.`, null, dependencies);
        }
        return;
    }

    const wasPreviouslyAutoModMute = muteInfo.isAutoMod; // Capture before removing
    const previousAutoModCheckType = muteInfo.triggeringCheckType; // Capture before removing

    const unmuted = playerDataManager?.removeMute(targetOnlinePlayer, dependencies);

    if (unmuted) {
        targetOnlinePlayer.sendMessage(getString('command.unmute.targetNotification'));

        const successMessage = getString('command.unmute.success', { playerName: targetOnlinePlayer.nameTag });
        if (player) {
            player.sendMessage(successMessage);
            playerUtils?.playSoundForEvent(player, 'commandSuccess', dependencies);
        }

        const logDetails = programmaticUnmuteReason
            ? `Unmuted by ${issuerName}. System Reason: ${programmaticUnmuteReason}. Previous reason: ${muteInfo.reason}`
            : `Unmuted by ${issuerName}. Previous reason: ${muteInfo.reason}`;

        logManager?.addLog({
            adminName: issuerName,
            actionType: 'playerUnmuted',
            targetName: targetOnlinePlayer.nameTag,
            targetId: targetOnlinePlayer.id,
            details: logDetails,
            isAutoMod: isAutoModAction, // If the unmute action itself is by AutoMod
            checkType: autoModCheckType, // Context for why AutoMod unmuted
        }, dependencies);

        if (wasPreviouslyAutoModMute && previousAutoModCheckType && config?.unmuteClearsAutomodFlagsForCheckType) {
            playerDataManager.clearFlagsForCheckType(targetOnlinePlayer, previousAutoModCheckType, dependencies);
            const flagsClearedMsg = getString('command.unmute.flagsCleared', { checkType: previousAutoModCheckType, playerName: targetOnlinePlayer.nameTag });
            if (player) {
                player.sendMessage(flagsClearedMsg);
            } else {
                playerUtils.debugLog(flagsClearedMsg, null, dependencies);
            }

            if (config?.notifyOnAdminUtilCommandUsage !== false || (isAutoModAction && config?.notifyOnAutoModAction !== false)) {
                const notifyMsgCleared = getString('command.unmute.notify.flagsCleared', { adminName: issuerName, targetName: targetOnlinePlayer.nameTag, checkType: previousAutoModCheckType });
                playerUtils?.notifyAdmins(notifyMsgCleared, dependencies, player, targetPData);
            }
        }

        if (config?.notifyOnAdminUtilCommandUsage !== false && invokedBy === 'PlayerCommand') {
            const notifyMsg = getString('command.unmute.notify.unmuted', { adminName: issuerName, targetName: targetOnlinePlayer.nameTag });
            playerUtils?.notifyAdmins(notifyMsg, dependencies, player, targetPData);
        } else if (isAutoModAction && config?.notifyOnAutoModAction !== false) {
            const notifyMsg = getString('command.unmute.notify.unmuted', { adminName: issuerName, targetName: targetOnlinePlayer.nameTag });
            playerUtils?.notifyAdmins(notifyMsg, dependencies, null, targetPData);
        }
    } else {
        const failureMessage = getString('command.unmute.failure', { playerName: targetOnlinePlayer.nameTag });
        if (player) {
            player.sendMessage(failureMessage);
            playerUtils?.playSoundForEvent(player, 'commandError', dependencies);
        } else {
            console.warn(`[UnmuteCommand.execute] ${issuerName} call: ${failureMessage.replace(/§[a-f0-9lr]/g, '')}`);
        }
    }
}
