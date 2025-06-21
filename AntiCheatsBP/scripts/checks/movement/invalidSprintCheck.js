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
    const { config, playerUtils, actionManager } = dependencies;

    if (!config.enableInvalidSprintCheck || !pData) {
        return;
    }

    // The pData.blindnessTicks field is assumed to be updated by updateTransientPlayerData in main.js
    // No need to call player.getEffects() here if that's the case.

    if (player.isSprinting) {
        let invalidConditionKey = null;
        let conditionDetails = "";
        let isHungerTooLow = false;
        let currentFoodLevel = 'N/A';
        let localizedCondition = "";

        try {
            const foodComp = player.getComponent("minecraft:food");
            if (foodComp) {
                currentFoodLevel = foodComp.foodLevel.toString();
                if (foodComp.foodLevel <= (config.sprintHungerLimit ?? 6)) {
                    isHungerTooLow = true;
                }
            }
        } catch (e) {
            if (playerUtils.debugLog && pData.isWatched) {
                playerUtils.debugLog(dependencies, `[InvalidSprintCheck] Error getting food component for ${player.nameTag}: ${e.message}`, player.nameTag);
            }
        }

        if ((pData.blindnessTicks ?? 0) > 0) {
            invalidConditionKey = "checks.invalidSprint.condition_blindness";
            localizedCondition = "Blindness";
            conditionDetails = `Blindness Ticks: ${pData.blindnessTicks}`;
        } else if (player.isSneaking) {
            invalidConditionKey = "checks.invalidSprint.condition_sneaking";
            localizedCondition = "Sneaking";
            conditionDetails = "Player is sneaking";
        } else if (player.isRiding) {
            invalidConditionKey = "checks.invalidSprint.condition_riding";
            localizedCondition = "Riding Entity";
            conditionDetails = "Player is riding an entity";
        } else if (isHungerTooLow) {
            invalidConditionKey = "check.invalidSprint.condition.hunger";
            localizedCondition = "Low hunger"; // Using key as string was not intended, providing default
            conditionDetails = `Hunger level at ${currentFoodLevel} (Limit: <= ${config.sprintHungerLimit ?? 6})`;
        } else if (pData.isUsingConsumable) {
            invalidConditionKey = "check.invalidSprint.condition.usingItem";
            localizedCondition = "Using item"; // Using key as string was not intended, providing default
            conditionDetails = "Player is using a consumable";
        } else if (pData.isChargingBow) {
            invalidConditionKey = "check.invalidSprint.condition.chargingBow";
            localizedCondition = "Charging bow"; // Using key as string was not intended, providing default
            conditionDetails = "Player is charging a bow";
        }
        // Note: Shield check (pData.isUsingShield) is not typically here as shield doesn't prevent sprint if already sprinting,
        // but prevents initiation. NoSlow check handles speed while shield is up.

        if (invalidConditionKey) {
            const violationDetails = {
                condition: localizedCondition,
                details: conditionDetails,
                isSprinting: player.isSprinting.toString(),
                isSneaking: player.isSneaking.toString(),
                isRiding: player.isRiding.toString(),
                blindnessTicks: (pData.blindnessTicks ?? 0).toString(),
                hungerLevel: currentFoodLevel,
                isUsingConsumable: pData.isUsingConsumable.toString(),
                isChargingBow: pData.isChargingBow.toString()
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
