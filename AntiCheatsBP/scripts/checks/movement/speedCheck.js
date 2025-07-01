/**
 * @file Implements a check to detect players moving horizontally faster than allowed.
 * Relies on `pData.velocity` (updated in main tick loop) and `pData.speedAmplifier`
 * (assumed to be updated by `updateTransientPlayerData` based on player effects).
 */

/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').CommandDependencies} CommandDependencies
 * @typedef {import('../../types.js').Config} Config
 */

/**
 * Checks for speed-related hacks by analyzing player's horizontal movement speed.
 * Considers game mode, effects (Speed), and whether the player is on ground or airborne.
 * Flags are typically applied if speeding on ground for a consecutive number of ticks.
 *
 * @async
 * @param {import('@minecraft/server').Player} player - The player instance to check.
 * @param {PlayerAntiCheatData} pData - Player-specific anti-cheat data.
 * @param {CommandDependencies} dependencies - The standard dependencies object.
 * @returns {Promise<void>}
 */
export async function checkSpeed(player, pData, dependencies) {
    const { config, playerUtils, actionManager } = dependencies;

    if (!config.enableSpeedCheck || !pData) {
        return;
    }

    const watchedPrefix = pData.isWatched ? player.nameTag : null;

    if (player.isFlying || player.isGliding || player.isClimbing || player.isInWater || player.isRiding) {
        if (pData.consecutiveOnGroundSpeedingTicks > 0) {
            pData.consecutiveOnGroundSpeedingTicks = 0;
            pData.isDirtyForSave = true;
        }
        if (config.enableDebugLogging && pData.isWatched) {
            playerUtils.debugLog(`[SpeedCheck] ${player.nameTag} in exempt state (flying, gliding, climbing, inWater, riding). Skipping.`, watchedPrefix, dependencies);
        }
        return;
    }

    const hSpeed = Math.sqrt((pData.velocity.x ** 2) + (pData.velocity.z ** 2));
    const hSpeedBPS = hSpeed * 20;

    let maxAllowedSpeedBPS = config.maxHorizontalSpeed ?? 7.0;

    const speedAmplifier = pData.speedAmplifier ?? -1;
    if (speedAmplifier >= 0) {
        maxAllowedSpeedBPS *= (1 + (speedAmplifier + 1) * 0.20);
    }

    maxAllowedSpeedBPS += (config.speedToleranceBuffer ?? 0.5);

    if (pData.isWatched && config.enableDebugLogging) {
        playerUtils.debugLog(
            `[SpeedCheck] Processing for ${player.nameTag}. HSpeedBPS=${hSpeedBPS.toFixed(2)}, MaxAllowedBPS=${maxAllowedSpeedBPS.toFixed(2)}, GroundSpeedingTicks=${pData.consecutiveOnGroundSpeedingTicks ?? 0}`,
            watchedPrefix, dependencies
        );
    }

    const groundActionProfileKey = config.speedGroundActionProfileName ?? 'movementSpeedGround';

    if (player.isOnGround) {
        if (hSpeedBPS > maxAllowedSpeedBPS) {
            pData.consecutiveOnGroundSpeedingTicks = (pData.consecutiveOnGroundSpeedingTicks || 0) + 1;
            pData.isDirtyForSave = true;

            const groundTicksThreshold = config.speedGroundConsecutiveTicksThreshold ?? 5;
            if (pData.consecutiveOnGroundSpeedingTicks >= groundTicksThreshold) {
                let activeEffectsString = 'none';
                try {
                    const effects = player.getEffects();
                    if (effects.length > 0) {
                        activeEffectsString = effects.map(e => `${e.typeId.replace('minecraft:', '')} (Amp: ${e.amplifier}, Dur: ${e.duration})`).join(', ') || 'none';
                    }
                } catch (e) {
                    playerUtils.debugLog(`[SpeedCheck] Error getting effects for ${player.nameTag}: ${e.message}`, watchedPrefix, dependencies);
                }

                const violationDetails = {
                    detectedSpeedBps: hSpeedBPS.toFixed(2),
                    maxAllowedBps: maxAllowedSpeedBPS.toFixed(2),
                    consecutiveTicks: (pData.consecutiveOnGroundSpeedingTicks ?? 0).toString(),
                    onGround: player.isOnGround.toString(),
                    activeEffects: activeEffectsString,
                };
                await actionManager.executeCheckAction(player, groundActionProfileKey, violationDetails, dependencies);
                pData.consecutiveOnGroundSpeedingTicks = 0;
                pData.isDirtyForSave = true;
            }
        } else {
            if (pData.consecutiveOnGroundSpeedingTicks > 0) {
                pData.consecutiveOnGroundSpeedingTicks = 0;
                pData.isDirtyForSave = true;
            }
        }
    } else {
        if (pData.consecutiveOnGroundSpeedingTicks > 0) {
            pData.consecutiveOnGroundSpeedingTicks = 0;
            pData.isDirtyForSave = true;
        }
    }
}
