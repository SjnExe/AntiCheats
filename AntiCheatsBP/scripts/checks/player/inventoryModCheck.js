/**
 * @file AntiCheatsBP/scripts/checks/player/inventoryModCheck.js
 * Implements checks for suspicious inventory manipulations, such as:
 * 1. Using an item in the same game tick as a hotbar slot change.
 * 2. Moving items in the inventory while an action that should lock inventory is in progress (e.g., eating).
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
 * Checks for item usage occurring in the exact same tick as a hotbar slot change.
 * This can indicate a client modification allowing faster-than-normal actions.
 * Relies on `pData.lastSelectedSlotChangeTick` being accurately updated in the main tick loop.
 * Called from the `ItemUseBeforeEvent` handler.
 *
 * @param {mc.Player} player - The player instance.
 * @param {PlayerAntiCheatData} pData - Player-specific anti-cheat data.
 * @param {mc.ItemStack} itemStack - The item being used.
 * @param {Config} config - The server configuration object.
 * @param {PlayerUtils} playerUtils - Utility functions for player interactions.
 * @param {PlayerDataManager} playerDataManager - Manager for player data.
 * @param {LogManager} logManager - Manager for logging.
 * @param {ExecuteCheckAction} executeCheckAction - Function to execute defined actions for a check.
 * @param {number} currentTick - The current game tick.
 * @returns {Promise<void>}
 */
export async function checkSwitchAndUseInSameTick(
    player,
    pData,
    itemStack,
    config,
    playerUtils,
    playerDataManager,
    logManager,
    executeCheckAction,
    currentTick
) {
    if (!config.enableInventoryModCheck || !pData) { // Added null check for pData
        return;
    }

    // pData.lastSelectedSlotChangeTick is updated by updateTransientPlayerData in main.js
    // It reflects the tick when the selectedSlotIndex was *first observed* to be different.
    if (pData.lastSelectedSlotChangeTick === currentTick) {
        const dependencies = { config, playerDataManager, playerUtils, logManager };
        const violationDetails = {
            reasonDetail: "Item used in the same tick as hotbar slot change",
            itemType: itemStack.typeId,
            slot: player.selectedSlotIndex.toString(), // The slot the item is being used from (the new slot)
            lastSlotChangeTick: pData.lastSelectedSlotChangeTick.toString(),
            currentTick: currentTick.toString()
        };
        // Action profile name: config.inventoryModActionProfileName ?? "player_inventory_mod" (using a general one for now)
        await executeCheckAction(player, "player_inventory_mod", violationDetails, dependencies);

        const watchedPrefix = pData.isWatched ? player.nameTag : null;
        playerUtils.debugLog?.(
            `InventoryMod (SwitchUse): Flagged ${player.nameTag} for using ${itemStack.typeId} in same tick as slot change (Tick: ${currentTick}).`,
            watchedPrefix
        );
    }
}

/**
 * Checks for inventory item changes while actions that should "lock" the inventory are in progress (e.g., eating, drawing a bow).
 * Relies on `pData` state flags like `isUsingConsumable` or `isChargingBow`.
 * Called from the `PlayerInventoryItemChangeAfterEvent` handler.
 *
 * @param {mc.Player} player - The player instance.
 * @param {PlayerAntiCheatData} pData - Player-specific anti-cheat data.
 * @param {mc.PlayerInventoryItemChangeAfterEvent} eventData - The inventory change event data.
 * @param {Config} config - The server configuration object.
 * @param {PlayerUtils} playerUtils - Utility functions for player interactions.
 * @param {PlayerDataManager} playerDataManager - Manager for player data.
 * @param {LogManager} logManager - Manager for logging.
 * @param {ExecuteCheckAction} executeCheckAction - Function to execute defined actions for a check.
 * @param {number} currentTick - The current game tick.
 * @returns {Promise<void>}
 */
export async function checkInventoryMoveWhileActionLocked(
    player,
    pData,
    eventData,
    config,
    playerUtils,
    playerDataManager,
    logManager,
    executeCheckAction,
    currentTick // currentTick might be useful for context or if action duration matters
) {
    if (!config.enableInventoryModCheck || !pData) { // Added null check for pData
        return;
    }

    let lockingAction = null;
    if (pData.isUsingConsumable) {
        lockingAction = "using consumable";
    } else if (pData.isChargingBow) {
        lockingAction = "charging bow";
    }
    // Note: isUsingShield is not typically an inventory-locking action in vanilla Minecraft.
    // Other actions like opening a chest, trading with villagers, etc., inherently lock inventory
    // and might not need this specific check, as the game prevents item changes.

    if (lockingAction) {
        const dependencies = { config, playerDataManager, playerUtils, logManager };
        // Determine item type involved, preferring new item stack, fallback to old, then "unknown"
        const changedItemType = eventData.itemStack?.typeId ?? eventData.oldItemStack?.typeId ?? "unknown";

        const violationDetails = {
            reasonDetail: `Inventory item moved/changed (slot ${eventData.slot}) while ${lockingAction}`,
            itemTypeInvolved: changedItemType,
            slotChanged: eventData.slot.toString(),
            actionInProgress: lockingAction,
            changeType: eventData.change // e.g., "Added", "Removed", "ModifiedAmount"
        };
        // Action profile name: config.inventoryModActionProfileName ?? "player_inventory_mod"
        await executeCheckAction(player, "player_inventory_mod", violationDetails, dependencies);

        const watchedPrefix = pData.isWatched ? player.nameTag : null;
        playerUtils.debugLog?.(
            `InventoryMod (MoveLocked): Flagged ${player.nameTag} for inventory item change (Slot: ${eventData.slot}, Item: ${changedItemType}) while ${lockingAction}.`,
            watchedPrefix
        );
    }
}
