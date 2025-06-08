/**
 * @file Script for the !tpacancel command, allowing players to cancel or decline TPA requests.
 * @version 1.0.0
 */

import { world, system } from '@minecraft/server';
import * as config from '../config.js';
import * as tpaManager from '../core/tpaManager.js';
import { permissionLevels } from '../core/rankManager.js';

/**
 * @typedef {import('../types.js').CommandDefinition} CommandDefinition
 * @typedef {import('../types.js').TpaRequest} TpaRequest
 * @typedef {import('@minecraft/server').Player} Player
 */

/**
 * @type {CommandDefinition}
 */
const tpacancelCommandDefinition = {
    name: 'tpacancel',
    description: 'Cancels your outgoing TPA request to a player, or declines an incoming request from a player. If no player name is given, cancels all your outgoing and declines all incoming TPA requests.',
    aliases: ['tpadeny', 'tpcancel'],
    permissionLevel: permissionLevels.normal,
    syntax: '!tpacancel [playerName]',
};

/**
 * Executes the !tpacancel command.
 * @param {Player} player The player issuing the command.
 * @param {string[]} args The command arguments. args[0] can be the other player's name.
 * @param {import('../types.js').CommandDependencies} dependencies Command dependencies.
 */
async function tpacancelCommandExecute(player, args, dependencies) {
    // const { playerUtils } = dependencies; // For debugLog, if needed

    if (!config.enableTpaSystem) {
        player.sendMessage("§cThe TPA system is currently disabled.");
        return;
    }

    const commandUserName = player.name; // The one cancelling/declining
    const specificPlayerName = args[0];
    let declinedCount = 0;
    let cancelledCount = 0;

    if (specificPlayerName) {
        const request = tpaManager.findRequest(commandUserName, specificPlayerName);

        if (request && Date.now() < request.expiryTimestamp) {
            const otherPlayerNameInRequest = request.requesterName === commandUserName ? request.targetName : request.requesterName;
            const otherPlayer = world.getAllPlayers().find(p => p.name === otherPlayerNameInRequest);

            // tpaManager.declineRequest will also remove the request from activeRequests
            tpaManager.declineRequest(request.requestId);

            if (request.requesterName === commandUserName) { // User cancelled their outgoing request
                player.sendMessage(`§aYour TPA request to "${otherPlayerNameInRequest}" has been cancelled.`);
                if (otherPlayer) {
                    system.run(() => { // Ensure action bar is set in a separate tick
                        try {
                            otherPlayer.onScreenDisplay.setActionBar(`§e${commandUserName} cancelled their TPA request to you.`);
                        } catch (e) { console.warn(`[TPACancelCommand] Failed to set action bar for ${otherPlayerNameInRequest}: ${e}`); }
                    });
                }
                cancelledCount++;
            } else { // User (target of the request) declined an incoming request
                player.sendMessage(`§aYou have declined the TPA request from "${otherPlayerNameInRequest}".`);
                if (otherPlayer) {
                     system.run(() => {
                        try {
                            otherPlayer.onScreenDisplay.setActionBar(`§cYour TPA request to "${commandUserName}" was declined.`);
                        } catch (e) { console.warn(`[TPACancelCommand] Failed to set action bar for ${otherPlayerNameInRequest}: ${e}`); }
                    });
                }
                declinedCount++;
            }
        } else {
            player.sendMessage(`§cNo active TPA request found with "${specificPlayerName}".`);
            return;
        }
    } else {
        // No specific player, cancel/decline all for commandUser
        const allPlayerRequests = tpaManager.findRequestsForPlayer(commandUserName);
        if (allPlayerRequests.length === 0) {
            player.sendMessage("§cYou have no active TPA requests to cancel or decline.");
            return;
        }

        for (const req of allPlayerRequests) {
            if (Date.now() >= req.expiryTimestamp) continue; // Skip already expired

            const otherPlayerNameInRequest = req.requesterName === commandUserName ? req.targetName : req.requesterName;
            const otherPlayer = world.getAllPlayers().find(p => p.name === otherPlayerNameInRequest);

            tpaManager.declineRequest(req.requestId); // This also removes it

            if (req.requesterName === commandUserName) { // User cancelled their outgoing request
                if (otherPlayer) {
                     system.run(() => {
                        try {
                            otherPlayer.onScreenDisplay.setActionBar(`§e${commandUserName} cancelled their TPA request to you.`);
                        } catch (e) { console.warn(`[TPACancelCommand] Failed to set action bar for ${otherPlayerNameInRequest}: ${e}`); }
                    });
                }
                cancelledCount++;
            } else { // User declined an incoming request
                if (otherPlayer) {
                    system.run(() => {
                        try {
                            otherPlayer.onScreenDisplay.setActionBar(`§cYour TPA request to "${commandUserName}" was declined.`);
                        } catch (e) { console.warn(`[TPACancelCommand] Failed to set action bar for ${otherPlayerNameInRequest}: ${e}`); }
                    });
                }
                declinedCount++;
            }
        }

        let summaryMessage = "§a";
        if (cancelledCount > 0) summaryMessage += `Cancelled ${cancelledCount} outgoing TPA request(s). `;
        if (declinedCount > 0) summaryMessage += `Declined ${declinedCount} incoming TPA request(s).`;
        if (cancelledCount === 0 && declinedCount === 0) summaryMessage = "§cNo active requests were found to cancel/decline (some may have expired).";

        player.sendMessage(summaryMessage.trim());
    }
}

export const definition = tpacancelCommandDefinition;
export const execute = tpacancelCommandExecute;
