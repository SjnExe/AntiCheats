/**
 * Script for the !tpaccept command, allowing players to accept incoming TPA requests.
 */
import { permissionLevels as importedPermissionLevels } from '../core/rankManager.js';
/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: 'tpaccept',
    description: "command.tpaccept.description",
    aliases: ['tpaaccept'],
    permissionLevel: importedPermissionLevels.normal,
    syntax: '!tpaccept [playerName]',
    enabled: true,
};
/**
 * Executes the !tpaccept command.
 */
export async function execute(player, args, dependencies) {
    const { playerUtils, config, tpaManager, logManager, getString } = dependencies;
    const prefix = config.prefix;

    if (!config.enableTPASystem) {
        player.sendMessage(getString('command.tpa.systemDisabled'));
        return;
    }

    const acceptingPlayerName = player.name;
    const specificRequesterName = args[0];
    let requestToAccept = null;

    const incomingRequests = tpaManager.findRequestsForPlayer(acceptingPlayerName)
        .filter(req => req.targetName === acceptingPlayerName && Date.now() < req.expiryTimestamp);

    if (incomingRequests.length === 0) {
        player.sendMessage(getString('command.tpaccept.noPending'));
        return;
    }

    if (specificRequesterName) {
        requestToAccept = incomingRequests.find(req => req.requesterName.toLowerCase() === specificRequesterName.toLowerCase());
        if (!requestToAccept) {
            player.sendMessage(getString('command.tpaccept.noRequestFromPlayer', { playerName: specificRequesterName }));
            player.sendMessage(getString('command.tpaccept.pendingFrom', { playerNames: incomingRequests.map(r => r.requesterName).join(', ') }));
            return;
        }
    } else {
        incomingRequests.sort((a, b) => b.creationTimestamp - a.creationTimestamp); // Get the most recent
        requestToAccept = incomingRequests[0];
    }

    if (!requestToAccept) {
        player.sendMessage(getString('command.tpaccept.couldNotFind', { prefix: prefix }));
        return;
    }

    try {
        const warmUpInitiated = await tpaManager.acceptRequest(requestToAccept.requestId, dependencies);

        if (warmUpInitiated) {
            player.sendMessage(getString('command.tpaccept.success', { playerName: requestToAccept.requesterName, warmupSeconds: config.tpaTeleportWarmupSeconds.toString() }));
        } else {
            player.sendMessage(getString('command.tpaccept.failure', { playerName: requestToAccept.requesterName }));
             if (config.enableDebugLogging) {
                playerUtils.debugLog(`[TpAcceptCommand] Call to tpaManager.acceptRequest for ${requestToAccept.requestId} returned falsy.`, player.nameTag, dependencies);
            }
        }
    } catch (error) {
        console.error(`[TpAcceptCommand] Error during tpaccept for ${player.nameTag}: ${error.stack || error}`);
        player.sendMessage(getString('command.tpacancel.error.generic')); // Reusing generic error
        logManager.addLog({
            actionType: 'errorTpAcceptCommand',
            context: 'tpaccept.execute',
            details: {
                playerName: player.nameTag,
                commandArgs: args,
                specificRequesterName: specificRequesterName,
                requestIdAttempted: requestToAccept?.requestId,
                errorMessage: error.message,
                stack: error.stack
            }
        }, dependencies);
    }
}
