/**
 * @file Implements a check to detect if a player is moving faster than allowed while performing actions
 * that should typically slow them down (e.g., eating, sneaking, charging a bow, using a shield).
 * Relies on player state flags in `pData` (e.g., `isUsingConsumable`, `isChargingBow`, `isUsingShield`) and
 * assumes `pData.speedAmplifier` is updated by `updateTransientPlayerData`.
 */
import * as mc from '@minecraft/server'; // Not strictly needed unless mc.Player type is used directly

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
    const { config, playerUtils, actionManager, getString } = dependencies;

    if (!config.enableNoSlowCheck || !pData) {
        return;
    }

    const velocity = player.getVelocity();
    // Calculate horizontal speed in blocks per second (BPS)
    const horizontalSpeedBPS = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z) * 20;

    let slowingActionKey = null; // Localization key for the action
    let maxAllowedBaseSpeedBPS = Infinity; // Base max speed for the action in BPS

    if (pData.isUsingConsumable) {
        slowingActionKey = 'check.noSlow.action.eatingDrinking';
        maxAllowedBaseSpeedBPS = config.noSlowMaxSpeedEating ?? 1.0; // Default from previous logic
    } else if (pData.isChargingBow) {
        slowingActionKey = 'check.noSlow.action.chargingBow';
        maxAllowedBaseSpeedBPS = config.noSlowMaxSpeedChargingBow ?? 1.0; // Default from previous logic
    } else if (pData.isUsingShield) {
        slowingActionKey = 'check.noSlow.action.usingShield';
        maxAllowedBaseSpeedBPS = config.noSlowMaxSpeedUsingShield ?? 4.4; // Vanilla walking speed is ~4.313 BPS
    } else if (player.isSneaking) {
        slowingActionKey = 'check.noSlow.action.sneaking';
        maxAllowedBaseSpeedBPS = config.noSlowMaxSpeedSneaking ?? 1.5; // Vanilla sneak speed is ~1.31 BPS
    }

    // If a slowing action is active and player is moving faster than the base allowed speed for that action
    if (slowingActionKey && horizontalSpeedBPS > maxAllowedBaseSpeedBPS) {
        let effectiveMaxAllowedSpeedBPS = maxAllowedBaseSpeedBPS;
        const speedAmplifier = pData.speedAmplifier ?? -1; // -1 if no speed effect

        if (speedAmplifier >= 0) { // If Speed effect is active
            const speedEffectMultiplier = 1 + (speedAmplifier + 1) * 0.20; // Vanilla speed increase
            const tolerance = 1 + (config.noSlowSpeedEffectTolerancePercent ?? 0.10); // 10% tolerance
            effectiveMaxAllowedSpeedBPS = maxAllowedBaseSpeedBPS * speedEffectMultiplier * tolerance;
        } else {
            // Apply a smaller general tolerance if no speed effect, to account for minor variations
            effectiveMaxAllowedSpeedBPS = maxAllowedBaseSpeedBPS * (1 + (config.noSlowGeneralTolerancePercent ?? 0.05));
        }


        if (horizontalSpeedBPS > effectiveMaxAllowedSpeedBPS) {
            let resolvedSlowingActionString;
            if (getString && typeof slowingActionKey === 'string' && slowingActionKey.startsWith('check.noSlow.action.')) {
                resolvedSlowingActionString = getString(slowingActionKey);
            } else {
                // Fallback to manual English strings
                switch (slowingActionKey) {
                    case 'check.noSlow.action.eatingDrinking': resolvedSlowingActionString = 'Eating/Drinking'; break;
                    case 'check.noSlow.action.chargingBow': resolvedSlowingActionString = 'Charging Bow'; break;
                    case 'check.noSlow.action.usingShield': resolvedSlowingActionString = 'Using Shield'; break;
                    case 'check.noSlow.action.sneaking': resolvedSlowingActionString = 'Sneaking'; break;
                    default: resolvedSlowingActionString = 'Unknown Action'; break;
                }
            }

            const violationDetails = {
                action: resolvedSlowingActionString,
                speed: horizontalSpeedBPS.toFixed(2),
                maxAllowedSpeed: effectiveMaxAllowedSpeedBPS.toFixed(2),
                baseMaxSpeedForAction: maxAllowedBaseSpeedBPS.toFixed(2),
                hasSpeedEffect: (speedAmplifier >= 0).toString(),
                speedEffectLevel: speedAmplifier >= 0 ? (speedAmplifier + 1).toString() : '0',
            };
            // Standardized action profile key
            await actionManager.executeCheckAction(player, 'movementNoslow', violationDetails, dependencies);

            const watchedPrefix = pData.isWatched ? player.nameTag : null;
            playerUtils.debugLog(
                `[NoSlowCheck] Flagged ${player.nameTag}. Action: ${resolvedSlowingActionString}, Speed: ${horizontalSpeedBPS.toFixed(2)}bps, Max: ${effectiveMaxAllowedSpeedBPS.toFixed(2)}bps`,
                watchedPrefix, dependencies
            );
        }
    }
}
