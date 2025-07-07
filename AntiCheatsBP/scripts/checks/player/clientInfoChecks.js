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
    const { config, playerUtils, actionManager, logManager } = dependencies;
    const playerName = player?.nameTag ?? 'UnknownPlayer';

    if (!config?.enableInvalidRenderDistanceCheck) {
        return;
    }

    const watchedPlayerName = pData?.isWatched ? playerName : null;

    if (!player.clientSystemInfo) {
        playerUtils?.debugLog(`[InvalidRenderDistanceCheck] clientSystemInfo not yet available for ${playerName}. Will check later.`, watchedPlayerName, dependencies);
        return;
    }

    const clientRenderDistance = player.clientSystemInfo.maxRenderDistance;
    if (pData && pData.lastReportedRenderDistance !== clientRenderDistance) {
        pData.lastReportedRenderDistance = clientRenderDistance;
    }


    if (typeof clientRenderDistance !== 'number' || clientRenderDistance < 0) {
        playerUtils?.debugLog(`[InvalidRenderDistanceCheck WARNING] Invalid or missing maxRenderDistance value (${clientRenderDistance}) for ${playerName}.`, watchedPlayerName, dependencies);
        logManager?.addLog({
            actionType: 'warningClientInfo',
            context: 'InvalidRenderDistanceCheck.getValue',
            targetName: playerName,
            details: `Reported maxRenderDistance is invalid: ${clientRenderDistance} (type: ${typeof clientRenderDistance})`,
        }, dependencies);
        return;
    }

    const maxAllowed = config?.maxAllowedClientRenderDistance ?? 64;

    if (clientRenderDistance > maxAllowed) {
        const violationDetails = {
            playerName: playerName,
            reportedDistance: clientRenderDistance.toString(),
            maxAllowed: maxAllowed.toString(),
            devicePlatform: player.clientSystemInfo.platformType?.toString() ?? 'Unknown',
        };

        const rawActionProfileKey = config?.invalidRenderDistanceActionProfileName ?? 'playerInvalidRenderDistance';
        const actionProfileKey = rawActionProfileKey
            .replace(/([-_][a-z0-9])/ig, ($1) => $1.toUpperCase().replace('-', '').replace('_', ''))
            .replace(/^[A-Z]/, (match) => match.toLowerCase());

        await actionManager?.executeCheckAction(player, actionProfileKey, violationDetails, dependencies);

        playerUtils?.debugLog(`[InvalidRenderDistanceCheck] Player ${playerName} reported ${clientRenderDistance} chunks, max allowed is ${maxAllowed}. Flagged via profile '${actionProfileKey}'.`, watchedPlayerName, dependencies);
    }
    else if (pData?.isWatched && config?.enableDebugLogging) {
        playerUtils?.debugLog(`[InvalidRenderDistanceCheck] Player ${playerName} reported valid render distance: ${clientRenderDistance} (Max: ${maxAllowed}).`, watchedPlayerName, dependencies);
    }
}
