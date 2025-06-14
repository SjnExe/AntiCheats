/**
 * @file Script for the !tpastatus command, allowing players to manage their TPA request availability.
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
    name: 'tpastatus',
    description: getString("command.tpastatus.description"),
    aliases: ['tpatoggle'],
    permissionLevel: permissionLevels.normal,
    syntax: '!tpastatus [on|off|status]',
    enabled: true,
};

/**
 * Executes the !tpastatus command.
 * @param {import('@minecraft/server').Player} player The player issuing the command.
 * @param {string[]} args The command arguments. args[0] can be 'on', 'off', or 'status'.
 * @param {import('../types.js').CommandDependencies} dependencies Command dependencies.
 */
export async function execute(player, args, dependencies) {
    const { playerUtils, config: fullConfig } = dependencies;
    const prefix = fullConfig.prefix;

    if (!fullConfig.enableTPASystem) {
        player.sendMessage(getString("command.tpa.systemDisabled"));
        return;
    }

    const option = args[0] ? args[0].toLowerCase() : 'status';

    switch (option) {
        case 'on':
            tpaManager.setPlayerTpaStatus(player.name, true);
            player.sendMessage(getString("command.tpastatus.nowEnabled"));
            break;
        case 'off':
            tpaManager.setPlayerTpaStatus(player.name, false);
            player.sendMessage(getString("command.tpastatus.nowDisabled"));

            const incomingRequests = tpaManager.findRequestsForPlayer(player.name)
                .filter(req => req.targetName === player.name && Date.now() < req.expiryTimestamp);

            if (incomingRequests.length > 0) {
                let declinedCount = 0;
                for (const req of incomingRequests) {
                    // Pass dependencies to declineRequest if it needs them (e.g., for logging or notifications within declineRequest)
                    tpaManager.declineRequest(req.requestId, dependencies);
                    const requesterPlayer = world.getAllPlayers().find(p => p.name === req.requesterName);
                    if (requesterPlayer) {
                        system.run(() => {
                            try {
                                requesterPlayer.onScreenDisplay.setActionBar(getString("command.tpastatus.notifyRequester.declined", {targetPlayerName: player.nameTag}));
                            } catch (e) {
                                if (fullConfig.enableDebugLogging && playerUtils?.debugLog) {
                                    playerUtils.debugLog(`[TPAStatusCmd] Failed to set action bar for ${req.requesterName}: ${e}`, player.nameTag);
                                } else {
                                    console.warn(`[TPAStatusCmd] Failed to set action bar for ${req.requesterName}: ${e}`);
                                }
                            }
                        });
                        // Also send a chat message as action bar can be missed
                        requesterPlayer.sendMessage(getString("command.tpastatus.notifyRequester.declined", {targetPlayerName: player.nameTag}));
                    }
                    declinedCount++;
                }
                if (declinedCount > 0) {
                    player.sendMessage(getString("command.tpastatus.nowDisabledDeclined", {count: declinedCount})); // Corrected potential extra space
                }
            }
            break;
        case 'status':
            const currentStatus = tpaManager.getPlayerTpaStatus(player.name);
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
}
