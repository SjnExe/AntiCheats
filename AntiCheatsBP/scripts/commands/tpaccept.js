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

    // The tpaManager.acceptRequest function will handle the teleportation and request removal.
    // It should also ideally handle notifying the involved players.
    // For now, we assume it's a placeholder that might return success/failure or handle notifications.
    // The current stub for tpaManager.acceptRequest does console.log and removeRequest.

    // Attempt to accept the request via tpaManager
    tpaManager.acceptRequest(requestToAccept.requestId);

    // Send feedback based on the assumption that tpaManager.acceptRequest will perform actions.
    // If tpaManager.acceptRequest were to return a status, we could use that.
    // Since it's a stub, direct feedback is provided here.
    player.sendMessage(`§aTPA request from "${requestToAccept.requesterName}" accepted. Teleportation should occur shortly.`);

    const requesterPlayer = world.getAllPlayers().find(p => p.name === requestToAccept.requesterName);
    if (requesterPlayer) {
        // Inform the requester their request was accepted.
        system.run(() => {
            try {
                requesterPlayer.onScreenDisplay.setActionBar(`§aYour TPA request to "${acceptingPlayerName}" was accepted!`);
            } catch (e) {
                // playerUtils?.debugLog could be used here
                console.warn(`[TPAcceptCommand] Failed to set action bar for requester ${requesterPlayer.nameTag}: ${e}`);
            }
        });
         requesterPlayer.sendMessage(`§aYour TPA request to "${acceptingPlayerName}" was accepted!`);
    }

    // The request is removed within tpaManager.acceptRequest in the current stub.
}

export const definition = tpacceptCommandDefinition;
export const execute = tpacceptCommandExecute;
