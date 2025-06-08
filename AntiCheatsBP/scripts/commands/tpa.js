/**
 * @file Script for the !tpa command, allowing players to request teleportation to another player.
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
export const definition = {
    name: 'tpa',
    description: 'Request to teleport to another player.',
    aliases: [],
    permissionLevel: permissionLevels.normal, // Accessible to everyone
    syntax: '!tpa <playerName>',
};

/**
 * Executes the !tpa command.
 * @param {Player} player The player issuing the command.
 * @param {string[]} args The command arguments.
 * @param {import('../types.js').CommandDependencies} dependencies Command dependencies.
 */
export async function execute(player, args, dependencies) {
    // playerUtils can be accessed from dependencies if needed for debugLog, etc.
    // const { playerUtils } = dependencies;

    if (!config.enableTpaSystem) {
        player.sendMessage("§cThe TPA system is currently disabled.");
        return;
    }

    if (args.length < 1) {
        player.sendMessage(`§cUsage: ${config.prefix}${definition.name} ${definition.syntax.split(' ')[1]}`); // More dynamic syntax usage
        return;
    }

    const targetName = args[0];
    const target = world.getAllPlayers().find(p => p.name === targetName); // Using .name for matching, as nameTag can change.

    if (!target) {
        player.sendMessage(`§cPlayer "${targetName}" not found or is not online.`);
        return;
    }

    if (target.name === player.name) {
        player.sendMessage("§cYou cannot send a TPA request to yourself.");
        return;
    }

    // Check target's TPA status
    const targetTpaStatus = tpaManager.getPlayerTpaStatus(target.name);
    if (!targetTpaStatus.acceptsTpaRequests) {
        player.sendMessage(`§cPlayer "${target.nameTag}" is not currently accepting TPA requests.`);
        return;
    }

    // Check for existing request
    const existingRequest = tpaManager.findRequest(player.name, target.name);
    if (existingRequest) {
         player.sendMessage(`§cYou already have an active TPA request with "${target.nameTag}".`);
         return;
    }

    const requestResult = tpaManager.addRequest(player, target, 'tpa');

    if (requestResult && requestResult.error === 'cooldown') {
        player.sendMessage(`§cYou must wait ${requestResult.remaining} more seconds before sending another TPA request.`);
        return;
    }

    if (requestResult) { // Successfully created request object
        player.sendMessage(`§aTPA request sent to "${target.nameTag}". They have ${config.tpaRequestTimeoutSeconds} seconds to accept. Type ${config.prefix}tpacancel to cancel.`);

        // Send action bar message to target player
        // Using system.run to ensure it's executed in a separate tick, which can help with reliability of setActionBar.
        system.run(() => {
            try {
                target.onScreenDisplay.setActionBar(`§e${player.nameTag} has requested to teleport to you. Use ${config.prefix}tpaccept ${player.nameTag} or ${config.prefix}tpacancel ${player.nameTag}.`);
            } catch (e) {
                // playerUtils?.debugLog could be used here if playerUtils is destructured from dependencies
                console.warn(`[TPACommand] Failed to set action bar for target ${target.nameTag}: ${e}`);
            }
        });

    } else {
        // This case might occur if addRequest implements more complex validation later (e.g., target has too many pending requests)
        // or if requestResult was null from tpaManager.addRequest for other reasons.
        player.sendMessage("§cCould not send TPA request. There might be an existing request or other issue.");
    }
}
