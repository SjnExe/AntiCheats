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

    if (args.length < 1) {
        player.sendMessage(getString('command.kick.usage', { prefix: prefix }));
        return;
    }

    const targetPlayerName = args[0];
    const reason = args.slice(1).join(' ').trim() || getString('common.value.noReasonProvided');

    const foundPlayer = playerUtils?.findPlayer(targetPlayerName);

    if (!foundPlayer || !foundPlayer.isValid()) { // Added isValid
        player.sendMessage(getString('common.error.playerNotFoundOnline', { playerName: targetPlayerName }));
        return;
    }

    if (foundPlayer.id === player.id) {
        player.sendMessage(getString('command.kick.cannotSelf'));
        return;
    }

    // Permission checks
    const targetPermissionLevel = rankManager?.getPlayerPermissionLevel(foundPlayer, dependencies);
    const issuerPermissionLevel = rankManager?.getPlayerPermissionLevel(player, dependencies);
    const ownerPerm = depPermLevels?.owner ?? 0;
    const adminPerm = depPermLevels?.admin ?? 1;


    if (typeof targetPermissionLevel === 'number' && typeof issuerPermissionLevel === 'number') {
        if (targetPermissionLevel <= ownerPerm && issuerPermissionLevel > ownerPerm) { // Target is Owner, issuer is not Owner
             player.sendMessage(getString('command.kick.noPermissionOwner')); // Specific message for trying to kick owner
             return;
        }
        // Admins (or higher) can kick other non-owner players.
        // An Owner can kick anyone (except another Owner if that rule is desired - not strictly enforced here).
        // This simplified check means if issuer is not Owner, they can't kick Admins or Owners.
        // If issuer IS Owner, they can kick Admins.
        if (targetPermissionLevel <= adminPerm && issuerPermissionLevel > adminPerm && issuerPermissionLevel > ownerPerm) { // Target is Admin or Owner, issuer is Mod or Member
            player.sendMessage(getString('command.kick.noPermission')); // Generic no permission for this player
            return;
        }
    } else {
        playerUtils?.debugLog(`[KickCommand WARNING] Could not determine permission levels for kick check between ${adminName} and ${targetPlayerName}. Proceeding with caution.`, adminName, dependencies);
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
