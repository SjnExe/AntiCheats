/**
 * @file Script for the !tpahere command, allowing players to request another player to teleport to them.
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
const tpahereCommandDefinition = {
    name: 'tpahere',
    description: 'Request another player to teleport to your location.',
    aliases: ['tpask', 'tph'], // Example aliases
    permissionLevel: permissionLevels.normal, // Accessible to everyone
    syntax: '!tpahere <playerName>',
};

/**
 * Executes the !tpahere command.
 * @param {Player} player The player issuing the command.
 * @param {string[]} args The command arguments.
 * @param {import('../types.js').CommandDependencies} dependencies Command dependencies.
 */
async function tpahereCommandExecute(player, args, dependencies) {
    // const { playerUtils } = dependencies; // For debugLog, if needed

    if (!config.enableTpaSystem) {
        player.sendMessage("§cThe TPA system is currently disabled.");
        return;
    }

    if (args.length < 1) {
        // Use config.prefix and definition.name for consistency
        player.sendMessage(`§cUsage: ${config.prefix}${tpahereCommandDefinition.name} ${tpahereCommandDefinition.syntax.split(' ')[1]}`);
        return;
    }

    const targetName = args[0];
    const target = world.getAllPlayers().find(p => p.name === targetName); // Using .name for matching

    if (!target) {
        player.sendMessage(`§cPlayer "${targetName}" not found or is not online.`);
        return;
    }

    if (target.name === player.name) {
        player.sendMessage("§cYou cannot send a TPA Here request to yourself.");
        return;
    }

    const targetTpaStatus = tpaManager.getPlayerTpaStatus(target.name);
    if (!targetTpaStatus.acceptsTpaRequests) {
        player.sendMessage(`§cPlayer "${target.nameTag}" is not currently accepting TPA requests.`);
        return;
    }

    const existingRequest = tpaManager.findRequest(player.name, target.name);
    if (existingRequest) {
         player.sendMessage(`§cYou already have an active TPA request with "${target.nameTag}".`);
         return;
    }

    const request = tpaManager.addRequest(player, target, 'tpahere');
    if (request) {
        player.sendMessage(`§aTPA Here request sent to "${target.nameTag}". They have ${config.tpaRequestTimeoutSeconds} seconds to accept. Type ${config.prefix}tpacancel to cancel.`);

        system.run(() => {
            try {
                target.onScreenDisplay.setActionBar(`§e${player.nameTag} has requested you to teleport to them. Use ${config.prefix}tpaccept ${player.nameTag} or ${config.prefix}tpacancel ${player.nameTag}.`);
            } catch (e) {
                // playerUtils?.debugLog could be used here if playerUtils is destructured from dependencies
                console.warn(`[TPAHereCommand] Failed to set action bar for target ${target.nameTag}: ${e}`);
            }
        });
    } else {
        player.sendMessage("§cCould not send TPA Here request. There might be an existing request or other issue.");
    }
}

export const definition = tpahereCommandDefinition;
export const execute = tpahereCommandExecute;
