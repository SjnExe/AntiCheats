/**
 * Checks if a player is attempting to use or place an item that is on a configured ban list.
 * If a banned item action is detected, the event is cancelled, and configured actions are executed.
 * This check is typically called from `ItemUseBeforeEvent`, `ItemUseOnBeforeEvent`, or `PlayerPlaceBlockBeforeEvent` handlers.
 * @async
 * @param {mc.Player} player - The player performing the action.
 * @param {mc.ItemStack | undefined} itemStack - The ItemStack involved in the action. Can be undefined if player's hand is empty.
 * @param {(mc.ItemUseBeforeEvent | mc.ItemUseOnBeforeEvent | mc.PlayerPlaceBlockBeforeEvent) & {cancel: boolean, block?: mc.Block, source?: mc.Entity}} eventData - The event data object.
 * Must have a `cancel` property. For 'place' actions, `eventData.block` is used. For 'use', `eventData.source` might be relevant.
 * @param {'use' | 'place' | 'inventoryChange'} actionType - The type of action being performed.
 * @param {import('../../types.js').PlayerAntiCheatData | undefined} pData - Player-specific anti-cheat data (primarily for `isWatched` status).
 * @param {import('../../types.js').Dependencies} dependencies - The standard dependencies object.
 * @returns {Promise<void>}
 */
export async function checkIllegalItems(player, itemStack, eventData, actionType, pData, dependencies) {
    const { config, playerUtils, actionManager } = dependencies;

    if (!config.enableIllegalItemCheck) {
        return;
    }

    const watchedPrefix = pData?.isWatched ? player.nameTag : null;

    if (!itemStack) {
        if (actionType !== 'inventoryChange' || (actionType === 'inventoryChange' && eventData.newItemStack)) {
            playerUtils.debugLog(`[IllegalItemCheck] No itemStack provided for ${player.nameTag}, action: ${actionType}. Skipping check.`, watchedPrefix, dependencies);
        }
        return;
    }

    const itemId = itemStack.typeId;
    if (config.enableDebugLogging && pData?.isWatched) {
        playerUtils.debugLog(`[IllegalItemCheck] Processing for ${player.nameTag}. Action: ${actionType}, Item: ${itemId}.`, watchedPrefix, dependencies);
    }

    let isBanned = false;
    let checkProfileKey = '';
    const violationDetails = {
        itemTypeId: itemId,
        action: actionType,
    };

    const bannedItemsForPlace = config.bannedItemsPlace ?? [];
    const bannedItemsForUse = config.bannedItemsUse ?? [];

    if (actionType === 'place' && bannedItemsForPlace.includes(itemId)) {
        isBanned = true;
        checkProfileKey = config.illegalItemPlaceActionProfileName ?? 'worldIllegalItemPlace';
        violationDetails.blockLocationX = eventData.block?.location?.x?.toString() ?? 'N/A';
        violationDetails.blockLocationY = eventData.block?.location?.y?.toString() ?? 'N/A';
        violationDetails.blockLocationZ = eventData.block?.location?.z?.toString() ?? 'N/A';
    } else if (actionType === 'use' && bannedItemsForUse.includes(itemId)) {
        isBanned = true;
        checkProfileKey = config.illegalItemUseActionProfileName ?? 'worldIllegalItemUse';
        violationDetails.sourceTypeId = eventData.source?.typeId ?? 'unknownSource';
    }

    if (isBanned && checkProfileKey) {
        if (typeof eventData.cancel === 'boolean') {
            eventData.cancel = true;
        } else {
            playerUtils.debugLog(`[IllegalItemCheck] EventData for ${actionType} does not support cancellation. Item: ${itemId}.`, watchedPrefix, dependencies);
        }

        await actionManager.executeCheckAction(player, checkProfileKey, violationDetails, dependencies);

        playerUtils.debugLog(
            `[IllegalItemCheck] Action '${actionType}' by ${player.nameTag} for item ${itemId} was flagged. Profile: '${checkProfileKey}'. Event cancelled: ${eventData.cancel}.`,
            watchedPrefix, dependencies,
        );
    }
}
