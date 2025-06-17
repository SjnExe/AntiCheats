/**
 * @file AntiCheatsBP/scripts/checks/player/inventoryModCheck.js
 * Implements checks for suspicious inventory manipulations, such as:
 * 1. Using an item in the same game tick as a hotbar slot change.
 * 2. Moving items in the inventory while an action that should lock inventory is in progress (e.g., eating).
 * @version 1.1.0
 */

import { getString } from '../../../core/i18n.js';

/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').CommandDependencies} CommandDependencies
 * @typedef {import('../../types.js').EventSpecificData} EventSpecificData
 */

/**
 * Checks for item usage occurring in the exact same tick as a hotbar slot change.
 * This can indicate a client modification allowing faster-than-normal actions.
 * Relies on `pData.lastSelectedSlotChangeTick` being accurately updated.
 *
 * @param {import('@minecraft/server').Player} player - The player instance.
 * @param {PlayerAntiCheatData} pData - Player-specific anti-cheat data.
 * @param {CommandDependencies} dependencies - Object containing necessary dependencies.
 * @param {EventSpecificData} eventSpecificData - Data specific to the event, expects `itemStack` (from ItemUse event).
 * @returns {Promise<void>}
 */
export async function checkSwitchAndUseInSameTick(
    player,
    pData,
    dependencies,
    eventSpecificData
) {
    const { config, playerUtils, actionManager, currentTick } = dependencies;
    const itemStack = eventSpecificData?.itemStack; // Item being used

    if (!config.enableInventoryModCheck || !pData || !itemStack) {
        return;
    }

    // pData.lastSelectedSlotChangeTick is updated in main.js's updateTransientPlayerData
    if (pData.lastSelectedSlotChangeTick === currentTick) {
        const violationDetails = {
            reasonDetail: getString("check.inventoryMod.details.switchAndUseSameTick"),
            itemType: itemStack.typeId,
            slot: player.selectedSlotIndex.toString(), // Current slot after the switch and now use
            lastSlotChangeTick: pData.lastSelectedSlotChangeTick.toString(),
            currentTick: currentTick.toString()
        };
        await actionManager.executeCheckAction(player, "playerInventoryModSwitchUse", violationDetails, dependencies);

        const watchedPrefix = pData.isWatched ? player.nameTag : null;
        playerUtils.debugLog?.(
            \`InventoryMod (SwitchUse): Flagged \${player.nameTag} for using \${itemStack.typeId} in same tick as slot change (Tick: \${currentTick}).\`,
            watchedPrefix
        );
    }
}

/**
 * Checks for inventory item changes while actions that should "lock" the inventory are in progress (e.g., eating, drawing a bow).
 * Relies on `pData` state flags like `isUsingConsumable` or `isChargingBow`.
 *
 * @param {import('@minecraft/server').Player} player - The player instance.
 * @param {PlayerAntiCheatData} pData - Player-specific anti-cheat data.
 * @param {CommandDependencies} dependencies - Object containing necessary dependencies.
 * @param {EventSpecificData} eventSpecificData - Data specific to the event, expects `inventoryChangeData` (original PlayerInventoryItemChangeAfterEvent data).
 * @returns {Promise<void>}
 */
export async function checkInventoryMoveWhileActionLocked(
    player,
    pData,
    dependencies,
    eventSpecificData
) {
    const { config, playerUtils, actionManager } = dependencies;
    // The original eventData from PlayerInventoryItemChangeAfterEvent is passed as eventSpecificData
    const inventoryChangeData = eventSpecificData;

    if (!config.enableInventoryModCheck || !pData || !inventoryChangeData) {
        return;
    }

    let lockingActionKey = null;
    if (pData.isUsingConsumable) {
        lockingActionKey = "check.inventoryMod.action.usingConsumable";
    } else if (pData.isChargingBow) {
        lockingActionKey = "check.inventoryMod.action.chargingBow";
    }
    // Potentially add other states like pData.isUsingShield if intended to lock inventory movement.

    if (lockingActionKey) {
        const localizedLockingAction = getString(lockingActionKey);
        // Extract details from inventoryChangeData (which is the original eventData)
        const changedItemType = inventoryChangeData.newItem?.typeId ?? inventoryChangeData.oldItem?.typeId ?? "unknown";
        const slotIdentifier = inventoryChangeData.slotName ?? inventoryChangeData.slot?.toString() ?? "unknown_slot";


        const violationDetails = {
            reasonDetail: getString("check.inventoryMod.details.movedWhileLocked", { slotNum: slotIdentifier, action: localizedLockingAction }),
            itemTypeInvolved: changedItemType,
            slotChanged: slotIdentifier,
            actionInProgress: localizedLockingAction,
            // changeType: inventoryChangeData.changeType // If 'changeType' was part of the original event. Standard event might not have it.
                                                      // PlayerInventoryItemChangeAfterEvent has newItem and oldItem.
        };
        await actionManager.executeCheckAction(player, "playerInventoryModMoveLocked", violationDetails, dependencies);

        const watchedPrefix = pData.isWatched ? player.nameTag : null;
        playerUtils.debugLog?.(
            \`InventoryMod (MoveLocked): Flagged \${player.nameTag} for inventory item change (Slot: \${slotIdentifier}, Item: \${changedItemType}) while \${localizedLockingAction}.\`,
            watchedPrefix
        );
    }
}
