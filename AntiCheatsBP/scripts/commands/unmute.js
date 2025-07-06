/**
 * Defines the !unmute command for administrators to allow a previously muted player to chat again.
 */
import { permissionLevels as importedPermissionLevels } from '../core/rankManager.js'; // Import permissionLevels
/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: "unmute",
    syntax: "!unmute <playername>",
    description: "command.unmute.description",
    permissionLevel: importedPermissionLevels.admin, // Set directly
    enabled: true,
};
/**
 * Executes the unmute command.
 */
export async function execute(player, args, dependencies) {
    const { config, playerUtils, playerDataManager, logManager, getString } = dependencies;
    const prefix = config.prefix;

    if (args.length < 1) {
        player.sendMessage(getString('command.unmute.usage', { prefix: prefix }));
        return;
    }
    const targetPlayerName = args[0];
    const foundPlayer = playerUtils.findPlayer(targetPlayerName);

    if (!foundPlayer) {
        player.sendMessage(getString('common.error.playerNotFoundOnline', { playerName: targetPlayerName }));
        return;
    }

    try {
        const oldMuteInfo = playerDataManager.getMuteInfo(foundPlayer, dependencies);

        if (!oldMuteInfo) {
            player.sendMessage(getString('command.unmute.notMuted', { playerName: foundPlayer.nameTag }));
            return;
        }

        const unmuted = playerDataManager.removeMute(foundPlayer, dependencies);

        if (unmuted) {
            try {
                foundPlayer.onScreenDisplay.setActionBar(getString('command.unmute.targetNotification'));
            } catch (e) {
                if (config.enableDebugLogging) {
                    playerUtils.debugLog(`[UnmuteCommand] Failed to set action bar for unmuted player ${foundPlayer.nameTag}: ${e.stack || e}`, player.nameTag, dependencies);
                }
            }
            player.sendMessage(getString('command.unmute.success', { playerName: foundPlayer.nameTag }));
            const targetPData = playerDataManager.getPlayerData(foundPlayer.id);
            // Critical notification - no config check
            const baseMainNotifyMsg = getString('command.unmute.notify.unmuted', { adminName: player.nameTag, targetName: foundPlayer.nameTag });
            playerUtils.notifyAdmins(baseMainNotifyMsg, dependencies, player, targetPData);
            logManager.addLog({
                timestamp: Date.now(),
                adminName: player.nameTag,
                actionType: 'unmute',
                targetName: foundPlayer.nameTag,
                reason: oldMuteInfo.reason,
                details: `Original mute by: ${oldMuteInfo.mutedBy}, AutoMod: ${oldMuteInfo.isAutoMod}, Check: ${oldMuteInfo.triggeringCheckType || getString('common.value.notAvailable')}`
            }, dependencies);

            if (oldMuteInfo.isAutoMod && oldMuteInfo.triggeringCheckType) {
                await playerDataManager.clearFlagsForCheckType(foundPlayer, oldMuteInfo.triggeringCheckType, dependencies);
                const message = getString('command.unmute.flagsCleared', { checkType: oldMuteInfo.triggeringCheckType, playerName: foundPlayer.nameTag });
                player.sendMessage(message);
                const targetPDataForFlagClearLog = playerDataManager.getPlayerData(foundPlayer.id);
                if (config.enableDebugLogging) {
                    playerUtils.debugLog(`[UnmuteCommand] ${message.replace(/§[a-f0-9]/g, '')}`, targetPDataForFlagClearLog?.isWatched ? foundPlayer.nameTag : null, dependencies);
                }
                if (dependencies.config.notifications?.notifyOnAdminUtilCommandUsage !== false) { // Default true
                    const baseFlagClearNotifyMsg = getString('command.unmute.notify.flagsCleared', { checkType: oldMuteInfo.triggeringCheckType, targetName: foundPlayer.nameTag, adminName: player.nameTag });
                    playerUtils.notifyAdmins(baseFlagClearNotifyMsg, dependencies, player, targetPDataForFlagClearLog);
                }
            }
        } else {
            player.sendMessage(getString('command.unmute.failure', { playerName: foundPlayer.nameTag }));
        }
    } catch (e) {
        player.sendMessage(getString('command.unmute.error.generic', { errorMessage: e.message }));
        console.error(`[UnmuteCommand] Unexpected error for ${foundPlayer?.nameTag || targetPlayerName} by ${player.nameTag}: ${e.stack || e}`);
        logManager.addLog({
            actionType: 'errorUnmuteCommand',
            context: 'UnmuteCommand.execute', // Consistent casing
            adminName: player.nameTag,
            targetName: foundPlayer?.nameTag || targetPlayerName,
            details: {
                commandArgs: args,
                errorMessage: e.message,
                stack: e.stack
            }
        }, dependencies);
    }
}
