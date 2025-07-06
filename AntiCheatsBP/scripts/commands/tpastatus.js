/**
 * Script for the !tpastatus command, allowing players to manage their TPA request availability.
 */
import * as mc from '@minecraft/server'; // Import mc for world and system
import { permissionLevels as importedPermissionLevels } from '../core/rankManager.js';
/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: 'tpastatus',
    description: "command.tpastatus.description",
    aliases: ['tpatoggle'],
    permissionLevel: importedPermissionLevels.normal,
    syntax: '!tpastatus [on|off|status]',
    enabled: true,
};
/**
 * Executes the !tpastatus command.
 */
export async function execute(player, args, dependencies) {
    const { playerUtils, config, tpaManager, logManager, getString } = dependencies;
    const prefix = config.prefix;

    if (!config.enableTPASystem) {
        player.sendMessage(getString('command.tpa.systemDisabled'));
        return;
    }

    const option = args[0] ? args[0].toLowerCase() : 'status';

    try {
        switch (option) {
            case 'on':
                tpaManager.setPlayerTpaStatus(player.name, true, dependencies);
                player.sendMessage(getString('command.tpastatus.on'));
                break;
            case 'off':
                tpaManager.setPlayerTpaStatus(player.name, false, dependencies);
                player.sendMessage(getString('command.tpastatus.off'));

                const incomingRequests = tpaManager.findRequestsForPlayer(player.name)
                    .filter(req => req.targetName === player.name && Date.now() < req.expiryTimestamp);

                if (incomingRequests.length > 0) {
                    let declinedCount = 0;
                    for (const req of incomingRequests) {
                        await tpaManager.declineRequest(req.requestId, dependencies);
                        const requesterPlayer = mc.world.getAllPlayers().find(p => p.name === req.requesterName);
                        if (requesterPlayer?.isValid()) { // Check validity
                            const declineMessage = getString('tpa.notify.actionBar.autoDeclined', { playerName: player.nameTag });
                            mc.system.run(() => {
                                try {
                                    requesterPlayer.onScreenDisplay.setActionBar(declineMessage);
                                } catch (e) {
                                    if (config.enableDebugLogging) {
                                        playerUtils.debugLog(`[TpaStatusCommand] Failed to set action bar for ${req.requesterName}: ${e.stack || e}`, player.nameTag, dependencies);
                                    }
                                }
                            });
                            requesterPlayer.sendMessage(declineMessage);
                        }
                        declinedCount++;
                    }
                    if (declinedCount > 0) {
                        player.sendMessage(getString('command.tpastatus.off.declinedNotification', { count: declinedCount.toString() }));
                    }
                }
                break;
            case 'status':
                const currentStatus = tpaManager.getPlayerTpaStatus(player.name, dependencies);
                if (currentStatus.acceptsTpaRequests) {
                    player.sendMessage(getString('command.tpastatus.status.accepting'));
                } else {
                    player.sendMessage(getString('command.tpastatus.status.notAccepting'));
                }
                break;
            default:
                player.sendMessage(getString('command.tpastatus.invalidOption', { prefix: prefix }));
                break;
        }
    } catch (error) {
        console.error(`[TpaStatusCommand] Error for ${player.nameTag} processing option ${option}: ${error.stack || error}`);
        player.sendMessage(getString('command.tpacancel.error.generic')); // Reusing generic error
        logManager.addLog({
            actionType: 'errorTpaStatusCommand',
            context: 'tpastatus.execute',
            details: {
                playerName: player.nameTag,
                commandArgs: args,
                option: option,
                errorMessage: error.message,
                stack: error.stack
            }
        }, dependencies);
    }
}
