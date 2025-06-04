import * as mc from '@minecraft/server';
import { addFlag } from '../../core/playerDataManager.js';
import { debugLog, warnPlayer } from '../../utils/playerUtils.js'; // warnPlayer is still used directly for the "You cannot..." message.
import {
    ENABLE_ILLEGAL_ITEM_CHECK,
    BANNED_ITEMS_PLACE,
    BANNED_ITEMS_USE
} from '../../config.js';

/**
 * @typedef {import('../../core/playerDataManager.js').PlayerAntiCheatData} PlayerAntiCheatData
 */

/**
 * Checks if a player is trying to use or place a banned item.
 * @param {mc.Player} player The player performing the action.
 * @param {mc.ItemStack | undefined} itemStack The item stack involved.
 * @param {{ cancel: boolean }} eventData The event data object (must have `cancel` property).
 * @param {"use" | "place"} actionType Type of action.
 * @param {PlayerAntiCheatData | undefined} pData Player-specific data. Can be undefined if player data not yet loaded.
 */
export function checkIllegalItems(player, itemStack, eventData, actionType, pData) {
    if (!ENABLE_ILLEGAL_ITEM_CHECK) return;

    const watchedPrefix = pData?.isWatched ? player.nameTag : null;

    if (!itemStack) {
        // debugLog(`IllegalItemCheck: Skipped for ${player.nameTag} - no itemStack provided.`, watchedPrefix);
        return;
    }

    const itemId = itemStack.typeId;
    const itemBaseName = itemId.replace("minecraft:", "");

    if (pData?.isWatched) { // Log general check info only if watched
         debugLog(`IllegalItemCheck: Processing for ${player.nameTag}. Action: ${actionType}, Item: ${itemId}.`, watchedPrefix);
    }

    let isBanned = false;
    if (actionType === "place" && BANNED_ITEMS_PLACE.includes(itemId)) {
        isBanned = true;
    } else if (actionType === "use" && BANNED_ITEMS_USE.includes(itemId)) {
        isBanned = true;
    }

    if (isBanned) {
        // The addFlag function handles warning the player, notifying admins, and debug logging the flag.
        // It also updates pData flags and saves data.
        // We only need to ensure pData exists if we want to pass it to addFlag for more context in notifyAdmins.
        // If pData might not exist (e.g., player just joined, data not loaded yet), addFlag needs to be robust or called conditionally.
        // However, for illegal item use/place, we always want to cancel the event and warn.

        const reason = `Attempted to ${actionType} banned item: ${itemBaseName}.`;

        if (pData) { // Pass pData if available for richer notifications via addFlag
            addFlag(player, "illegalItem", `You cannot ${actionType} the item: ${itemBaseName}.`, `Item: ${itemId}, Action: ${actionType}`);
        } else {
            // If no pData, still warn player and log basic info.
            // The centralized addFlag won't be called, so no automatic pData update/save here.
            // This scenario should be rare if pData is ensured for all players in main tick.
            warnPlayer(player, `You cannot ${actionType} the item: ${itemBaseName}.`);
            // notifyAdmins separately if needed, but addFlag usually handles it.
            // For simplicity, if no pData, we skip the full addFlag process here.
            // This might mean a very early illegal item use isn't "flagged" in stats but is still prevented.
            playerUtils.debugLog(`Illegal ${actionType} attempt (no pData): ${player.nameTag} item ${itemId}. Event cancelled.`, watchedPrefix);
        }

        eventData.cancel = true;
    }
}
