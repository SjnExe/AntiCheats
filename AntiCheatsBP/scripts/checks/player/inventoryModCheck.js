/**
 * @file Implements checks for suspicious inventory manipulations, such as:
 * 1. Using an item in the same game tick as a hotbar slot change (Switch-Use).
 * 2. Moving items in the inventory while an action that should lock inventory is in progress (e.g., eating, charging bow) (Move-Locked).
 */

/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').CommandDependencies} CommandDependencies
 * @typedef {import('../../types.js').EventSpecificData} EventSpecificData containing `itemStack` or `inventoryChangeData`.
 * @typedef {import('../../types.js').Config} Config
 */

/**
 * Checks for item usage occurring in the exact same game tick as a hotbar slot change.
 * This behavior can indicate client modification allowing faster-than-normal actions.
 * Relies on `pData.lastSelectedSlotChangeTick` being accurately updated by other systems (e.g., main tick loop).
 *
 * @async
 * @param {import('@minecraft/server').Player} player - The player instance.
 * @param {PlayerAntiCheatData} pData - Player-specific anti-cheat data.
 * @param {CommandDependencies} dependencies - Object containing necessary dependencies.
 * @param {EventSpecificData} eventSpecificData - Data specific to the event, expects `itemStack` (from ItemUse event).
 * @returns {Promise<void>}
 */
export async function checkSwitchAndUseInSameTick(player, pData, dependencies, eventSpecificData) {
    const { config, playerUtils, actionManager, currentTick } = dependencies;
    const itemStack = eventSpecificData?.itemStack;

    if (!config.enableInventoryModCheck || !pData || !itemStack) {
        return;
    }

    // Ensure actionProfileKey is camelCase, standardizing from config
    const rawActionProfileKey = config.inventoryModSwitchUseActionProfileName ?? 'playerInventoryModSwitchUse'; // Default is already camelCase
    const actionProfileKey = rawActionProfileKey
        .replace(/([-_][a-z0-9])/ig, ($1) => $1.toUpperCase().replace('-', '').replace('_', ''))
        .replace(/^[A-Z]/, (match) => match.toLowerCase());

    if (pData.lastSelectedSlotChangeTick === currentTick) {
        const violationDetails = {
            reasonDetail: 'Used item in the same tick as a hotbar slot change.',
            itemType: itemStack.typeId,
            slot: player.selectedSlotIndex.toString(),
            lastSlotChangeTick: pData.lastSelectedSlotChangeTick.toString(),
            currentTick: currentTick.toString(),
        };
        await actionManager.executeCheckAction(player, actionProfileKey, violationDetails, dependencies);

        const watchedPrefix = pData.isWatched ? player.nameTag : null;
        playerUtils.debugLog(
            `[InventoryModCheck](SwitchUse): Flagged ${player.nameTag} for using ${itemStack.typeId} in same tick as slot change (Tick: ${currentTick}).`,
            watchedPrefix, dependencies
        );
    }
}

/**
 * Checks for inventory item changes (moves, drops, etc.) while actions that should "lock"
 * the inventory are in progress (e.g., eating, drawing a bow).
 * Relies on `pData` state flags like `isUsingConsumable` or `isChargingBow`,
 * which are expected to be managed by other parts of the system (e.g., eventHandlers.js).
 *
 * @async
 * @param {import('@minecraft/server').Player} player - The player instance.
 * @param {PlayerAntiCheatData} pData - Player-specific anti-cheat data.
 * @param {CommandDependencies} dependencies - Object containing necessary dependencies.
 * @param {EventSpecificData} eventSpecificData - Data specific to the event, expects `inventoryChangeData`
 *                                                (which should mirror structure of `PlayerInventoryItemChangeAfterEvent`'s eventData like `newItemStack`, `oldItemStack`, `inventorySlot`).
 * @returns {Promise<void>}
 */
export async function checkInventoryMoveWhileActionLocked(player, pData, dependencies, eventSpecificData) {
    const { config, playerUtils, actionManager } = dependencies;
    const inventoryChangeDetails = eventSpecificData?.inventoryChangeDetails || eventSpecificData;

    if (!config.enableInventoryModCheck || !pData || !inventoryChangeDetails) {
        return;
    }

    let lockingActionKey = null;
    if (pData.isUsingConsumable) {
        lockingActionKey = 'usingConsumable';
    } else if (pData.isChargingBow) {
        lockingActionKey = 'chargingBow';
    }

    if (lockingActionKey) {
        const newItem = inventoryChangeDetails.newItemStack || inventoryChangeDetails.newItem;
        const oldItem = inventoryChangeDetails.oldItemStack || inventoryChangeDetails.oldItem;
        const changedItemType = newItem?.typeId ?? oldItem?.typeId ?? 'unknown';
        const slotIdentifier = inventoryChangeDetails.slotName ?? inventoryChangeDetails.inventorySlot?.toString() ?? inventoryChangeDetails.slot?.toString() ?? 'unknown_slot';

        const violationDetails = {
            reasonDetail: `Moved item in slot ${slotIdentifier} while ${lockingActionKey}.`,
            itemTypeInvolved: changedItemType,
            slotChanged: slotIdentifier,
            actionInProgress: lockingActionKey,
        };
        // Ensure actionProfileKey is camelCase, standardizing from config
        const rawActionProfileKey = config.inventoryModMoveLockedActionProfileName ?? 'playerInventoryModMoveLocked'; // Default is already camelCase
        const actionProfileKey = rawActionProfileKey
            .replace(/([-_][a-z0-9])/ig, ($1) => $1.toUpperCase().replace('-', '').replace('_', ''))
            .replace(/^[A-Z]/, (match) => match.toLowerCase());
        await actionManager.executeCheckAction(player, actionProfileKey, violationDetails, dependencies);

        const watchedPrefix = pData.isWatched ? player.nameTag : null;
        playerUtils.debugLog(
            `[InventoryModCheck](MoveLocked): Flagged ${player.nameTag} for inventory item change (Slot: ${slotIdentifier}, Item: ${changedItemType}) while ${lockingActionKey}.`,
            watchedPrefix, dependencies
        );
    }
}
