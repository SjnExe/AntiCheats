/**
 * @file Implements checks for players attacking while in states that should normally prevent combat actions,
 * @module AntiCheatsBP/scripts/checks/combat/stateConflictCheck
 * such as sleeping, using consumables, charging bows, or using shields.
 */

/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').Dependencies} Dependencies
 * @typedef {import('../../types.js').EventSpecificData} EventSpecificData
 */

/**
 * Checks if the player is attacking while in a sleeping state.
 * Player's sleep state is determined by `player.isSleeping`.
 * @async
 * @param {import('@minecraft/server').Player} player - The player instance to check.
 * @param {PlayerAntiCheatData} pData - Player-specific anti-cheat data.
 * @param {Dependencies} dependencies - Object containing necessary dependencies.
 * @param {EventSpecificData} [eventSpecificData] - Optional event-specific data (e.g., targetEntity).
 * @returns {Promise<void>}
 */
export async function checkAttackWhileSleeping(player, pData, dependencies, eventSpecificData) {
    const { config, playerUtils, actionManager } = dependencies;
    const playerName = player?.nameTag ?? 'UnknownPlayer';

    if (!config?.enableStateConflictCheck) {
        return;
    }
    if (!pData) {
        playerUtils?.debugLog(`[StateConflictCheck.Sleeping] Skipping for ${playerName}: pData is null.`, playerName, dependencies);
        return;
    }

    const watchedPlayerName = pData.isWatched ? playerName : null;

    if (player.isSleeping) {
        const violationDetails = {
            state: 'isSleeping',
            targetEntityId: eventSpecificData?.targetEntity?.id,
            targetEntityType: eventSpecificData?.targetEntity?.typeId,
        };
        const rawActionProfileKey = config?.attackWhileSleepingActionProfileName ?? 'combatAttackWhileSleeping';
        const actionProfileKey = rawActionProfileKey
            .replace(/([-_][a-z0-9])/ig, ($1) => $1.toUpperCase().replace('-', '').replace('_', ''))
            .replace(/^[A-Z]/, (match) => match.toLowerCase());

        await actionManager?.executeCheckAction(player, actionProfileKey, violationDetails, dependencies);
        playerUtils?.debugLog(`[StateConflictCheck.Sleeping] Flagged ${playerName} for Attack While Sleeping.`, watchedPlayerName, dependencies);
    }
}

/**
 * Checks if the player is attacking while using an item (consumable, bow, shield).
 * Relies on state flags in `pData` (e.g., `isUsingConsumable`, `isChargingBow`, `isUsingShield`).
 * These flags are expected to be managed by other parts of the system (e.g., eventHandlers.js).
 * @async
 * @param {import('@minecraft/server').Player} player - The player instance to check.
 * @param {PlayerAntiCheatData} pData - Player-specific anti-cheat data.
 * @param {Dependencies} dependencies - Object containing necessary dependencies.
 * @param {EventSpecificData} [eventSpecificData] - Optional event-specific data (e.g., targetEntity).
 * @returns {Promise<void>}
 */
export async function checkAttackWhileUsingItem(player, pData, dependencies, eventSpecificData) {
    const { config, playerUtils, actionManager } = dependencies;
    const playerName = player?.nameTag ?? 'UnknownPlayer';

    if (!config?.enableStateConflictCheck) {
        return;
    }
    if (!pData) {
        playerUtils?.debugLog(`[StateConflictCheck.ItemUse] Skipping for ${playerName}: pData is null.`, playerName, dependencies);
        return;
    }

    const watchedPlayerName = pData.isWatched ? playerName : null;
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
        const rawActionProfileKeyConsuming = config?.attackWhileConsumingActionProfileName ?? 'combatAttackWhileConsuming';
        const actionProfileKeyConsuming = rawActionProfileKeyConsuming
            .replace(/([-_][a-z0-9])/ig, ($1) => $1.toUpperCase().replace('-', '').replace('_', ''))
            .replace(/^[A-Z]/, (match) => match.toLowerCase());
        await actionManager?.executeCheckAction(player, actionProfileKeyConsuming, violationDetails, dependencies);
        playerUtils?.debugLog(`[StateConflictCheck.ItemUse] Flagged ${playerName} for Attack While Consuming.`, watchedPlayerName, dependencies);
    }

    if (pData.isChargingBow) {
        const violationDetails = {
            ...targetDetails,
            state: 'isChargingBow',
            itemCategory: 'bow',
        };
        const rawActionProfileKeyBow = config?.attackWhileBowChargingActionProfileName ?? 'combatAttackWhileBowCharging';
        const actionProfileKeyBow = rawActionProfileKeyBow
            .replace(/([-_][a-z0-9])/ig, ($1) => $1.toUpperCase().replace('-', '').replace('_', ''))
            .replace(/^[A-Z]/, (match) => match.toLowerCase());
        await actionManager?.executeCheckAction(player, actionProfileKeyBow, violationDetails, dependencies);
        playerUtils?.debugLog(`[StateConflictCheck.ItemUse] Flagged ${playerName} for Attack While Charging Bow.`, watchedPlayerName, dependencies);
    }

    if (pData.isUsingShield) {
        const violationDetails = {
            ...targetDetails,
            state: 'isUsingShield',
            itemCategory: 'shield',
        };
        const rawActionProfileKeyShield = config?.attackWhileShieldingActionProfileName ?? 'combatAttackWhileShielding';
        const actionProfileKeyShield = rawActionProfileKeyShield
            .replace(/([-_][a-z0-9])/ig, ($1) => $1.toUpperCase().replace('-', '').replace('_', ''))
            .replace(/^[A-Z]/, (match) => match.toLowerCase());
        await actionManager?.executeCheckAction(player, actionProfileKeyShield, violationDetails, dependencies);
        playerUtils?.debugLog(`[StateConflictCheck.ItemUse] Flagged ${playerName} for Attack While Shielding.`, watchedPlayerName, dependencies);
    }
}
