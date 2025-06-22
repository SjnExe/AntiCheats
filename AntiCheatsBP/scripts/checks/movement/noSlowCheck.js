/**
 * @file AntiCheatsBP/scripts/checks/movement/noSlowCheck.js
 * Implements a check to detect if a player is moving faster than allowed while performing actions
 * that should typically slow them down (e.g., eating, sneaking, charging a bow).
 * Relies on player state flags in `pData` (e.g., `isUsingConsumable`, `isChargingBow`) and
 * assumes `pData.speedAmplifier` is updated by `updateTransientPlayerData`.
 * @version 1.0.2
 */

import * as mc from '@minecraft/server';
// getString will be accessed via dependencies.getString

/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').Dependencies} Dependencies
 */

/**
 * Checks if a player is moving faster than allowed for actions that should slow them down
 * (e.g., eating, sneaking, using a bow, using a shield).
 *
 * @param {mc.Player} player - The player instance to check.
 * @param {PlayerAntiCheatData} pData - Player-specific anti-cheat data. Expected to contain
 *                                     state flags like `isUsingConsumable`, `isChargingBow`, `isUsingShield`,
 *                                     and `speedAmplifier` (from Speed effect).
 * @param {Dependencies} dependencies - The standard dependencies object.
 * @returns {Promise<void>}
 */
export async function checkNoSlow(player, pData, dependencies) {
    const { config, playerUtils, actionManager } = dependencies; // getString removed

    if (!config.enableNoSlowCheck || !pData) {
        return;
    }

    const velocity = player.getVelocity();
    const horizontalSpeed = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z) * 20;

    let slowingActionKey = null;
    let maxAllowedBaseSpeed = Infinity;

    if (pData.isUsingConsumable) {
        slowingActionKey = "check.noSlow.action.eatingDrinking";
        maxAllowedBaseSpeed = config.noSlowMaxSpeedEating ?? 1.0;
    } else if (pData.isChargingBow) {
        slowingActionKey = "check.noSlow.action.chargingBow";
        maxAllowedBaseSpeed = config.noSlowMaxSpeedChargingBow ?? 1.0;
    } else if (pData.isUsingShield) {
        slowingActionKey = "check.noSlow.action.usingShield";
        maxAllowedBaseSpeed = config.noSlowMaxSpeedUsingShield ?? 4.4;
    } else if (player.isSneaking) {
        slowingActionKey = "check.noSlow.action.sneaking";
        maxAllowedBaseSpeed = config.noSlowMaxSpeedSneaking ?? 1.5;
    }

    if (slowingActionKey && horizontalSpeed > maxAllowedBaseSpeed) {
        let effectiveMaxAllowedSpeed = maxAllowedBaseSpeed;
        const speedAmplifier = pData.speedAmplifier ?? -1; // pData.speedAmplifier is 0 for Speed I, 1 for Speed II, etc.

        if (speedAmplifier >= 0) {
            // Calculate vanilla speed with effect: Speed effect is 20% per level (amplifier + 1)
            const vanillaSpeedWithEffect = maxAllowedBaseSpeed * (1 + (speedAmplifier + 1) * 0.20);
            // Add percentage-based tolerance
            effectiveMaxAllowedSpeed = vanillaSpeedWithEffect * (1 + (config.noSlowSpeedEffectTolerancePercent ?? 0.10));
        }
        // If no speed effect, effectiveMaxAllowedSpeed remains maxAllowedBaseSpeed (plus any inherent small buffer in that base speed)

        if (horizontalSpeed > effectiveMaxAllowedSpeed) {
            let resolvedSlowingAction = slowingActionKey; // Fallback
            if (slowingActionKey === "check.noSlow.action.eatingDrinking") resolvedSlowingAction = "Eating/Drinking";
            else if (slowingActionKey === "check.noSlow.action.chargingBow") resolvedSlowingAction = "Charging Bow";
            else if (slowingActionKey === "check.noSlow.action.usingShield") resolvedSlowingAction = "Using Shield";
            else if (slowingActionKey === "check.noSlow.action.sneaking") resolvedSlowingAction = "Sneaking";

            const violationDetails = {
                action: resolvedSlowingAction,
                speed: horizontalSpeed.toFixed(2),
                maxAllowedSpeed: effectiveMaxAllowedSpeed.toFixed(2),
                baseMaxSpeedForAction: maxAllowedBaseSpeed.toFixed(2),
                hasSpeedEffect: (speedAmplifier >= 0).toString(),
                speedEffectLevel: speedAmplifier >= 0 ? (speedAmplifier + 1).toString() : "0"
            };
            await actionManager.executeCheckAction(player, "movementNoslow", violationDetails, dependencies);

            const watchedPrefix = pData.isWatched ? player.nameTag : null;
            playerUtils.debugLog(
                `[NoSlowCheck] Flagged ${player.nameTag}. Action: ${resolvedSlowingAction}, Speed: ${horizontalSpeed.toFixed(2)}bps, Max: ${effectiveMaxAllowedSpeed.toFixed(2)}bps`,
                watchedPrefix, dependencies
            );
        }
    }
}
