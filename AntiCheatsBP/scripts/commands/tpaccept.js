/**
 * @file Script for the !tpaccept command, allowing players to accept incoming TPA requests.
 * @version 1.0.0
 */

import { world, system } from '@minecraft/server';
import * as config from '../config.js';
import * as tpaManager from '../core/tpaManager.js';
import { permissionLevels } from '../core/rankManager.js';
// Assuming sendActionbarMessage is not used, direct ActionBar is fine.
// import { sendActionbarMessage } from '../utils/playerUtils.js';

/**
 * @typedef {import('../types.js').CommandDefinition} CommandDefinition
 * @typedef {import('../types.js').TpaRequest} TpaRequest
 * @typedef {import('@minecraft/server').Player} Player
 */

/**
 * @type {CommandDefinition}
 */
const tpacceptCommandDefinition = {
    name: 'tpaccept',
    description: 'Accepts an incoming TPA request. Specify a player name to accept from a specific person, or leave blank to accept the latest request.',
    aliases: ['tpaaccept'],
    permissionLevel: permissionLevels.normal,
    syntax: '!tpaccept [playerName]', // Kept for help command consistency
};

/**
 * Executes the !tpaccept command.
 * @param {Player} player The player issuing the command (the one accepting).
 * @param {string[]} args The command arguments. args[0] can be the requester's name.
 * @param {import('../types.js').CommandDependencies} dependencies Command dependencies.
 */
async function tpacceptCommandExecute(player, args, dependencies) {
    const { playerUtils } = dependencies; // For debugLog or other utils if needed

    if (!config.enableTpaSystem) {
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
        // No specific requester, accept the most recent one (newest first)
        incomingRequests.sort((a, b) => b.creationTimestamp - a.creationTimestamp);
        requestToAccept = incomingRequests[0];
    }

    if (!requestToAccept) {
        player.sendMessage("§cCould not find a suitable TPA request to accept. Type !tpastatus to see your requests.");
        return;
    }

    // The tpaManager.acceptRequest function now initiates warm-up and handles notifications.
    // It returns true if warm-up was initiated, false otherwise.

    const warmUpInitiated = tpaManager.acceptRequest(requestToAccept.requestId);

    if (warmUpInitiated) {
        // The tpaManager.acceptRequest now handles detailed player notifications.
        // This command can send a simpler confirmation to the player who typed !tpaccept.
        player.sendMessage(`§aAccepted TPA request from "${requestToAccept.requesterName}". Teleport will occur in ${config.tpaTeleportWarmupSeconds} seconds if the teleporting player avoids damage and stays online.`);
    } else {
        // This might happen if the request was already cancelled, expired, or the player went offline.
        // tpaManager.acceptRequest would have logged details.
        player.sendMessage(`§cCould not accept TPA request from "${requestToAccept.requesterName}". It might have expired or been cancelled.`);
    }
    // No need to manually notify the other player here, tpaManager.acceptRequest does it.
}

export const definition = tpacceptCommandDefinition;
export const execute = tpacceptCommandExecute;
