/**
 * Script for the !tpaccept command, allowing players to accept incoming TPA requests.
 */
// import { world, system } from '@minecraft/server'; // Not used in this file
import { permissionLevels as importedPermissionLevels } from '../core/rankManager.js'; // Import permissionLevels
/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: 'tpaccept',
    description: "command.tpaccept.description",
    aliases: ['tpaaccept'],
    permissionLevel: importedPermissionLevels.normal, // Set directly
    syntax: '!tpaccept [playerName]',
    enabled: true,
};
/**
 * Executes the !tpaccept command.
 */
export async function execute(player, args, dependencies) {
    // Use permissionLevels from dependencies for runtime checks if necessary
    const { playerUtils, config, tpaManager, permissionLevels: execPermissionLevels, logManager } = dependencies;

    // definition.permissionLevel is now set at module load time.
    // The check `if (definition.permissionLevel === null)` is no longer needed.

    const prefix = config.prefix;

    if (!config.enableTPASystem) {
        player.sendMessage("§cThe TPA system is currently disabled.");
        return;
    }

    const acceptingPlayerName = player.name;
    const specificRequesterName = args[0];
    let requestToAccept = null;

    const incomingRequests = tpaManager.findRequestsForPlayer(acceptingPlayerName)
        .filter(req => req.targetName === acceptingPlayerName && Date.now() < req.expiryTimestamp);

    if (incomingRequests.length === 0) {
        player.sendMessage("§cYou have no pending TPA requests.");
        return;
    }

    if (specificRequesterName) {
        requestToAccept = incomingRequests.find(req => req.requesterName.toLowerCase() === specificRequesterName.toLowerCase());
        if (!requestToAccept) {
            player.sendMessage(`§cNo pending TPA request found from "${specificRequesterName}".`);
            player.sendMessage(`§7Pending requests are from: ${incomingRequests.map(r => r.requesterName).join(', ')}`);
            return;
        }
    } else {
        incomingRequests.sort((a, b) => b.creationTimestamp - a.creationTimestamp);
        requestToAccept = incomingRequests[0];
    }

    if (!requestToAccept) {
        player.sendMessage(`§cCould not find a suitable TPA request to accept. Type ${prefix}tpastatus to see your requests.`);
        return;
    }

    try {
        const warmUpInitiated = await tpaManager.acceptRequest(requestToAccept.requestId, dependencies);

        if (warmUpInitiated) {
            player.sendMessage(`§aAccepted TPA request from "${requestToAccept.requesterName}". Teleport will occur in ${config.tpaTeleportWarmupSeconds} seconds if the teleporting player avoids damage and stays online.`);
        } else {
            player.sendMessage(`§cCould not accept TPA request from "${requestToAccept.requesterName}". It might have expired or been cancelled.`);
             if (config.enableDebugLogging) {
                playerUtils.debugLog(`[TpAcceptCommand] Call to tpaManager.acceptRequest for ${requestToAccept.requestId} returned falsy.`, player.nameTag, dependencies);
            }
        }
    } catch (error) {
        console.error(`[TpAcceptCommand] Error during tpaccept for ${player.nameTag}: ${error.stack || error}`);
        player.sendMessage("§cAn unexpected error occurred.");
        logManager.addLog({actionType: 'error', details: `[TpAcceptCommand] ${player.nameTag} failed to accept TPA: ${error.stack || error}`}, dependencies);
    }
}
