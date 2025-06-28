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
    // Use permissionLevels from dependencies for runtime checks if necessary
    const { config, playerUtils, playerDataManager, logManager } = dependencies;

    const prefix = config.prefix;

    if (args.length < 1) {
        player.sendMessage(`§cUsage: ${prefix}unmute <playername>`);
        return;
    }
    const targetPlayerName = args[0];
    const foundPlayer = playerUtils.findPlayer(targetPlayerName);

    if (!foundPlayer) {
        player.sendMessage(`§cPlayer '${targetPlayerName}' not found or is not online.`);
        return;
    }

    try {
        const oldMuteInfo = playerDataManager.getMuteInfo(foundPlayer, dependencies);

        if (!oldMuteInfo) {
            player.sendMessage(`§ePlayer "${foundPlayer.nameTag}" is not currently muted.`);
            return;
        }

        const unmuted = playerDataManager.removeMute(foundPlayer, dependencies);

        if (unmuted) {
            try {
                foundPlayer.onScreenDisplay.setActionBar("§aYou have been unmuted.");
            } catch (e) {
                if (config.enableDebugLogging) {
                    playerUtils.debugLog(`[UnmuteCommand] Failed to set action bar for unmuted player ${foundPlayer.nameTag}: ${e.stack || e}`, player.nameTag, dependencies);
                }
            }
            player.sendMessage(`§aSuccessfully unmuted ${foundPlayer.nameTag}.`);
            const targetPData = playerDataManager.getPlayerData(foundPlayer.id);
            playerUtils.notifyAdmins(`§7[Admin] §e${player.nameTag}§7 unmuted §e${foundPlayer.nameTag}.`, dependencies, player, targetPData);
            logManager.addLog({
                timestamp: Date.now(),
                adminName: player.nameTag,
                actionType: 'unmute',
                targetName: foundPlayer.nameTag,
                reason: oldMuteInfo.reason,
                details: `Original mute by: ${oldMuteInfo.mutedBy}, AutoMod: ${oldMuteInfo.isAutoMod}, Check: ${oldMuteInfo.triggeringCheckType || 'N/A'}`
            }, dependencies);

            if (oldMuteInfo.isAutoMod && oldMuteInfo.triggeringCheckType) {
                await playerDataManager.clearFlagsForCheckType(foundPlayer, oldMuteInfo.triggeringCheckType, dependencies);
                const message = `§7Flags for check type '${oldMuteInfo.triggeringCheckType}' were cleared for ${foundPlayer.nameTag} due to unmute from AutoMod action.`;
                player.sendMessage(message);
                const targetPDataForFlagClearLog = playerDataManager.getPlayerData(foundPlayer.id);
                if (config.enableDebugLogging) {
                    playerUtils.debugLog(`[UnmuteCommand] ${message.replace(/§[a-f0-9]/g, '')}`, targetPDataForFlagClearLog?.isWatched ? foundPlayer.nameTag : null, dependencies);
                }
                playerUtils.notifyAdmins(`§7[Admin] Flags for check type '${oldMuteInfo.triggeringCheckType}' were cleared for ${foundPlayer.nameTag} by ${player.nameTag} (AutoMod unmute).`, dependencies, player, targetPDataForFlagClearLog);
            }
        } else {
            player.sendMessage(`§cFailed to unmute ${foundPlayer.nameTag}.`);
        }
    } catch (e) {
        player.sendMessage(`§cAn unexpected error occurred.: ${e.message}`);
        console.error(`[UnmuteCommand] Unexpected error for ${foundPlayer?.nameTag || targetPlayerName} by ${player.nameTag}: ${e.stack || e}`);
        logManager.addLog({ actionType: 'error', details: `[UnmuteCommand] Failed to unmute ${foundPlayer?.nameTag || targetPlayerName}: ${e.stack || e}`}, dependencies);
    }
}
