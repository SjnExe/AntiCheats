/** @type {import('../../types.js').CommandDefinition} */
export const definition = {
    name: 'kick',
    syntax: '<playername> [reason]',
    description: 'Kicks a player from the server.',
    permissionLevel: 1, // admin
};

/**
 * Executes the kick command.
 * @param {import('@minecraft/server').Player} player
 * @param {string[]} args
 * @param {import('../../types.js').Dependencies} dependencies
 * @param {string} [invokedBy]
 * @param {boolean} [isAutoModAction]
 * @param {string | null} [autoModCheckType]
 * @param {string | null} [programmaticReason]
 */
export function execute(
    player,
    args,
    dependencies,
    invokedBy = 'PlayerCommand',
    isAutoModAction = false,
    autoModCheckType = null,
    programmaticReason = null,
) {
    const { config, playerUtils, logManager, playerDataManager, rankManager, getString } = dependencies;
    const issuerName = player?.nameTag ?? (invokedBy === 'AutoMod' ? 'AutoMod' : 'System');
    const prefix = config?.prefix ?? '!';
    const targetPlayerName = args[0];
    let reason;

    if (invokedBy === 'AutoMod' && programmaticReason) {
        reason = programmaticReason;
    } else if (invokedBy === 'AutoMod') {
        reason = getString('command.kick.automodReason', { checkType: autoModCheckType || 'violations' });
    } else {
        const parsedArgsUtil = playerUtils.parsePlayerAndReasonArgs(args, 1, 'common.value.noReasonProvided', dependencies);
        reason = parsedArgsUtil.reason;
    }
    const usageMessage = `§cUsage: ${prefix}kick <playername> [reason]`;

    if (!targetPlayerName) {
        if (player) {
            player.sendMessage(usageMessage);
        } else {
            console.warn(`[KickCommand.execute] System call missing arguments. Usage: ${prefix}${definition.name} ${definition.syntax}`);
            playerUtils?.debugLog('[KickCommand.execute] System call missing target player name.', null, dependencies);
        }
        return;
    }

    let foundPlayer;
    if (invokedBy === 'PlayerCommand' && player) {
        foundPlayer = playerUtils.validateCommandTarget(player, targetPlayerName, dependencies, { commandName: 'kick' });
        if (!foundPlayer) return;

        const permCheck = rankManager.canAdminActionTarget(player, foundPlayer, 'kick', dependencies);
        if (!permCheck.allowed) {
            player.sendMessage(getString(permCheck.messageKey || 'command.kick.noPermission', permCheck.messageParams));
            return;
        }
    } else {
        foundPlayer = playerUtils.findPlayer(targetPlayerName);
        if (!foundPlayer || !foundPlayer.isValid()) {
            console.warn(`[KickCommand.execute] ${issuerName} call: Target player '${targetPlayerName}' not found or invalid.`);
            logManager?.addLog({
                actionType: 'error.cmd.kick.targetNotFound',
                context: 'KickCommand.execute',
                adminName: issuerName,
                targetName: targetPlayerName,
                details: { errorCode: 'CMD_TARGET_NOT_FOUND', message: `${issuerName} attempt to kick offline/invalid player.` },
            }, dependencies);
            return;
        }
    }

    try {
        const kickMessageToTarget = getString('command.kick.targetMessage', { kickerName: issuerName, reason });
        foundPlayer.kick(kickMessageToTarget);

        const successMessage = getString('command.kick.success', { playerName: foundPlayer.nameTag, reason });
        if (player) {
            player.sendMessage(successMessage);
            playerUtils?.playSoundForEvent(player, 'commandSuccess', dependencies);
        }

        const targetPData = playerDataManager?.getPlayerData(foundPlayer.id);
        if (config?.notifyOnAdminUtilCommandUsage !== false && invokedBy === 'PlayerCommand') {
            const baseAdminNotifyMsg = getString('command.kick.notify.kicked', { targetName: foundPlayer.nameTag, adminName: issuerName, reason });
            playerUtils?.notifyAdmins(baseAdminNotifyMsg, dependencies, player, targetPData);
        } else if (isAutoModAction && config?.notifyOnAutoModAction !== false) {
            const baseAdminNotifyMsg = getString('command.kick.notify.kicked', { targetName: foundPlayer.nameTag, adminName: issuerName, reason });
            playerUtils?.notifyAdmins(baseAdminNotifyMsg, dependencies, null, targetPData);
        }

        logManager?.addLog({
            adminName: issuerName,
            actionType: 'playerKicked',
            targetName: foundPlayer.nameTag,
            targetId: foundPlayer.id,
            reason,
            isAutoMod: isAutoModAction,
            checkType: autoModCheckType,
        }, dependencies);

    } catch (e) {
        const errorMessage = getString('command.kick.error', { playerName: targetPlayerName, errorMessage: e.message });
        if (player && player.isValid()) {
            player.sendMessage(errorMessage);
            playerUtils?.playSoundForEvent(player, 'commandError', dependencies);
        } else {
            console.error(`[KickCommand CRITICAL] ${errorMessage.replace(/§[a-f0-9lr]/g, '')} (Invoked by ${issuerName})`);
        }
        console.error(`[KickCommand CRITICAL] Error kicking player ${targetPlayerName} by ${issuerName}: ${e.stack || e}`);
        logManager?.addLog({
            actionType: 'error.cmd.kick.execFail',
            context: 'KickCommand.execute',
            adminName: issuerName,
            targetName: targetPlayerName,
            targetId: foundPlayer?.id,
            details: {
                errorCode: 'CMD_KICK_EXEC_FAIL',
                message: e.message,
                rawErrorStack: e.stack || e.toString(),
                meta: { reasonAttempted: reason, invokedBy },
            },
        }, dependencies);
    }
}
