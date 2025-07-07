/**
 * @file Defines the !unmute command for administrators to allow a muted player to chat again.
 */
/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: 'unmute',
    syntax: '<playername>',
    description: 'Unmutes a player, allowing them to send chat messages again.',
    aliases: ['um'],
    permissionLevel: 1, // admin
    enabled: true,
};

/**
 * Executes the !unmute command.
 * Removes a mute from the specified player.
 * @async
 * @param {import('@minecraft/server').Player} player - The player issuing the command.
 * @param {string[]} args - Command arguments: [playername].
 * @param {import('../types.js').Dependencies} dependencies - Object containing dependencies.
 * @returns {void}
 */
export function execute(player, args, dependencies) {
    const { config, playerUtils, playerDataManager, logManager, getString } = dependencies;
    const adminName = player?.nameTag ?? 'UnknownAdmin';
    const prefix = config?.prefix ?? '!';

    const parsedArgs = playerUtils.parsePlayerAndReasonArgs(args, 1, '', dependencies);
    const targetPlayerName = parsedArgs.targetPlayerName;

    if (!targetPlayerName) {
        player.sendMessage(getString('command.unmute.usage', { prefix: prefix }));
        return;
    }

    const targetPlayer = playerUtils.validateCommandTarget(player, targetPlayerName, dependencies, { commandName: 'unmute' });
    if (!targetPlayer) {
        return;
    }

    const pData = playerDataManager?.getPlayerData(targetPlayer.id);
    if (!pData) {
        player.sendMessage(getString('command.unmute.failure', { playerName: targetPlayer.nameTag }) + ' (No data)');
        playerUtils?.debugLog(`[UnmuteCommand] No pData found for online player ${targetPlayer.nameTag}. Cannot verify mute status or unmute.`, adminName, dependencies);
        return;
    }

    const muteInfo = pData.muteInfo;

    if (!muteInfo) {
        player.sendMessage(getString('command.unmute.notMuted', { playerName: targetPlayer.nameTag }));
        return;
    }

    const wasAutoModMute = muteInfo.isAutoMod;
    const autoModCheckType = muteInfo.triggeringCheckType;

    const unmuted = playerDataManager?.removeMute(targetPlayer, dependencies);

    if (unmuted) {
        targetPlayer.sendMessage(getString('command.unmute.targetNotification'));
        player.sendMessage(getString('command.unmute.success', { playerName: targetPlayer.nameTag }));
        playerUtils?.playSoundForEvent(player, 'commandSuccess', dependencies);

        logManager?.addLog({
            adminName: adminName,
            actionType: 'playerUnmuted',
            targetName: targetPlayer.nameTag,
            targetId: targetPlayer.id,
            details: `Unmuted by ${adminName}. Previous reason: ${muteInfo.reason}`,
        }, dependencies);

        if (wasAutoModMute && autoModCheckType && config?.unmuteClearsAutomodFlags) {
            // TODO: Implement flag clearing logic for checkType when unmuting from AutoMod action
        }

        if (config?.notifyOnAdminUtilCommandUsage !== false) {
            const notifyMsg = getString('command.unmute.notify.unmuted', { adminName: adminName, targetName: targetPlayer.nameTag });
            playerUtils?.notifyAdmins(notifyMsg, dependencies, player, pData);
        }

    }
    else {
        player.sendMessage(getString('command.unmute.failure', { playerName: targetPlayer.nameTag }));
        playerUtils?.playSoundForEvent(player, 'commandError', dependencies);
    }
}
