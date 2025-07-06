/**
 * @file Defines the !unmute command for administrators to allow a muted player to chat again.
 */
// Assuming permissionLevels is a static export for now.
import { permissionLevels } from '../core/rankManager.js';

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: 'unmute',
    syntax: '<playername>', // Prefix handled by commandManager
    description: 'Unmutes a player, allowing them to send chat messages again.',
    permissionLevel: permissionLevels.admin,
    enabled: true,
};

/**
 * Executes the !unmute command.
 * Removes a mute from the specified player.
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

    // unmute <playername> - reason is not applicable here.
    const parsedArgs = playerUtils.parsePlayerAndReasonArgs(args, 1, '', dependencies); // Reason part is not used by unmute
    const targetPlayerName = parsedArgs.targetPlayerName;

    if (!targetPlayerName) {
        player.sendMessage(getString('command.unmute.usage', { prefix: prefix }));
        return;
    }

    const targetPlayer = playerUtils.validateCommandTarget(player, targetPlayerName, dependencies, { commandName: 'unmute' });
    if (!targetPlayer) {
        return; // Message already sent by validateCommandTarget
    }

    const pData = playerDataManager?.getPlayerData(targetPlayer.id);
    if (!pData) {
        // This case means the player is online but has no AntiCheat data, which is unusual.
        player.sendMessage(getString('command.unmute.failure', { playerName: targetPlayer.nameTag }) + " (No data)");
        playerUtils?.debugLog(`[UnmuteCommand] No pData found for online player ${targetPlayer.nameTag}. Cannot verify mute status or unmute.`, adminName, dependencies);
        return;
    }

    const muteInfo = pData.muteInfo; // Mute info is on pData

    if (!muteInfo) {
        player.sendMessage(getString('command.unmute.notMuted', { playerName: targetPlayer.nameTag }));
        return;
    }

    const wasAutoModMute = muteInfo.isAutoMod;
    const autoModCheckType = muteInfo.triggeringCheckType; // Already camelCase or null

    const unmuted = playerDataManager?.removeMute(targetPlayer, dependencies);

    if (unmuted) {
        targetPlayer.sendMessage(getString('command.unmute.targetNotification'));
        player.sendMessage(getString('command.unmute.success', { playerName: targetPlayer.nameTag }));
        playerUtils?.playSoundForEvent(player, "commandSuccess", dependencies);

        logManager?.addLog({
            adminName: adminName,
            actionType: 'playerUnmuted', // Standardized camelCase
            targetName: targetPlayer.nameTag,
            targetId: targetPlayer.id,
            details: `Unmuted by ${adminName}. Previous reason: ${muteInfo.reason}`,
        }, dependencies);

        // Optional: Clear flags if unmuted from an AutoMod action, similar to unban
        if (wasAutoModMute && autoModCheckType && config?.unmuteClearsAutomodFlags) { // Example new config
            // await playerDataManager.clearFlagsForCheckType(targetPlayer, autoModCheckType, dependencies);
            // player.sendMessage(getString('command.unmute.flagsCleared', { checkType: autoModCheckType, playerName: targetPlayer.nameTag }));
            // playerUtils?.debugLog(`[UnmuteCommand] Cleared flags for ${autoModCheckType} for ${targetPlayer.nameTag} due to unmute from AutoMod action.`, adminName, dependencies);
            // For now, this logic is commented out as it depends on a new config and potentially more complex interaction.
        }

        if (config?.notifyOnAdminUtilCommandUsage !== false) {
            const notifyMsg = getString('command.unmute.notify.unmuted', { adminName: adminName, targetName: targetPlayer.nameTag });
            playerUtils?.notifyAdmins(notifyMsg, dependencies, player, pData);
        }

    } else {
        // This path might be hit if removeMute itself had an issue not related to player not being muted.
        player.sendMessage(getString('command.unmute.failure', { playerName: targetPlayer.nameTag }));
        playerUtils?.playSoundForEvent(player, "commandError", dependencies);
    }
}
