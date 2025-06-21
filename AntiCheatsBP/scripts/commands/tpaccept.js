/**
 * @file Script for the !tpaccept command, allowing players to accept incoming TPA requests.
 * @version 1.0.2
 */

import { world, system } from '@minecraft/server'; // Keep system import if used, though it's not in this snippet
// tpaManager, permissionLevels, getString will be from dependencies.

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: 'tpaccept',
    description: "command.tpaccept.description", // Key
    aliases: ['tpaaccept'],
    permissionLevel: null, // To be set from dependencies.permissionLevels.normal
    syntax: '!tpaccept [playerName]',
    enabled: true, // Will be checked against dependencies.config.enableTPASystem
};

/**
 * Executes the !tpaccept command.
 * @param {import('@minecraft/server').Player} player The player issuing the command (the one accepting).
 * @param {string[]} args The command arguments. args[0] can be the requester's name.
 * @param {import('../types.js').CommandDependencies} dependencies Command dependencies.
 */
export async function execute(player, args, dependencies) {
    const { playerUtils, config, tpaManager, permissionLevels, getString, logManager } = dependencies;

    definition.description = getString(definition.description);
    definition.permissionLevel = permissionLevels.normal;

    const prefix = config.prefix;

    if (!config.enableTPASystem) {
        player.sendMessage(getString("command.tpa.systemDisabled"));
        return;
    }

    const acceptingPlayerName = player.name;
    const specificRequesterName = args[0];
    let requestToAccept = null;

    // findRequestsForPlayer does not need dependencies as it's a local lookup in tpaManager
    const incomingRequests = tpaManager.findRequestsForPlayer(acceptingPlayerName)
        .filter(req => req.targetName === acceptingPlayerName && Date.now() < req.expiryTimestamp);

    if (incomingRequests.length === 0) {
        player.sendMessage(getString("command.tpaccept.error.noPending"));
        return;
    }

    if (specificRequesterName) {
        requestToAccept = incomingRequests.find(req => req.requesterName.toLowerCase() === specificRequesterName.toLowerCase());
        if (!requestToAccept) {
            player.sendMessage(getString("command.tpaccept.error.noRequestFrom", { playerName: specificRequesterName }));
            player.sendMessage(getString("command.tpaccept.error.pendingFromList", { playerList: incomingRequests.map(r => r.requesterName).join(', ') }));
            return;
        }
    } else {
        incomingRequests.sort((a, b) => b.creationTimestamp - a.creationTimestamp); // Sort to get the latest if no name specified
        requestToAccept = incomingRequests[0];
    }

    if (!requestToAccept) {
        player.sendMessage(getString("command.tpaccept.error.couldNotFind", { prefix: prefix }));
        return;
    }

    try {
        const warmUpInitiated = await tpaManager.acceptRequest(requestToAccept.requestId, dependencies);

        if (warmUpInitiated) {
            player.sendMessage(getString("command.tpaccept.success", { playerName: requestToAccept.requesterName, warmupSeconds: config.TPATeleportWarmupSeconds }));
        } else {
            // Attempt to provide a more specific message if acceptRequest returned an error object (though current acceptRequest returns bool)
            player.sendMessage(getString("command.tpaccept.fail", { playerName: requestToAccept.requesterName }));
             if (config.enableDebugLogging) {
                playerUtils.debugLog(`[TpAcceptCommand] Call to tpaManager.acceptRequest for ${requestToAccept.requestId} returned falsy.`, player.nameTag, dependencies);
            }
        }
    } catch (error) {
        console.error(`[TpAcceptCommand] Error during tpaccept for ${player.nameTag}: ${error.stack || error}`);
        player.sendMessage(getString("common.error.genericCommand"));
        if(logManager) {
            logManager.addLog({actionType: 'error', details: `[TpAcceptCommand] ${player.nameTag} failed to accept TPA: ${error.stack || error}`});
        }
    }
}
