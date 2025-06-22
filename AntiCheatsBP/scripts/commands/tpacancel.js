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
    const { playerUtils, config, tpaManager, permissionLevels, logManager } = dependencies; // getString removed

    // definition.description is static (or resolved by help command if it was a key)
    if (definition.permissionLevel === null) {
        definition.permissionLevel = permissionLevels.normal;
    }

    const prefix = config.prefix;

    if (!config.enableTPASystem) {
        // "command.tpa.systemDisabled" -> "§cThe TPA system is currently disabled."
        player.sendMessage("§cThe TPA system is currently disabled.");
        return;
    }

    const commandUserName = player.name;
    const specificPlayerName = args[0];
    let cancelledRequestCount = 0;

    try {
        if (specificPlayerName) {
            const request = tpaManager.findRequest(commandUserName, specificPlayerName);

            if (request && (request.status === 'pending_acceptance' || request.status === 'pending_teleport_warmup')) {
                const otherPlayerName = request.requesterName === commandUserName ? request.targetName : request.requesterName;
                // "command.tpacancel.notifyOther.cancelled" -> "§eTPA request involving \"{otherPlayerName}\" was cancelled by {cancellingPlayerName}."
                const reasonMsgPlayer = `§eTPA request involving "${otherPlayerName}" was cancelled by ${player.nameTag}.`;
                const reasonLog = `Request ${request.requestId} between ${request.requesterName} and ${request.targetName} cancelled by ${commandUserName}. Status was: ${request.status}.`;

                await tpaManager.cancelTeleport(request.requestId, reasonMsgPlayer, reasonLog, dependencies);

                // "command.tpacancel.success.specific" -> "§aSuccessfully cancelled/declined TPA request involving \"{playerName}\"."
                player.sendMessage(`§aSuccessfully cancelled/declined TPA request involving "${otherPlayerName}".`);
                cancelledRequestCount++;
            } else {
                // "command.tpacancel.error.noSpecificRequest" -> "§cNo active or pending TPA request found with \"{playerName}\" that can be cancelled."
                player.sendMessage(`§cNo active or pending TPA request found with "${specificPlayerName}" that can be cancelled.`);
                return;
            }
        } else {
            const allPlayerRequests = tpaManager.findRequestsForPlayer(commandUserName);
            if (allPlayerRequests.length === 0) {
                // "command.tpacancel.error.noRequests" -> "§cYou have no active TPA requests to cancel or decline."
                player.sendMessage("§cYou have no active TPA requests to cancel or decline.");
                return;
            }

            for (const req of allPlayerRequests) {
                if (req.status === 'pending_acceptance' || req.status === 'pending_teleport_warmup') {
                    const otherPlayerName = req.requesterName === commandUserName ? req.targetName : req.requesterName;
                    const reasonMsgPlayer = `§eTPA request involving "${otherPlayerName}" was cancelled by ${player.nameTag}.`;
                    const reasonLog = `Request ${req.requestId} between ${req.requesterName} and ${req.targetName} cancelled by ${commandUserName}. Status was: ${req.status}.`;

                    await tpaManager.cancelTeleport(req.requestId, reasonMsgPlayer, reasonLog, dependencies);
                    cancelledRequestCount++;
                }
            }

            let summaryMessage;
            if (cancelledRequestCount > 0) {
                // "command.tpacancel.success.all" -> "§aCancelled/declined {count} TPA request(s)."
                summaryMessage = `§aCancelled/declined ${cancelledRequestCount} TPA request(s).`;
            } else {
                // "command.tpacancel.error.noneCancellable" -> "§cNo active requests were found in a state that could be cancelled/declined."
                summaryMessage = "§cNo active requests were found in a state that could be cancelled/declined.";
            }
            player.sendMessage(summaryMessage.trim());
        }
    } catch (error) {
        console.error(`[TpaCancelCommand] Error for ${player.nameTag}: ${error.stack || error}`);
        // "common.error.generic" -> "§cAn unexpected error occurred."
        player.sendMessage("§cAn unexpected error occurred.");
        if(logManager) {
            logManager.addLog({actionType: 'error', details: `[TpaCancelCommand] ${player.nameTag} error: ${error.stack || error}`});
        }
    }
}
