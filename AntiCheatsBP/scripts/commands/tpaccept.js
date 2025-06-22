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
    const { playerUtils, config, tpaManager, permissionLevels, logManager } = dependencies; // getString removed

    // definition.description is static (or resolved by help command if it was a key)
    if (definition.permissionLevel === null) {
        definition.permissionLevel = permissionLevels.normal;
    }

    const prefix = config.prefix;

    if (!config.enableTPASystem) {
        // "command.tpa.systemDisabled" -> "§cThe TPA system is currently disabled."
        player.sendMessage("§cThe TPA system is currently disabled.");
        return;
    }

    const acceptingPlayerName = player.name;
    const specificRequesterName = args[0];
    let requestToAccept = null;

    const incomingRequests = tpaManager.findRequestsForPlayer(acceptingPlayerName)
        .filter(req => req.targetName === acceptingPlayerName && Date.now() < req.expiryTimestamp);

    if (incomingRequests.length === 0) {
        // "command.tpaccept.error.noPending" -> "§cYou have no pending TPA requests."
        player.sendMessage("§cYou have no pending TPA requests.");
        return;
    }

    if (specificRequesterName) {
        requestToAccept = incomingRequests.find(req => req.requesterName.toLowerCase() === specificRequesterName.toLowerCase());
        if (!requestToAccept) {
            // "command.tpaccept.error.noRequestFrom" -> "§cNo pending TPA request found from \"{playerName}\"."
            player.sendMessage(`§cNo pending TPA request found from "${specificRequesterName}".`);
            // "command.tpaccept.error.pendingFromList" -> "§7Pending requests are from: {playerList}"
            player.sendMessage(`§7Pending requests are from: ${incomingRequests.map(r => r.requesterName).join(', ')}`);
            return;
        }
    } else {
        incomingRequests.sort((a, b) => b.creationTimestamp - a.creationTimestamp);
        requestToAccept = incomingRequests[0];
    }

    if (!requestToAccept) {
        // "command.tpaccept.error.couldNotFind" -> "§cCould not find a suitable TPA request to accept. Type {prefix}tpastatus to see your requests."
        player.sendMessage(`§cCould not find a suitable TPA request to accept. Type ${prefix}tpastatus to see your requests.`);
        return;
    }

    try {
        const warmUpInitiated = await tpaManager.acceptRequest(requestToAccept.requestId, dependencies);

        if (warmUpInitiated) {
            // "command.tpaccept.success" -> "§aAccepted TPA request from \"{playerName}\". Teleport will occur in {warmupSeconds} seconds if the teleporting player avoids damage and stays online."
            player.sendMessage(`§aAccepted TPA request from "${requestToAccept.requesterName}". Teleport will occur in ${config.TPATeleportWarmupSeconds} seconds if the teleporting player avoids damage and stays online.`);
        } else {
            // "command.tpaccept.fail" -> "§cCould not accept TPA request from \"{playerName}\". It might have expired or been cancelled."
            player.sendMessage(`§cCould not accept TPA request from "${requestToAccept.requesterName}". It might have expired or been cancelled.`);
             if (config.enableDebugLogging) {
                playerUtils.debugLog(`[TpAcceptCommand] Call to tpaManager.acceptRequest for ${requestToAccept.requestId} returned falsy.`, player.nameTag, dependencies);
            }
        }
    } catch (error) {
        console.error(`[TpAcceptCommand] Error during tpaccept for ${player.nameTag}: ${error.stack || error}`);
        // "common.error.generic" -> "§cAn unexpected error occurred."
        player.sendMessage("§cAn unexpected error occurred.");
        if(logManager) {
            logManager.addLog({actionType: 'error', details: `[TpAcceptCommand] ${player.nameTag} failed to accept TPA: ${error.stack || error}`});
        }
    }
}
