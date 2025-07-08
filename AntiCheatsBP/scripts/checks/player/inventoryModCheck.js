/**
 * @file Implements checks for suspicious inventory manipulations, such as:
 * @module AntiCheatsBP/scripts/checks/player/inventoryModCheck
 * 1. Using an item in the same game tick as a hotbar slot change (Switch-Use).
 * 2. Moving items in the inventory while an action that should lock inventory is in progress (e.g., eating, charging bow) (Move-Locked).
 */
import * as mc from '@minecraft/server';

/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').Dependencies} Dependencies
 * @typedef {import('../../types.js').EventSpecificData} EventSpecificData containing `itemStack` (for switch-use) or `inventoryChangeDetails` (for move-locked).
 */

/**
 * Checks for item usage occurring in the exact same game tick as a hotbar slot change.
 * This behavior can indicate client modification allowing faster-than-normal actions.
 * Relies on `pData.lastSelectedSlotChangeTick` being accurately updated by other systems
 * (e.g., main tick loop processing `player.selectedSlotChanged` or similar event if available,
 * or `playerDataManager.updateTransientPlayerData` which updates it if slot index changes).
 * This check is typically called from an `ItemUseBeforeEvent` handler.
 * @async
 * @param {import('@minecraft/server').Player} player - The player instance.
 * @param {PlayerAntiCheatData} pData - Player-specific anti-cheat data.
 * @param {Dependencies} dependencies - Object containing necessary dependencies.
 * @param {EventSpecificData} eventSpecificData - Data specific to the event, expects `itemStack` (the item being used).
 * @returns {Promise<void>}
 */
export async function checkSwitchAndUseInSameTick(player, pData, dependencies, eventSpecificData) {
    const { config, playerUtils, actionManager, currentTick } = dependencies;
    const itemStack = eventSpecificData?.itemStack;
    const playerName = player?.nameTag ?? 'UnknownPlayer';

    if (!config?.enableInventoryModCheck) {
        return;
    }
    if (!pData || !(itemStack instanceof mc.ItemStack)) {
        playerUtils?.debugLog(`[InventoryModCheck.SwitchUse] Skipping for ${playerName}: pData or itemStack invalid.`, playerName, dependencies);
        return;
    }

    const rawActionProfileKey = config?.inventoryModSwitchUseActionProfileName ?? 'playerInventoryModSwitchUse';
    const actionProfileKey = rawActionProfileKey
        .replace(/([-_][a-z0-9])/ig, ($1) => $1.toUpperCase().replace('-', '').replace('_', ''))
        .replace(/^[A-Z]/, (match) => match.toLowerCase());

    if (pData.lastSelectedSlotChangeTick === currentTick) {
        const violationDetails = {
            reasonDetail: 'Used item in the same tick as a hotbar slot change.',
            itemType: itemStack.typeId,
            itemName: itemStack.nameTag ?? itemStack.typeId.replace('minecraft:', ''),
            slot: player.selectedSlotIndex.toString(),
            lastSlotChangeTick: (pData.lastSelectedSlotChangeTick ?? 'N/A').toString(),
            currentTick: currentTick.toString(),
        };
        await actionManager?.executeCheckAction(player, actionProfileKey, violationDetails, dependencies);

        const watchedPlayerName = pData.isWatched ? playerName : null;
        playerUtils?.debugLog(
            `[InventoryModCheck.SwitchUse] Flagged ${playerName} for using ${itemStack.typeId} in same tick as slot change (Tick: ${currentTick}).`,
            watchedPlayerName, dependencies,
        );
    }
}

/**
 * Checks for inventory item changes (moves, drops, etc.) while actions that should "lock"
 * the inventory are in progress (e.g., eating, drawing a bow).
 * Relies on `pData` state flags like `isUsingConsumable` or `isChargingBow`,
 * which are expected to be managed by other parts of the system (e.g., eventHandlers.js).
 * This check is typically called from an `PlayerInventoryItemChangeAfterEvent` handler.
 * @async
 * @param {import('@minecraft/server').Player} player - The player instance.
 * @param {PlayerAntiCheatData} pData - Player-specific anti-cheat data.
 * @param {Dependencies} dependencies - Object containing necessary dependencies.
 * @param {EventSpecificData} eventSpecificData - Data specific to the event, expects `inventoryChangeDetails`
 * (which should mirror structure of `PlayerInventoryItemChangeAfterEvent`'s eventData
 * like `newItemStack`, `oldItemStack`, `inventorySlot`).
 * @returns {Promise<void>}
 */
export async function checkInventoryMoveWhileActionLocked(player, pData, dependencies, eventSpecificData) {
    const { config, playerUtils, actionManager } = dependencies;
    const inventoryChangeDetails = eventSpecificData?.inventoryChangeDetails ?? eventSpecificData;
    const playerName = player?.nameTag ?? 'UnknownPlayer';

    if (!config?.enableInventoryModCheck) {
        return;
    }
    if (!pData || !inventoryChangeDetails) {
        playerUtils?.debugLog(`[InventoryModCheck.MoveLocked] Skipping for ${playerName}: pData or inventoryChangeDetails invalid.`, playerName, dependencies);
        return;
    }

    let lockingActionKey = null;
    if (pData.isUsingConsumable) {
        lockingActionKey = 'usingConsumable';
    } else if (pData.isChargingBow) {
        lockingActionKey = 'chargingBow';
    }

    if (lockingActionKey) {
        const newItem = inventoryChangeDetails.newItemStack ?? inventoryChangeDetails.newItem;
        const oldItem = inventoryChangeDetails.oldItemStack ?? inventoryChangeDetails.oldItem;
        const changedItemType = newItem?.typeId ?? oldItem?.typeId ?? 'unknown_item';
        const slotIdentifier = inventoryChangeDetails.slotName ?? inventoryChangeDetails.inventorySlot?.toString() ?? inventoryChangeDetails.slot?.toString() ?? 'unknown_slot';

        const violationDetails = {
            reasonDetail: `Moved item in slot ${slotIdentifier} while ${lockingActionKey}.`,
            itemTypeInvolved: changedItemType,
            slotChanged: slotIdentifier,
            actionInProgress: lockingActionKey,
            newItemAmount: newItem?.amount?.toString() ?? 'N/A',
            oldItemAmount: oldItem?.amount?.toString() ?? 'N/A',
        };
        const rawActionProfileKey = config?.inventoryModMoveLockedActionProfileName ?? 'playerInventoryModMoveLocked';
        const actionProfileKey = rawActionProfileKey
            .replace(/([-_][a-z0-9])/ig, ($1) => $1.toUpperCase().replace('-', '').replace('_', ''))
            .replace(/^[A-Z]/, (match) => match.toLowerCase());

        await actionManager?.executeCheckAction(player, actionProfileKey, violationDetails, dependencies);

        const watchedPlayerName = pData.isWatched ? playerName : null;
        playerUtils?.debugLog(
            `[InventoryModCheck.MoveLocked] Flagged ${playerName} for inventory item change (Slot: ${slotIdentifier}, Item: ${changedItemType}) while ${lockingActionKey}.`,
            watchedPlayerName, dependencies,
        );
    }
}
