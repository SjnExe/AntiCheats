/**
 * Script for the !tpacancel command, allowing players to cancel or decline TPA requests.
 */
import { permissionLevels as importedPermissionLevels } from '../core/rankManager.js';
/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: 'tpacancel',
    description: "command.tpacancel.description",
    aliases: ['tpadeny', 'tpcancel'],
    permissionLevel: importedPermissionLevels.normal,
    syntax: '!tpacancel [playerName]',
    enabled: true,
};
/**
 * Executes the !tpacancel command.
 */
export async function execute(player, args, dependencies) {
    const { playerUtils, config, tpaManager, logManager, getString } = dependencies;

    if (!config.enableTPASystem) {
        player.sendMessage(getString('command.tpa.systemDisabled'));
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
                // Message sent by tpaManager.cancelTeleport usually, but if we want a specific one here:
                // const reasonMsgPlayer = getString('tpa.manager.decline.otherCancelledRequester', { targetPlayerName: otherPlayerName });
                // For now, tpaManager handles the notification based on who initiated cancel.
                // Log reason needs to be constructed before cancelTeleport if it's specific to this command's context.
                const reasonLog = `Request ${request.requestId} between ${request.requesterName} and ${request.targetName} cancelled by ${commandUserName} via command. Status was: ${request.status}.`;

                // The player-facing message for cancellation is now handled by tpaManager.cancelTeleport or declineRequest
                await tpaManager.cancelTeleport(request.requestId, `TPA request involving ${otherPlayerName} cancelled by ${player.nameTag}.`, reasonLog, dependencies);


                player.sendMessage(getString('command.tpacancel.specific.success', { playerName: otherPlayerName }));
                cancelledRequestCount++;
            } else {
                player.sendMessage(getString('command.tpacancel.specific.notFound', { playerName: specificPlayerName }));
                return;
            }
        } else {
            const allPlayerRequests = tpaManager.findRequestsForPlayer(commandUserName);
            if (allPlayerRequests.length === 0) {
                player.sendMessage(getString('command.tpacancel.all.noneFound'));
                return;
            }

            for (const req of allPlayerRequests) {
                if (req.status === 'pending_acceptance' || req.status === 'pending_teleport_warmup') {
                    const otherPlayerName = req.requesterName === commandUserName ? req.targetName : req.requesterName;
                    const reasonLog = `Request ${req.requestId} between ${req.requesterName} and ${req.targetName} cancelled by ${commandUserName} via command (all). Status was: ${req.status}.`;
                    await tpaManager.cancelTeleport(req.requestId, `TPA request involving ${otherPlayerName} cancelled by ${player.nameTag}.`, reasonLog, dependencies);
                    cancelledRequestCount++;
                }
            }

            let summaryMessage;
            if (cancelledRequestCount > 0) {
                summaryMessage = getString('command.tpacancel.all.success', { count: cancelledRequestCount.toString() });
            } else {
                summaryMessage = getString('command.tpacancel.all.noneCancellable');
            }
            player.sendMessage(summaryMessage.trim());
        }
    } catch (error) {
        console.error(`[TpaCancelCommand] Error for ${player.nameTag}: ${error.stack || error}`);
        player.sendMessage(getString('command.tpacancel.error.generic'));
        logManager.addLog({actionType: 'error', details: `[TpaCancelCommand] ${player.nameTag} error: ${error.stack || error}`}, dependencies);
    }
}
