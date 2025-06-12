/**
 * @file AntiCheatsBP/scripts/commands/unmute.js
 * Defines the !unmute command for administrators to allow a previously muted player to chat again.
 * @version 1.0.1
 */
import { permissionLevels } from '../core/rankManager.js';
import { clearFlagsForCheckType } from '../../core/playerDataManager.js';
import { getString } from '../core/i18n.js'; // Import getString

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: "unmute",
    syntax: "!unmute <playername>",
    description: getString("command.unmute.description"),
    permissionLevel: permissionLevels.admin
};

/**
 * Executes the unmute command.
 * @param {import('@minecraft/server').Player} player The player issuing the command.
 * @param {string[]} args The command arguments.
 * @param {import('../types.js').CommandDependencies} dependencies Command dependencies.
 */
export async function execute(player, args, dependencies) {
    const { config, playerUtils, playerDataManager, addLog, findPlayer } = dependencies;
    const prefix = config.prefix;

    if (args.length < 1) {
        player.sendMessage(getString("command.unmute.usage", { prefix: prefix }));
        return;
    }
    const targetPlayerName = args[0];
    const foundPlayer = findPlayer(targetPlayerName, playerUtils);

    if (!foundPlayer) {
        player.sendMessage(getString("common.error.playerNotFoundOnline", { playerName: targetPlayerName }));
        return;
    }

    try {
        const oldMuteInfo = playerDataManager.getMuteInfo(foundPlayer);

        if (!oldMuteInfo) {
            player.sendMessage(getString("command.unmute.error.notMuted", { targetName: foundPlayer.nameTag }));
            return;
        }

        const unmuted = playerDataManager.removeMute(foundPlayer);

        if (unmuted) {
            try {
                foundPlayer.onScreenDisplay.setActionBar(getString("command.unmute.targetNotification"));
            } catch (e) {
                if (playerUtils.debugLog) playerUtils.debugLog(`Failed to set action bar for unmuted player ${foundPlayer.nameTag}: ${e}`, player.nameTag);
            }
            player.sendMessage(getString("command.unmute.success", { targetName: foundPlayer.nameTag }));
            if (playerUtils.notifyAdmins) {
                playerUtils.notifyAdmins(getString("command.unmute.adminNotify", { targetName: foundPlayer.nameTag, adminName: player.nameTag }), player, null);
            }
            if (addLog) {
                addLog({
                    timestamp: Date.now(),
                    adminName: player.nameTag,
                    actionType: 'unmute',
                    targetName: foundPlayer.nameTag,
                    reason: oldMuteInfo.reason,
                    details: `Original mute by: ${oldMuteInfo.mutedBy}, AutoMod: ${oldMuteInfo.isAutoMod}, Check: ${oldMuteInfo.triggeringCheckType || 'N/A'}`
                });
            }

            if (oldMuteInfo.isAutoMod && oldMuteInfo.triggeringCheckType) {
                await clearFlagsForCheckType(foundPlayer, oldMuteInfo.triggeringCheckType, dependencies);
                const message = getString("command.unmute.automodFlagClear", { checkType: oldMuteInfo.triggeringCheckType, targetName: foundPlayer.nameTag });
                player.sendMessage(message);
                if (playerUtils.debugLog) playerUtils.debugLog(message.replace(/§[a-f0-9]/g, ''), player.nameTag);
                if (playerUtils.notifyAdmins) {
                    playerUtils.notifyAdmins(getString("command.unmute.automodFlagClearAdminNotify", { checkType: oldMuteInfo.triggeringCheckType, targetName: foundPlayer.nameTag, adminName: player.nameTag }), player, null);
                }
            }
        } else {
            player.sendMessage(getString("command.unmute.fail", { targetName: foundPlayer.nameTag }));
        }
    } catch (e) {
        player.sendMessage(getString("common.error.generic") + `: ${e}`);
        if (playerUtils.debugLog) playerUtils.debugLog(`Unexpected error during unmute command for ${foundPlayer.nameTag} by ${player.nameTag}: ${e}`, player.nameTag);
    }
}
