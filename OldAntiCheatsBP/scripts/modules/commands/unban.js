/** @type {import('../../types.js').CommandDefinition} */
export const definition = {
    name: 'unban',
    syntax: '<playername>',
    description: 'Unbans a player.',
    permissionLevel: 1, // admin
};

/**
 * Executes the unban command.
 * @param {import('@minecraft/server').Player} player
 * @param {string[]} args
 * @param {import('../../types.js').Dependencies} dependencies
 * @param {string} [invokedBy]
 * @param {boolean} [isAutoModAction]
 * @param {string | null} [autoModCheckType]
 * @param {string | null} [programmaticUnbanReason]
 */
export function execute(
    player,
    args,
    dependencies,
    invokedBy = 'PlayerCommand',
    isAutoModAction = false,
    autoModCheckType = null,
    programmaticUnbanReason = null,
) {
    const { config, playerUtils, playerDataManager, logManager, getString } = dependencies;
    const issuerName = player?.nameTag ?? (invokedBy === 'AutoMod' ? 'AutoMod' : 'System');
    const prefix = config?.prefix ?? '!';

    const targetPlayerName = args[0];

    if (!targetPlayerName) {
        const usageMessage = getString('command.unban.usage', { prefix });
        if (player) {
            player.sendMessage(usageMessage);
        } else {
            console.warn(`[UnbanCommand.execute] System call missing target player name. Usage: ${prefix}${definition.name} ${definition.syntax}`);
        }
        return;
    }

    let targetOnlinePlayer;

    if (invokedBy === 'PlayerCommand' && player) {
        targetOnlinePlayer = playerUtils.validateCommandTarget(player, targetPlayerName, dependencies, { commandName: 'unban', requireOnline: true });
        if (!targetOnlinePlayer) {
            return;
        }
    } else {
        targetOnlinePlayer = playerUtils.findPlayer(targetPlayerName);
        if (!targetOnlinePlayer || !targetOnlinePlayer.isValid()) {
            console.warn(`[UnbanCommand.execute] ${issuerName} call: Target player '${targetPlayerName}' not found online. Offline unban via this command is currently limited.`);
            logManager?.addLog({
                actionType: 'error.cmd.unban.targetOffline',
                context: 'UnbanCommand.execute',
                adminName: issuerName,
                targetName: targetPlayerName,
                details: { errorCode: 'CMD_TARGET_OFFLINE_UNBAN_LIMITED', message: `${issuerName} attempt to unban offline player. Command requires online target.` },
            }, dependencies);
            return;
        }
    }

    const targetPData = playerDataManager?.getPlayerData(targetOnlinePlayer.id);

    if (!targetPData) {
        const failureMsg = `${getString('command.unban.failure', { playerName: targetOnlinePlayer.nameTag }) } (No data for ban info)`;
        if (player) {
            player.sendMessage(failureMsg);
        } else {
            console.warn(`[UnbanCommand.execute] ${issuerName} call: ${failureMsg}`);
        }
        playerUtils?.debugLog(`[UnbanCommand] No pData found for online player ${targetOnlinePlayer.nameTag}. Cannot verify ban status or unban.`, issuerName, dependencies);
        return;
    }

    const banInfo = targetPData.banInfo; // Use targetPData

    if (!banInfo) {
        const notBannedMsg = getString('command.unban.notBanned', { playerName: targetOnlinePlayer.nameTag });
        if (player) {
            player.sendMessage(notBannedMsg);
        } else {
            playerUtils?.debugLog(`[UnbanCommand] ${issuerName} call: Target ${targetOnlinePlayer.nameTag} was not banned.`, null, dependencies);
        }
        return;
    }

    const wasPreviouslyAutoModBan = banInfo.isAutoMod;
    const previousAutoModCheckType = banInfo.triggeringCheckType;

    const unbanned = playerDataManager?.removePlayerStateRestriction(targetPData, 'ban', dependencies);

    if (unbanned) {
        const successMessage = getString('command.unban.success', { playerName: targetOnlinePlayer.nameTag });
        if (player) {
            player.sendMessage(successMessage);
            playerUtils?.playSoundForEvent(player, 'commandSuccess', dependencies);
        }

        const logDetails = programmaticUnbanReason
            ? `Unbanned by ${issuerName}. System Reason: ${programmaticUnbanReason}. Previous reason: ${banInfo.reason}`
            : `Unbanned by ${issuerName}. Previous reason: ${banInfo.reason}`;

        logManager?.addLog({
            adminName: issuerName,
            actionType: 'playerUnbanned',
            targetName: targetOnlinePlayer.nameTag,
            targetId: targetOnlinePlayer.id,
            details: logDetails,
            isAutoMod: isAutoModAction,      // If the unban action itself is by AutoMod
            checkType: autoModCheckType,    // Context for why AutoMod unbanned (less common for unban)
        }, dependencies);

        if (wasPreviouslyAutoModBan && previousAutoModCheckType && config?.unbanClearsAutomodFlagsForCheckType) {
            playerDataManager.clearFlagsForCheckType(targetOnlinePlayer, previousAutoModCheckType, dependencies);
            const flagsClearedMsg = getString('command.unban.flagsCleared', { checkType: previousAutoModCheckType, playerName: targetOnlinePlayer.nameTag });
            if (player) {
                player.sendMessage(flagsClearedMsg);
            } else {
                playerUtils.debugLog(flagsClearedMsg, null, dependencies);
            }

            if (config?.notifyOnAdminUtilCommandUsage !== false || (isAutoModAction && config?.notifyOnAutoModAction !== false)) {
                const notifyMsgCleared = getString('command.unban.notify.flagsCleared', { adminName: issuerName, targetName: targetOnlinePlayer.nameTag, checkType: previousAutoModCheckType });
                playerUtils?.notifyAdmins(notifyMsgCleared, dependencies, player, targetPData);
            }
        }

        if (config?.notifyOnAdminUtilCommandUsage !== false && invokedBy === 'PlayerCommand') {
            const notifyMsg = getString('command.unban.notify.unbanned', { adminName: issuerName, targetName: targetOnlinePlayer.nameTag });
            playerUtils?.notifyAdmins(notifyMsg, dependencies, player, targetPData);
        } else if (isAutoModAction && config?.notifyOnAutoModAction !== false) {
            const notifyMsg = getString('command.unban.notify.unbanned', { adminName: issuerName, targetName: targetOnlinePlayer.nameTag });
            playerUtils?.notifyAdmins(notifyMsg, dependencies, null, targetPData);
        }
    } else {
        const failureMessage = getString('command.unban.failure', { playerName: targetOnlinePlayer.nameTag });
        if (player) {
            player.sendMessage(failureMessage);
            playerUtils?.playSoundForEvent(player, 'commandError', dependencies);
        } else {
            console.warn(`[UnbanCommand.execute] ${issuerName} call: ${failureMessage.replace(/§[a-f0-9lr]/g, '')}`);
        }
    }
}
