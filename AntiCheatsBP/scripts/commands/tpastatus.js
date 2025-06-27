/**
 * Script for the !tpastatus command, allowing players to manage their TPA request availability.
 */
import * as mc from '@minecraft/server'; // Import mc for world and system
import { permissionLevels as importedPermissionLevels } from '../core/rankManager.js'; // Import permissionLevels
/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: 'tpastatus',
    description: "command.tpastatus.description",
    aliases: ['tpatoggle'],
    permissionLevel: importedPermissionLevels.normal, // Set directly
    syntax: '!tpastatus [on|off|status]',
    enabled: true,
};
/**
 * Executes the !tpastatus command.
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

    const option = args[0] ? args[0].toLowerCase() : 'status';

    try {
        switch (option) {
            case 'on':
                tpaManager.setPlayerTpaStatus(player.name, true, dependencies);
                player.sendMessage("§aYou are now accepting TPA requests.");
                break;
            case 'off':
                tpaManager.setPlayerTpaStatus(player.name, false, dependencies);
                player.sendMessage("§cYou are no longer accepting TPA requests.");

                const incomingRequests = tpaManager.findRequestsForPlayer(player.name)
                    .filter(req => req.targetName === player.name && Date.now() < req.expiryTimestamp);

                if (incomingRequests.length > 0) {
                    let declinedCount = 0;
                    for (const req of incomingRequests) {
                        await tpaManager.declineRequest(req.requestId, dependencies);
                        const requesterPlayer = mc.world.getAllPlayers().find(p => p.name === req.requesterName);
                        if (requesterPlayer) {
                            mc.system.run(() => {
                                try {
                                    requesterPlayer.onScreenDisplay.setActionBar(`§e${player.nameTag} is no longer accepting TPA requests; your request was automatically declined.`);
                                } catch (e) {
                                    if (config.enableDebugLogging) {
                                        playerUtils.debugLog(`[TpaStatusCommand] Failed to set action bar for ${req.requesterName}: ${e.stack || e}`, player.nameTag, dependencies);
                                    }
                                }
                            });
                            requesterPlayer.sendMessage(`§e${player.nameTag} is no longer accepting TPA requests; your request was automatically declined.`);
                        }
                        declinedCount++;
                    }
                    if (declinedCount > 0) {
                        player.sendMessage(`§e${declinedCount} pending incoming TPA request(s) were automatically declined.`);
                    }
                }
                break;
            case 'status':
                const currentStatus = tpaManager.getPlayerTpaStatus(player.name, dependencies);
                if (currentStatus.acceptsTpaRequests) {
                    player.sendMessage("§aYou are currently accepting TPA requests.");
                } else {
                    player.sendMessage("§cYou are currently not accepting TPA requests.");
                }
                break;
            default:
                player.sendMessage(`§cInvalid option. Usage: ${prefix}tpastatus [on|off|status]`);
                break;
        }
    } catch (error) {
        console.error(`[TpaStatusCommand] Error for ${player.nameTag} processing option ${option}: ${error.stack || error}`);
        player.sendMessage("§cAn unexpected error occurred.");
        logManager.addLog({actionType: 'error', details: `[TpaStatusCommand] ${player.nameTag} error (option: ${option}): ${error.stack || error}`}, dependencies);
    }
}
