/**
 * @file Implements checks related to player client system information, such as render distance.
 */

/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').Dependencies} Dependencies
 */

/**
 * Checks if a player's reported maximum render distance exceeds the configured allowed limit.
 * This check is typically run periodically (e.g., via main tick loop) or on player spawn/join.
 *
 * @async
 * @param {import('@minecraft/server').Player} player - The player to check.
 * @param {PlayerAntiCheatData} pData - Player-specific anti-cheat data (used for watched status).
 * @param {Dependencies} dependencies - Object containing necessary dependencies.
 * @returns {Promise<void>}
 */
export async function checkInvalidRenderDistance(player, pData, dependencies) {
    const { config, playerUtils, actionManager, logManager } = dependencies; // Added logManager
    const playerName = player?.nameTag ?? 'UnknownPlayer';

    if (!config?.enableInvalidRenderDistanceCheck) {
        return;
    }

    // pData might be null if called very early, but isWatched check is fine with ?.
    const watchedPlayerName = pData?.isWatched ? playerName : null;

    if (!player.clientSystemInfo) { // clientSystemInfo might not be available immediately on join
        playerUtils?.debugLog(`[InvalidRenderDistanceCheck] clientSystemInfo not yet available for ${playerName}. Will check later.`, watchedPlayerName, dependencies);
        return;
    }

    const clientRenderDistance = player.clientSystemInfo.maxRenderDistance;
    // Update pData with the last reported render distance if it's different
    if (pData && pData.lastReportedRenderDistance !== clientRenderDistance) {
        pData.lastReportedRenderDistance = clientRenderDistance;
        // This field might not be persisted by default, but if it were:
        // pData.isDirtyForSave = true;
    }


    if (typeof clientRenderDistance !== 'number' || clientRenderDistance < 0) {
        playerUtils?.debugLog(`[InvalidRenderDistanceCheck WARNING] Invalid or missing maxRenderDistance value (${clientRenderDistance}) for ${playerName}.`, watchedPlayerName, dependencies);
        // Optionally log this as a minor system issue if it occurs often
        logManager?.addLog({
            actionType: 'warningClientInfo',
            context: 'InvalidRenderDistanceCheck.getValue',
            targetName: playerName,
            details: `Reported maxRenderDistance is invalid: ${clientRenderDistance} (type: ${typeof clientRenderDistance})`
        }, dependencies);
        return;
    }

    const maxAllowed = config?.maxAllowedClientRenderDistance ?? 64; // Default 64 chunks

    if (clientRenderDistance > maxAllowed) {
        const violationDetails = {
            playerName: playerName, // Already have playerName
            reportedDistance: clientRenderDistance.toString(),
            maxAllowed: maxAllowed.toString(),
            devicePlatform: player.clientSystemInfo.platformType?.toString() ?? 'Unknown', // Add platform for context
        };

        // Ensure actionProfileKey is camelCase, standardizing from config
        const rawActionProfileKey = config?.invalidRenderDistanceActionProfileName ?? 'playerInvalidRenderDistance';
        const actionProfileKey = rawActionProfileKey
            .replace(/([-_][a-z0-9])/ig, ($1) => $1.toUpperCase().replace('-', '').replace('_', ''))
            .replace(/^[A-Z]/, (match) => match.toLowerCase());

        await actionManager?.executeCheckAction(player, actionProfileKey, violationDetails, dependencies);

        playerUtils?.debugLog(`[InvalidRenderDistanceCheck] Player ${playerName} reported ${clientRenderDistance} chunks, max allowed is ${maxAllowed}. Flagged via profile '${actionProfileKey}'.`, watchedPlayerName, dependencies);
    } else if (pData?.isWatched && config?.enableDebugLogging) {
        playerUtils?.debugLog(`[InvalidRenderDistanceCheck] Player ${playerName} reported valid render distance: ${clientRenderDistance} (Max: ${maxAllowed}).`, watchedPlayerName, dependencies);
    }
}
