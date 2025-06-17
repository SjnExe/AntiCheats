/**
 * @file Script for the !tpacancel command, allowing players to cancel or decline TPA requests.
 * @version 1.0.2
 */

import { world, system } from '@minecraft/server'; // system is not used, world might not be needed directly
// tpaManager, permissionLevels, getString will be from dependencies.

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: 'tpacancel',
    description: "command.tpacancel.description", // Key
    aliases: ['tpadeny', 'tpcancel'],
    permissionLevel: null, // To be set from dependencies.permissionLevels.normal
    syntax: '!tpacancel [playerName]',
    enabled: true, // Will be checked against dependencies.config.enableTPASystem
};

/**
 * Executes the !tpacancel command.
 * @param {import('@minecraft/server').Player} player The player issuing the command.
 * @param {string[]} args The command arguments. args[0] can be the other player's name.
 * @param {import('../types.js').CommandDependencies} dependencies Command dependencies.
 */
export async function execute(player, args, dependencies) {
    const { playerUtils, config, tpaManager, permissionLevels, getString, logManager } = dependencies;

    definition.description = getString(definition.description);
    definition.permissionLevel = permissionLevels.normal;

    const prefix = config.prefix;

    if (!config.enableTPASystem) {
        player.sendMessage(getString("command.tpa.systemDisabled"));
        return;
    }

    const commandUserName = player.name;
    const specificPlayerName = args[0];
    let cancelledRequestCount = 0;

    try {
        if (specificPlayerName) {
            // findRequest does not require dependencies
            const request = tpaManager.findRequest(commandUserName, specificPlayerName);

            if (request && (request.status === 'pending_acceptance' || request.status === 'pending_teleport_warmup')) {
                const otherPlayerName = request.requesterName === commandUserName ? request.targetName : request.requesterName;
                const reasonMsgPlayer = getString("command.tpacancel.notifyOther.cancelled", { otherPlayerName: otherPlayerName, cancellingPlayerName: player.nameTag });
                const reasonLog = `Request ${request.requestId} between ${request.requesterName} and ${request.targetName} cancelled by ${commandUserName}. Status was: ${request.status}.`;

                await tpaManager.cancelTeleport(request.requestId, reasonMsgPlayer, reasonLog, dependencies);

                player.sendMessage(getString("command.tpacancel.success.specific", { playerName: otherPlayerName }));
                cancelledRequestCount++;
            } else {
                player.sendMessage(getString("command.tpacancel.error.noSpecificRequest", { playerName: specificPlayerName }));
                return;
            }
        } else {
            // findRequestsForPlayer does not require dependencies
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

                    await tpaManager.cancelTeleport(req.requestId, reasonMsgPlayer, reasonLog, dependencies);
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
    } catch (error) {
        console.error(`[TpaCancelCommand] Error for ${player.nameTag}: ${error.stack || error}`);
        player.sendMessage(getString("common.error.genericCommand"));
        if(logManager) {
            logManager.addLog({actionType: 'error', details: `[TpaCancelCommand] ${player.nameTag} error: ${error.stack || error}`});
        }
    }
}
