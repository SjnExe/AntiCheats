/**
 * Implements a check to prevent players from using or placing banned items.
 * Banned items are defined in the server configuration.
 */
import * as mc from '@minecraft/server';
/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').Dependencies} Dependencies
 * @typedef {mc.ItemUseBeforeEvent | mc.ItemUseOnBeforeEvent | mc.PlayerPlaceBlockBeforeEvent} ItemRelatedEventData
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
 * @param {Dependencies} dependencies - The standard dependencies object.
 * @returns {Promise<void>}
 */
export async function checkIllegalItems(
    player,
    itemStack,
    eventData,
    actionType,
    pData,
    dependencies
) {
    const { config, playerUtils, actionManager, playerDataManager, logManager } = dependencies;

    if (!config.enableIllegalItemCheck) {
        return;
    }

    const watchedPrefix = pData?.isWatched ? player.nameTag : null;

    if (!itemStack) {
        playerUtils.debugLog(`[IllegalItemCheck] No itemStack provided for ${player.nameTag}, action: ${actionType}.`, watchedPrefix, dependencies);
        return;
    }

    const itemId = itemStack.typeId;
    playerUtils.debugLog(`[IllegalItemCheck] Processing for ${player.nameTag}. Action: ${actionType}, Item: ${itemId}.`, watchedPrefix, dependencies);

    let isBanned = false;
    let checkProfileKey = "";
    let violationDetails = {};

    const bannedItemsForPlace = config.bannedItemsPlace ?? [];
    const bannedItemsForUse = config.bannedItemsUse ?? [];

    if (actionType === "place" && bannedItemsForPlace.includes(itemId)) {
        isBanned = true;
        checkProfileKey = "worldIllegalItemPlace";
        violationDetails = {
            itemTypeId: itemId,
            action: "place",
            blockLocationX: eventData.block?.location?.x?.toString() ?? 'N/A',
            blockLocationY: eventData.block?.location?.y?.toString() ?? 'N/A',
            blockLocationZ: eventData.block?.location?.z?.toString() ?? 'N/A'
        };
    } else if (actionType === "use" && bannedItemsForUse.includes(itemId)) {
        isBanned = true;
        checkProfileKey = "worldIllegalItemUse";
        violationDetails = {
            itemTypeId: itemId,
            action: "use",
            sourceTypeId: eventData.source?.typeId ?? 'unknown'
        };
    }

    if (isBanned) {
        eventData.cancel = true;
        await actionManager.executeCheckAction(player, checkProfileKey, violationDetails, dependencies);

        playerUtils.debugLog(
            `[IllegalItemCheck] Cancelled illegal ${actionType} by ${player.nameTag} for item ${itemId}. Action profile "${checkProfileKey}" triggered.`,
            watchedPrefix, dependencies
        );
    }
}
