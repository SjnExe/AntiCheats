/**
 * @file AntiCheatsBP/scripts/checks/movement/netherRoofCheck.js
 * Checks if a player is on the Nether roof.
 * @version 1.0.1
 */
import * as mc from '@minecraft/server';
import { getString } from '../../../core/i18n.js';

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
                // This 'originalDetailsForNotify' is more for the internal flag reason in playerDataManager,
                // the user-facing notification message comes from checkActionProfiles.
                // However, if any part of this *were* to be directly shown, it should be built from localized parts.
                // For now, it's an internal detail string. If it needs localization, the structure would change.
                // If this `detailsForNotify.originalDetailsForNotify` IS used in a user-facing message template
                // then it MUST be localized. Assuming it's for internal logging / details for admins for now.
                // For true localization, the profile message would use {detectedY} and {threshold}.
                originalDetailsForNotify: getString("check.netherRoof.details.onRoof", {
                    detectedY: detectedYValue,
                    threshold: thresholdValue.toString()
                })
            };
            playerDataManager.addFlag(
                player,
                "movement_nether_roof",
                "Player detected on Nether roof.", // This specific reason is for internal flagging, not typically directly shown to users.
                                                  // User-facing messages come from action profiles.
                detailsForNotify
            );
        } else {
            if (playerUtils && playerUtils.debugLog) {
                playerUtils.debugLog(\`NetherRoofCheck: playerDataManager.addFlag not available for player \${player.nameTag}\`, player.nameTag);
            }
        }
    }
}
