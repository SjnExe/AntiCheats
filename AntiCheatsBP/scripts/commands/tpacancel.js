/**
 * @file Defines the !tpacancel command for players to cancel their outgoing TPA requests
 * or decline incoming TPA requests.
 */
// Assuming permissionLevels is a static export for now.
import { permissionLevels } from '../core/rankManager.js';

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: 'tpacancel',
    syntax: '[playerName]', // Prefix handled by commandManager
    description: 'Cancels your outgoing TPA request or declines an incoming one. If [playerName] is specified, cancels request with that player.',
    permissionLevel: permissionLevels.member, // Accessible by members
    enabled: true, // Master toggle for this command, TPA system itself has a global toggle in config.js
};

/**
 * Executes the !tpacancel command.
 * @async
 * @param {import('@minecraft/server').Player} player - The player issuing the command.
 * @param {string[]} args - Command arguments: [playerName].
 * @param {import('../types.js').Dependencies} dependencies - Object containing dependencies.
 * @returns {Promise<void>}
 */
export async function execute(player, args, dependencies) {
    const { config, playerUtils, tpaManager, getString, logManager } = dependencies;
    const issuerName = player?.nameTag ?? 'UnknownPlayer'; // Player initiating the cancel/decline
    const prefix = config?.prefix ?? '!';

    if (!config?.enableTpaSystem) {
        player.sendMessage(getString('command.tpa.systemDisabled'));
        return;
    }
     if (!dependencies.commandSettings?.tpacancel?.enabled) { // Check specific command toggle
        player.sendMessage(getString('command.error.unknownCommand', { prefix: prefix, commandName: definition.name }));
        return;
    }

    const targetPlayerNameArg = args[0];
    let requestToCancel = null;
    let specificPlayerTargeted = false;

    if (targetPlayerNameArg) {
        // User specified a player, try to find a request involving them.
        // findRequest expects system names. playerUtils.findPlayer gets the online Player object.
        const otherPlayerOnline = playerUtils?.findPlayer(targetPlayerNameArg);
        if (otherPlayerOnline && otherPlayerOnline.isValid()) {
            requestToCancel = tpaManager?.findRequest(player.name, otherPlayerOnline.name); // Use system names
        } else {
            // If player not online, findRequest can still work if tpaManager stores requests by name.
            // Assuming findRequest can handle potentially offline targetPlayerNameArg if it's just a name.
            requestToCancel = tpaManager?.findRequest(player.name, targetPlayerNameArg);
        }
        specificPlayerTargeted = true;
    } else {
        // No player specified, find any active request involving the issuer (outgoing or incoming).
        // Prioritize outgoing if multiple exist.
        const allRequests = tpaManager?.findRequestsForPlayer(player.name) ?? []; // Use system name
        const outgoing = allRequests.find(r => r.requesterName === player.name && (r.status === 'pendingAcceptance' || r.status === 'pendingTeleportWarmup'));
        const incoming = allRequests.find(r => r.targetName === player.name && r.status === 'pendingAcceptance');
        requestToCancel = outgoing || incoming || null;
    }

    if (!requestToCancel) {
        if (specificPlayerTargeted) {
            player.sendMessage(getString('command.tpacancel.specific.notFound', { playerName: targetPlayerNameArg }));
        } else {
            player.sendMessage(getString('command.tpacancel.all.noneFound'));
        }
        return;
    }

    // Determine if this is a decline (target cancelling incoming) or cancel (requester cancelling outgoing)
    const isDecline = requestToCancel.targetName === player.name && requestToCancel.status === 'pendingAcceptance';
    const actionLogType = isDecline ? 'tpaRequestDeclinedByTarget' : 'tpaRequestCancelledByRequester';

    // tpaManager.declineRequest or a more generic cancel function should handle notifying the other party.
    // For simplicity, let's assume tpaManager.declineRequest handles both cases if status is appropriate.
    // Or, we might need a tpaManager.cancelRequest if the semantics are different.
    // Assuming declineRequest can be used for both scenarios or adapt tpaManager.
    tpaManager?.declineRequest(requestToCancel.requestId, dependencies); // This should notify other player and log internally.

    // Send confirmation to the issuer of !tpacancel
    const otherPartyNameForMsg = requestToCancel.requesterName === player.name ? requestToCancel.targetName : requestToCancel.requesterName;
    // If other party object is available, use nameTag, else system name from request.
    const otherPlayerOnlineForNameTag = playerUtils?.findPlayer(otherPartyNameForMsg);
    const otherPlayerDisplayName = otherPlayerOnlineForNameTag?.nameTag ?? otherPartyNameForMsg;

    player.sendMessage(getString('command.tpacancel.specific.success', { playerName: otherPlayerDisplayName }));
    playerUtils?.playSoundForEvent(player, "commandSuccess", dependencies); // Sound for successful cancel/decline

    // External log for the command execution itself (tpaManager logs the actual TPA state change)
    logManager?.addLog({
        adminName: issuerName, // Player who typed !tpacancel
        actionType: 'commandTpaCancelExecuted',
        targetName: otherPlayerDisplayName, // The other player in the TPA
        details: `User ${isDecline ? 'declined' : 'cancelled'} TPA request (ID: ${requestToCancel.requestId}) with ${otherPlayerDisplayName}.`,
        context: 'TpaCancelCommand.execute',
    }, dependencies);

}
