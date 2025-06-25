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

    // Standardized action profile key
    const actionProfileKey = 'playerInventoryModSwitchUse';

    if (pData.lastSelectedSlotChangeTick === currentTick) {
        const violationDetails = {
            reasonDetail: 'Used item in the same tick as a hotbar slot change.', // Hardcoded string
            itemType: itemStack.typeId,
            slot: player.selectedSlotIndex.toString(), // Current slot where item is used
            lastSlotChangeTick: pData.lastSelectedSlotChangeTick.toString(),
            currentTick: currentTick.toString(),
        };
        await actionManager.executeCheckAction(player, actionProfileKey, violationDetails, dependencies);

        const watchedPrefix = pData.isWatched ? player.nameTag : null;
        playerUtils.debugLog(
            `[InventoryModCheck](SwitchUse): Flagged ${player.nameTag} for using ${itemStack.typeId} in same tick as slot change (Tick: ${currentTick}).`,
            watchedPrefix, dependencies
        );
        // Message cancellation, if any, should be handled by the action profile.
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
    // Assuming eventSpecificData is the raw event data from PlayerInventoryItemChangeAfterEvent
    // or a compatible structure.
    const inventoryChangeDetails = eventSpecificData?.inventoryChangeDetails || eventSpecificData;


    if (!config.enableInventoryModCheck || !pData || !inventoryChangeDetails) {
        return;
    }

    let lockingActionKey = null; // Localization key for the locking action
    if (pData.isUsingConsumable) {
        lockingActionKey = 'check.inventoryMod.action.usingConsumable';
    } else if (pData.isChargingBow) {
        lockingActionKey = 'check.inventoryMod.action.chargingBow';
    }
    // Could add more locking states here, e.g., pData.isUsingShield, pData.isSleeping

    if (lockingActionKey) {
        const localizedLockingAction = lockingActionKey.split('.').pop(); // Fallback to key part

        // Extract item and slot info from the event data
        const newItem = inventoryChangeDetails.newItemStack || inventoryChangeDetails.newItem; // Support both naming conventions
        const oldItem = inventoryChangeDetails.oldItemStack || inventoryChangeDetails.oldItem;
        const changedItemType = newItem?.typeId ?? oldItem?.typeId ?? 'unknown';
        // Slot identifier can vary based on event; prefer slotName if available, fallback to slot index
        const slotIdentifier = inventoryChangeDetails.slotName ?? inventoryChangeDetails.inventorySlot?.toString() ?? inventoryChangeDetails.slot?.toString() ?? 'unknown_slot';


        const violationDetails = {
            reasonDetail: `Moved item in slot ${slotIdentifier} while ${localizedLockingAction}.`, // Hardcoded string
            itemTypeInvolved: changedItemType,
            slotChanged: slotIdentifier,
            actionInProgress: localizedLockingAction,
        };
        // Standardized action profile key
        const actionProfileKey = 'playerInventoryModMoveLocked';
        await actionManager.executeCheckAction(player, actionProfileKey, violationDetails, dependencies);

        const watchedPrefix = pData.isWatched ? player.nameTag : null;
        playerUtils.debugLog(
            `[InventoryModCheck](MoveLocked): Flagged ${player.nameTag} for inventory item change (Slot: ${slotIdentifier}, Item: ${changedItemType}) while ${localizedLockingAction}.`,
            watchedPrefix, dependencies
        );
        // Event cancellation for inventory changes is usually not done as it's an 'after' event.
        // Any direct action (like reverting item move) would be complex and potentially handled by specific automod rules if needed.
    }
}
