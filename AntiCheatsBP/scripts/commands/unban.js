/**
 * Defines the !unban command for administrators to remove a ban from a player.
 * Note: Current version primarily supports unbanning players who are online.
 */
import { permissionLevels as importedPermissionLevels } from '../core/rankManager.js'; // Import permissionLevels
/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: "unban",
    syntax: "!unban <playername>",
    description: "command.unban.description",
    permissionLevel: importedPermissionLevels.admin, // Set directly
    enabled: true,
};
/**
 * Executes the unban command.
 */
export async function execute(player, args, dependencies) {
    const { config, playerUtils, playerDataManager, logManager, getString } = dependencies;
    const prefix = config.prefix;

    if (args.length < 1) {
        player.sendMessage(getString('command.unban.usage', { prefix: prefix }));
        return;
    }
    const targetPlayerName = args[0];
    const foundPlayer = playerUtils.findPlayer(targetPlayerName);

    if (!foundPlayer) {
        player.sendMessage(getString('command.unban.offline', { playerName: targetPlayerName }));
        if (config.enableDebugLogging) {
            playerUtils.debugLog(`[UnbanCommand] Unban attempt for offline player ${targetPlayerName} by ${player.nameTag}. This version primarily handles online players.`, player.nameTag, dependencies);
        }
        return;
    }

    try {
        const oldBanInfo = playerDataManager.getBanInfo(foundPlayer, dependencies);

        if (!oldBanInfo) {
            player.sendMessage(getString('command.unban.notBanned', { playerName: foundPlayer.nameTag }));
            return;
        }

        const unbanned = playerDataManager.removeBan(foundPlayer, dependencies);

        if (unbanned) {
            player.sendMessage(getString('command.unban.success', { playerName: foundPlayer.nameTag }));
            const targetPData = playerDataManager.getPlayerData(foundPlayer.id);
            const baseUnbanNotifyMsg = getString('command.unban.notify.unbanned', { adminName: player.nameTag, targetName: foundPlayer.nameTag });
            playerUtils.notifyAdmins(baseUnbanNotifyMsg, dependencies, player, targetPData);
            logManager.addLog({
                timestamp: Date.now(),
                adminName: player.nameTag,
                actionType: 'unban',
                targetName: foundPlayer.nameTag,
                reason: oldBanInfo.reason,
                details: `Original ban by: ${oldBanInfo.bannedBy}, AutoMod: ${oldBanInfo.isAutoMod}, Check: ${oldBanInfo.triggeringCheckType || getString('common.value.notAvailable')}`
            }, dependencies);

            if (oldBanInfo.isAutoMod && oldBanInfo.triggeringCheckType) {
                await playerDataManager.clearFlagsForCheckType(foundPlayer, oldBanInfo.triggeringCheckType, dependencies);
                const message = getString('command.unban.flagsCleared', { checkType: oldBanInfo.triggeringCheckType, playerName: foundPlayer.nameTag });
                player.sendMessage(message);
                const targetPDataForFlagClearLog = playerDataManager.getPlayerData(foundPlayer.id);
                if (config.enableDebugLogging) {
                    playerUtils.debugLog(`[UnbanCommand] ${message.replace(/§[a-f0-9]/g, '')}`, targetPDataForFlagClearLog?.isWatched ? foundPlayer.nameTag : null, dependencies);
                }
                if (dependencies.config.notifications?.notifyOnAdminUtilCommandUsage !== false) { // Default true
                    const baseNotifyMsg = getString('command.unban.notify.flagsCleared', { checkType: oldBanInfo.triggeringCheckType, targetName: foundPlayer.nameTag, adminName: player.nameTag });
                    playerUtils.notifyAdmins(baseNotifyMsg, dependencies, player, targetPDataForFlagClearLog);
                }
            }
        } else {
            player.sendMessage(getString('command.unban.failure', { playerName: foundPlayer.nameTag }));
        }
    } catch (e) {
        player.sendMessage(getString('command.unban.error.generic', { errorMessage: e.message }));
        console.error(`[UnbanCommand] Unexpected error for ${foundPlayer?.nameTag || targetPlayerName} by ${player.nameTag}: ${e.stack || e}`);
        logManager.addLog({
            actionType: 'errorUnbanCommand',
            context: 'unban.execute',
            adminName: player.nameTag, // Already a top-level field in LogEntry, but good to ensure it's passed
            targetName: foundPlayer?.nameTag || targetPlayerName, // Already a top-level field
            details: {
                commandArgs: args,
                errorMessage: e.message,
                stack: e.stack
            }
        }, dependencies);
    }
}
