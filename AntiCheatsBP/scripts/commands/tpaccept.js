/**
 * @file Script for the !tpaccept command, allowing players to accept incoming TPA requests.
 * @version 1.0.1
 */

import { world, system } from '@minecraft/server';
// import * as config from '../config.js'; // config.prefix is used, but should come from dependencies.configModule.prefix
import * as tpaManager from '../core/tpaManager.js';
import { permissionLevels } from '../core/rankManager.js';
import { getString } from '../../core/localizationManager.js'; // Import getString

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: 'tpaccept',
    description: getString("command.tpaccept.description"),
    aliases: ['tpaaccept'],
    permissionLevel: permissionLevels.normal,
    syntax: '!tpaccept [playerName]',
};

/**
 * Executes the !tpaccept command.
 * @param {import('@minecraft/server').Player} player The player issuing the command (the one accepting).
 * @param {string[]} args The command arguments. args[0] can be the requester's name.
 * @param {import('../types.js').CommandDependencies} dependencies Command dependencies.
 */
export async function execute(player, args, dependencies) {
    const { playerUtils, config: fullConfig } = dependencies; // config here is editableConfigValues, fullConfig is the module
    const prefix = fullConfig.prefix; // Use prefix from the main config module via dependencies


    if (!fullConfig.enableTPASystem) {
        player.sendMessage(getString("command.tpa.systemDisabled"));
        return;
    }

    const acceptingPlayerName = player.name;
    const specificRequesterName = args[0];
    let requestToAccept = null;

    const incomingRequests = tpaManager.findRequestsForPlayer(acceptingPlayerName)
        .filter(req => req.targetName === acceptingPlayerName && Date.now() < req.expiryTimestamp);

    if (incomingRequests.length === 0) {
        player.sendMessage(getString("command.tpaccept.error.noPending"));
        return;
    }

    if (specificRequesterName) {
        requestToAccept = incomingRequests.find(req => req.requesterName.toLowerCase() === specificRequesterName.toLowerCase());
        if (!requestToAccept) {
            player.sendMessage(getString("command.tpaccept.error.noRequestFrom", { playerName: specificRequesterName }));
            player.sendMessage(getString("command.tpaccept.error.pendingFromList", { playerList: incomingRequests.map(r => r.requesterName).join(', ') }));
            return;
        }
    } else {
        incomingRequests.sort((a, b) => b.creationTimestamp - a.creationTimestamp);
        requestToAccept = incomingRequests[0];
    }

    if (!requestToAccept) {
        player.sendMessage(getString("command.tpaccept.error.couldNotFind", { prefix: prefix }));
        return;
    }

    // Pass dependencies to tpaManager.acceptRequest
    const warmUpInitiated = tpaManager.acceptRequest(requestToAccept.requestId, dependencies);


    if (warmUpInitiated) {
        player.sendMessage(getString("command.tpaccept.success", { playerName: requestToAccept.requesterName, warmupSeconds: fullConfig.TPATeleportWarmupSeconds }));
    } else {
        player.sendMessage(getString("command.tpaccept.fail", { playerName: requestToAccept.requesterName }));
    }
}
