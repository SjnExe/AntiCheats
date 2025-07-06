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

    const watchedPrefix = pData?.isWatched ? player.nameTag : null;

    if (!player.clientSystemInfo) {
        playerUtils.debugLog(`[InvalidRenderDistanceCheck] clientSystemInfo not yet available for ${player.nameTag}. Will check later.`, watchedPrefix, dependencies);
        return;
    }

    const clientRenderDistance = player.clientSystemInfo.maxRenderDistance;

    if (typeof clientRenderDistance !== 'number' || clientRenderDistance < 0) {
        playerUtils.debugLog(`[InvalidRenderDistanceCheck] Invalid or missing maxRenderDistance value (${clientRenderDistance}) for ${player.nameTag}.`, watchedPrefix, dependencies);
        return;
    }

    if (clientRenderDistance > config.maxAllowedClientRenderDistance) {
        const violationDetails = {
            playerName: player.nameTag,
            reportedDistance: clientRenderDistance.toString(),
            maxAllowed: config.maxAllowedClientRenderDistance.toString(),
        };

        // Ensure actionProfileKey is camelCase, standardizing from config
        const rawActionProfileKey = config.invalidRenderDistanceActionProfileName ?? 'playerInvalidRenderDistance'; // Default is already camelCase
        const actionProfileKey = rawActionProfileKey
            .replace(/([-_][a-z0-9])/ig, ($1) => $1.toUpperCase().replace('-', '').replace('_', ''))
            .replace(/^[A-Z]/, (match) => match.toLowerCase());
        await actionManager.executeCheckAction(player, actionProfileKey, violationDetails, dependencies);

        playerUtils.debugLog(`[InvalidRenderDistanceCheck] Player ${player.nameTag} reported ${clientRenderDistance} chunks, max allowed is ${config.maxAllowedClientRenderDistance}. Flagged via profile '${actionProfileKey}'.`, watchedPrefix, dependencies);
    }
}
