import * as mc from '@minecraft/server';
import { addFlag } from '../../core/playerDataManager.js';
import { debugLog, warnPlayer } from '../../utils/playerUtils.js';
import {
    enableIllegalItemCheck, // Renamed
    bannedItemsPlace, // Renamed
    bannedItemsUse // Renamed
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
 * @param {PlayerAntiCheatData | undefined} pData Player-specific data.
 */
export function checkIllegalItems(player, itemStack, eventData, actionType, pData) {
    if (!enableIllegalItemCheck) return; // Renamed

    const watchedPrefix = pData?.isWatched ? player.nameTag : null;

    if (!itemStack) {
        return;
    }

    const itemId = itemStack.typeId;
    const itemBaseName = itemId.replace("minecraft:", "");

    if (pData?.isWatched) {
         debugLog(`IllegalItemCheck: Processing for ${player.nameTag}. Action: ${actionType}, Item: ${itemId}.`, watchedPrefix);
    }

    let isBanned = false;
    if (actionType === "place" && bannedItemsPlace.includes(itemId)) { // Renamed
        isBanned = true;
    } else if (actionType === "use" && bannedItemsUse.includes(itemId)) { // Renamed
        isBanned = true;
    }

    if (isBanned) {
        const userMessage = `You cannot ${actionType} the item: ${itemBaseName}.`;
        const details = `Item: ${itemId}, Action: ${actionType}`;

        if (pData) {
            addFlag(player, "illegalItem", userMessage, details);
        } else {
            warnPlayer(player, userMessage);
            debugLog(`Illegal ${actionType} attempt (no pData): ${player.nameTag} item ${itemId}. Event cancelled.`, watchedPrefix);
        }

        eventData.cancel = true;
    }
}
