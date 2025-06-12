/**
 * @file AntiCheatsBP/scripts/checks/movement/invalidSprintCheck.js
 * Implements a check to detect if a player is sprinting under conditions that should prevent it
 * (e.g., while sneaking, blind, riding, or potentially low hunger).
 * Relies on player state from Minecraft API (e.g., `isSprinting`, `isSneaking`) and
 * assumes `pData.blindnessTicks` (or similar for other effects) is updated by `updateTransientPlayerData`.
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
 * Checks if a player is sprinting under invalid conditions (e.g., while sneaking, blind, riding).
 *
 * @param {mc.Player} player - The player instance to check.
 * @param {PlayerAntiCheatData} pData - Player-specific anti-cheat data. Expected to contain `blindnessTicks`
 *                                     (updated by `updateTransientPlayerData`).
 * @param {Config} config - The server configuration object, with `enableInvalidSprintCheck`.
 * @param {PlayerUtils} playerUtils - Utility functions for player interactions.
 * @param {PlayerDataManager} playerDataManager - Manager for player data.
 * @param {LogManager} logManager - Manager for logging.
 * @param {ExecuteCheckAction} executeCheckAction - Function to execute defined actions for a check.
 * @param {number} currentTick - The current game tick (not directly used in this check's core logic).
 * @returns {Promise<void>}
 */
export async function checkInvalidSprint(
    player,
    pData,
    config,
    playerUtils,
    playerDataManager,
    logManager,
    executeCheckAction,
    currentTick // Not directly used by this check's core logic
) {
    if (!config.enableInvalidSprintCheck || !pData) { // Added null check for pData
        return;
    }

    // The pData.blindnessTicks field is assumed to be updated by updateTransientPlayerData in main.js
    // No need to call player.getEffects() here if that's the case.

import { getString } from '../../../core/i18n.js'; // Adjusted path

/**
 * @file AntiCheatsBP/scripts/checks/movement/invalidSprintCheck.js
// ... (rest of the file header)
 */
// ... (imports)

// Ensure getString is imported if not already:
// import { getString } from '../../../core/i18n.js'; // Path might vary

export async function checkInvalidSprint(
    player,
    pData,
    config,
    playerUtils,
    playerDataManager,
    logManager,
    executeCheckAction,
    currentTick // Not directly used by this check's core logic
) {
    if (!config.enableInvalidSprintCheck || !pData) { // Added null check for pData
        return;
    }

    if (player.isSprinting) {
        let invalidConditionKey = null; // Store the key for localization
        let conditionDetails = "";

        if ((pData.blindnessTicks ?? 0) > 0) {
            invalidConditionKey = "check.invalidSprint.condition.blindness";
            conditionDetails = `Blindness Ticks: ${pData.blindnessTicks}`;
        } else if (player.isSneaking) {
            invalidConditionKey = "check.invalidSprint.condition.sneaking";
            conditionDetails = "Player is sneaking";
        } else if (player.isRiding) {
            invalidConditionKey = "check.invalidSprint.condition.riding";
            conditionDetails = "Player is riding an entity";
        }

        if (invalidConditionKey) {
            const localizedCondition = getString(invalidConditionKey);
            const dependencies = { config, playerDataManager, playerUtils, logManager };
            const violationDetails = {
                condition: localizedCondition, // Use the localized string here
                details: conditionDetails,
                isSprinting: player.isSprinting.toString(),
                isSneaking: player.isSneaking.toString(),
                isRiding: player.isRiding.toString(),
                blindnessTicks: (pData.blindnessTicks ?? 0).toString()
            };
            await executeCheckAction(player, "movement_invalid_sprint", violationDetails, dependencies);

            const watchedPrefix = pData.isWatched ? player.nameTag : null;
            playerUtils.debugLog?.(
                `InvalidSprint: Flagged ${player.nameTag}. Condition: ${localizedCondition}. Details: ${conditionDetails}`,
                watchedPrefix
            );
        }
    }
}
