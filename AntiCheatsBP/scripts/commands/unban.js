/**
 * @file Defines the !unban command for administrators to remove a ban from a player.
 */
// Assuming permissionLevels is a static export for now.
import { permissionLevels } from '../core/rankManager.js';

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: 'unban',
    syntax: '<playername>', // Prefix handled by commandManager
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

    // unban <playername> - reason is not applicable here.
    const parsedArgs = playerUtils.parsePlayerAndReasonArgs(args, 1, '', dependencies); // Reason part is not used by unban
    const targetPlayerName = parsedArgs.targetPlayerName;

    if (!targetPlayerName) {
        player.sendMessage(getString('command.unban.usage', { prefix: prefix }));
        return;
    }

    // For unbanning, we often need to target players who are offline.
    // The current `validateCommandTarget` uses `findPlayer` which only finds online players.
    // For unban, we might need a different approach or an enhanced `validateCommandTarget`
    // that can accept offline player names if the action supports it (e.g., by modifying persisted data).
    // For now, we'll use it with requireOnline: false, but note that `findPlayer` itself doesn't support offline.
    // This means `unban` will effectively only work for online players until offline player data management is enhanced.

    // TODO: Enhance `validateCommandTarget` or `findPlayer` to support resolving offline players for commands like unban.
    // The `requireOnline: false` here is more of a placeholder for future capability.
    const targetOnlinePlayer = playerUtils.validateCommandTarget(player, targetPlayerName, dependencies, { commandName: 'unban', requireOnline: true }); // For now, still require online.
    if (!targetOnlinePlayer) {
        // Message already sent by validateCommandTarget if player is the issuer.
        // If system call and target not found, it's an issue (though unban is usually player-issued).
        return;
    }

    // Get pData to check current ban status and potentially clear AutoMod flags
    const pData = playerDataManager?.getPlayerData(targetOnlinePlayer.id);
    if (!pData) {
        // This case means the player is online but has no AntiCheat data, which is unusual.
        // Or, if targetOnlinePlayer was actually an offline data stub, pData might be it.
        // Assuming getPlayerData works for online players.
        player.sendMessage(getString('command.unban.failure', { playerName: targetOnlinePlayer.nameTag }) + " (No data)");
        playerUtils?.debugLog(`[UnbanCommand] No pData found for online player ${targetOnlinePlayer.nameTag}. Cannot verify ban status or unban.`, adminName, dependencies);
        return;
    }

    const banInfo = pData.banInfo; // Ban info is on pData

    if (!banInfo) {
        player.sendMessage(getString('command.unban.notBanned', { playerName: targetOnlinePlayer.nameTag }));
        return;
    }

    const wasAutoModBan = banInfo.isAutoMod;
    const autoModCheckType = banInfo.triggeringCheckType; // Already camelCase or null

    const unbanned = playerDataManager?.removeBan(targetOnlinePlayer, dependencies);

    if (unbanned) {
        player.sendMessage(getString('command.unban.success', { playerName: targetOnlinePlayer.nameTag }));
        playerUtils?.playSoundForEvent(player, "commandSuccess", dependencies);

        logManager?.addLog({
            adminName: adminName,
            actionType: 'playerUnbanned', // Standardized camelCase
            targetName: targetOnlinePlayer.nameTag,
            targetId: targetOnlinePlayer.id,
            details: `Unbanned by ${adminName}. Previous reason: ${banInfo.reason}`,
        }, dependencies);

        // If unbanned from an AutoMod action that had resetFlagsAfterAction: true,
        // the flags would have been reset at the time of banning.
        // This command doesn't restore flags, it just removes the ban.
        // However, if the AutoMod rule *didn't* reset flags, and we want unbanning to clear them,
        // that logic could be added here. For now, assume unban just unbans.
        if (wasAutoModBan && autoModCheckType && config?.unbanClearsAutomodFlags) { // Example new config
            // playerDataManager.clearFlagsForCheckType(targetOnlinePlayer, autoModCheckType, dependencies);
            // player.sendMessage(getString('command.unban.flagsCleared', { checkType: autoModCheckType, playerName: targetOnlinePlayer.nameTag }));
            // playerUtils?.debugLog(`[UnbanCommand] Cleared flags for ${autoModCheckType} for ${targetOnlinePlayer.nameTag} due to unban from AutoMod action.`, adminName, dependencies);
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
