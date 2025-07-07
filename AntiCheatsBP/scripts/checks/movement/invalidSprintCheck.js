/**
 * @file Implements a check to detect if a player is sprinting under conditions that should prevent it
 * (e.g., while sneaking, blind, riding, low hunger, using item, or charging bow).
 * Relies on player state from Minecraft API (e.g., `isSprinting`, `isSneaking`) and
 * assumes `pData` fields like `blindnessTicks`, `isUsingConsumable`, `isChargingBow`
 * are updated by `updateTransientPlayerData` or relevant event handlers.
 */
import * as mc from '@minecraft/server';

/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').Dependencies} Dependencies
 */

// Constants for magic numbers
const DEFAULT_SPRINT_HUNGER_LIMIT = 6;

/**
 * Checks if a player is sprinting under invalid conditions.
 * Conditions checked: Blindness, Sneaking, Riding, Low Hunger, Using Consumable, Charging Bow.
 *
 * @async
 * @param {import('@minecraft/server').Player} player - The player instance to check.
 * @param {PlayerAntiCheatData} pData - Player-specific anti-cheat data.
 * @param {Dependencies} dependencies - The standard dependencies object.
 * @returns {Promise<void>}
 */
export async function checkInvalidSprint(player, pData, dependencies) {
    const { config, playerUtils, actionManager } = dependencies;
    const playerName = player?.nameTag ?? 'UnknownPlayer';

    if (!config?.enableInvalidSprintCheck) {
        return;
    }
    if (!pData) {
        playerUtils?.debugLog(`[InvalidSprintCheck] Skipping for ${playerName}: pData is null.`, playerName, dependencies);
        return;
    }

    if (player.isSprinting) {
        let resolvedConditionString = null;
        let conditionDetailsLog = '';
        let isHungerTooLow = false;
        let currentFoodLevel = 'N/A';

        const rawActionProfileKey = config?.invalidSprintActionProfileName ?? 'movementInvalidSprint';
        const actionProfileKey = rawActionProfileKey
            .replace(/([-_][a-z0-9])/ig, ($1) => $1.toUpperCase().replace('-', '').replace('_', ''))
            .replace(/^[A-Z]/, (match) => match.toLowerCase());
        const watchedPlayerName = pData.isWatched ? playerName : null;

        try {
            const foodComp = player.getComponent(mc.EntityComponentTypes.Food);
            if (foodComp) {
                currentFoodLevel = foodComp.foodLevel.toString();
                if (foodComp.foodLevel <= (config?.sprintHungerLimit ?? DEFAULT_SPRINT_HUNGER_LIMIT)) {
                    isHungerTooLow = true;
                }
            }
        } catch (e) {
            playerUtils?.debugLog(`[InvalidSprintCheck WARNING] Error getting food component for ${playerName}: ${e.message}`, watchedPlayerName, dependencies);
        }

        if ((pData.blindnessTicks ?? 0) > 0) {
            resolvedConditionString = 'Blindness';
            conditionDetailsLog = `Blindness Ticks: ${pData.blindnessTicks}`;
        } else if (player.isSneaking) {
            resolvedConditionString = 'Sneaking';
            conditionDetailsLog = 'Player is sneaking';
        } else if (player.isRiding) {
            resolvedConditionString = 'Riding Entity';
            conditionDetailsLog = 'Player is riding an entity';
        } else if (isHungerTooLow) {
            resolvedConditionString = `Low Hunger (Food: ${currentFoodLevel})`;
            conditionDetailsLog = `Hunger level at ${currentFoodLevel} (Limit: <= ${config?.sprintHungerLimit ?? DEFAULT_SPRINT_HUNGER_LIMIT})`;
        } else if (pData.isUsingConsumable) {
            resolvedConditionString = 'Using Item (Consumable)';
            conditionDetailsLog = 'Player is using a consumable';
        } else if (pData.isChargingBow) {
            resolvedConditionString = 'Charging Bow';
            conditionDetailsLog = 'Player is charging a bow';
        }

        if (resolvedConditionString) {
            const violationDetails = {
                condition: resolvedConditionString,
                details: conditionDetailsLog,
                isSprinting: player.isSprinting.toString(),
                isSneaking: player.isSneaking.toString(),
                isRiding: player.isRiding.toString(),
                blindnessTicks: (pData.blindnessTicks ?? 0).toString(),
                hungerLevel: currentFoodLevel,
                isUsingConsumable: (pData.isUsingConsumable ?? false).toString(),
                isChargingBow: (pData.isChargingBow ?? false).toString(),
            };
            await actionManager?.executeCheckAction(player, actionProfileKey, violationDetails, dependencies);

            playerUtils?.debugLog(
                `[InvalidSprintCheck] Flagged ${playerName}. Condition: ${resolvedConditionString}. Details: ${conditionDetailsLog}`,
                watchedPlayerName, dependencies,
            );
        }
    }
}
