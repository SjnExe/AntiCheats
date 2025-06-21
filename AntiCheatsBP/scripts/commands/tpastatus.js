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
    const { playerUtils, config, tpaManager, permissionLevels, getString, logManager } = dependencies;

    definition.description = getString(definition.description);
    definition.permissionLevel = permissionLevels.normal;

    const prefix = config.prefix;

    if (!config.enableTPASystem) {
        player.sendMessage(getString("command.tpa.systemDisabled"));
        return;
    }

    const option = args[0] ? args[0].toLowerCase() : 'status';

    try {
        switch (option) {
            case 'on':
                tpaManager.setPlayerTpaStatus(player.name, true, dependencies); // Pass dependencies
                player.sendMessage(getString("command.tpastatus.nowEnabled"));
                break;
            case 'off':
                tpaManager.setPlayerTpaStatus(player.name, false, dependencies); // Pass dependencies
                player.sendMessage(getString("command.tpastatus.nowDisabled"));

                // findRequestsForPlayer does not require dependencies
                const incomingRequests = tpaManager.findRequestsForPlayer(player.name)
                    .filter(req => req.targetName === player.name && Date.now() < req.expiryTimestamp);

                if (incomingRequests.length > 0) {
                    let declinedCount = 0;
                    for (const req of incomingRequests) {
                        await tpaManager.declineRequest(req.requestId, dependencies); // Pass dependencies
                        const requesterPlayer = world.getAllPlayers().find(p => p.name === req.requesterName);
                        if (requesterPlayer) {
                            system.run(() => {
                                try {
                                    requesterPlayer.onScreenDisplay.setActionBar(getString("command.tpastatus.notifyRequester.declined", {targetPlayerName: player.nameTag}));
                                } catch (e) {
                                    if (config.enableDebugLogging && playerUtils?.debugLog) {
                                        playerUtils.debugLog(`[TpaStatusCommand] Failed to set action bar for ${req.requesterName}: ${e.stack || e}`, player.nameTag, dependencies);
                                    } else {
                                        // Consider a less intrusive log if debugLog is off, or remove.
                                        // console.warn(`[TpaStatusCommand] Failed to set action bar for ${req.requesterName}: ${e}`);
                                    }
                                }
                            });
                            requesterPlayer.sendMessage(getString("command.tpastatus.notifyRequester.declined", {targetPlayerName: player.nameTag}));
                        }
                        declinedCount++;
                    }
                    if (declinedCount > 0) {
                        player.sendMessage(getString("command.tpastatus.nowDisabledDeclined", {count: declinedCount}));
                    }
                }
                break;
            case 'status':
                const currentStatus = tpaManager.getPlayerTpaStatus(player.name, dependencies); // Pass dependencies
                if (currentStatus.acceptsTpaRequests) {
                    player.sendMessage(getString("command.tpastatus.current.enabled"));
                } else {
                    player.sendMessage(getString("command.tpastatus.current.disabled"));
                }
                break;
            default:
                player.sendMessage(getString("command.tpastatus.error.invalidOption", { prefix: prefix }));
                break;
        }
    } catch (error) {
        console.error(`[TpaStatusCommand] Error for ${player.nameTag} processing option ${option}: ${error.stack || error}`);
        player.sendMessage(getString("common.error.genericCommand"));
        if(logManager) {
            logManager.addLog({actionType: 'error', details: `[TpaStatusCommand] ${player.nameTag} error (option: ${option}): ${error.stack || error}`});
        }
    }
}
