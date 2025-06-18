/**
 * @file AntiCheatsBP/scripts/checks/movement/invalidSprintCheck.js
 * Implements a check to detect if a player is sprinting under conditions that should prevent it
 * (e.g., while sneaking, blind, riding, or potentially low hunger).
 * Relies on player state from Minecraft API (e.g., `isSprinting`, `isSneaking`) and
 * assumes `pData.blindnessTicks` (or similar for other effects) is updated by `updateTransientPlayerData`.
 * @version 1.0.1
 */

import * as mc from '@minecraft/server';
// getString will be accessed via dependencies.getString

/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').Dependencies} Dependencies
 */

/**
 * Checks if a player is sprinting under invalid conditions (e.g., while sneaking, blind, riding).
 *
 * @param {mc.Player} player - The player instance to check.
 * @param {PlayerAntiCheatData} pData - Player-specific anti-cheat data. Expected to contain `blindnessTicks`
 *                                     (updated by `updateTransientPlayerData`).
 * @param {Dependencies} dependencies - The standard dependencies object.
 * @returns {Promise<void>}
 */
export async function checkInvalidSprint(player, pData, dependencies) {
    const { config, playerUtils, actionManager, getString } = dependencies;

    if (!config.enableInvalidSprintCheck || !pData) {
        return;
    }

    // The pData.blindnessTicks field is assumed to be updated by updateTransientPlayerData in main.js
    // No need to call player.getEffects() here if that's the case.

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
            const localizedCondition = getString(invalidConditionKey); // getString from dependencies
            // Pass the full dependencies object to executeCheckAction
            const violationDetails = {
                condition: localizedCondition,
                details: conditionDetails,
                isSprinting: player.isSprinting.toString(),
                isSneaking: player.isSneaking.toString(),
                isRiding: player.isRiding.toString(),
                blindnessTicks: (pData.blindnessTicks ?? 0).toString()
            };
            await actionManager.executeCheckAction(player, "movementInvalidSprint", violationDetails, dependencies);

            const watchedPrefix = pData.isWatched ? player.nameTag : null;
            playerUtils.debugLog(
                `[InvalidSprintCheck] Flagged ${player.nameTag}. Condition: ${localizedCondition}. Details: ${conditionDetails}`,
                dependencies, watchedPrefix
            );
        }
    }
}
