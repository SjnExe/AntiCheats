/**
 * Implements checks related to player client system information, such as render distance.
 */
import * as mc from '@minecraft/server';
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

    const watchedPrefix = pData?.isWatched ? player.nameTag : null;
    const clientSystemInfo = player.clientSystemInfo;

    if (!clientSystemInfo) {
        playerUtils.debugLog(`[InvalidRenderDistanceCheck] clientSystemInfo not available for ${player.nameTag}.`, watchedPrefix, dependencies);
        return;
    }

    const clientRenderDistance = clientSystemInfo.maxRenderDistance;

    if (typeof clientRenderDistance !== 'number' || clientRenderDistance < 0) {
        playerUtils.debugLog(`[InvalidRenderDistanceCheck] Invalid or missing maxRenderDistance value (${clientRenderDistance}) for ${player.nameTag}.`, watchedPrefix, dependencies);
        return;
    }

    if (clientRenderDistance > config.maxAllowedClientRenderDistance) {
        const violationDetails = {
            playerName: player.nameTag,
            reportedDistance: clientRenderDistance.toString(),
            maxAllowed: config.maxAllowedClientRenderDistance.toString(),
            detailsString: `Reported: ${clientRenderDistance.toString()}, Max: ${config.maxAllowedClientRenderDistance.toString()}`
        };

        if (actionManager && typeof actionManager.executeCheckAction === 'function') {
            await actionManager.executeCheckAction(player, "playerInvalidRenderDistance", violationDetails, dependencies);
        } else {
            playerUtils.debugLog("[InvalidRenderDistanceCheck] actionManager.executeCheckAction not available in dependencies for critical logging.", null, dependencies);
            if (logManager && typeof logManager.addLog === 'function') {
                 logManager.addLog({
                    adminName: "System (AntiCheat)",
                    actionType: "errorMissingActionManager",
                    targetName: player.nameTag,
                    details: "executeCheckAction was not available for InvalidRenderDistance check."
                }, dependencies);
            }
        }

        playerUtils.debugLog(`[InvalidRenderDistanceCheck] Player ${player.nameTag} reported ${clientRenderDistance} chunks, max allowed is ${config.maxAllowedClientRenderDistance}.`, watchedPrefix, dependencies);
    }
}
