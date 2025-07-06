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

    if (!config?.enableNoSlowCheck) {
        return;
    }
    if (!pData) {
        playerUtils?.debugLog(`[NoSlowCheck] Skipping for ${playerName}: pData is null.`, playerName, dependencies);
        return;
    }

    const velocity = pData.velocity ?? player.getVelocity();
    const horizontalSpeedBPS = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z) * 20;

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
        maxAllowedBaseSpeedBPS = config?.noSlowMaxSpeedUsingShield ?? 4.4;
    } else if (player.isSneaking) {
        resolvedSlowingActionString = 'Sneaking';
        maxAllowedBaseSpeedBPS = config?.noSlowMaxSpeedSneaking ?? 1.5;
    }

    if (resolvedSlowingActionString) {
        let effectiveMaxAllowedSpeedBPS = maxAllowedBaseSpeedBPS;
        const speedAmplifier = pData.speedAmplifier ?? -1;

        if (speedAmplifier >= 0) {
            const speedEffectMultiplier = 1 + ((speedAmplifier + 1) * (config?.noSlowSpeedEffectMultiplierPerLevel ?? 0.20));
            effectiveMaxAllowedSpeedBPS *= speedEffectMultiplier;
            effectiveMaxAllowedSpeedBPS *= (1 + (config?.noSlowSpeedEffectTolerancePercent ?? 0.10));
        } else {
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
