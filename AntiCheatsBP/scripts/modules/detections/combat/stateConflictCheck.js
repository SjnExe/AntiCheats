/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').Dependencies} Dependencies
 * @typedef {import('../../types.js').EventSpecificData} EventSpecificData
 */

/**
 * Checks if the player is attacking while sleeping.
 * @param {import('@minecraft/server').Player} player The player to check.
 * @param {PlayerAntiCheatData} pData The player's data.
 * @param {Dependencies} dependencies The command dependencies.
 * @param {EventSpecificData} [eventSpecificData] Optional event-specific data.
 */
export async function checkAttackWhileSleeping(player, pData, dependencies, eventSpecificData) {
    const { config, playerUtils, actionManager } = dependencies;
    const playerName = player?.name ?? 'UnknownPlayer';

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
        const actionProfileKey = config?.attackWhileSleepingActionProfileName ?? 'combatAttackWhileSleeping';

        await actionManager?.executeCheckAction(player, actionProfileKey, violationDetails, dependencies);
        playerUtils?.debugLog(`[StateConflictCheck.Sleeping] Flagged ${playerName} for Attack While Sleeping.`, watchedPlayerName, dependencies);
    }
}

/**
 * Checks if the player is attacking while using an item.
 * @param {import('@minecraft/server').Player} player The player to check.
 * @param {PlayerAntiCheatData} pData The player's data.
 * @param {Dependencies} dependencies The command dependencies.
 * @param {EventSpecificData} [eventSpecificData] Optional event-specific data.
 */
export async function checkAttackWhileUsingItem(player, pData, dependencies, eventSpecificData) {
    const { config, playerUtils, actionManager } = dependencies;
    const playerName = player?.name ?? 'UnknownPlayer';

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
        const actionProfileKeyConsuming = config?.attackWhileConsumingActionProfileName ?? 'combatAttackWhileConsuming';
        await actionManager?.executeCheckAction(player, actionProfileKeyConsuming, violationDetails, dependencies);
        playerUtils?.debugLog(`[StateConflictCheck.ItemUse] Flagged ${playerName} for Attack While Consuming.`, watchedPlayerName, dependencies);
    }

    if (pData.isChargingBow) {
        const violationDetails = {
            ...targetDetails,
            state: 'isChargingBow',
            itemCategory: 'bow',
        };
        const actionProfileKeyBow = config?.attackWhileBowChargingActionProfileName ?? 'combatAttackWhileBowCharging';
        await actionManager?.executeCheckAction(player, actionProfileKeyBow, violationDetails, dependencies);
        playerUtils?.debugLog(`[StateConflictCheck.ItemUse] Flagged ${playerName} for Attack While Charging Bow.`, watchedPlayerName, dependencies);
    }

    if (pData.isUsingShield) {
        const violationDetails = {
            ...targetDetails,
            state: 'isUsingShield',
            itemCategory: 'shield',
        };
        const actionProfileKeyShield = config?.attackWhileShieldingActionProfileName ?? 'combatAttackWhileShielding';
        await actionManager?.executeCheckAction(player, actionProfileKeyShield, violationDetails, dependencies);
        playerUtils?.debugLog(`[StateConflictCheck.ItemUse] Flagged ${playerName} for Attack While Shielding.`, watchedPlayerName, dependencies);
    }
}
