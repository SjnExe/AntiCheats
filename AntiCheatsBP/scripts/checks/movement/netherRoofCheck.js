/**
 * @file AntiCheatsBP/scripts/checks/movement/netherRoofCheck.js
 * Checks if a player is on the Nether roof.
 * @version 1.0.0
 */
import * as mc from '@minecraft/server';
// import { getPlayerDimensionId } from '../../utils/dimensionUtils.js'; // Assuming a utility like this exists or will be created

/**
 * Checks if a player is on top of the Nether roof.
 * @param {mc.Player} player The player to check.
 * @param {object} pData The player's anti-cheat data. (Not directly used in this check's logic but part of standard signature)
 * @param {object} dependencies Shared dependencies, expected to include:
 *                            { config, playerDataManager, playerUtils }
 */
export function checkNetherRoof(player, pData, dependencies) {
    const { config, playerDataManager, playerUtils } = dependencies;

    if (!config.enableNetherRoofCheck) {
        return;
    }

    // It's more robust to use the actual dimension ID string directly.
    // const playerDimension = getPlayerDimensionId(player); // Using utility
    // const netherDimensionId = "minecraft:nether";
    // For direct comparison without a utility:
    if (player.dimension.id !== "minecraft:nether") {
         return;
    }

    if (player.location.y >= config.netherRoofYLevelThreshold) {
        if (playerDataManager && playerDataManager.addFlag) {
            const detailsForNotify = {
                detectedY: player.location.y.toFixed(2),
                threshold: config.netherRoofYLevelThreshold,
                originalDetailsForNotify: \`Player on Nether roof at Y: \${player.location.y.toFixed(2)} (Threshold: \${config.netherRoofYLevelThreshold})\`
            };
            playerDataManager.addFlag(
                player,
                "movement_nether_roof", // checkType
                "Player detected on Nether roof.", // Generic reason for flag, AutoMod will use its own for kick.
                detailsForNotify
            );
            // The debugLog for addFlag in playerDataManager will show this.
            // No need for an additional debugLog here unless more specific context from the check is needed.
        } else {
            // Fallback or error if playerDataManager.addFlag is not available
            if (playerUtils && playerUtils.debugLog) {
                playerUtils.debugLog(\`NetherRoofCheck: playerDataManager.addFlag not available for player \${player.nameTag}\`, player.nameTag);
            }
        }
    }
}
