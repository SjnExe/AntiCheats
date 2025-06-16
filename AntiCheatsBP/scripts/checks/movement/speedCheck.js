/**
 * @file AntiCheatsBP/scripts/checks/movement/speedCheck.js
 * Implements a check to detect players moving horizontally faster than allowed.
 * Relies on `pData.velocity` (updated in main tick loop) and `pData.speedAmplifier`
 * (assumed to be updated by `updateTransientPlayerData` based on player effects).
 * @version 1.0.2
 */

import * as mc from '@minecraft/server';

/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').Config} Config
 * @typedef {import('../../types.js').PlayerUtils} PlayerUtils
 * @typedef {import('../../types.js').PlayerDataManager} PlayerDataManager
 * @typedef {import('../../types.js').LogManager} LogManager
 * @typedef {import('../../types.js').ExecuteCheckAction} ExecuteCheckAction
 */

/**
 * Checks for speed-related hacks by analyzing player's horizontal movement speed.
 * Considers game mode, effects (Speed), and whether the player is on ground or airborne.
 *
 * @param {mc.Player} player - The player instance to check.
 * @param {PlayerAntiCheatData} pData - Player-specific anti-cheat data. Expected to contain `velocity`,
 *                                     `speedAmplifier`, and `consecutiveOnGroundSpeedingTicks`.
 * @param {Config} config - The server configuration object, with `enableSpeedCheck`, `maxHorizontalSpeed`,
 *                          `speedEffectBonus`, `speedToleranceBuffer`, `speedGroundConsecutiveTicksThreshold`.
 * @param {PlayerUtils} playerUtils - Utility functions for player interactions.
 * @param {PlayerDataManager} playerDataManager - Manager for player data.
 * @param {LogManager} logManager - Manager for logging.
 * @param {ExecuteCheckAction} executeCheckAction - Function to execute defined actions for a check.
 * @param {number} currentTick - The current game tick (not directly used in this check's core logic).
 * @returns {Promise<void>}
 */
export async function checkSpeed(
    player,
    pData,
    config,
    playerUtils,
    playerDataManager,
    logManager,
    executeCheckAction,
    currentTick // Not directly used by this check's core logic
) {
    if (!config.enableSpeedCheck || !pData) { // Added null check for pData
        return;
    }

    const watchedPrefix = pData.isWatched ? player.nameTag : null;

    // Exempt players in states where normal speed limits don't apply or are hard to baseline
    if (player.isFlying || player.isGliding || player.isClimbing || player.isInWater || player.isRiding) {
        if (pData.consecutiveOnGroundSpeedingTicks > 0) {
            pData.consecutiveOnGroundSpeedingTicks = 0; // Reset if previously speeding on ground
            pData.isDirtyForSave = true;
        }
        playerUtils.debugLog?.(`SpeedCheck: ${player.nameTag} in exempt state (flying, gliding, climbing, inWater, riding). Skipping.`, watchedPrefix);
        return;
    }

    // pData.velocity should be updated each tick in updateTransientPlayerData
    const hSpeed = Math.sqrt((pData.velocity.x ** 2) + (pData.velocity.z ** 2)); // Horizontal speed in blocks per tick
    const hSpeedBPS = hSpeed * 20; // Convert to blocks per second

    let maxAllowedSpeedBPS = config.maxHorizontalSpeed ?? 7.0;

    // Adjust max speed based on Speed effect amplifier stored in pData
    // pData.speedAmplifier = -1 (no effect), 0 (Speed I), 1 (Speed II), etc.
    const speedAmplifier = pData.speedAmplifier ?? -1;
    if (speedAmplifier >= 0) {
        maxAllowedSpeedBPS += (speedAmplifier + 1) * (config.speedEffectBonus ?? 2.0);
    }

    maxAllowedSpeedBPS += (config.speedToleranceBuffer ?? 0.5);

    playerUtils.debugLog?.(
        `SpeedCheck: Processing for ${player.nameTag}. HSpeedBPS=${hSpeedBPS.toFixed(2)}, MaxAllowableBPS=${maxAllowedSpeedBPS.toFixed(2)}, GroundSpeedingTicks=${pData.consecutiveOnGroundSpeedingTicks ?? 0}`,
        watchedPrefix
    );

    const dependencies = { config, playerDataManager, playerUtils, logManager };
    const groundActionProfileKey = "movementSpeedGround";

    if (player.isOnGround) {
        if (hSpeedBPS > maxAllowedSpeedBPS) {
            pData.consecutiveOnGroundSpeedingTicks = (pData.consecutiveOnGroundSpeedingTicks || 0) + 1;
            pData.isDirtyForSave = true;

            const groundTicksThreshold = config.speedGroundConsecutiveTicksThreshold ?? 5;
            if (pData.consecutiveOnGroundSpeedingTicks > groundTicksThreshold) {
                let activeEffectsString = "none";
                 try {
                    const effects = player.getEffects(); // Get current effects for logging context
                    if (effects.length > 0) {
                        activeEffectsString = effects.map(e => `${e.typeId} (Amp: ${e.amplifier}, Dur: ${e.duration})`).join(', ') || "none";
                    }
                } catch(e) {
                    playerUtils.debugLog?.(`SpeedCheck: Error getting effects for ${player.nameTag}: ${e}`, watchedPrefix);
                }

                const violationDetails = {
                    detectedSpeedBps: hSpeedBPS.toFixed(2),
                    maxAllowedBps: maxAllowedSpeedBPS.toFixed(2),
                    consecutiveTicks: (pData.consecutiveOnGroundSpeedingTicks ?? 0).toString(),
                    onGround: player.isOnGround.toString(),
                    activeEffects: activeEffectsString
                };
                await executeCheckAction(player, groundActionProfileKey, violationDetails, dependencies);
                pData.consecutiveOnGroundSpeedingTicks = 0; // Reset after flagging
                pData.isDirtyForSave = true;
            }
        } else {
            if (pData.consecutiveOnGroundSpeedingTicks > 0) { // Only mark dirty if it actually changes
                 pData.consecutiveOnGroundSpeedingTicks = 0;
                 pData.isDirtyForSave = true;
            }
        }
    } else { // Player is airborne (and not flying, gliding, climbing, inWater, riding)
        // Reset ground speeding ticks if airborne
        if (pData.consecutiveOnGroundSpeedingTicks > 0) {
            pData.consecutiveOnGroundSpeedingTicks = 0;
            pData.isDirtyForSave = true;
        }

        // Implement airborne speed check if desired (potentially with different thresholds/profile key)
    }
}
