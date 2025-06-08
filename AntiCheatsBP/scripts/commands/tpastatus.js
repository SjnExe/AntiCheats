/**
 * @file Script for the !tpastatus command, allowing players to manage their TPA request availability.
 * @version 1.0.0
 */

import { world, system } from '@minecraft/server';
import * as config from '../config.js';
import * as tpaManager from '../core/tpaManager.js';
import { permissionLevels } from '../core/rankManager.js';

/**
 * @typedef {import('../types.js').CommandDefinition} CommandDefinition
 * @typedef {import('@minecraft/server').Player} Player
 */

/**
 * @type {CommandDefinition}
 */
const tpastatusCommandDefinition = {
    name: 'tpastatus',
    description: 'Manage or view your TPA request availability. Use "on" to accept, "off" to decline, or "status" (or no argument) to check.',
    aliases: ['tpatoggle'],
    permissionLevel: permissionLevels.normal, // Accessible to everyone
    syntax: '!tpastatus [on|off|status]',
};

/**
 * Executes the !tpastatus command.
 * @param {Player} player The player issuing the command.
 * @param {string[]} args The command arguments. args[0] can be 'on', 'off', or 'status'.
 * @param {import('../types.js').CommandDependencies} dependencies Command dependencies.
 */
async function tpastatusCommandExecute(player, args, dependencies) {
    // const { playerUtils } = dependencies; // For debugLog, if needed

    if (!config.enableTpaSystem) {
        player.sendMessage("§cThe TPA system is currently disabled.");
        return;
    }

    const option = args[0] ? args[0].toLowerCase() : 'status'; // Default to 'status' if no arg

    switch (option) {
        case 'on':
            tpaManager.setPlayerTpaStatus(player.name, true);
            player.sendMessage("§aYou are now accepting TPA requests.");
            break;
        case 'off':
            tpaManager.setPlayerTpaStatus(player.name, false);
            player.sendMessage("§cYou are no longer accepting TPA requests.");

            // Decline all pending incoming requests for the player
            const incomingRequests = tpaManager.findRequestsForPlayer(player.name)
                .filter(req => req.targetName === player.name && Date.now() < req.expiryTimestamp);

            if (incomingRequests.length > 0) {
                let declinedCount = 0;
                for (const req of incomingRequests) {
                    tpaManager.declineRequest(req.requestId); // This also removes the request
                    const requesterPlayer = world.getAllPlayers().find(p => p.name === req.requesterName);
                    if (requesterPlayer) {
                        system.run(() => { // Run in a separate tick for action bar reliability
                            try {
                                requesterPlayer.onScreenDisplay.setActionBar(`§e${player.nameTag} is no longer accepting TPA requests; your request was automatically declined.`);
                            } catch (e) { console.warn(`[TPAStatusCmd] Failed to set action bar for ${req.requesterName}: ${e}`); }
                        });
                         requesterPlayer.sendMessage(`§e${player.nameTag} is no longer accepting TPA requests; your TPA request was automatically declined.`);
                    }
                    declinedCount++;
                }
                if (declinedCount > 0) {
                     player.sendMessage(`§e${declinedCount} pending incoming TPA request(s) were automatically declined.`);
                }
            }
            break;
        case 'status':
            const currentStatus = tpaManager.getPlayerTpaStatus(player.name);
            if (currentStatus.acceptsTpaRequests) {
                player.sendMessage("§aYou are currently accepting TPA requests.");
            } else {
                player.sendMessage("§cYou are currently not accepting TPA requests.");
            }
            break;
        default:
            player.sendMessage(`§cInvalid option. Usage: ${config.prefix}${tpastatusCommandDefinition.name} ${tpastatusCommandDefinition.syntax.split(' ')[1]}`);
            break;
    }
}

export const definition = tpastatusCommandDefinition;
export const execute = tpastatusCommandExecute;
