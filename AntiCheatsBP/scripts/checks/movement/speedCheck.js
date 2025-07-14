/**
 * @file Implements a check to detect players moving horizontally faster than allowed.
 * @module AntiCheatsBP/scripts/checks/movement/speedCheck
 * Relies on `pData.velocity` (updated in main tick loop) and `pData.speedAmplifier`
 * (assumed to be updated by `updateTransientPlayerData` based on player effects).
 */

/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').Dependencies} Dependencies
 */

// Constants for magic numbers
const ticksPerSecondSpeed = 20;
const defaultMaxHorizontalSpeedVanillaSprint = 5.7;
const defaultSpeedEffectMultiplierPerLevel = 0.20;
const defaultSpeedToleranceBuffer = 0.5;
const speedLoggingDecimalPlaces = 3;
const defaultSpeedGroundConsecutiveTicksThreshold = 5;

/**
 * Checks for speed-related hacks by analyzing player's horizontal movement speed.
 * Considers game mode, effects (Speed), and whether the player is on ground or airborne.
 * Flags are typically applied if speeding on ground for a consecutive number of ticks.
 * This check is typically run every tick.
 * @async
 * @param {import('@minecraft/server').Player} player - The player instance to check.
 * @param {PlayerAntiCheatData} pData - Player-specific anti-cheat data.
 * @param {Dependencies} dependencies - The standard dependencies object.
 * @returns {Promise<void>}
 */
export async function checkSpeed(player, pData, dependencies) {
    const { config, playerUtils, actionManager } = dependencies;
    const playerName = player?.nameTag ?? 'UnknownPlayer';

    if (!config?.enableSpeedCheck) {
        return;
    }
    if (!pData || !pData.velocity) {
        playerUtils?.debugLog(`[SpeedCheck] Skipping for ${playerName}: pData or pData.velocity is null/undefined.`, playerName, dependencies);
        return;
    }

    const watchedPlayerName = pData.isWatched ? playerName : null;

    if (player.isFlying || player.isGliding || player.isClimbing || player.isInWater || player.isRiding) {
        if (pData.consecutiveOnGroundSpeedingTicks > 0) {
            pData.consecutiveOnGroundSpeedingTicks = 0;
            pData.isDirtyForSave = true;
        }
        if (config?.enableDebugLogging && pData.isWatched) {
            const exemptReason = player.isFlying ? 'Flying' : player.isGliding ? 'Gliding' : player.isClimbing ? 'Climbing' : player.isInWater ? 'InWater' : 'Riding';
            playerUtils?.debugLog(`[SpeedCheck] ${playerName} in exempt state (${exemptReason}). Skipping speed check.`, watchedPlayerName, dependencies);
        }
        return;
    }

    const hSpeed = Math.sqrt((pData.velocity.x ** 2) + (pData.velocity.z ** 2));
    const hSpeedBPS = hSpeed * ticksPerSecondSpeed;

    let maxAllowedSpeedBPS = config?.maxHorizontalSpeedVanillaSprint ?? defaultMaxHorizontalSpeedVanillaSprint;

    const speedAmplifier = pData.speedAmplifier ?? -1; // -1 is fine
    if (speedAmplifier >= 0) { // 0 is fine
        maxAllowedSpeedBPS *= (1 + ((speedAmplifier + 1) * (config?.speedEffectMultiplierPerLevel ?? defaultSpeedEffectMultiplierPerLevel))); // 1 is fine
    }

    maxAllowedSpeedBPS += (config?.speedToleranceBuffer ?? defaultSpeedToleranceBuffer);

    if (pData.isWatched && config?.enableDebugLogging) {
        playerUtils?.debugLog(
            `[SpeedCheck] Processing for ${playerName}. HSpeedBPS=${hSpeedBPS.toFixed(speedLoggingDecimalPlaces)}, MaxAllowedBPS=${maxAllowedSpeedBPS.toFixed(speedLoggingDecimalPlaces)}, GroundSpeedingTicks=${pData.consecutiveOnGroundSpeedingTicks ?? 0}, OnGround=${player.isOnGround}`,
            watchedPlayerName, dependencies,
        );
    }

    const groundActionProfileKey = config?.speedGroundActionProfileName ?? 'movementSpeedGround';

    if (player.isOnGround) {
        if (hSpeedBPS > maxAllowedSpeedBPS) {
            pData.consecutiveOnGroundSpeedingTicks = (pData.consecutiveOnGroundSpeedingTicks || 0) + 1; // 0 and 1 are fine
            pData.isDirtyForSave = true;

            const groundTicksThreshold = config?.speedGroundConsecutiveTicksThreshold ?? defaultSpeedGroundConsecutiveTicksThreshold;
            if (pData.consecutiveOnGroundSpeedingTicks >= groundTicksThreshold) {
                let activeEffectsString = 'none';
                try {
                    const effects = player.getEffects();
                    if (effects.length > 0) {
                        activeEffectsString = effects.map(eff => `${eff.typeId.replace('minecraft:', '')}(${eff.amplifier})`).join(', ') || 'none';
                    }
                } catch (e) { /* Error suppressed, default value will be used */ }

                const violationDetails = {
                    detectedSpeedBps: hSpeedBPS.toFixed(speedLoggingDecimalPlaces),
                    maxAllowedBps: maxAllowedSpeedBPS.toFixed(speedLoggingDecimalPlaces),
                    consecutiveTicks: (pData.consecutiveOnGroundSpeedingTicks ?? 0).toString(), // 0 is fine
                    onGround: player.isOnGround.toString(),
                    activeEffects: activeEffectsString,
                };
                await actionManager?.executeCheckAction(player, groundActionProfileKey, violationDetails, dependencies);
                playerUtils?.debugLog(`[SpeedCheck] Flagged ${playerName} for ground speed. Speed: ${hSpeedBPS.toFixed(speedLoggingDecimalPlaces)} > ${maxAllowedSpeedBPS.toFixed(speedLoggingDecimalPlaces)} for ${pData.consecutiveOnGroundSpeedingTicks} ticks.`, watchedPlayerName, dependencies);

                const pDataToUpdate = pData; // Re-affirm pData reference
                pDataToUpdate.consecutiveOnGroundSpeedingTicks = 0; // 0 is fine
                pDataToUpdate.isDirtyForSave = true;
            }
        } else {
            if (pData.consecutiveOnGroundSpeedingTicks > 0) { // 0 is fine
                pData.consecutiveOnGroundSpeedingTicks = 0; // 0 is fine
                pData.isDirtyForSave = true;
            }
        }
    } else {
        if (pData.consecutiveOnGroundSpeedingTicks > 0) { // 0 is fine
            pData.consecutiveOnGroundSpeedingTicks = 0; // 0 is fine
            pData.isDirtyForSave = true;
        }
    }
}
