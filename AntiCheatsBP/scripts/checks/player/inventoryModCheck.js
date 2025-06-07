import * as mc from '@minecraft/server';

/**
 * Checks for suspicious inventory manipulations like using an item in the same tick as a slot change,
 * or moving items while inventory should be locked (e.g. eating).
 */

/**
 * Part 1: Checks for item use in the same tick as a hotbar slot change.
 * Called from ItemUseBeforeEvent handler.
 * @param {mc.Player} player The player instance.
 * @param {import('../../core/playerDataManager.js').PlayerAntiCheatData} pData Player-specific anti-cheat data.
 * @param {mc.ItemStack} itemStack The item being used.
 * @param {object} config The configuration object.
 * @param {object} playerUtils Utility functions for players.
 * @param {object} playerDataManager Manager for player data.
 * @param {object} logManager Manager for logging.
 * @param {function} executeCheckAction Function to execute defined actions for a check.
 * @param {number} currentTick The current game tick.
 */
export async function checkSwitchAndUseInSameTick(player, pData, itemStack, config, playerUtils, playerDataManager, logManager, executeCheckAction, currentTick) {
    if (!config.enableInventoryModCheck) return;

    // pData.lastSelectedSlotChangeTick is updated by updateTransientPlayerData in main tick loop
    // It reflects the tick when the selectedSlotIndex was *first observed* to be different.
    if (pData.lastSelectedSlotChangeTick === currentTick) {
        const dependencies = { config, playerDataManager, playerUtils, logManager };
        const violationDetails = {
            reasonDetail: "Item used in the same tick as hotbar slot change",
            itemType: itemStack.typeId,
            slot: player.selectedSlotIndex, // The slot the item is being used from (the new slot)
            lastSlotChangeTick: pData.lastSelectedSlotChangeTick,
            currentTick: currentTick
        };
        await executeCheckAction(player, "player_inventory_mod", violationDetails, dependencies);

        const watchedPrefix = pData.isWatched ? player.nameTag : null;
        if (pData.isWatched && playerUtils.debugLog) {
            playerUtils.debugLog(\`InventoryMod: Flagged \${player.nameTag} for using \${itemStack.typeId} in same tick as slot change (\${currentTick}).\`, watchedPrefix);
        }
    }
}

/**
 * Part 2: Checks for inventory item changes while actions that should lock inventory are in progress.
 * Called from PlayerInventoryItemChangeAfterEvent handler.
 * @param {mc.Player} player The player instance.
 * @param {import('../../core/playerDataManager.js').PlayerAntiCheatData} pData Player-specific anti-cheat data.
 * @param {mc.PlayerInventoryItemChangeAfterEvent} eventData The inventory change event data.
 * @param {object} config The configuration object.
 * @param {object} playerUtils Utility functions for players.
 * @param {object} playerDataManager Manager for player data.
 * @param {object} logManager Manager for logging.
 * @param {function} executeCheckAction Function to execute defined actions for a check.
 * @param {number} currentTick The current game tick.
 */
export async function checkInventoryMoveWhileActionLocked(player, pData, eventData, config, playerUtils, playerDataManager, logManager, executeCheckAction, currentTick) {
    if (!config.enableInventoryModCheck) return;

    let lockingAction = null;
    if (pData.isUsingConsumable) {
        lockingAction = "using consumable";
    } else if (pData.isChargingBow) {
        lockingAction = "charging bow";
    }
    // Note: isUsingShield is not typically an inventory-locking action in vanilla.

    if (lockingAction) {
        const dependencies = { config, playerDataManager, playerUtils, logManager };
        const violationDetails = {
            reasonDetail: `Inventory item moved while \${lockingAction}`,
            itemType: eventData.itemStack ? eventData.itemStack.typeId : (eventData.oldItemStack ? eventData.oldItemStack.typeId : "unknown"),
            slot: eventData.slot,
            actionInProgress: lockingAction
        };
        await executeCheckAction(player, "player_inventory_mod", violationDetails, dependencies);

        const watchedPrefix = pData.isWatched ? player.nameTag : null;
        if (pData.isWatched && playerUtils.debugLog) {
            playerUtils.debugLog(\`InventoryMod: Flagged \${player.nameTag} for inventory item change (slot \${eventData.slot}) while \${lockingAction}.\`, watchedPrefix);
        }
    }
}
