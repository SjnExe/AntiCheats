/**
 * @file Implements a check to detect if a player is moving faster than allowed while performing actions
 * @module AntiCheatsBP/scripts/checks/movement/noSlowCheck
 * that should typically slow them down (e.g., eating, sneaking, charging a bow, using a shield).
 * Relies on player state flags in `pData` (e.g., `isUsingConsumable`, `isChargingBow`, `isUsingShield`) and
 * assumes `pData.speedAmplifier` is updated by `updateTransientPlayerData`.
 */

/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').Dependencies} Dependencies
 */

// Constants for magic numbers
const TICKS_PER_SECOND_NOSLOW = 20;
const DEFAULT_NOSLOW_MAX_SPEED_SHIELD = 4.4;
const DEFAULT_NOSLOW_MAX_SPEED_SNEAKING = 1.5;
const DEFAULT_NOSLOW_SPEED_EFFECT_MULTIPLIER_PER_LEVEL = 0.20;
const DEFAULT_NOSLOW_SPEED_EFFECT_TOLERANCE_PERCENT = 0.10;
const DEFAULT_NOSLOW_GENERAL_TOLERANCE_PERCENT = 0.05;

/**
 * Checks if a player is moving faster than allowed for actions that should slow them down.
 * Slowing actions considered: Eating/Drinking, Charging Bow, Using Shield, Sneaking.
 * Takes into account Speed effect and a configurable tolerance.
 * This check is typically run every tick.
 * @async
 * @param {import('@minecraft/server').Player} player - The player instance to check.
 * @param {PlayerAntiCheatData} pData - Player-specific anti-cheat data.
 * @param {Dependencies} dependencies - The standard dependencies object.
 * @returns {Promise<void>}
 */
export async function checkNoSlow(player, pData, dependencies) {
    const { config, playerUtils, actionManager } = dependencies;
    const playerName = player?.name ?? 'UnknownPlayer';

    if (!config?.enableNoSlowCheck) {
        return;
    }
    if (!pData) {
        playerUtils?.debugLog(`[NoSlowCheck] Skipping for ${playerName}: pData is null.`, playerName, dependencies);
        return;
    }

    const watchedPlayerName = pData.isWatched ? playerName : null; // Define watchedPlayerName at a higher scope

    const velocity = pData.velocity ?? player.getVelocity();
    const horizontalSpeedBPS = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z) * TICKS_PER_SECOND_NOSLOW;

    let resolvedSlowingActionString = null;
    let maxAllowedBaseSpeedBPS = Infinity;

    if (pData.isUsingConsumable) {
        resolvedSlowingActionString = 'Eating/Drinking';
        maxAllowedBaseSpeedBPS = config?.noSlowMaxSpeedEating ?? 1.0;
    } else if (pData.isChargingBow) {
        resolvedSlowingActionString = 'Charging Bow';
        maxAllowedBaseSpeedBPS = config?.noSlowMaxSpeedChargingBow ?? 1.0;
    } else if (pData.isUsingShield) {
        resolvedSlowingActionString = 'Using Shield';
        maxAllowedBaseSpeedBPS = config?.noSlowMaxSpeedUsingShield ?? DEFAULT_NOSLOW_MAX_SPEED_SHIELD;
    } else if (player.isSneaking) {
        resolvedSlowingActionString = 'Sneaking';
        maxAllowedBaseSpeedBPS = config?.noSlowMaxSpeedSneaking ?? DEFAULT_NOSLOW_MAX_SPEED_SNEAKING;
    }

    if (resolvedSlowingActionString) {
        let effectiveMaxAllowedSpeedBPS = maxAllowedBaseSpeedBPS;
        const speedAmplifier = pData.speedAmplifier ?? -1; // -1 is fine

        if (speedAmplifier >= 0) { // 0 is fine
            const speedEffectMultiplier = 1 + ((speedAmplifier + 1) * (config?.noSlowSpeedEffectMultiplierPerLevel ?? DEFAULT_NOSLOW_SPEED_EFFECT_MULTIPLIER_PER_LEVEL)); // 1 is fine
            effectiveMaxAllowedSpeedBPS *= speedEffectMultiplier;
            effectiveMaxAllowedSpeedBPS *= (1 + (config?.noSlowSpeedEffectTolerancePercent ?? DEFAULT_NOSLOW_SPEED_EFFECT_TOLERANCE_PERCENT)); // 1 is fine
        } else {
            effectiveMaxAllowedSpeedBPS *= (1 + (config?.noSlowGeneralTolerancePercent ?? DEFAULT_NOSLOW_GENERAL_TOLERANCE_PERCENT)); // 1 is fine
        }

        if (horizontalSpeedBPS > effectiveMaxAllowedSpeedBPS) {
            // watchedPlayerName is now defined in the outer scope
            const violationDetails = {
                action: resolvedSlowingActionString,
                speed: horizontalSpeedBPS.toFixed(2),
                maxAllowedSpeed: effectiveMaxAllowedSpeedBPS.toFixed(2),
                baseMaxSpeedForAction: maxAllowedBaseSpeedBPS.toFixed(2),
                hasSpeedEffect: (speedAmplifier >= 0).toString(),
                speedEffectLevel: speedAmplifier >= 0 ? (speedAmplifier + 1).toString() : '0',
            };
            const actionProfileKey = config?.noSlowActionProfileName ?? 'movementNoSlow';

            await actionManager?.executeCheckAction(player, actionProfileKey, violationDetails, dependencies);

            playerUtils?.debugLog(
                `[NoSlowCheck] Flagged ${playerName}. Action: ${resolvedSlowingActionString}, Speed: ${horizontalSpeedBPS.toFixed(2)}bps, EffectiveMax: ${effectiveMaxAllowedSpeedBPS.toFixed(2)}bps (BaseMax: ${maxAllowedBaseSpeedBPS.toFixed(2)})`,
                watchedPlayerName, dependencies,
            );
        } else if (pData.isWatched && config?.enableDebugLogging) {
            playerUtils?.debugLog(
                `[NoSlowCheck] ${playerName} valid speed. Action: ${resolvedSlowingActionString}, Speed: ${horizontalSpeedBPS.toFixed(2)}bps, EffectiveMax: ${effectiveMaxAllowedSpeedBPS.toFixed(2)}bps`,
                watchedPlayerName, dependencies,
            );
        }
    }
}
