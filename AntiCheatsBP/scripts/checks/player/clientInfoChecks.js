/**
 * @file AntiCheatsBP/scripts/checks/player/clientInfoChecks.js
 * Implements checks related to player client system information, such as render distance.
 * @version 1.1.0
 */
import * as mc from '@minecraft/server';
import { getString } from '../../../core/i18n.js';

/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').CommandDependencies} CommandDependencies
 */

/**
 * Checks if a player's reported maximum render distance exceeds the configured allowed limit.
 * @param {mc.Player} player - The player to check.
 * @param {PlayerAntiCheatData} pData - Player-specific anti-cheat data.
 * @param {CommandDependencies} dependencies - Object containing necessary dependencies like config, playerUtils, logManager, actionManager, etc.
 * @returns {Promise<void>}
 */
export async function checkInvalidRenderDistance(player, pData, dependencies) {
    const { config, playerUtils, logManager, actionManager } = dependencies;

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

        if (actionManager && typeof actionManager.executeCheckAction === 'function') {
            await actionManager.executeCheckAction(player, "playerInvalidRenderDistance", violationDetails, dependencies);
        } else {
            playerUtils.debugLog("InvalidRenderDistance: actionManager.executeCheckAction not available in dependencies for critical logging.", null);
            if (logManager && typeof logManager.addLog === 'function') { // Fallback critical log
                 logManager.addLog({
                    adminName: "System (AntiCheat)",
                    actionType: "errorMissingActionManager",
                    targetName: player.nameTag,
                    details: "executeCheckAction was not available for InvalidRenderDistance check."
                });
            }
        }

        playerUtils.debugLog(`InvalidRenderDistance: Player ${player.nameTag} reported ${clientRenderDistance} chunks, max allowed is ${config.maxAllowedClientRenderDistance}.`, pData?.isWatched ? player.nameTag : null);
    }
}
