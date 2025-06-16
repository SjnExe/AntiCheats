/**
 * @file AntiCheatsBP/scripts/checks/world/illegalItemCheck.js
 * Implements a check to prevent players from using or placing banned items.
 * Banned items are defined in the server configuration.
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
 * @typedef {mc.ItemUseBeforeEvent | mc.ItemUseOnBeforeEvent | mc.PlayerPlaceBlockBeforeEvent} ItemRelatedEventData
 * // PlayerPlaceBlockBeforeEvent is also relevant for "place" actions, though ItemUseOnBeforeEvent is more common for item-specific place denial.
 * // This type definition is a bit broad; specific event types are usually handled by the calling event handler.
 * // The key is that `eventData` must have a `cancel` property and relevant source/block info.
 */

/**
 * Checks if a player is attempting to use or place an item that is on a configured ban list.
 * If a banned item action is detected, the event is cancelled, and configured actions are executed.
 * Note: For optimal performance with very large ban lists (hundreds of items), consider converting
 * `config.bannedItemsPlace` and `config.bannedItemsUse` arrays to Sets during config loading.
 *
 * @param {mc.Player} player - The player performing the action.
 * @param {mc.ItemStack | undefined} itemStack - The ItemStack involved in the action. Can be undefined if player's hand is empty.
 * @param {ItemRelatedEventData & {cancel: boolean, block?: mc.Block, source?: mc.Entity}} eventData - The event data object.
 *        Must have a `cancel` property. For "place" actions, `eventData.block` is used. For "use", `eventData.source` might be relevant.
 * @param {"use" | "place"} actionType - The type of action being performed ("use" or "place").
 * @param {PlayerAntiCheatData | undefined} pData - Player-specific anti-cheat data (primarily for `isWatched` status).
 * @param {Config} config - The server configuration object, containing `enableIllegalItemCheck`,
 *                          `bannedItemsPlace`, and `bannedItemsUse` lists.
 * @param {PlayerUtils} playerUtils - Utility functions for player interactions.
 * @param {PlayerDataManager} playerDataManager - Manager for player data.
 * @param {LogManager} logManager - Manager for logging.
 * @param {ExecuteCheckAction} executeCheckAction - Function to execute defined actions for a check.
 * @returns {Promise<void>}
 */
export async function checkIllegalItems(
    player,
    itemStack,
    eventData,
    actionType,
    pData, // pData can be undefined if not available, check handles this for debug logging.
    config,
    playerUtils,
    playerDataManager,
    logManager,
    executeCheckAction
) {
    if (!config.enableIllegalItemCheck) {
        return;
    }

    const watchedPrefix = pData?.isWatched ? player.nameTag : null;

    if (!itemStack) {
        // This case might occur if the event doesn't involve an item or hand is empty.
        playerUtils.debugLog?.(`IllegalItemCheck: No itemStack provided for ${player.nameTag}, action: ${actionType}.`, watchedPrefix);
        return;
    }

    const itemId = itemStack.typeId;
    playerUtils.debugLog?.(`IllegalItemCheck: Processing for ${player.nameTag}. Action: ${actionType}, Item: ${itemId}.`, watchedPrefix);

    let isBanned = false;
    let checkProfileKey = ""; // The key for checkActionProfiles in config
    let violationDetails = {};
    const dependencies = { config, playerDataManager, playerUtils, logManager };

    const bannedItemsForPlace = config.bannedItemsPlace ?? [];
    const bannedItemsForUse = config.bannedItemsUse ?? [];

    if (actionType === "place" && bannedItemsForPlace.includes(itemId)) {
        isBanned = true;
        // Action Profile Name: config.illegalItemPlaceActionProfileName ?? "world_illegal_item_place"
        checkProfileKey = "worldIllegalItemPlace";
        violationDetails = {
            itemTypeId: itemId,
            action: "place",
            // Safely access block location properties using optional chaining and nullish coalescing
            blockLocationX: eventData.block?.location?.x?.toString() ?? 'N/A',
            blockLocationY: eventData.block?.location?.y?.toString() ?? 'N/A',
            blockLocationZ: eventData.block?.location?.z?.toString() ?? 'N/A'
        };
    } else if (actionType === "use" && bannedItemsForUse.includes(itemId)) {
        isBanned = true;
        // Action Profile Name: config.illegalItemUseActionProfileName ?? "world_illegal_item_use"
        checkProfileKey = "worldIllegalItemUse";
        violationDetails = {
            itemTypeId: itemId,
            action: "use",
            // eventData.source might be the player or another entity if item use can be indirect.
            sourceTypeId: eventData.source?.typeId ?? 'unknown'
        };
    }

    if (isBanned) {
        eventData.cancel = true; // Crucial: cancel the event immediately to prevent illegal action.
        await executeCheckAction(player, checkProfileKey, violationDetails, dependencies);

        playerUtils.debugLog?.(
            `IllegalItemCheck: Cancelled illegal ${actionType} by ${player.nameTag} for item ${itemId}. Action profile "${checkProfileKey}" triggered.`,
            watchedPrefix
        );
    }
    // This check doesn't modify pData directly.
}
