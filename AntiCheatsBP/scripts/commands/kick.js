/**
 * @file Defines the !kick command for administrators to remove a player from the server.
 */
// Assuming permissionLevels is a static export for now.
import { permissionLevels } from '../core/rankManager.js';

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: 'kick',
    syntax: '<playername> [reason]', // Prefix handled by commandManager
    description: 'Kicks a player from the server.',
    permissionLevel: permissionLevels.admin, // Default admin, can be adjusted
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

    if (!targetPlayerName) { // Should be caught by validateCommandTarget if player is not null, but good practice
        player.sendMessage(getString('command.kick.usage', { prefix: prefix }));
        return;
    }

    const foundPlayer = playerUtils.validateCommandTarget(player, targetPlayerName, dependencies, { commandName: 'kick' });
    if (!foundPlayer) {
        return; // validateCommandTarget already sent a message
    }

    // Permission checks
    // Note: validateCommandTarget already handles player == null for targetPlayerName check,
    // and self-target check. So, foundPlayer here is valid and not self if player is not null.
    const permCheck = rankManager.canAdminActionTarget(player, foundPlayer, 'kick', dependencies);
    if (!permCheck.allowed) {
        player.sendMessage(getString(permCheck.messageKey || 'command.kick.noPermission', permCheck.messageParams));
        return;
    }

    try {
        const kickMessageToTarget = getString('command.kick.targetMessage', { kickerName: adminName, reason: reason });
        // The kick method itself is synchronous in the current Bedrock API, but wrapping in try/catch is good.
        foundPlayer.kick(kickMessageToTarget);

        player.sendMessage(getString('command.kick.success', { playerName: foundPlayer.nameTag, reason: reason }));
        playerUtils?.playSoundForEvent(player, "commandSuccess", dependencies);

        const targetPData = playerDataManager?.getPlayerData(foundPlayer.id); // For context if needed by notifyAdmins
        if (config?.notifyOnAdminUtilCommandUsage !== false) {
            const baseAdminNotifyMsg = getString('command.kick.notify.kicked', { targetName: foundPlayer.nameTag, adminName: adminName, reason: reason });
            playerUtils?.notifyAdmins(baseAdminNotifyMsg, dependencies, player, targetPData);
        }

        logManager?.addLog({
            adminName: adminName,
            actionType: 'playerKicked', // Standardized camelCase
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
            targetId: foundPlayer?.id, // Log ID if foundPlayer was resolved
            details: { errorMessage: e.message, reasonAttempted: reason },
            errorStack: e.stack || e.toString(),
        }, dependencies);
    }
}
