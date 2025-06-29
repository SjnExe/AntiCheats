/**
 * @file Checks if a player is on the Nether roof, which is often restricted.
 */
import * as mc from '@minecraft/server';

/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData;
 * @typedef {import('../../types.js').CommandDependencies} CommandDependencies;
 * @typedef {import('../../types.js').Config} Config;
 */

/**
 * Checks if a player is on top of the Nether roof based on their Y-coordinate.
 * This check is typically run periodically for players in the Nether dimension.
 *
 * @async This function is marked async due to potential call to actionManager.
 * @param {mc.Player} player - The player to check.
 * @param {PlayerAntiCheatData} pData - The player's anti-cheat data.
 * @param {CommandDependencies} dependencies - Shared dependencies.
 * @returns {Promise<void>}
 */
export async function checkNetherRoof(player, pData, dependencies) {
    const { config, playerDataManager, playerUtils, actionManager } = dependencies;
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

        if (actionManager && typeof actionManager.executeCheckAction === 'function') {
            await actionManager.executeCheckAction(player, actionProfileKey, violationDetails, dependencies);
            if (playerUtils.debugLog && (pData?.isWatched || config.enableDebugLogging)) {
                playerUtils.debugLog(`[NetherRoofCheck] Player ${player.nameTag} on Nether roof. Y: ${detectedYValue}, Threshold: ${thresholdValue}. Action profile '${actionProfileKey}' triggered.`, player.nameTag, dependencies);
            }
        } else {
            if (playerUtils?.debugLog) {
                playerUtils.debugLog(`[NetherRoofCheck] actionManager.executeCheckAction not available for player ${player.nameTag}. Attempting direct flag.`, player.nameTag, dependencies);
            }
            if (playerDataManager && playerDataManager.addFlag) {
                playerDataManager.addFlag(
                    player,
                    actionProfileKey,
                    `Player detected on Nether roof (Y: ${detectedYValue} >= ${thresholdValue})`,
                    violationDetails,
                    dependencies
                );
            }
        }
    }
}
