/**
 * @file AntiCheatsBP/scripts/checks/movement/noSlowCheck.js
 * Implements a check to detect if a player is moving faster than allowed while performing actions
 * that should typically slow them down (e.g., eating, sneaking, charging a bow).
 * Relies on player state flags in `pData` (e.g., `isUsingConsumable`, `isChargingBow`) and
 * assumes `pData.speedAmplifier` is updated by `updateTransientPlayerData`.
 * @version 1.0.2
 */

import * as mc from '@minecraft/server';
import { getString } from '../../../core/i18n.js';

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
    currentTick
) {
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
        const speedAmplifier = pData.speedAmplifier ?? -1;

        if (speedAmplifier >= 0) {
            effectiveMaxAllowedSpeed += (config.noSlowSpeedEffectTolerance ?? 0.5);
        }

        if (horizontalSpeed > effectiveMaxAllowedSpeed) {
            const localizedSlowingAction = getString(slowingActionKey);
            const dependencies = { config, playerDataManager, playerUtils, logManager };
            const violationDetails = {
                action: localizedSlowingAction, // Use localized string
                speed: horizontalSpeed.toFixed(2),
                maxAllowedSpeed: effectiveMaxAllowedSpeed.toFixed(2),
                baseMaxSpeedForAction: maxAllowedBaseSpeed.toFixed(2),
                hasSpeedEffect: (speedAmplifier >= 0).toString(),
                speedEffectLevel: speedAmplifier >= 0 ? (speedAmplifier + 1).toString() : "0"
            };
            await executeCheckAction(player, "movement_noslow", violationDetails, dependencies);

            const watchedPrefix = pData.isWatched ? player.nameTag : null;
            playerUtils.debugLog?.(
                `NoSlow: Flagged ${player.nameTag}. Action: ${localizedSlowingAction}, Speed: ${horizontalSpeed.toFixed(2)}bps, Max: ${effectiveMaxAllowedSpeed.toFixed(2)}bps`,
                watchedPrefix
            );
        }
    }
}
