/**
 * @file AntiCheatsBP/scripts/checks/combat/stateConflictCheck.js
 * Implements checks for players attacking while in states that should normally prevent combat actions,
 * such as sleeping, using consumables, charging bows, or using shields.
 * @version 1.1.0
 */
/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').CommandDependencies} CommandDependencies
 * @typedef {import('../../types.js').EventSpecificData} EventSpecificData
 */
/**
 * Checks if the player is attacking while in a sleeping state.
 * Player's sleep state is determined by `player.isSleeping`.
 * @param {import('@minecraft/server').Player} player - The player instance to check.
 * @param {PlayerAntiCheatData} pData - Player-specific anti-cheat data.
 * @param {CommandDependencies} dependencies - Object containing necessary dependencies.
 * @param {EventSpecificData} [eventSpecificData] - Optional event-specific data (e.g., targetEntity).
 * @returns {Promise<void>}
 */
export async function checkAttackWhileSleeping(
    player,
    pData,
    dependencies,
    eventSpecificData
) {
    const { config, playerUtils, playerDataManager, logManager, actionManager } = dependencies;

    if (!config.enableStateConflictCheck || !pData) {
        return;
    }

    const watchedPrefix = pData.isWatched ? player.nameTag : null;

    if (player.isSleeping) {
        const violationDetails = {
            state: "isSleeping",
            targetEntityId: eventSpecificData?.targetEntity?.id,
            targetEntityType: eventSpecificData?.targetEntity?.typeId
        };
        await actionManager.executeCheckAction(player, "combatAttackWhileSleeping", violationDetails, dependencies);
        playerUtils.debugLog(`[StateConflictCheck] Flagged ${player.nameTag} for Attack While Sleeping.`, watchedPrefix, dependencies);
    }
}
/**
 * Checks if the player is attacking while using an item (consumable, bow, shield).
 * Relies on state flags in `pData` (e.g., `isUsingConsumable`, `isChargingBow`, `isUsingShield`).
 * @param {import('@minecraft/server').Player} player - The player instance to check.
 * @param {PlayerAntiCheatData} pData - Player-specific anti-cheat data.
 * @param {CommandDependencies} dependencies - Object containing necessary dependencies.
 * @param {EventSpecificData} [eventSpecificData] - Optional event-specific data (e.g., targetEntity).
 * @returns {Promise<void>}
 */
export async function checkAttackWhileUsingItem(
    player,
    pData,
    dependencies,
    eventSpecificData
) {
    const { config, playerUtils, playerDataManager, logManager, actionManager } = dependencies;

    if (!config.enableStateConflictCheck || !pData) {
        return;
    }

    const watchedPrefix = pData.isWatched ? player.nameTag : null;
    const targetDetails = {
        targetEntityId: eventSpecificData?.targetEntity?.id,
        targetEntityType: eventSpecificData?.targetEntity?.typeId
    };

    if (pData.isUsingConsumable) {
        const violationDetails = {
            ...targetDetails,
            state: "isUsingConsumable",
            itemCategory: "consumable",
        };
        await actionManager.executeCheckAction(player, "combatAttackWhileConsuming", violationDetails, dependencies);
        playerUtils.debugLog(`[StateConflictCheck] Flagged ${player.nameTag} for Attack While Consuming.`, watchedPrefix, dependencies);
    }

    if (pData.isChargingBow) {
        const violationDetails = {
            ...targetDetails,
            state: "isChargingBow",
            itemCategory: "bow",
        };
        await actionManager.executeCheckAction(player, "combatAttackWhileBowCharging", violationDetails, dependencies);
        playerUtils.debugLog(`[StateConflictCheck] Flagged ${player.nameTag} for Attack While Charging Bow.`, watchedPrefix, dependencies);
    }

    if (pData.isUsingShield) {
        const violationDetails = {
            ...targetDetails,
            state: "isUsingShield",
            itemCategory: "shield",
        };
        await actionManager.executeCheckAction(player, "combatAttackWhileShielding", violationDetails, dependencies);
        playerUtils.debugLog(`[StateConflictCheck] Flagged ${player.nameTag} for Attack While Shielding.`, watchedPrefix, dependencies);
    }
}
