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

    if (player.isSprinting) {
        let invalidConditionKey = null;
        let conditionDetails = "";
        let isHungerTooLow = false;
        let currentFoodLevel = 'N/A';

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
                playerUtils.debugLog(`[InvalidSprintCheck] Error getting food component for ${player.nameTag}: ${e.message}`, player.nameTag, dependencies);
            }
        }

        if ((pData.blindnessTicks ?? 0) > 0) {
            invalidConditionKey = "check.invalidSprint.condition.blindness";
            conditionDetails = `Blindness Ticks: ${pData.blindnessTicks}`;
        } else if (player.isSneaking) {
            invalidConditionKey = "check.invalidSprint.condition.sneaking";
            conditionDetails = "Player is sneaking";
        } else if (player.isRiding) {
            invalidConditionKey = "check.invalidSprint.condition.riding";
            conditionDetails = "Player is riding an entity";
        } else if (isHungerTooLow) {
            invalidConditionKey = "check.invalidSprint.condition.hunger";
            conditionDetails = `Hunger level at ${currentFoodLevel} (Limit: <= ${config.sprintHungerLimit ?? 6})`;
        } else if (pData.isUsingConsumable) {
            invalidConditionKey = "check.invalidSprint.condition.usingItem";
            conditionDetails = "Player is using a consumable";
        } else if (pData.isChargingBow) {
            invalidConditionKey = "check.invalidSprint.condition.chargingBow";
            conditionDetails = "Player is charging a bow";
        }

        if (invalidConditionKey) {
            let resolvedLocalizedCondition = invalidConditionKey;
            if (invalidConditionKey === "check.invalidSprint.condition.blindness") resolvedLocalizedCondition = "Blindness";
            else if (invalidConditionKey === "check.invalidSprint.condition.sneaking") resolvedLocalizedCondition = "Sneaking";
            else if (invalidConditionKey === "check.invalidSprint.condition.riding") resolvedLocalizedCondition = "Riding Entity";
            else if (invalidConditionKey === "check.invalidSprint.condition.hunger") resolvedLocalizedCondition = "Low Hunger";
            else if (invalidConditionKey === "check.invalidSprint.condition.usingItem") resolvedLocalizedCondition = "Using Item";
            else if (invalidConditionKey === "check.invalidSprint.condition.chargingBow") resolvedLocalizedCondition = "Charging Bow";

            const violationDetails = {
                condition: resolvedLocalizedCondition,
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
                `[InvalidSprintCheck] Flagged ${player.nameTag}. Condition: ${resolvedLocalizedCondition}. Details: ${conditionDetails}`,
                watchedPrefix, dependencies
            );
        }
    }
}
