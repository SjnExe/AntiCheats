/**
 * @file AntiCheatsBP/scripts/checks/player/clientInfoChecks.js
 * Implements checks related to player client system information.
 * @version 1.0.1
 */
import * as mc from '@minecraft/server';
import { getString } from '../../../core/i18n.js';

/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').Config} Config
 * @typedef {import('../../types.js').PlayerUtils} PlayerUtils
 * @typedef {import('../../core/logManager.js').LogManager} LogManager
 * @typedef {import('../../core/actionManager.js').ActionManager} ActionManager
 * @typedef {import('../../../types.js').ExecuteCheckAction} ExecuteCheckAction
 * @typedef {import('../../../types.js').EventHandlerDependencies} EventHandlerDependencies
 */

/**
 * Checks if a player's reported maximum render distance exceeds the configured allowed limit.
 * @param {mc.Player} player - The player to check.
 * @param {PlayerAntiCheatData} pData - Player-specific anti-cheat data.
 * @param {Config} config - The server configuration object.
 * @param {PlayerUtils} playerUtils - Utility functions for player interactions.
 * @param {LogManager} logManager - Manager for logging.
 * @param {ActionManager | ExecuteCheckAction} actionManagerOrExecuteFn - Manager for handling check actions or the execute function itself.
 * @param {EventHandlerDependencies} dependencies - Broader dependencies object.
 */
export async function checkInvalidRenderDistance(player, pData, config, playerUtils, logManager, actionManagerOrExecuteFn, dependencies) {
    if (!config.enableInvalidRenderDistanceCheck) {
        return;
    }

    const clientSystemInfo = player.clientSystemInfo;
    if (!clientSystemInfo) {
        playerUtils.debugLog(`InvalidRenderDistance: clientSystemInfo not available for ${player.nameTag}.`, pData?.isWatched ? player.nameTag : null);
        return;
    }

    const clientRenderDistance = clientSystemInfo.maxRenderDistance;

    if (typeof clientRenderDistance !== 'number' || clientRenderDistance < 0) {
        playerUtils.debugLog(`InvalidRenderDistance: Invalid or missing maxRenderDistance value (${clientRenderDistance}) for ${player.nameTag}.`, pData?.isWatched ? player.nameTag : null);
        return;
    }

    if (clientRenderDistance > config.maxAllowedClientRenderDistance) {
        const violationDetails = {
            playerName: player.nameTag,
            reportedDistance: clientRenderDistance.toString(),
            maxAllowed: config.maxAllowedClientRenderDistance.toString(),
            detailsString: getString("check.clientInfo.renderDistance.details", {
                reportedDistance: clientRenderDistance.toString(),
                maxAllowed: config.maxAllowedClientRenderDistance.toString()
            })
        };

        let executeActionFn;
        if (typeof actionManagerOrExecuteFn === 'function') {
            executeActionFn = actionManagerOrExecuteFn;
        } else if (actionManagerOrExecuteFn && typeof actionManagerOrExecuteFn.executeCheckAction === 'function') {
            executeActionFn = actionManagerOrExecuteFn.executeCheckAction;
        } else if (dependencies?.actionManager && typeof dependencies.actionManager.executeCheckAction === 'function') {
            executeActionFn = dependencies.actionManager.executeCheckAction;
        }


        if (executeActionFn) {
            await executeActionFn(player, "player_invalid_render_distance", violationDetails, dependencies);
        } else {
            playerUtils.debugLog("InvalidRenderDistance: executeCheckAction not available.", null);
            if (logManager && typeof logManager.addLog === 'function') {
                logManager.addLog({
                    adminName: "System (AntiCheat)",
                    actionType: "error_missing_action_manager",
                    targetName: player.nameTag,
                    details: "executeCheckAction was not available for InvalidRenderDistance check."
                });
            }
        }

        playerUtils.debugLog(`InvalidRenderDistance: Player ${player.nameTag} reported ${clientRenderDistance} chunks, max allowed is ${config.maxAllowedClientRenderDistance}.`, pData?.isWatched ? player.nameTag : null);
    }
}
