/**
 * @file AntiCheatsBP/scripts/checks/movement/noSlowCheck.js
 * Implements a check to detect if a player is moving faster than allowed while performing actions
 * that should typically slow them down (e.g., eating, sneaking, charging a bow).
 * Relies on player state flags in `pData` (e.g., `isUsingConsumable`, `isChargingBow`) and
 * assumes `pData.speedAmplifier` is updated by `updateTransientPlayerData`.
 * @version 1.0.1
 */

import * as mc from '@minecraft/server';

/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').Config} Config
 * @typedef {import('../../types.js').PlayerUtils} PlayerUtils
 * @typedef {import('../../types.js').PlayerDataManager} PlayerDataManager
 * @typedef {import('../../types.js').LogManager} LogManager
 * @typedef {import('../../types.js').ExecuteCheckAction} ExecuteCheckAction
 */

/**
 * Checks if a player is moving faster than allowed for actions that should slow them down
 * (e.g., eating, sneaking, using a bow, using a shield).
 *
 * @param {mc.Player} player - The player instance to check.
 * @param {PlayerAntiCheatData} pData - Player-specific anti-cheat data. Expected to contain
 *                                     state flags like `isUsingConsumable`, `isChargingBow`, `isUsingShield`,
 *                                     and `speedAmplifier` (from Speed effect).
 * @param {Config} config - The server configuration object, with `enableNoSlowCheck` and speed thresholds
 *                          like `noSlowMaxSpeedEating`, `noSlowMaxSpeedChargingBow`, etc.
 * @param {PlayerUtils} playerUtils - Utility functions for player interactions.
 * @param {PlayerDataManager} playerDataManager - Manager for player data.
 * @param {LogManager} logManager - Manager for logging.
 * @param {ExecuteCheckAction} executeCheckAction - Function to execute defined actions for a check.
 * @param {number} currentTick - The current game tick (not directly used in this check's core logic).
 * @returns {Promise<void>}
 */
export async function checkNoSlow(
    player,
    pData,
    config,
    playerUtils,
    playerDataManager,
    logManager,
    executeCheckAction,
    currentTick // Not directly used by this check's core logic
) {
    if (!config.enableNoSlowCheck || !pData) { // Added null check for pData
        return;
    }

    // This velocity is real-time from the player object, not from pData, which is correct for current speed.
    const velocity = player.getVelocity();
    const horizontalSpeed = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z) * 20; // Blocks per second

    let slowingAction = null; // Renamed from 'action' to 'slowingAction' for clarity
    let maxAllowedBaseSpeed = Infinity;

    if (pData.isUsingConsumable) {
        slowingAction = "Eating/Drinking";
        maxAllowedBaseSpeed = config.noSlowMaxSpeedEating ?? 1.0;
    } else if (pData.isChargingBow) {
        slowingAction = "Charging Bow";
        maxAllowedBaseSpeed = config.noSlowMaxSpeedChargingBow ?? 1.0;
    } else if (pData.isUsingShield) {
        slowingAction = "Using Shield";
        maxAllowedBaseSpeed = config.noSlowMaxSpeedUsingShield ?? 4.4; // Vanilla walk speed as a default example
    } else if (player.isSneaking) {
        slowingAction = "Sneaking";
        maxAllowedBaseSpeed = config.noSlowMaxSpeedSneaking ?? 1.5;
    }

    if (slowingAction && horizontalSpeed > maxAllowedBaseSpeed) {
        let effectiveMaxAllowedSpeed = maxAllowedBaseSpeed;
        const speedAmplifier = pData.speedAmplifier ?? -1; // Get speed effect level from pData

        // Crude adjustment for Speed effect: Vanilla NoSlow still applies, but players might try to bypass it
        // while Speed is active. This allows a slightly higher threshold if Speed is active.
        // A more accurate model would involve base player speed, effect modifiers, and then slowing percentages.
        // This is a simpler heuristic. Configured thresholds should be set with Speed effect in mind
        // or this adjustment should be more nuanced / configurable.
        if (speedAmplifier >= 0) { // If Speed effect is active (amplifier 0 for Speed I)
            // Example: Add a small fixed buffer or a percentage of the speed boost.
            // This is highly dependent on how `noSlowMaxSpeed...` values are configured.
            // If they are absolute maximums, this buffer might not be needed or should be small.
            // If they are "expected vanilla slowed speeds", then Speed effect should allow exceeding them.
            // For now, let's assume the configured values are strict maximums during the action,
            // and we add a small, configurable tolerance if Speed is active.
            effectiveMaxAllowedSpeed += (config.noSlowSpeedEffectTolerance ?? 0.5);
        }

        if (horizontalSpeed > effectiveMaxAllowedSpeed) {
            const dependencies = { config, playerDataManager, playerUtils, logManager };
            const violationDetails = {
                action: slowingAction,
                speed: horizontalSpeed.toFixed(2),
                maxAllowedSpeed: effectiveMaxAllowedSpeed.toFixed(2), // The actual limit that was exceeded
                baseMaxSpeedForAction: maxAllowedBaseSpeed.toFixed(2), // The configured limit for the action itself
                hasSpeedEffect: (speedAmplifier >= 0).toString(),
                speedEffectLevel: speedAmplifier >= 0 ? (speedAmplifier + 1).toString() : "0" // Show level 1 for amplifier 0
            };
            // Action profile name: config.noSlowActionProfileName ?? "movement_noslow"
            await executeCheckAction(player, "movement_noslow", violationDetails, dependencies);

            const watchedPrefix = pData.isWatched ? player.nameTag : null;
            playerUtils.debugLog?.(
                `NoSlow: Flagged ${player.nameTag}. Action: ${slowingAction}, Speed: ${horizontalSpeed.toFixed(2)}bps, Max: ${effectiveMaxAllowedSpeed.toFixed(2)}bps`,
                watchedPrefix
            );
        }
    }
    // This check reads pData states but doesn't modify them. No isDirtyForSave needed.
}
