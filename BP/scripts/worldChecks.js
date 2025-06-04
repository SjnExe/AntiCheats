import * as mc from '@minecraft/server';
import { warnPlayer, notifyAdmins, debugLog } from './playerUtils.js';
import {
    NUKER_MAX_BREAKS_SHORT_INTERVAL,
    NUKER_CHECK_INTERVAL_MS,
    BANNED_ITEMS_PLACE,
    BANNED_ITEMS_USE
} from './config.js';

// This check will be called from the main tick loop, using data collected from block break events.
export function checkNuker(player, pData) {
    if (!pData || !pData.blockBreakEvents) {
        // debugLog(`Nuker check skipped for ${player.nameTag}: pData or blockBreakEvents missing.`);
        return;
    }

    const now = Date.now();
    const timeWindow = NUKER_CHECK_INTERVAL_MS; // Use the configured time window

    // Filter events older than our timeWindow
    pData.blockBreakEvents = pData.blockBreakEvents.filter(timestamp => now - timestamp < timeWindow);

    const brokenBlocksInWindow = pData.blockBreakEvents.length;

    if (brokenBlocksInWindow > NUKER_MAX_BREAKS_SHORT_INTERVAL) {
        pData.lastFlagType = "nuker";
        pData.flags.totalFlags = (pData.flags.totalFlags || 0) + 1;
        if (!pData.flags.nuker) pData.flags.nuker = { count: 0, lastDetectionTime: 0 };
        pData.flags.nuker.count++;
        pData.flags.nuker.lastDetectionTime = Date.now();
        warnPlayer(player, `Potential Nuker detected. Broke ${brokenBlocksInWindow} blocks in ~${timeWindow}ms.`);
        notifyAdmins(`Flagged for Nuker (${brokenBlocksInWindow} blocks in ~${timeWindow}ms).`, player, pData);
        debugLog(`Nuker: ${player.nameTag} broke ${brokenBlocksInWindow} blocks in ~${timeWindow}ms. Events: ${pData.blockBreakEvents.map(ts => now - ts).join(', ')}ms ago`);

        // To prevent immediate re-flagging from the same burst of events if checkNuker is called again quickly,
        // clear the events after detection. This makes the check detect distinct bursts.
        pData.blockBreakEvents = [];
    }
}

/**
 * Checks if a player is trying to use or place a banned item.
 * @param {mc.Player} player The player performing the action.
 * @param {mc.ItemStack | undefined} itemStack The item stack involved.
 * @param {{ cancel: boolean }} eventData The event data object with a 'cancel' property.
 * @param {"use" | "place"} actionType The type of action being performed.
 * @param {any} pData Player-specific data from main.js for flagging.
 */
export function checkIllegalItems(player, itemStack, eventData, actionType, pData) { // Added pData
    if (!itemStack) {
        // debugLog(`Illegal item check skipped for ${player.nameTag}: no itemStack provided.`);
        return; // No item involved, or interaction with air.
    }

    const itemId = itemStack.typeId; // e.g., "minecraft:command_block"

    if (actionType === "place") {
        if (BANNED_ITEMS_PLACE.includes(itemId)) {
            if (pData) {
                pData.lastFlagType = "illegalItem";
                pData.flags.totalFlags = (pData.flags.totalFlags || 0) + 1;
                if (!pData.flags.illegalItem) pData.flags.illegalItem = { count: 0, lastDetectionTime: 0 };
                pData.flags.illegalItem.count++;
                pData.flags.illegalItem.lastDetectionTime = Date.now();
                notifyAdmins(`Attempted to place banned item: ${itemId.replace("minecraft:", "")}.`, player, pData);
            } else {
                notifyAdmins(`Player ${player.nameTag} attempted to place banned item: ${itemId.replace("minecraft:", "")}.`);
            }
            warnPlayer(player, `You cannot place the item: ${itemId.replace("minecraft:", "")}.`);
            debugLog(`Illegal place attempt: ${player.nameTag} tried to place ${itemId}. Event cancelled.`);
            eventData.cancel = true;
        }
    } else if (actionType === "use") {
        if (BANNED_ITEMS_USE.includes(itemId)) {
            if (pData) {
                pData.lastFlagType = "illegalItem";
                pData.flags.totalFlags = (pData.flags.totalFlags || 0) + 1;
                if (!pData.flags.illegalItem) pData.flags.illegalItem = { count: 0, lastDetectionTime: 0 };
                pData.flags.illegalItem.count++;
                pData.flags.illegalItem.lastDetectionTime = Date.now();
                notifyAdmins(`Attempted to use banned item: ${itemId.replace("minecraft:", "")}.`, player, pData);
            } else {
                notifyAdmins(`Player ${player.nameTag} attempted to use banned item: ${itemId.replace("minecraft:", "")}.`);
            }
            warnPlayer(player, `You cannot use the item: ${itemId.replace("minecraft:", "")}.`);
            debugLog(`Illegal use attempt: ${player.nameTag} tried to use ${itemId}. Event cancelled.`);
            eventData.cancel = true;
        }
    } else {
        debugLog(`Unknown actionType '${actionType}' in checkIllegalItems for player ${player.nameTag} with item ${itemId}.`);
    }
}
