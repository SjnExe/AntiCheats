/**
 * @file Implements a check to detect if a player is sprinting under conditions that should prevent it
 * (e.g., while sneaking, blind, riding, low hunger, using item, or charging bow).
 * Relies on player state from Minecraft API (e.g., `isSprinting`, `isSneaking`) and
 * assumes `pData` fields like `blindnessTicks`, `isUsingConsumable`, `isChargingBow`
 * are updated by `updateTransientPlayerData` or relevant event handlers.
 */
import * as mc from '@minecraft/server'; // Not strictly needed if only using mc.Player type via JSDoc

/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').CommandDependencies} CommandDependencies
 * @typedef {import('../../types.js').Config} Config
 */

/**
 * Checks if a player is sprinting under invalid conditions.
 * Conditions checked: Blindness, Sneaking, Riding, Low Hunger, Using Consumable, Charging Bow.
 *
 * @async
 * @param {import('@minecraft/server').Player} player - The player instance to check.
 * @param {PlayerAntiCheatData} pData - Player-specific anti-cheat data.
 * @param {CommandDependencies} dependencies - The standard dependencies object.
 * @returns {Promise<void>}
 */
export async function checkInvalidSprint(player, pData, dependencies) {
    const { config, playerUtils, actionManager, getString } = dependencies; // Added getString

    if (!config.enableInvalidSprintCheck || !pData) {
        return;
    }

    if (player.isSprinting) {
        let invalidConditionKey = null; // Will hold the localization key for the condition
        let conditionDetailsLog = ''; // For more detailed internal logging
        let isHungerTooLow = false;
        let currentFoodLevel = 'N/A';
        const actionProfileKey = 'movementInvalidSprint'; // Standardized key

        try {
            const foodComp = player.getComponent('minecraft:food');
            if (foodComp) {
                currentFoodLevel = foodComp.foodLevel.toString();
                if (foodComp.foodLevel <= (config.sprintHungerLimit ?? 6)) {
                    isHungerTooLow = true;
                }
            }
        } catch (e) {
            // Log error if debug mode is on and player is watched, or generally if food component access fails
            if (playerUtils.debugLog && (pData.isWatched || config.enableDebugLogging)) {
                playerUtils.debugLog(`[InvalidSprintCheck] Error getting food component for ${player.nameTag}: ${e.message}`, player.nameTag, dependencies);
            }
            // console.error(`[InvalidSprintCheck] Food component error for ${player.nameTag}: ${e.stack || e}`); // Optional: more aggressive logging
        }

        if ((pData.blindnessTicks ?? 0) > 0) {
            invalidConditionKey = 'check.invalidSprint.condition.blindness';
            conditionDetailsLog = `Blindness Ticks: ${pData.blindnessTicks}`;
        } else if (player.isSneaking) {
            invalidConditionKey = 'check.invalidSprint.condition.sneaking';
            conditionDetailsLog = 'Player is sneaking';
        } else if (player.isRiding) {
            invalidConditionKey = 'check.invalidSprint.condition.riding';
            conditionDetailsLog = 'Player is riding an entity';
        } else if (isHungerTooLow) {
            invalidConditionKey = 'check.invalidSprint.condition.hunger';
            conditionDetailsLog = `Hunger level at ${currentFoodLevel} (Limit: <= ${config.sprintHungerLimit ?? 6})`;
        } else if (pData.isUsingConsumable) {
            invalidConditionKey = 'check.invalidSprint.condition.usingItem';
            conditionDetailsLog = 'Player is using a consumable';
        } else if (pData.isChargingBow) {
            invalidConditionKey = 'check.invalidSprint.condition.chargingBow';
            conditionDetailsLog = 'Player is charging a bow';
        }
        // Add more conditions here if needed, like being in water without depth strider, etc.

        if (invalidConditionKey) {
            let resolvedConditionString;
            // Attempt to use getString for localized condition name
            if (getString && typeof invalidConditionKey === 'string' && invalidConditionKey.startsWith('check.invalidSprint.condition.')) {
                resolvedConditionString = getString(invalidConditionKey, {
                    hungerLevel: currentFoodLevel, // For hunger condition
                    limit: (config.sprintHungerLimit ?? 6).toString(), // For hunger condition
                });
            } else {
                // Fallback to a more generic English description if getString is not available or key doesn't match pattern
                switch (invalidConditionKey) { // Using the key directly as fallback
                    case 'check.invalidSprint.condition.blindness': resolvedConditionString = 'Blindness'; break;
                    case 'check.invalidSprint.condition.sneaking': resolvedConditionString = 'Sneaking'; break;
                    case 'check.invalidSprint.condition.riding': resolvedConditionString = 'Riding Entity'; break;
                    case 'check.invalidSprint.condition.hunger': resolvedConditionString = `Low Hunger (Food: ${currentFoodLevel})`; break;
                    case 'check.invalidSprint.condition.usingItem': resolvedConditionString = 'Using Item'; break;
                    case 'check.invalidSprint.condition.chargingBow': resolvedConditionString = 'Charging Bow'; break;
                    default: resolvedConditionString = 'Unknown Invalid Sprint Condition'; break;
                }
            }

            const violationDetails = {
                condition: resolvedConditionString, // User-friendly condition name
                details: conditionDetailsLog,      // More detailed log string
                isSprinting: player.isSprinting.toString(),
                isSneaking: player.isSneaking.toString(),
                isRiding: player.isRiding.toString(),
                blindnessTicks: (pData.blindnessTicks ?? 0).toString(),
                hungerLevel: currentFoodLevel,
                isUsingConsumable: (pData.isUsingConsumable ?? false).toString(),
                isChargingBow: (pData.isChargingBow ?? false).toString(),
            };
            await actionManager.executeCheckAction(player, actionProfileKey, violationDetails, dependencies);

            const watchedPrefix = pData.isWatched ? player.nameTag : null;
            playerUtils.debugLog(
                `[InvalidSprintCheck] Flagged ${player.nameTag}. Condition: ${resolvedConditionString}. Details: ${conditionDetailsLog}`,
                watchedPrefix, dependencies
            );
        }
    }
}
