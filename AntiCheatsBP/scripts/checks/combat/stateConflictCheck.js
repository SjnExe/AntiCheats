/**
 * @file AntiCheatsBP/scripts/checks/combat/stateConflictCheck.js
 * Implements checks for players attacking while in states that should normally prevent combat actions,
 * such as sleeping, using consumables, charging bows, or using shields.
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
 * Checks if the player is attacking while in a sleeping state.
 * Player's sleep state is determined by `player.isSleeping`.
 * @param {mc.Player} player - The player instance to check.
 * @param {PlayerAntiCheatData} pData - Player-specific anti-cheat data.
 * @param {Config} config - The server configuration object.
 * @param {PlayerUtils} playerUtils - Utility functions for player interactions.
 * @param {PlayerDataManager} playerDataManager - Manager for player data.
 * @param {LogManager} logManager - Manager for logging.
 * @param {ExecuteCheckAction} executeCheckAction - Function to execute defined actions for a check.
 * @param {number} currentTick - The current game tick (not directly used in this check's core logic).
 * @returns {Promise<void>}
 */
export async function checkAttackWhileSleeping(
    player,
    pData,
    config,
    playerUtils,
    playerDataManager,
    logManager,
    executeCheckAction,
    currentTick // Not directly used by this check's logic
) {
    if (!config.enableStateConflictCheck || !pData) { // Added null check for pData
        return;
    }

    const watchedPrefix = pData.isWatched ? player.nameTag : null;

    if (player.isSleeping) {
        const violationDetails = {
            state: "isSleeping",
            // targetEntity information would typically come from the EntityHurtEvent that triggered this check sequence.
            // If this check is called from such an event, the target could be passed in.
            // For now, keeping details minimal as this check focuses on the attacker's state.
        };
        const dependencies = { config, playerDataManager, playerUtils, logManager };
        await executeCheckAction(player, "combatAttackWhileSleeping", violationDetails, dependencies);

        playerUtils.debugLog?.(`StateConflict: Flagged ${player.nameTag} for Attack While Sleeping.`, watchedPrefix);
    }
}

/**
 * Checks if the player is attacking while using an item (consumable, bow, shield).
 * Relies on state flags in `pData` (e.g., `isUsingConsumable`, `isChargingBow`, `isUsingShield`)
 * which are typically set in `handleItemUse` and cleared in the main tick loop or by other events.
 * @param {mc.Player} player - The player instance to check.
 * @param {PlayerAntiCheatData} pData - Player-specific anti-cheat data.
 * @param {Config} config - The server configuration object.
 * @param {PlayerUtils} playerUtils - Utility functions for player interactions.
 * @param {PlayerDataManager} playerDataManager - Manager for player data.
 * @param {LogManager} logManager - Manager for logging.
 * @param {ExecuteCheckAction} executeCheckAction - Function to execute defined actions for a check.
 * @param {number} currentTick - The current game tick (not directly used in this check's core logic).
 * @returns {Promise<void>}
 */
export async function checkAttackWhileUsingItem(
    player,
    pData,
    config,
    playerUtils,
    playerDataManager,
    logManager,
    executeCheckAction,
    currentTick // Not directly used by this check's logic
) {
    if (!config.enableStateConflictCheck || !pData) { // Added null check for pData
        return;
    }

    const watchedPrefix = pData.isWatched ? player.nameTag : null;
    const dependencies = { config, playerDataManager, playerUtils, logManager };

    if (pData.isUsingConsumable) {
        const violationDetails = {
            state: "isUsingConsumable",
            itemCategory: "consumable",
            // To get specific item: pData.lastUsedItemTypeId (if stored during handleItemUse)
        };
        await executeCheckAction(player, "combatAttackWhileConsuming", violationDetails, dependencies);
        playerUtils.debugLog?.(`StateConflict: Flagged ${player.nameTag} for Attack While Consuming.`, watchedPrefix);
    }

    // It's possible for multiple conflicting states to be true if logic elsewhere is flawed or due to client behavior.
    // These are checked independently.
    if (pData.isChargingBow) {
        const violationDetails = {
            state: "isChargingBow",
            itemCategory: "bow",
        };
        await executeCheckAction(player, "combatAttackWhileBowCharging", violationDetails, dependencies);
        playerUtils.debugLog?.(`StateConflict: Flagged ${player.nameTag} for Attack While Charging Bow.`, watchedPrefix);
    }

    if (pData.isUsingShield) {
        const violationDetails = {
            state: "isUsingShield",
            itemCategory: "shield",
        };
        await executeCheckAction(player, "combatAttackWhileShielding", violationDetails, dependencies);
        playerUtils.debugLog?.(`StateConflict: Flagged ${player.nameTag} for Attack While Shielding.`, watchedPrefix);
    }
}
