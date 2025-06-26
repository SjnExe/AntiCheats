/**
 * @file Implements checks for players attacking while in states that should normally prevent combat actions,
 * such as sleeping, using consumables, charging bows, or using shields.
 */

/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').CommandDependencies} CommandDependencies
 * @typedef {import('../../types.js').EventSpecificData} EventSpecificData
 */

/**
 * Checks if the player is attacking while in a sleeping state.
 * Player's sleep state is determined by `player.isSleeping`.
 *
 * @async
 * @param {import('@minecraft/server').Player} player - The player instance to check.
 * @param {PlayerAntiCheatData} pData - Player-specific anti-cheat data.
 * @param {CommandDependencies} dependencies - Object containing necessary dependencies.
 * @param {EventSpecificData} [eventSpecificData] - Optional event-specific data (e.g., targetEntity).
 * @returns {Promise<void>}
 */
export async function checkAttackWhileSleeping(player, pData, dependencies, eventSpecificData) {
    const { config, playerUtils, actionManager } = dependencies; // Removed unused playerDataManager, logManager

    if (!config.enableStateConflictCheck || !pData) {
        return;
    }

    const watchedPrefix = pData.isWatched ? player.nameTag : null;

    if (player.isSleeping) {
        const violationDetails = {
            state: 'isSleeping',
            targetEntityId: eventSpecificData?.targetEntity?.id,
            targetEntityType: eventSpecificData?.targetEntity?.typeId,
        };
        // Standardized action profile key
        const actionProfileKey = config.attackWhileSleepingActionProfileName ?? 'combatAttackWhileSleeping';
        await actionManager.executeCheckAction(player, actionProfileKey, violationDetails, dependencies);
        playerUtils.debugLog(`[StateConflictCheck] Flagged ${player.nameTag} for Attack While Sleeping.`, watchedPrefix, dependencies);
    }
}

/**
 * Checks if the player is attacking while using an item (consumable, bow, shield).
 * Relies on state flags in `pData` (e.g., `isUsingConsumable`, `isChargingBow`, `isUsingShield`).
 * These flags are expected to be managed by other parts of the system (e.g., eventHandlers.js).
 *
 * @async
 * @param {import('@minecraft/server').Player} player - The player instance to check.
 * @param {PlayerAntiCheatData} pData - Player-specific anti-cheat data.
 * @param {CommandDependencies} dependencies - Object containing necessary dependencies.
 * @param {EventSpecificData} [eventSpecificData] - Optional event-specific data (e.g., targetEntity).
 * @returns {Promise<void>}
 */
export async function checkAttackWhileUsingItem(player, pData, dependencies, eventSpecificData) {
    const { config, playerUtils, actionManager } = dependencies; // Removed unused playerDataManager, logManager

    if (!config.enableStateConflictCheck || !pData) {
        return;
    }

    const watchedPrefix = pData.isWatched ? player.nameTag : null;
    const targetDetails = {
        targetEntityId: eventSpecificData?.targetEntity?.id,
        targetEntityType: eventSpecificData?.targetEntity?.typeId,
    };

    if (pData.isUsingConsumable) {
        const violationDetails = {
            ...targetDetails,
            state: 'isUsingConsumable',
            itemCategory: 'consumable',
        };
        // Standardized action profile key
        const actionProfileKeyConsuming = config.attackWhileConsumingActionProfileName ?? 'combatAttackWhileConsuming';
        await actionManager.executeCheckAction(player, actionProfileKeyConsuming, violationDetails, dependencies);
        playerUtils.debugLog(`[StateConflictCheck] Flagged ${player.nameTag} for Attack While Consuming.`, watchedPrefix, dependencies);
    }

    if (pData.isChargingBow) {
        const violationDetails = {
            ...targetDetails,
            state: 'isChargingBow',
            itemCategory: 'bow',
        };
        // Standardized action profile key
        const actionProfileKeyBow = config.attackWhileBowChargingActionProfileName ?? 'combatAttackWhileBowCharging';
        await actionManager.executeCheckAction(player, actionProfileKeyBow, violationDetails, dependencies);
        playerUtils.debugLog(`[StateConflictCheck] Flagged ${player.nameTag} for Attack While Charging Bow.`, watchedPrefix, dependencies);
    }

    if (pData.isUsingShield) {
        const violationDetails = {
            ...targetDetails,
            state: 'isUsingShield',
            itemCategory: 'shield',
        };
        // Standardized action profile key
        const actionProfileKeyShield = config.attackWhileShieldingActionProfileName ?? 'combatAttackWhileShielding';
        await actionManager.executeCheckAction(player, actionProfileKeyShield, violationDetails, dependencies);
        playerUtils.debugLog(`[StateConflictCheck] Flagged ${player.nameTag} for Attack While Shielding.`, watchedPrefix, dependencies);
    }
}
