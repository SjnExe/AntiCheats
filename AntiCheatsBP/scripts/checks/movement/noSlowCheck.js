/**
 * @file Implements a check to detect if a player is moving faster than allowed while performing actions
 * that should typically slow them down (e.g., eating, sneaking, charging a bow, using a shield).
 * Relies on player state flags in `pData` (e.g., `isUsingConsumable`, `isChargingBow`, `isUsingShield`) and
 * assumes `pData.speedAmplifier` is updated by `updateTransientPlayerData`.
 */

/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').Dependencies} Dependencies
 */

/**
 * Checks if a player is moving faster than allowed for actions that should slow them down.
 * Slowing actions considered: Eating/Drinking, Charging Bow, Using Shield, Sneaking.
 * Takes into account Speed effect and a configurable tolerance.
 * This check is typically run every tick.
 *
 * @async
 * @param {import('@minecraft/server').Player} player - The player instance to check.
 * @param {PlayerAntiCheatData} pData - Player-specific anti-cheat data.
 * @param {Dependencies} dependencies - The standard dependencies object.
 * @returns {Promise<void>}
 */
export async function checkNoSlow(player, pData, dependencies) {
    const { config, playerUtils, actionManager } = dependencies;
    const playerName = player?.nameTag ?? 'UnknownPlayer';

    if (!config?.enableNoSlowCheck) { // Check master toggle
        return;
    }
    if (!pData) {
        playerUtils?.debugLog(`[NoSlowCheck] Skipping for ${playerName}: pData is null.`, playerName, dependencies);
        return;
    }

    // velocity should be current, typically from pData updated by updateTransientPlayerData
    const velocity = pData.velocity ?? player.getVelocity(); // Fallback to live velocity if pData.velocity isn't set
    const horizontalSpeedBPS = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z) * 20; // Blocks per second

    let resolvedSlowingActionString = null;
    let maxAllowedBaseSpeedBPS = Infinity; // Default to no limit if no action matches

    // Determine if player is performing a slowing action and get the base max speed
    if (pData.isUsingConsumable) {
        resolvedSlowingActionString = 'Eating/Drinking';
        maxAllowedBaseSpeedBPS = config?.noSlowMaxSpeedEating ?? 1.0;
    } else if (pData.isChargingBow) {
        resolvedSlowingActionString = 'Charging Bow';
        maxAllowedBaseSpeedBPS = config?.noSlowMaxSpeedChargingBow ?? 1.0;
    } else if (pData.isUsingShield) { // pData.isUsingShield should be set if player is actively blocking
        resolvedSlowingActionString = 'Using Shield';
        maxAllowedBaseSpeedBPS = config?.noSlowMaxSpeedUsingShield ?? 4.4; // Vanilla walking speed is ~4.3, shield doesn't slow normal walking
    } else if (player.isSneaking) {
        resolvedSlowingActionString = 'Sneaking';
        maxAllowedBaseSpeedBPS = config?.noSlowMaxSpeedSneaking ?? 1.5; // Vanilla sneaking is ~1.31
    }

    if (resolvedSlowingActionString) { // If a slowing action is identified
        let effectiveMaxAllowedSpeedBPS = maxAllowedBaseSpeedBPS;
        const speedAmplifier = pData.speedAmplifier ?? -1; // From updateTransientPlayerData

        // Adjust max speed for Speed effect
        if (speedAmplifier >= 0) {
            // Vanilla Speed effect adds 20% per level to base speed (not multiplicative with action speed directly)
            // This is a simplification; true calculation might be more complex.
            // For NoSlow, we're checking if they bypass the action's slowdown.
            // So, we allow a percentage increase on the action's max speed.
            const speedEffectMultiplier = 1 + ((speedAmplifier + 1) * (config?.noSlowSpeedEffectMultiplierPerLevel ?? 0.20)); // Configurable multiplier
            effectiveMaxAllowedSpeedBPS *= speedEffectMultiplier;
            // Apply an additional tolerance specifically for when speed effect is active
            effectiveMaxAllowedSpeedBPS *= (1 + (config?.noSlowSpeedEffectTolerancePercent ?? 0.10));
        } else {
            // Apply general tolerance if no speed effect
            effectiveMaxAllowedSpeedBPS *= (1 + (config?.noSlowGeneralTolerancePercent ?? 0.05));
        }

        if (horizontalSpeedBPS > effectiveMaxAllowedSpeedBPS) {
            const watchedPlayerName = pData.isWatched ? playerName : null;
            const violationDetails = {
                action: resolvedSlowingActionString,
                speed: horizontalSpeedBPS.toFixed(2),
                maxAllowedSpeed: effectiveMaxAllowedSpeedBPS.toFixed(2),
                baseMaxSpeedForAction: maxAllowedBaseSpeedBPS.toFixed(2),
                hasSpeedEffect: (speedAmplifier >= 0).toString(),
                speedEffectLevel: speedAmplifier >= 0 ? (speedAmplifier + 1).toString() : '0',
            };
            // Ensure actionProfileKey is camelCase
            const rawActionProfileKey = config?.noSlowActionProfileName ?? 'movementNoSlow';
            const actionProfileKey = rawActionProfileKey
                .replace(/([-_][a-z0-9])/ig, ($1) => $1.toUpperCase().replace('-', '').replace('_', ''))
                .replace(/^[A-Z]/, (match) => match.toLowerCase());

            await actionManager?.executeCheckAction(player, actionProfileKey, violationDetails, dependencies);

            playerUtils?.debugLog(
                `[NoSlowCheck] Flagged ${playerName}. Action: ${resolvedSlowingActionString}, Speed: ${horizontalSpeedBPS.toFixed(2)}bps, EffectiveMax: ${effectiveMaxAllowedSpeedBPS.toFixed(2)}bps (BaseMax: ${maxAllowedBaseSpeedBPS.toFixed(2)})`,
                watchedPlayerName, dependencies
            );
        } else if (pData.isWatched && config?.enableDebugLogging) {
             playerUtils?.debugLog(
                `[NoSlowCheck] ${playerName} valid speed. Action: ${resolvedSlowingActionString}, Speed: ${horizontalSpeedBPS.toFixed(2)}bps, EffectiveMax: ${effectiveMaxAllowedSpeedBPS.toFixed(2)}bps`,
                watchedPlayerName, dependencies
            );
        }
    }
}
