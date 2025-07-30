/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').Dependencies} Dependencies
 */

// Constants for magic numbers
const ticksPerSecondNoSlow = 20;
const defaultNoSlowMaxSpeedShield = 4.4;
const defaultNoSlowMaxSpeedSneaking = 1.5;
const defaultNoSlowSpeedEffectMultiplierPerLevel = 0.20;
const defaultNoSlowSpeedEffectTolerancePercent = 0.10;
const defaultNoSlowGeneralTolerancePercent = 0.05;

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
    const horizontalSpeedBPS = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z) * ticksPerSecondNoSlow;

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
        maxAllowedBaseSpeedBPS = config?.noSlowMaxSpeedUsingShield ?? defaultNoSlowMaxSpeedShield;
    } else if (player.isSneaking) {
        resolvedSlowingActionString = 'Sneaking';
        maxAllowedBaseSpeedBPS = config?.noSlowMaxSpeedSneaking ?? defaultNoSlowMaxSpeedSneaking;
    }

    if (resolvedSlowingActionString) {
        let effectiveMaxAllowedSpeedBPS = maxAllowedBaseSpeedBPS;
        const speedAmplifier = pData.speedAmplifier ?? -1; // -1 is fine

        if (speedAmplifier >= 0) { // 0 is fine
            const speedEffectMultiplier = 1 + ((speedAmplifier + 1) * (config?.noSlowSpeedEffectMultiplierPerLevel ?? defaultNoSlowSpeedEffectMultiplierPerLevel)); // 1 is fine
            effectiveMaxAllowedSpeedBPS *= speedEffectMultiplier;
            effectiveMaxAllowedSpeedBPS *= (1 + (config?.noSlowSpeedEffectTolerancePercent ?? defaultNoSlowSpeedEffectTolerancePercent)); // 1 is fine
        } else {
            effectiveMaxAllowedSpeedBPS *= (1 + (config?.noSlowGeneralTolerancePercent ?? defaultNoSlowGeneralTolerancePercent)); // 1 is fine
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
