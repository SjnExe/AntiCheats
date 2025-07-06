/**
 * @file Implements a check to detect if a player is moving faster than allowed while performing actions
 * that should typically slow them down (e.g., eating, sneaking, charging a bow, using a shield).
 * Relies on player state flags in `pData` (e.g., `isUsingConsumable`, `isChargingBow`, `isUsingShield`) and
 * assumes `pData.speedAmplifier` is updated by `updateTransientPlayerData`.
 */

/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').CommandDependencies} CommandDependencies
 * @typedef {import('../../types.js').Config} Config
 */

/**
 * Checks if a player is moving faster than allowed for actions that should slow them down.
 * Slowing actions considered: Eating/Drinking, Charging Bow, Using Shield, Sneaking.
 * Takes into account Speed effect and a configurable tolerance.
 *
 * @async
 * @param {import('@minecraft/server').Player} player - The player instance to check.
 * @param {PlayerAntiCheatData} pData - Player-specific anti-cheat data.
 * @param {CommandDependencies} dependencies - The standard dependencies object.
 * @returns {Promise<void>}
 */
export async function checkNoSlow(player, pData, dependencies) {
    const { config, playerUtils, actionManager } = dependencies;

    if (!config.enableNoSlowCheck || !pData) {
        return;
    }

    const velocity = player.getVelocity();
    const horizontalSpeedBPS = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z) * 20;

    let resolvedSlowingActionString = null;
    let maxAllowedBaseSpeedBPS = Infinity;

    if (pData.isUsingConsumable) {
        resolvedSlowingActionString = 'Eating/Drinking';
        maxAllowedBaseSpeedBPS = config.noSlowMaxSpeedEating ?? 1.0;
    } else if (pData.isChargingBow) {
        resolvedSlowingActionString = 'Charging Bow';
        maxAllowedBaseSpeedBPS = config.noSlowMaxSpeedChargingBow ?? 1.0;
    } else if (pData.isUsingShield) {
        resolvedSlowingActionString = 'Using Shield';
        maxAllowedBaseSpeedBPS = config.noSlowMaxSpeedUsingShield ?? 4.4;
    } else if (player.isSneaking) {
        resolvedSlowingActionString = 'Sneaking';
        maxAllowedBaseSpeedBPS = config.noSlowMaxSpeedSneaking ?? 1.5;
    }

    if (resolvedSlowingActionString && horizontalSpeedBPS > maxAllowedBaseSpeedBPS) {
        let effectiveMaxAllowedSpeedBPS = maxAllowedBaseSpeedBPS;
        const speedAmplifier = pData.speedAmplifier ?? -1;

        if (speedAmplifier >= 0) {
            const speedEffectMultiplier = 1 + (speedAmplifier + 1) * 0.20;
            const tolerance = 1 + (config.noSlowSpeedEffectTolerancePercent ?? 0.10);
            effectiveMaxAllowedSpeedBPS = maxAllowedBaseSpeedBPS * speedEffectMultiplier * tolerance;
        } else {
            effectiveMaxAllowedSpeedBPS = maxAllowedBaseSpeedBPS * (1 + (config.noSlowGeneralTolerancePercent ?? 0.05));
        }

        if (horizontalSpeedBPS > effectiveMaxAllowedSpeedBPS) {
            const violationDetails = {
                action: resolvedSlowingActionString,
                speed: horizontalSpeedBPS.toFixed(2),
                maxAllowedSpeed: effectiveMaxAllowedSpeedBPS.toFixed(2),
                baseMaxSpeedForAction: maxAllowedBaseSpeedBPS.toFixed(2),
                hasSpeedEffect: (speedAmplifier >= 0).toString(),
                speedEffectLevel: speedAmplifier >= 0 ? (speedAmplifier + 1).toString() : '0',
            };
            // Ensure actionProfileKey is camelCase, standardizing from config
            const rawActionProfileKey = config.noSlowActionProfileName ?? 'movementNoSlow'; // Default is already camelCase
            const actionProfileKey = rawActionProfileKey
                .replace(/([-_][a-z0-9])/ig, ($1) => $1.toUpperCase().replace('-', '').replace('_', ''))
                .replace(/^[A-Z]/, (match) => match.toLowerCase());
            await actionManager.executeCheckAction(player, actionProfileKey, violationDetails, dependencies);

            const watchedPrefix = pData.isWatched ? player.nameTag : null;
            playerUtils.debugLog(
                `[NoSlowCheck] Flagged ${player.nameTag}. Action: ${resolvedSlowingActionString}, Speed: ${horizontalSpeedBPS.toFixed(2)}bps, Max: ${effectiveMaxAllowedSpeedBPS.toFixed(2)}bps`,
                watchedPrefix, dependencies
            );
        }
    }
}
