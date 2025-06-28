/**
 * @file Implements checks related to player client system information, such as render distance.
 */

/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').CommandDependencies} CommandDependencies
 * @typedef {import('../../types.js').Config} Config
 */

/**
 * Checks if a player's reported maximum render distance exceeds the configured allowed limit.
 * This check is typically run periodically or on player spawn/join.
 *
 * @async
 * @param {import('@minecraft/server').Player} player - The player to check.
 * @param {PlayerAntiCheatData} pData - Player-specific anti-cheat data (used for watched status).
 * @param {CommandDependencies} dependencies - Object containing necessary dependencies.
 * @returns {Promise<void>}
 */
export async function checkInvalidRenderDistance(player, pData, dependencies) {
    const { config, playerUtils, logManager, actionManager } = dependencies;

    if (!config.enableInvalidRenderDistanceCheck) {
        return;
    }

    const watchedPrefix = pData?.isWatched ? player.nameTag : null; // Used for contextual debug logging

    // Ensure clientSystemInfo is available. It might not be immediately on player join.
    if (!player.clientSystemInfo) {
        playerUtils.debugLog(`[InvalidRenderDistanceCheck] clientSystemInfo not yet available for ${player.nameTag}. Will check later.`, watchedPrefix, dependencies);
        return;
    }

    const clientRenderDistance = player.clientSystemInfo.maxRenderDistance;

    // Validate the reported render distance
    if (typeof clientRenderDistance !== 'number' || clientRenderDistance < 0) {
        playerUtils.debugLog(`[InvalidRenderDistanceCheck] Invalid or missing maxRenderDistance value (${clientRenderDistance}) for ${player.nameTag}.`, watchedPrefix, dependencies);
        return;
    }

    if (clientRenderDistance > config.maxAllowedClientRenderDistance) {
        const violationDetails = {
            playerName: player.nameTag, // Kept for direct use in some notification templates
            reportedDistance: clientRenderDistance.toString(),
            maxAllowed: config.maxAllowedClientRenderDistance.toString(),
        };

        // Standardized action profile key
        const actionProfileKey = 'playerInvalidRenderDistance';
        if (actionManager && typeof actionManager.executeCheckAction === 'function') {
            await actionManager.executeCheckAction(player, actionProfileKey, violationDetails, dependencies);
        } else {
            // Fallback logging if actionManager is not available (should not happen)
            playerUtils.debugLog('[InvalidRenderDistanceCheck] actionManager.executeCheckAction not available. Critical logging fallback.', null, dependencies);
            if (logManager && typeof logManager.addLog === 'function') {
                logManager.addLog({
                    adminName: 'System (AntiCheat)',
                    actionType: 'errorMissingActionManager',
                    targetName: player.nameTag,
                    details: `executeCheckAction was not available for InvalidRenderDistance check. Details: ${JSON.stringify(violationDetails)}`,
                }, dependencies);
            }
        }

        playerUtils.debugLog(`[InvalidRenderDistanceCheck] Player ${player.nameTag} reported ${clientRenderDistance} chunks, max allowed is ${config.maxAllowedClientRenderDistance}. Flagged via profile '${actionProfileKey}'.`, watchedPrefix, dependencies);
    }
}
