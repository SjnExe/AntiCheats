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

    if (player.isSprinting) {
        let invalidCondition = null;
        let conditionDetails = ""; // For more specific logging or details

        // Check for Blindness effect (assuming pData.blindnessTicks is updated elsewhere)
        if ((pData.blindnessTicks ?? 0) > 0) {
            invalidCondition = "Blindness";
            conditionDetails = `Blindness Ticks: ${pData.blindnessTicks}`;
        } else if (player.isSneaking) {
            // Vanilla Minecraft typically prevents sprinting while sneaking.
            // This check catches if client state desync or cheats allow this combination.
            invalidCondition = "Sneaking";
            conditionDetails = "Player is sneaking";
        } else if (player.isRiding) {
            // Player shouldn't be able to sprint while riding most entities.
            invalidCondition = "Riding Entity";
            conditionDetails = "Player is riding an entity";
        }
        // Future: Add check for hunger level if player.getComponent('minecraft:hunger') is accessible
        // and sprint requires > X hunger. This would also benefit from pData caching.
        // Example:
        // if ((pData.hungerLevel ?? 20) <= (config.sprintMinHunger ?? 6)) {
        //     invalidCondition = "Low Hunger";
        //     conditionDetails = `Hunger: ${pData.hungerLevel}, Min: ${config.sprintMinHunger ?? 6}`;
        // }


        if (invalidCondition) {
            const dependencies = { config, playerDataManager, playerUtils, logManager };
            const violationDetails = {
                condition: invalidCondition,
                details: conditionDetails, // Add more specific details
                isSprinting: player.isSprinting.toString(), // Explicitly stringify booleans for details
                isSneaking: player.isSneaking.toString(),
                isRiding: player.isRiding.toString(),
                blindnessTicks: (pData.blindnessTicks ?? 0).toString()
                // hungerLevel: (pData.hungerLevel ?? 'N/A').toString() // If hunger check added
            };
            // Action profile name: config.invalidSprintActionProfileName ?? "movement_invalid_sprint"
            await executeCheckAction(player, "movement_invalid_sprint", violationDetails, dependencies);

            const watchedPrefix = pData.isWatched ? player.nameTag : null;
            playerUtils.debugLog?.(
                `InvalidSprint: Flagged ${player.nameTag}. Condition: ${invalidCondition}. Details: ${conditionDetails}`,
                watchedPrefix
            );
        }
    }
    // This check primarily reads states. If pData.blindnessTicks was set here, it would need isDirtyForSave.
    // However, per the optimization plan, effect states are read from pData, set by updateTransientPlayerData.
}
