/**
 * @file Checks if a player is on the Nether roof, which is often restricted.
 */
import * as mc from '@minecraft/server'; // For mc.GameMode

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
    const { config, playerDataManager, playerUtils, getString, actionManager } = dependencies;
    const minecraftSystem = dependencies.mc; // Access mc module via dependencies

    if (!config.enableNetherRoofCheck) {
        return;
    }

    // Spectators are typically allowed anywhere
    if (player.gameMode === minecraftSystem.GameMode.spectator) {
        if (playerUtils.debugLog && pData?.isWatched) { // Check pData exists before accessing isWatched
            playerUtils.debugLog(`[NetherRoofCheck] Player ${player.nameTag} is in spectator mode. Check bypassed.`, player.nameTag, dependencies);
        }
        return;
    }

    // Only check if the player is in the Nether dimension
    if (player.dimension.id !== mc.DimensionTypes.nether.id) { // Use mc.DimensionTypes for clarity
        return;
    }

    if (player.location.y >= config.netherRoofYLevelThreshold) {
        const detectedYValue = player.location.y.toFixed(2);
        const thresholdValue = config.netherRoofYLevelThreshold.toString();

        // The localizedDetailString is good for direct use but actionManager usually formats its own messages.
        // const localizedDetailString = getString('check.netherRoof.details.onRoof', {
        //     detectedY: detectedYValue,
        //     threshold: thresholdValue,
        // });

        const violationDetails = {
            detectedY: detectedYValue,
            threshold: thresholdValue,
            // detailsString: localizedDetailString, // Can be added if actionProfile uses {detailsString}
        };

        // Standardized action profile key
        const actionProfileKey = config.netherRoofActionProfileName || 'movementNetherRoof';

        if (actionManager && typeof actionManager.executeCheckAction === 'function') {
            await actionManager.executeCheckAction(player, actionProfileKey, violationDetails, dependencies);
            if (playerUtils.debugLog && (pData?.isWatched || config.enableDebugLogging)) {
                playerUtils.debugLog(`[NetherRoofCheck] Player ${player.nameTag} on Nether roof. Y: ${detectedYValue}, Threshold: ${thresholdValue}. Action profile '${actionProfileKey}' triggered.`, player.nameTag, dependencies);
            }
        } else {
            // Fallback or error logging if actionManager is not available (should not happen)
            if (playerUtils?.debugLog) {
                playerUtils.debugLog(`[NetherRoofCheck] actionManager.executeCheckAction not available for player ${player.nameTag}. Attempting direct flag.`, player.nameTag, dependencies);
            }
            // Fallback to direct flagging if actionManager is missing (less ideal)
            if (playerDataManager && playerDataManager.addFlag) {
                playerDataManager.addFlag(
                    player,
                    actionProfileKey, // Use the determined action profile key
                    `Player detected on Nether roof (Y: ${detectedYValue} >= ${thresholdValue})`,
                    violationDetails,
                    dependencies
                );
            }
        }
    }
}
