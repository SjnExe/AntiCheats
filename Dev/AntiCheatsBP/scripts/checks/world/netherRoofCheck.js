/**
 * @file Checks if a player is on the Nether roof, which is often restricted.
 * @module AntiCheatsBP/scripts/checks/world/netherRoofCheck
 */
import * as mc from '@minecraft/server';

/**
 * Checks if a player is on top of the Nether roof based on their Y-coordinate.
 * This check is typically run periodically for players in the Nether dimension.
 * @async
 * @param {mc.Player} player - The player to check.
 * @param {import('../../types.js').PlayerAntiCheatData} pData - The player's anti-cheat data.
 * @param {import('../../types.js').Dependencies} dependencies - Shared dependencies.
 * @returns {Promise<void>}
 */
export async function checkNetherRoof(player, pData, dependencies) {
    const { config, playerUtils, actionManager } = dependencies; // Removed playerDataManager
    const minecraftSystem = dependencies.mc;

    if (!config.enableNetherRoofCheck) {
        return;
    }

    if (player.gameMode === minecraftSystem.GameMode.spectator) {
        if (playerUtils.debugLog && pData?.isWatched) {
            playerUtils.debugLog(`[NetherRoofCheck] Player ${player.nameTag} is in spectator mode. Check bypassed.`, player.nameTag, dependencies);
        }
        return;
    }

    if (player.dimension.id !== mc.DimensionTypes.nether.id) {
        return;
    }

    if (player.location.y >= config.netherRoofYLevelThreshold) {
        const detectedYValue = player.location.y.toFixed(2);
        const thresholdValue = config.netherRoofYLevelThreshold.toString();

        const violationDetails = {
            detectedY: detectedYValue,
            threshold: thresholdValue,
            detailsString: `Player on Nether roof (Y: ${detectedYValue} >= ${thresholdValue})`,
        };

        const actionProfileKey = config.netherRoofActionProfileName ?? 'movementNetherRoof';

        await actionManager.executeCheckAction(player, actionProfileKey, violationDetails, dependencies);
        if (playerUtils.debugLog && (pData?.isWatched || config.enableDebugLogging)) {
            playerUtils.debugLog(`[NetherRoofCheck] Player ${player.nameTag} on Nether roof. Y: ${detectedYValue}, Threshold: ${thresholdValue}. Action profile '${actionProfileKey}' triggered.`, player.nameTag, dependencies);
        }
    }
}
