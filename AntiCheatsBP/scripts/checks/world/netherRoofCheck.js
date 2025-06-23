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
        const detectedYValue = player.location.y.toFixed(2);
        const thresholdValue = config.netherRoofYLevelThreshold.toString(); // Ensure string for getString
        const localizedDetailString = getString("check.netherRoof.details.onRoof", {
            detectedY: detectedYValue,
            threshold: thresholdValue
        });

        const violationDetails = {
            detectedY: detectedYValue,
            threshold: thresholdValue,
            // The localized string can be part of the reason in the action profile if needed,
            // or used by admin notifications directly if the profile supports it.
            // For now, keeping details structured for the action profile.
        };

        // Use actionManager to handle flagging, logging, and notifications consistently
        if (dependencies.actionManager && typeof dependencies.actionManager.executeCheckAction === 'function') {
            await dependencies.actionManager.executeCheckAction(
                player,
                config.netherRoofActionProfileName || "movementNetherRoof", // Use a configurable profile name or default
                violationDetails,
                dependencies
            );
            if (playerUtils.debugLog && (pData?.isWatched || config.enableDebugLogging)) {
                 playerUtils.debugLog(`[NetherRoofCheck] Player ${player.nameTag} on Nether roof. Y: ${detectedYValue}, Threshold: ${thresholdValue}. Action profile triggered.`, player.nameTag, dependencies);
            }
        } else {
            // Fallback or error logging if actionManager is not available
            if (playerUtils && playerUtils.debugLog) {
                playerUtils.debugLog(`[NetherRoofCheck] actionManager.executeCheckAction not available for player ${player.nameTag}. Attempting direct flag.`, player.nameTag, dependencies);
            }
            // Fallback to direct flagging if actionManager is missing (less ideal)
            if (playerDataManager && playerDataManager.addFlag) {
                 playerDataManager.addFlag(
                    player,
                    "movementNetherRoof",
                    `Player detected on Nether roof (Y: ${detectedYValue} >= ${thresholdValue})`,
                    violationDetails, // Pass structured details
                    dependencies
                );
            }
        }
    }
}
