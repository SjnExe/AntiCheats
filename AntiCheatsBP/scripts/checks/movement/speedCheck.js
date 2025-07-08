/**
 * @file Implements a check to detect players moving horizontally faster than allowed.
 * Relies on `pData.velocity` (updated in main tick loop) and `pData.speedAmplifier`
 * (assumed to be updated by `updateTransientPlayerData` based on player effects).
 */

/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').Dependencies} Dependencies
 */

// Constants for magic numbers
const TICKS_PER_SECOND_SPEED = 20;
const DEFAULT_MAX_HORIZONTAL_SPEED_VANILLA_SPRINT = 5.7;
const DEFAULT_SPEED_EFFECT_MULTIPLIER_PER_LEVEL = 0.20;
const DEFAULT_SPEED_TOLERANCE_BUFFER = 0.5;
const SPEED_LOGGING_DECIMAL_PLACES = 3;
const DEFAULT_SPEED_GROUND_CONSECUTIVE_TICKS_THRESHOLD = 5;

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
    const hSpeedBPS = hSpeed * TICKS_PER_SECOND_SPEED;

    let maxAllowedSpeedBPS = config?.maxHorizontalSpeedVanillaSprint ?? DEFAULT_MAX_HORIZONTAL_SPEED_VANILLA_SPRINT;

    const speedAmplifier = pData.speedAmplifier ?? -1; // -1 is fine
    if (speedAmplifier >= 0) { // 0 is fine
        maxAllowedSpeedBPS *= (1 + ((speedAmplifier + 1) * (config?.speedEffectMultiplierPerLevel ?? DEFAULT_SPEED_EFFECT_MULTIPLIER_PER_LEVEL))); // 1 is fine
    }

    maxAllowedSpeedBPS += (config?.speedToleranceBuffer ?? DEFAULT_SPEED_TOLERANCE_BUFFER);

    if (pData.isWatched && config?.enableDebugLogging) {
        playerUtils?.debugLog(
            `[SpeedCheck] Processing for ${playerName}. HSpeedBPS=${hSpeedBPS.toFixed(SPEED_LOGGING_DECIMAL_PLACES)}, MaxAllowedBPS=${maxAllowedSpeedBPS.toFixed(SPEED_LOGGING_DECIMAL_PLACES)}, GroundSpeedingTicks=${pData.consecutiveOnGroundSpeedingTicks ?? 0}, OnGround=${player.isOnGround}`,
            watchedPlayerName, dependencies,
        );
    }

    const rawGroundActionProfileKey = config?.speedGroundActionProfileName ?? 'movementSpeedGround';
    const groundActionProfileKey = rawGroundActionProfileKey
        .replace(/([-_][a-z0-9])/ig, ($1) => $1.toUpperCase().replace('-', '').replace('_', ''))
        .replace(/^[A-Z]/, (match) => match.toLowerCase());

    if (player.isOnGround) {
        if (hSpeedBPS > maxAllowedSpeedBPS) {
            pData.consecutiveOnGroundSpeedingTicks = (pData.consecutiveOnGroundSpeedingTicks || 0) + 1; // 0 and 1 are fine
            pData.isDirtyForSave = true;

            const groundTicksThreshold = config?.speedGroundConsecutiveTicksThreshold ?? DEFAULT_SPEED_GROUND_CONSECUTIVE_TICKS_THRESHOLD;
            if (pData.consecutiveOnGroundSpeedingTicks >= groundTicksThreshold) {
                let activeEffectsString = 'none';
                try {
                    const effects = player.getEffects();
                    if (effects.length > 0) {
                        activeEffectsString = effects.map(eff => `${eff.typeId.replace('minecraft:', '')}(${eff.amplifier})`).join(', ') || 'none';
                    }
                } catch (_e) { /* Error suppressed, default value will be used */ }

                const violationDetails = {
                    detectedSpeedBps: hSpeedBPS.toFixed(SPEED_LOGGING_DECIMAL_PLACES),
                    maxAllowedBps: maxAllowedSpeedBPS.toFixed(SPEED_LOGGING_DECIMAL_PLACES),
                    consecutiveTicks: (pData.consecutiveOnGroundSpeedingTicks ?? 0).toString(), // 0 is fine
                    onGround: player.isOnGround.toString(),
                    activeEffects: activeEffectsString,
                };
                await actionManager?.executeCheckAction(player, groundActionProfileKey, violationDetails, dependencies);
                playerUtils?.debugLog(`[SpeedCheck] Flagged ${playerName} for ground speed. Speed: ${hSpeedBPS.toFixed(SPEED_LOGGING_DECIMAL_PLACES)} > ${maxAllowedSpeedBPS.toFixed(SPEED_LOGGING_DECIMAL_PLACES)} for ${pData.consecutiveOnGroundSpeedingTicks} ticks.`, watchedPlayerName, dependencies);

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
