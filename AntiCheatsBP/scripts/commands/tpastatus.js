/**
 * @file Script for the !tpastatus command, allowing players to manage their TPA request availability.
 * @version 1.0.2
 */

import { world, system } from '@minecraft/server'; // system is used
// tpaManager, permissionLevels, getString will be from dependencies.

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: 'tpastatus',
    description: "command.tpastatus.description", // Key
    aliases: ['tpatoggle'],
    permissionLevel: null, // To be set from dependencies.permissionLevels.normal
    syntax: '!tpastatus [on|off|status]',
    enabled: true, // Will be checked against dependencies.config.enableTPASystem
};

/**
 * Executes the !tpastatus command.
 * @param {import('@minecraft/server').Player} player The player issuing the command.
 * @param {string[]} args The command arguments. args[0] can be 'on', 'off', or 'status'.
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

    const option = args[0] ? args[0].toLowerCase() : 'status';

    try {
        switch (option) {
            case 'on':
                tpaManager.setPlayerTpaStatus(player.name, true, dependencies);
                // "command.tpastatus.nowEnabled" -> "§aYou are now accepting TPA requests."
                player.sendMessage("§aYou are now accepting TPA requests.");
                break;
            case 'off':
                tpaManager.setPlayerTpaStatus(player.name, false, dependencies);
                // "command.tpastatus.nowDisabled" -> "§cYou are no longer accepting TPA requests."
                player.sendMessage("§cYou are no longer accepting TPA requests.");

                const incomingRequests = tpaManager.findRequestsForPlayer(player.name)
                    .filter(req => req.targetName === player.name && Date.now() < req.expiryTimestamp);

                if (incomingRequests.length > 0) {
                    let declinedCount = 0;
                    for (const req of incomingRequests) {
                        await tpaManager.declineRequest(req.requestId, dependencies);
                        const requesterPlayer = world.getAllPlayers().find(p => p.name === req.requesterName);
                        if (requesterPlayer) {
                            system.run(() => {
                                try {
                                    // "command.tpastatus.notifyRequester_declined" -> "§e{targetPlayerName} is no longer accepting TPA requests; your request was automatically declined."
                                    requesterPlayer.onScreenDisplay.setActionBar(`§e${player.nameTag} is no longer accepting TPA requests; your request was automatically declined.`);
                                } catch (e) {
                                    if (config.enableDebugLogging && playerUtils?.debugLog) {
                                        playerUtils.debugLog(`[TpaStatusCommand] Failed to set action bar for ${req.requesterName}: ${e.stack || e}`, player.nameTag, dependencies);
                                    }
                                }
                            });
                            requesterPlayer.sendMessage(`§e${player.nameTag} is no longer accepting TPA requests; your request was automatically declined.`);
                        }
                        declinedCount++;
                    }
                    if (declinedCount > 0) {
                        // "command.tpastatus.nowDisabledDeclined" -> "§e{count} pending incoming TPA request(s) were automatically declined."
                        player.sendMessage(`§e${declinedCount} pending incoming TPA request(s) were automatically declined.`);
                    }
                }
                break;
            case 'status':
                const currentStatus = tpaManager.getPlayerTpaStatus(player.name, dependencies);
                if (currentStatus.acceptsTpaRequests) {
                    // "command.tpastatus.current.enabled" -> "§aYou are currently accepting TPA requests."
                    player.sendMessage("§aYou are currently accepting TPA requests.");
                } else {
                    // "command.tpastatus.current.disabled" -> "§cYou are currently not accepting TPA requests."
                    player.sendMessage("§cYou are currently not accepting TPA requests.");
                }
                break;
            default:
                // "command.tpastatus.error.invalidOption" -> "§cInvalid option. Usage: {prefix}tpastatus [on|off|status]"
                player.sendMessage(`§cInvalid option. Usage: ${prefix}tpastatus [on|off|status]`);
                break;
        }
    } catch (error) {
        console.error(`[TpaStatusCommand] Error for ${player.nameTag} processing option ${option}: ${error.stack || error}`);
        // "common.error.generic" -> "§cAn unexpected error occurred."
        player.sendMessage("§cAn unexpected error occurred.");
        if(logManager) {
            logManager.addLog({actionType: 'error', details: `[TpaStatusCommand] ${player.nameTag} error (option: ${option}): ${error.stack || error}`});
        }
    }
}
