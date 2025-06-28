/**
 * @file Implements a check to prevent players from using or placing banned items.
 * Banned items are defined in the server configuration.
 */
import * as mc from '@minecraft/server';

/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData;
 * @typedef {import('../../types.js').CommandDependencies} CommandDependencies; // Full dependencies for actionManager, etc.
 * @typedef {import('../../types.js').Config} Config;
 * @typedef {mc.ItemUseBeforeEvent | mc.ItemUseOnBeforeEvent | mc.PlayerPlaceBlockBeforeEvent} ItemRelatedEventData;
 */

/**
 * Checks if a player is attempting to use or place an item that is on a configured ban list.
 * If a banned item action is detected, the event is cancelled, and configured actions are executed.
 * This check is typically called from `ItemUseBeforeEvent`, `ItemUseOnBeforeEvent`, or `PlayerPlaceBlockBeforeEvent` handlers.
 *
 * @async
 * @param {mc.Player} player - The player performing the action.
 * @param {mc.ItemStack | undefined} itemStack - The ItemStack involved in the action. Can be undefined if player's hand is empty.
 * @param {ItemRelatedEventData & {cancel: boolean, block?: mc.Block, source?: mc.Entity}} eventData - The event data object.
 *        Must have a `cancel` property. For "place" actions, `eventData.block` is used. For "use", `eventData.source` might be relevant.
 * @param {'use' | 'place' | 'inventory_change'} actionType - The type of action being performed.
 * @param {PlayerAntiCheatData | undefined} pData - Player-specific anti-cheat data (primarily for `isWatched` status).
 * @param {CommandDependencies} dependencies - The standard dependencies object.
 * @returns {Promise<void>}
 */
export async function checkIllegalItems(player, itemStack, eventData, actionType, pData, dependencies) {
    const { config, playerUtils, actionManager } = dependencies; // Removed unused playerDataManager, logManager

    if (!config.enableIllegalItemCheck) {
        return;
    }

    const watchedPrefix = pData?.isWatched ? player.nameTag : null;

    if (!itemStack) {
        // For 'inventory_change', newItemStack might be undefined if an item was removed.
        if (actionType !== 'inventory_change' || (actionType === 'inventory_change' && eventData.newItemStack)) { // Log if not an item removal scenario
             playerUtils.debugLog(`[IllegalItemCheck] No itemStack provided for ${player.nameTag}, action: ${actionType}. Skipping check.`, watchedPrefix, dependencies);
        }
        return;
    }

    const itemId = itemStack.typeId;
    if (config.enableDebugLogging && pData?.isWatched) { // More targeted debug logging
        playerUtils.debugLog(`[IllegalItemCheck] Processing for ${player.nameTag}. Action: ${actionType}, Item: ${itemId}.`, watchedPrefix, dependencies);
    }

    let isBanned = false;
    let checkProfileKey = '';
    let violationDetails = {
        itemTypeId: itemId,
        action: actionType,
    };

    const bannedItemsForPlace = config.bannedItemsPlace ?? [];
    const bannedItemsForUse = config.bannedItemsUse ?? [];
    // Consider adding bannedItemsForInventory if needed for 'inventory_change'

    if (actionType === 'place' && bannedItemsForPlace.includes(itemId)) {
        isBanned = true;
        checkProfileKey = 'worldIllegalItemPlace'; // Standardized key
        violationDetails.blockLocationX = eventData.block?.location?.x?.toString() ?? 'N/A';
        violationDetails.blockLocationY = eventData.block?.location?.y?.toString() ?? 'N/A';
        violationDetails.blockLocationZ = eventData.block?.location?.z?.toString() ?? 'N/A';
    } else if (actionType === 'use' && bannedItemsForUse.includes(itemId)) {
        isBanned = true;
        checkProfileKey = 'worldIllegalItemUse'; // Standardized key
        violationDetails.sourceTypeId = eventData.source?.typeId ?? 'unknown_source'; // e.g. if used on an entity
    }
    // Add handling for 'inventory_change' if specific inventory ban list exists.
    // else if (actionType === 'inventory_change' && config.bannedItemsForInventory?.includes(itemId)) {
    //     isBanned = true;
    //     checkProfileKey = 'playerIllegalItemInventory'; // Example profile key
    //     violationDetails.slotChanged = eventData.slotName || eventData.inventorySlot?.toString() || 'unknown';
    // }


    if (isBanned && checkProfileKey) {
        // Event cancellation should be handled by the action profile if configured.
        // However, for banned items, it's often critical to cancel the event regardless.
        if (typeof eventData.cancel === 'boolean') { // Ensure cancel is a property
            eventData.cancel = true;
        } else {
            playerUtils.debugLog(`[IllegalItemCheck] EventData for ${actionType} does not support cancellation. Item: ${itemId}.`, watchedPrefix, dependencies);
        }

        await actionManager.executeCheckAction(player, checkProfileKey, violationDetails, dependencies);

        playerUtils.debugLog(
            `[IllegalItemCheck] Action '${actionType}' by ${player.nameTag} for item ${itemId} was flagged. Profile: '${checkProfileKey}'. Event cancelled: ${eventData.cancel}.`,
            watchedPrefix, dependencies
        );
    }
}
