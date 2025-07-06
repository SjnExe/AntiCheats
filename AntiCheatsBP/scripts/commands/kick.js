/**
 * @file Defines the !kick command for administrators to remove a player from the server.
 */
/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: 'kick',
    syntax: '<playername> [reason]',
    description: 'Kicks a player from the server.',
    aliases: ['k'],
    permissionLevel: 1, // admin
    enabled: true,
};

/**
 * Executes the !kick command.
 * Removes a specified player from the server with an optional reason.
 * @async
 * @param {import('@minecraft/server').Player} player - The player issuing the command.
 * @param {string[]} args - Command arguments: <playername> [reason].
 * @param {import('../types.js').Dependencies} dependencies - Object containing dependencies.
 * @returns {Promise<void>}
 */
export async function execute(player, args, dependencies) {
    const { config, playerUtils, logManager, playerDataManager, permissionLevels: depPermLevels, rankManager, getString } = dependencies;
    const adminName = player?.nameTag ?? 'UnknownAdmin';
    const prefix = config?.prefix ?? '!';

    const parsedArgs = playerUtils.parsePlayerAndReasonArgs(args, 1, 'common.value.noReasonProvided', dependencies);
    const targetPlayerName = parsedArgs.targetPlayerName;
    const reason = parsedArgs.reason;

    if (!targetPlayerName) {
        player.sendMessage(getString('command.kick.usage', { prefix: prefix }));
        return;
    }

    const foundPlayer = playerUtils.validateCommandTarget(player, targetPlayerName, dependencies, { commandName: 'kick' });
    if (!foundPlayer) {
        return;
    }

    const permCheck = rankManager.canAdminActionTarget(player, foundPlayer, 'kick', dependencies);
    if (!permCheck.allowed) {
        player.sendMessage(getString(permCheck.messageKey || 'command.kick.noPermission', permCheck.messageParams));
        return;
    }

    try {
        const kickMessageToTarget = getString('command.kick.targetMessage', { kickerName: adminName, reason: reason });
        foundPlayer.kick(kickMessageToTarget);

        player.sendMessage(getString('command.kick.success', { playerName: foundPlayer.nameTag, reason: reason }));
        playerUtils?.playSoundForEvent(player, "commandSuccess", dependencies);

        const targetPData = playerDataManager?.getPlayerData(foundPlayer.id);
        if (config?.notifyOnAdminUtilCommandUsage !== false) {
            const baseAdminNotifyMsg = getString('command.kick.notify.kicked', { targetName: foundPlayer.nameTag, adminName: adminName, reason: reason });
            playerUtils?.notifyAdmins(baseAdminNotifyMsg, dependencies, player, targetPData);
        }

        logManager?.addLog({
            adminName: adminName,
            actionType: 'playerKicked',
            targetName: foundPlayer.nameTag,
            targetId: foundPlayer.id,
            reason: reason,
        }, dependencies);

    } catch (e) {
        player.sendMessage(getString('command.kick.error', { playerName: targetPlayerName, errorMessage: e.message }));
        console.error(`[KickCommand CRITICAL] Error kicking player ${targetPlayerName} by ${adminName}: ${e.stack || e}`);
        playerUtils?.playSoundForEvent(player, "commandError", dependencies);
        logManager?.addLog({
            actionType: 'errorKickCommand',
            context: 'KickCommand.execute',
            adminName: adminName,
            targetName: targetPlayerName,
            targetId: foundPlayer?.id,
            details: { errorMessage: e.message, reasonAttempted: reason },
            errorStack: e.stack || e.toString(),
        }, dependencies);
    }
}
