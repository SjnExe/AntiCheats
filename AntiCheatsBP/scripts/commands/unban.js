/**
 * @file Defines the !unban command for administrators to remove a ban from a player.
 */
import { permissionLevels } from '../core/rankManager.js';

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: 'unban',
    syntax: '<playername>',
    description: 'Unbans a player, allowing them to rejoin the server.',
    permissionLevel: permissionLevels.admin,
    enabled: true,
};

/**
 * Executes the !unban command.
 * Removes a ban from the specified player. If the ban was due to an AutoMod action
 * that also reset flags, this command might not automatically restore those flags.
 * @async
 * @param {import('@minecraft/server').Player} player - The player issuing the command.
 * @param {string[]} args - Command arguments: [playername].
 * @param {import('../types.js').Dependencies} dependencies - Object containing dependencies.
 * @returns {Promise<void>}
 */
export async function execute(player, args, dependencies) {
    const { config, playerUtils, playerDataManager, logManager, getString } = dependencies;
    const adminName = player?.nameTag ?? 'UnknownAdmin';
    const prefix = config?.prefix ?? '!';

    const parsedArgs = playerUtils.parsePlayerAndReasonArgs(args, 1, '', dependencies);
    const targetPlayerName = parsedArgs.targetPlayerName;

    if (!targetPlayerName) {
        player.sendMessage(getString('command.unban.usage', { prefix: prefix }));
        return;
    }

    const targetOnlinePlayer = playerUtils.validateCommandTarget(player, targetPlayerName, dependencies, { commandName: 'unban', requireOnline: true });
    if (!targetOnlinePlayer) {
        return;
    }

    const pData = playerDataManager?.getPlayerData(targetOnlinePlayer.id);
    if (!pData) {
        player.sendMessage(getString('command.unban.failure', { playerName: targetOnlinePlayer.nameTag }) + " (No data)");
        playerUtils?.debugLog(`[UnbanCommand] No pData found for online player ${targetOnlinePlayer.nameTag}. Cannot verify ban status or unban.`, adminName, dependencies);
        return;
    }

    const banInfo = pData.banInfo;

    if (!banInfo) {
        player.sendMessage(getString('command.unban.notBanned', { playerName: targetOnlinePlayer.nameTag }));
        return;
    }

    const wasAutoModBan = banInfo.isAutoMod;
    const autoModCheckType = banInfo.triggeringCheckType;

    const unbanned = playerDataManager?.removeBan(targetOnlinePlayer, dependencies);

    if (unbanned) {
        player.sendMessage(getString('command.unban.success', { playerName: targetOnlinePlayer.nameTag }));
        playerUtils?.playSoundForEvent(player, "commandSuccess", dependencies);

        logManager?.addLog({
            adminName: adminName,
            actionType: 'playerUnbanned',
            targetName: targetOnlinePlayer.nameTag,
            targetId: targetOnlinePlayer.id,
            details: `Unbanned by ${adminName}. Previous reason: ${banInfo.reason}`,
        }, dependencies);

        if (wasAutoModBan && autoModCheckType && config?.unbanClearsAutomodFlags) {
        }

        if (config?.notifyOnAdminUtilCommandUsage !== false) {
            const notifyMsg = getString('command.unban.notify.unbanned', { adminName: adminName, targetName: targetOnlinePlayer.nameTag });
            playerUtils?.notifyAdmins(notifyMsg, dependencies, player, pData);
        }

    } else {
        player.sendMessage(getString('command.unban.failure', { playerName: targetOnlinePlayer.nameTag }));
        playerUtils?.playSoundForEvent(player, "commandError", dependencies);
    }
}
