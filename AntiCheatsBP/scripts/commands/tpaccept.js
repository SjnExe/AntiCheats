/**
 * @file Defines the !tpaccept command for players to accept incoming TPA requests.
 */
// Assuming permissionLevels is a static export for now.
import { permissionLevels } from '../core/rankManager.js';

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: 'tpaccept',
    syntax: '[playerName]', // Prefix handled by commandManager
    description: 'Accepts an incoming TPA request. If multiple, specify which player\'s request to accept.',
    permissionLevel: permissionLevels.member, // Accessible by members
    enabled: true, // Master toggle for this command, TPA system itself has a global toggle in config.js
};

/**
 * Executes the !tpaccept command.
 * Allows a player to accept a pending TPA request made to them.
 * @async
 * @param {import('@minecraft/server').Player} player - The player issuing the command (the one accepting).
 * @param {string[]} args - Command arguments: [playerName] (optional, name of player whose request to accept).
 * @param {import('../types.js').Dependencies} dependencies - Object containing dependencies.
 * @returns {Promise<void>}
 */
export async function execute(player, args, dependencies) {
    const { config, playerUtils, tpaManager, getString, logManager } = dependencies;
    const acceptorName = player?.nameTag ?? 'UnknownPlayer';
    const prefix = config?.prefix ?? '!';

    if (!config?.enableTpaSystem) {
        player.sendMessage(getString('command.tpa.systemDisabled'));
        return;
    }
    if (!dependencies.commandSettings?.tpaccept?.enabled) { // Check specific command toggle
        player.sendMessage(getString('command.error.unknownCommand', { prefix: prefix, commandName: definition.name }));
        return;
    }

    const targetRequesterNameArg = args[0];
    let requestToAccept = null;

    const incomingRequests = (tpaManager?.findRequestsForPlayer(player.name) ?? []) // Use system name
        .filter(r => r.targetName === player.name && r.status === 'pendingAcceptance');

    if (incomingRequests.length === 0) {
        player.sendMessage(getString('command.tpaccept.noPending'));
        return;
    }

    if (targetRequesterNameArg) {
        const lowerTargetRequesterName = targetRequesterNameArg.toLowerCase();
        // Find by comparing nameTag if player is online, or system name from request
        requestToAccept = incomingRequests.find(r => {
            const requesterOnline = playerUtils?.findPlayer(r.requesterName);
            return (requesterOnline?.nameTag?.toLowerCase() === lowerTargetRequesterName) || (r.requesterName.toLowerCase() === lowerTargetRequesterName);
        });
        if (!requestToAccept) {
            player.sendMessage(getString('command.tpaccept.noRequestFromPlayer', { playerName: targetRequesterNameArg }));
            return;
        }
    } else if (incomingRequests.length === 1) {
        requestToAccept = incomingRequests[0];
    } else { // Multiple pending requests, no specific player named
        const requesterNames = incomingRequests.map(r => {
            const reqOnline = playerUtils?.findPlayer(r.requesterName);
            return reqOnline?.nameTag ?? r.requesterName; // Display nameTag if online
        }).join(', ');
        player.sendMessage(getString('command.tpaccept.pendingFrom', { playerNames: requesterNames }));
        player.sendMessage(getString('command.tpaccept.usage', { prefix: prefix })); // Remind usage
        return;
    }

    if (!requestToAccept) { // Should be caught by earlier checks, but as a safeguard
        player.sendMessage(getString('command.tpaccept.couldNotFind'));
        return;
    }

    const success = await tpaManager?.acceptRequest(requestToAccept.requestId, dependencies);

    if (success) {
        // Messages to players are handled by tpaManager.acceptRequest
        // player.sendMessage(getString('command.tpaccept.success', { playerName: requestToAccept.requesterName, warmupSeconds: (config?.tpaTeleportWarmupSeconds ?? 5).toString() }));
        // No specific success message needed here as tpaManager handles it.
        playerUtils?.playSoundForEvent(player, "commandSuccess", dependencies); // Sound for successful accept

        // Log for the command execution itself
        logManager?.addLog({
            adminName: acceptorName, // Player who typed !tpaccept
            actionType: 'commandTpaAcceptExecuted',
            targetName: requestToAccept.requesterName, // The player whose request was accepted
            details: `User accepted TPA request (ID: ${requestToAccept.requestId}) from ${requestToAccept.requesterName}.`,
            context: 'TpaAcceptCommand.execute',
        }, dependencies);
    } else {
        // tpaManager.acceptRequest might have already sent a message if target went offline.
        // This is a fallback if it returns false for other reasons.
        player.sendMessage(getString('command.tpaccept.failure', { playerName: requestToAccept.requesterName }));
        playerUtils?.playSoundForEvent(player, "commandError", dependencies);
    }
}
