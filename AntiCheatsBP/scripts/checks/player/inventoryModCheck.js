/**
 * @file AntiCheatsBP/scripts/checks/player/inventoryModCheck.js
 * Implements checks for suspicious inventory manipulations, such as:
 * 1. Using an item in the same game tick as a hotbar slot change.
 * 2. Moving items in the inventory while an action that should lock inventory is in progress (e.g., eating).
 * @version 1.0.2
 */

import * as mc from '@minecraft/server';
import { getString } from '../../../core/i18n.js';

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
    if (!config.enableInventoryModCheck || !pData) {
        return;
    }

    if (pData.lastSelectedSlotChangeTick === currentTick) {
        const dependencies = { config, playerDataManager, playerUtils, logManager };
        const violationDetails = {
            reasonDetail: getString("check.inventoryMod.details.switchAndUseSameTick"),
            itemType: itemStack.typeId,
            slot: player.selectedSlotIndex.toString(),
            lastSlotChangeTick: pData.lastSelectedSlotChangeTick.toString(),
            currentTick: currentTick.toString()
        };
        await executeCheckAction(player, "playerInventoryMod", violationDetails, dependencies);

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
    currentTick
) {
    if (!config.enableInventoryModCheck || !pData) {
        return;
    }

    let lockingActionKey = null;
    if (pData.isUsingConsumable) {
        lockingActionKey = "check.inventoryMod.action.usingConsumable";
    } else if (pData.isChargingBow) {
        lockingActionKey = "check.inventoryMod.action.chargingBow";
    }

    if (lockingActionKey) {
        const localizedLockingAction = getString(lockingActionKey);
        const dependencies = { config, playerDataManager, playerUtils, logManager };
        const changedItemType = eventData.itemStack?.typeId ?? eventData.oldItemStack?.typeId ?? "unknown";

        const violationDetails = {
            reasonDetail: getString("check.inventoryMod.details.movedWhileLocked", { slotNum: eventData.slot.toString(), action: localizedLockingAction }),
            itemTypeInvolved: changedItemType,
            slotChanged: eventData.slot.toString(),
            actionInProgress: localizedLockingAction,
            changeType: eventData.change
        };
        await executeCheckAction(player, "playerInventoryMod", violationDetails, dependencies);

        const watchedPrefix = pData.isWatched ? player.nameTag : null;
        playerUtils.debugLog?.(
            `InventoryMod (MoveLocked): Flagged ${player.nameTag} for inventory item change (Slot: ${eventData.slot}, Item: ${changedItemType}) while ${localizedLockingAction}.`,
            watchedPrefix
        );
    }
}
