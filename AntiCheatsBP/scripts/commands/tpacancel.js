/**
 * @file Script for the !tpacancel command, allowing players to cancel or decline TPA requests.
 * @version 1.0.2
 */

import { world, system } from '@minecraft/server';
// import * as config from '../config.js'; // No direct config needed here, prefix comes from dependencies
import * as tpaManager from '../core/tpaManager.js';
import { permissionLevels } from '../core/rankManager.js';
import { getString } from '../core/i18n.js'; // Import getString

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: 'tpacancel',
    description: getString("command.tpacancel.description"),
    aliases: ['tpadeny', 'tpcancel'],
    permissionLevel: permissionLevels.normal,
    syntax: '!tpacancel [playerName]',
    enabled: true,
};

/**
 * Executes the !tpacancel command.
 * @param {import('@minecraft/server').Player} player The player issuing the command.
 * @param {string[]} args The command arguments. args[0] can be the other player's name.
 * @param {import('../types.js').CommandDependencies} dependencies Command dependencies.
 */
export async function execute(player, args, dependencies) {
    const { playerUtils, config: fullConfig } = dependencies; // config is editableConfigValues, fullConfig is the module
    const prefix = fullConfig.prefix;


    if (!fullConfig.enableTPASystem) { // Check against the main config module
        player.sendMessage(getString("command.tpa.systemDisabled"));
        return;
    }

    const commandUserName = player.name;
    const specificPlayerName = args[0];
    let cancelledRequestCount = 0;

    if (specificPlayerName) {
        const request = tpaManager.findRequest(commandUserName, specificPlayerName);

        if (request && (request.status === 'pending_acceptance' || request.status === 'pending_teleport_warmup')) {
            const otherPlayerName = request.requesterName === commandUserName ? request.targetName : request.requesterName;
            const reasonMsgPlayer = getString("command.tpacancel.notifyOther.cancelled", { otherPlayerName: otherPlayerName, cancellingPlayerName: player.nameTag });
            const reasonLog = `Request ${request.requestId} between ${request.requesterName} and ${request.targetName} cancelled by ${commandUserName}. Status was: ${request.status}.`;

            // Pass dependencies to cancelTeleport
            tpaManager.cancelTeleport(request.requestId, reasonMsgPlayer, reasonLog, dependencies);

            player.sendMessage(getString("command.tpacancel.success.specific", { playerName: otherPlayerName }));
            cancelledRequestCount++;
        } else {
            player.sendMessage(getString("command.tpacancel.error.noSpecificRequest", { playerName: specificPlayerName }));
            return;
        }
    } else {
        const allPlayerRequests = tpaManager.findRequestsForPlayer(commandUserName);
        if (allPlayerRequests.length === 0) {
            player.sendMessage(getString("command.tpacancel.error.noRequests"));
            return;
        }

        for (const req of allPlayerRequests) {
            if (req.status === 'pending_acceptance' || req.status === 'pending_teleport_warmup') {
                const otherPlayerName = req.requesterName === commandUserName ? req.targetName : req.requesterName;
                const reasonMsgPlayer = getString("command.tpacancel.notifyOther.cancelled", { otherPlayerName: otherPlayerName, cancellingPlayerName: player.nameTag });
                const reasonLog = `Request ${req.requestId} between ${req.requesterName} and ${req.targetName} cancelled by ${commandUserName}. Status was: ${req.status}.`;

                // Pass dependencies to cancelTeleport
                tpaManager.cancelTeleport(req.requestId, reasonMsgPlayer, reasonLog, dependencies);
                cancelledRequestCount++;
            }
        }

        let summaryMessage;
        if (cancelledRequestCount > 0) {
            summaryMessage = getString("command.tpacancel.success.all", { count: cancelledRequestCount });
        } else {
            summaryMessage = getString("command.tpacancel.error.noneCancellable");
        }
        player.sendMessage(summaryMessage.trim());
    }
}
