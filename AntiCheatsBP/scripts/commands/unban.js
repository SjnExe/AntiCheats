/**
 * @file AntiCheatsBP/scripts/commands/unban.js
 * Defines the !unban command for administrators to remove a ban from a player.
 * Note: Current version primarily supports unbanning players who are online.
 * @version 1.0.1
 */
import { permissionLevels } from '../core/rankManager.js';
import { clearFlagsForCheckType } from '../../core/playerDataManager.js';
import { getString } from '../../core/localizationManager.js'; // Import getString

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: "unban",
    syntax: "!unban <playername>",
    description: getString("command.unban.description"),
    permissionLevel: permissionLevels.admin
};

/**
 * Executes the unban command.
 * @param {import('@minecraft/server').Player} player The player issuing the command.
 * @param {string[]} args The command arguments.
 * @param {import('../types.js').CommandDependencies} dependencies Command dependencies.
 */
export async function execute(player, args, dependencies) {
    const { config, playerUtils, playerDataManager, addLog, findPlayer } = dependencies;
    const prefix = config.prefix;

    if (args.length < 1) {
        player.sendMessage(getString("command.unban.usage", { prefix: prefix }));
        return;
    }
    const targetPlayerName = args[0];
    const foundPlayer = findPlayer(targetPlayerName, playerUtils);

    if (!foundPlayer) {
        // Using a more specific error message for unban if player must be online.
        // If offline unbanning becomes possible, this might change or use common.error.playerNotFoundOnline.
        player.sendMessage(getString("command.unban.error.offlineNotSupported", { targetName: targetPlayerName }));
        if (playerUtils.debugLog) playerUtils.debugLog(`Unban attempt for offline player ${targetPlayerName} by ${player.nameTag}. This version primarily handles online players.`, player.nameTag);
        return;
    }

    try {
        const oldBanInfo = playerDataManager.getBanInfo(foundPlayer);

        if (!oldBanInfo) {
            player.sendMessage(getString("command.unban.error.notBanned", { targetName: foundPlayer.nameTag }));
            return;
        }

        const unbanned = playerDataManager.removeBan(foundPlayer);

        if (unbanned) {
            player.sendMessage(getString("command.unban.success", { targetName: foundPlayer.nameTag }));
            if (playerUtils.notifyAdmins) {
                playerUtils.notifyAdmins(getString("command.unban.adminNotify", { targetName: foundPlayer.nameTag, adminName: player.nameTag }), player, null);
            }
            if (addLog) {
                addLog({
                    timestamp: Date.now(),
                    adminName: player.nameTag,
                    actionType: 'unban',
                    targetName: foundPlayer.nameTag,
                    reason: oldBanInfo.reason,
                    details: `Original ban by: ${oldBanInfo.bannedBy}, AutoMod: ${oldBanInfo.isAutoMod}, Check: ${oldBanInfo.triggeringCheckType || 'N/A'}`
                });
            }

            if (oldBanInfo.isAutoMod && oldBanInfo.triggeringCheckType) {
                await clearFlagsForCheckType(foundPlayer, oldBanInfo.triggeringCheckType, dependencies);
                const message = getString("command.unban.automodFlagClear", { checkType: oldBanInfo.triggeringCheckType, targetName: foundPlayer.nameTag });
                player.sendMessage(message);
                if (playerUtils.debugLog) playerUtils.debugLog(message.replace(/§[a-f0-9]/g, ''), player.nameTag);
                 if (playerUtils.notifyAdmins) {
                    playerUtils.notifyAdmins(getString("command.unban.automodFlagClearAdminNotify", { checkType: oldBanInfo.triggeringCheckType, targetName: foundPlayer.nameTag, adminName: player.nameTag }), player, null);
                }
            }

        } else {
            player.sendMessage(getString("command.unban.fail", { targetName: foundPlayer.nameTag }));
        }
    } catch (e) {
        player.sendMessage(getString("common.error.generic") + `: ${e}`);
        if (playerUtils.debugLog) playerUtils.debugLog(`Unexpected error during unban command for ${foundPlayer.nameTag} by ${player.nameTag}: ${e}`, player.nameTag);
    }
}
