/**
 * Checks if a player is on the Nether roof.
 */
import * as mc from '@minecraft/server';
/**
 * Checks if a player is on top of the Nether roof.
 * @param {mc.Player} player The player to check.
 * @param {object} pData The player's anti-cheat data. (Not directly used in this check's logic but part of standard signature)
 * @param {import('../../types.js').Dependencies} dependencies Shared dependencies.
 */
export function checkNetherRoof(player, pData, dependencies) {
    const { config, playerDataManager, playerUtils, getString, mc: minecraftSystem } = dependencies;

    if (!config.enableNetherRoofCheck) {
        return;
    }

    if (player.gameMode === minecraftSystem.GameMode.spectator) {
        if (playerUtils.debugLog && pData.isWatched) {
            playerUtils.debugLog(`[NetherRoofCheck] Player ${player.nameTag} is in spectator mode. Check bypassed.`, player.nameTag, dependencies);
        }
        return;
    }

    if (player.dimension.id !== "minecraft:nether") {
         return;
    }

    if (player.location.y >= config.netherRoofYLevelThreshold) {
        if (playerDataManager && playerDataManager.addFlag) {
            const detectedYValue = player.location.y.toFixed(2);
            const thresholdValue = config.netherRoofYLevelThreshold;
            const detailsForNotify = {
                detectedY: detectedYValue,
                threshold: thresholdValue,
                originalDetailsForNotify: getString("check.netherRoof.details.onRoof", {
                    detectedY: detectedYValue,
                    threshold: thresholdValue.toString()
                })
            };
            playerDataManager.addFlag(
                player,
                "movementNetherRoof",
                "Player detected on Nether roof.",
                detailsForNotify,
                dependencies
            );
        } else {
            if (playerUtils && playerUtils.debugLog) {
                playerUtils.debugLog(`[NetherRoofCheck] playerDataManager.addFlag not available for player ${player.nameTag}`, player.nameTag, dependencies);
            }
        }
    }
}
