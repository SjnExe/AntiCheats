import * as mc from '@minecraft/server';
// Removed: import { addFlag } from '../../core/playerDataManager.js';
// Removed: import { debugLog } from '../../utils/playerUtils.js';
// Config values are accessed via the config object passed as a parameter.

/**
 * @typedef {import('../../core/playerDataManager.js').PlayerAntiCheatData} PlayerAntiCheatData
 */

/**
 * Checks for speed-related hacks by analyzing player's horizontal movement speed.
 * @param {mc.Player} player The player instance to check.
 * @param {PlayerAntiCheatData} pData Player-specific data.
 * @param {object} config The server configuration object.
 * @param {object} playerUtils Utility functions for players.
 * @param {object} playerDataManager Manager for player data.
 * @param {object} logManager Manager for logging.
 * @param {function} executeCheckAction Function to execute defined actions for a check.
 */
export async function checkSpeed(player, pData, config, playerUtils, playerDataManager, logManager, executeCheckAction) {
    if (!config.enableSpeedCheck) return;
    const watchedPrefix = pData.isWatched ? player.nameTag : null;

    if (player.isFlying || player.isClimbing || player.isInWater) { // Added isInWater as speed checks usually apply to ground/air movement
        pData.consecutiveOnGroundSpeedingTicks = 0;
        // Optionally, if you want to debug this state:
        // if (playerUtils.debugLog && pData.isWatched) playerUtils.debugLog(`SpeedCheck: ${player.nameTag} is flying, climbing, or in water. Skipping ground/air speed check.`, watchedPrefix);
        return;
    }

    const hSpeed = Math.sqrt(pData.velocity.x ** 2 + pData.velocity.z ** 2);
    let currentMaxSpeed = config.maxHorizontalSpeed;

    const speedEffect = player.getEffects().find(effect => effect.typeId === "speed");
    if (speedEffect) {
        currentMaxSpeed += (speedEffect.amplifier + 1) * config.speedEffectBonus;
    }

    currentMaxSpeed += config.speedToleranceBuffer;

    if (pData.isWatched && playerUtils.debugLog) {
        playerUtils.debugLog(`SpeedCheck: Processing for ${player.nameTag}. HSpeed=${hSpeed.toFixed(2)}, MaxAllowable=${currentMaxSpeed.toFixed(2)}, SpeedingTicks=${pData.consecutiveOnGroundSpeedingTicks}`, watchedPrefix);
    }

    const dependencies = { config, playerDataManager, playerUtils, logManager };
    let checkTypeKey = "speed_ground_example"; // Default, will adjust if air speed profile is needed
    let violationType = "ground";

    if (player.isOnGround) {
        if (hSpeed > currentMaxSpeed) {
            pData.consecutiveOnGroundSpeedingTicks = (pData.consecutiveOnGroundSpeedingTicks || 0) + 1;
            if (pData.consecutiveOnGroundSpeedingTicks > config.speedGroundConsecutiveTicksThreshold) {
                const violationDetails = {
                    detectedSpeedBps: hSpeed.toFixed(2),
                    maxAllowedBps: currentMaxSpeed.toFixed(2),
                    consecutiveTicks: pData.consecutiveOnGroundSpeedingTicks,
                    onGround: true,
                    isFlying: player.isFlying,
                    isClimbing: player.isClimbing,
                    isInWater: player.isInWater, // Added for more context
                    activeEffects: player.getEffects().map(e => e.typeId).join(', ') || "none"
                };
                await executeCheckAction(player, checkTypeKey, violationDetails, dependencies);
                pData.consecutiveOnGroundSpeedingTicks = 0; // Reset after flagging
            }
        } else {
            pData.consecutiveOnGroundSpeedingTicks = 0;
        }
    } else { // Player is airborne (and not flying/climbing/in water)
        // For airborne speed, you might have different thresholds or use a different profile key.
        // For now, let's assume it uses a similar logic but we might use a different checkTypeKey if desired.
        // Example: checkTypeKey = "speed_air_example";
        // This part would need further definition if airborne speed has different rules/thresholds.
        // If airborne speed is not specifically checked or uses same ground logic:
        pData.consecutiveOnGroundSpeedingTicks = 0; // Reset this as it's for ground

        // Example if you wanted to check air speed with potentially different limits:
        // const maxAirSpeed = currentMaxSpeed; // Or some other config.maxAirSpeed
        // if (hSpeed > maxAirSpeed) {
        //     violationType = "air";
        //     checkTypeKey = "speed_air_example"; // Ensure this key exists in checkActionProfiles
        //     const violationDetails = {
        //         detectedSpeedBps: hSpeed.toFixed(2),
        //         maxAllowedBps: maxAirSpeed.toFixed(2),
        //         onGround: false,
        //         // ... other details
        //     };
        //     await executeCheckAction(player, checkTypeKey, violationDetails, dependencies);
        // }
    }
}
