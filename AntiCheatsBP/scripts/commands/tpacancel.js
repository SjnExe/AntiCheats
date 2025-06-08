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
    let cancelledRequestCount = 0;

    if (specificPlayerName) {
        const request = tpaManager.findRequest(commandUserName, specificPlayerName);

        if (request && (request.status === 'pending_acceptance' || request.status === 'pending_teleport_warmup')) {
            const otherPlayerName = request.requesterName === commandUserName ? request.targetName : request.requesterName;
            const reasonMsgPlayer = `§eTPA request involving "${otherPlayerName}" was cancelled by ${player.nameTag}.`;
            const reasonLog = `Request ${request.requestId} between ${request.requesterName} and ${request.targetName} cancelled by ${commandUserName}. Status was: ${request.status}.`;

            // tpaManager.cancelTeleport handles notifications and removal.
            // We use cancelTeleport for both declining pending_acceptance and cancelling pending_teleport_warmup for unified handling.
            tpaManager.cancelTeleport(request.requestId, reasonMsgPlayer, reasonLog);

            player.sendMessage(`§aSuccessfully cancelled/declined TPA request involving "${otherPlayerName}".`);
            cancelledRequestCount++;
        } else {
            player.sendMessage(`§cNo active or pending TPA request found with "${specificPlayerName}" that can be cancelled.`);
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
            // Only cancel requests that are pending acceptance or in warmup.
            if (req.status === 'pending_acceptance' || req.status === 'pending_teleport_warmup') {
                const otherPlayerName = req.requesterName === commandUserName ? req.targetName : req.requesterName;
                const reasonMsgPlayer = `§eTPA request involving "${otherPlayerName}" was cancelled by ${player.nameTag}.`;
                const reasonLog = `Request ${req.requestId} between ${req.requesterName} and ${req.targetName} cancelled by ${commandUserName}. Status was: ${req.status}.`;

                tpaManager.cancelTeleport(req.requestId, reasonMsgPlayer, reasonLog);
                cancelledRequestCount++;
            }
        }

        let summaryMessage = "§a";
        if (cancelledRequestCount > 0) {
            summaryMessage += `Cancelled/declined ${cancelledRequestCount} TPA request(s).`;
        } else {
            summaryMessage = "§cNo active requests were found in a state that could be cancelled/declined.";
        }

        player.sendMessage(summaryMessage.trim());
    }
}

export const definition = tpacancelCommandDefinition;
export const execute = tpacancelCommandExecute;
