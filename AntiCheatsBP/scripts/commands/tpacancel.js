/**
 * Script for the !tpacancel command, allowing players to cancel or decline TPA requests.
 */
import { world, system } from '@minecraft/server';
import { permissionLevels as importedPermissionLevels } from '../core/rankManager.js'; // Import permissionLevels
/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: 'tpacancel',
    description: "command.tpacancel.description",
    aliases: ['tpadeny', 'tpcancel'],
    permissionLevel: importedPermissionLevels.normal, // Set directly
    syntax: '!tpacancel [playerName]',
    enabled: true,
};
/**
 * Executes the !tpacancel command.
 */
export async function execute(player, args, dependencies) {
    // Use permissionLevels from dependencies for runtime checks if necessary
    const { playerUtils, config, tpaManager, permissionLevels: execPermissionLevels, logManager } = dependencies;

    // definition.permissionLevel is now set at module load time.
    // The check `if (definition.permissionLevel === null)` is no longer needed.

    const prefix = config.prefix;

    if (!config.enableTPASystem) {
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
                const reasonMsgPlayer = `§eTPA request involving "${otherPlayerName}" was cancelled by ${player.nameTag}.`;
                const reasonLog = `Request ${request.requestId} between ${request.requesterName} and ${request.targetName} cancelled by ${commandUserName}. Status was: ${request.status}.`;

                await tpaManager.cancelTeleport(request.requestId, reasonMsgPlayer, reasonLog, dependencies);

                player.sendMessage(`§aSuccessfully cancelled/declined TPA request involving "${otherPlayerName}".`);
                cancelledRequestCount++;
            } else {
                player.sendMessage(`§cNo active or pending TPA request found with "${specificPlayerName}" that can be cancelled.`);
                return;
            }
        } else {
            const allPlayerRequests = tpaManager.findRequestsForPlayer(commandUserName);
            if (allPlayerRequests.length === 0) {
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
                summaryMessage = `§aCancelled/declined ${cancelledRequestCount} TPA request(s).`;
            } else {
                summaryMessage = "§cNo active requests were found in a state that could be cancelled/declined.";
            }
            player.sendMessage(summaryMessage.trim());
        }
    } catch (error) {
        console.error(`[TpaCancelCommand] Error for ${player.nameTag}: ${error.stack || error}`);
        player.sendMessage("§cAn unexpected error occurred.");
        logManager.addLog({actionType: 'error', details: `[TpaCancelCommand] ${player.nameTag} error: ${error.stack || error}`}, dependencies);
    }
}
