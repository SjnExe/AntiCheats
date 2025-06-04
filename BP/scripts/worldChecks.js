/**
 * @file worldChecks.js
 * Contains functions for detecting world interaction-related hacks,
 * such as Nuker (rapid block breaking) and use/placement of illegal items.
 */

import * as mc from '@minecraft/server';
import { warnPlayer, notifyAdmins, debugLog } from './playerUtils.js';
import {
    NUKER_MAX_BREAKS_SHORT_INTERVAL,
    NUKER_CHECK_INTERVAL_MS,
    BANNED_ITEMS_PLACE,
    BANNED_ITEMS_USE
} from './config.js';

/**
 * Checks for Nuker hacks by analyzing the rate of block breaking by a player.
 * It counts block break events within a configured time window.
 * @param {mc.Player} player The player instance to check.
 * @param {import('../main.js').PlayerAntiCheatData} pData Player-specific data, including block break event timestamps and flags.
 *        Requires `pData.isWatched`, `pData.blockBreakEvents`, `pData.flags`, `pData.lastFlagType`.
 */
export function checkNuker(player, pData) {
    const watchedPrefix = pData?.isWatched ? player.nameTag : null;

    // Section: Prerequisite Checks
    if (!pData || !pData.blockBreakEvents) {
        debugLog(`Nuker check skipped: pData or blockBreakEvents missing.`, watchedPrefix);
        return;
    }

    // Section: Timestamp Management & Break Count
    const now = Date.now();
    const timeWindow = NUKER_CHECK_INTERVAL_MS;

    // Filter block break events to the defined time window
    pData.blockBreakEvents = pData.blockBreakEvents.filter(timestamp => now - timestamp < timeWindow);
    const brokenBlocksInWindow = pData.blockBreakEvents.length;

    if (brokenBlocksInWindow > 0) { // Only log if there's activity
        debugLog(`Nuker check: Broke ${brokenBlocksInWindow} blocks in last ${timeWindow}ms.`, watchedPrefix);
    }

    // Section: Violation Check
    if (brokenBlocksInWindow > NUKER_MAX_BREAKS_SHORT_INTERVAL) {
        pData.lastFlagType = "nuker";
        pData.flags.totalFlags = (pData.flags.totalFlags || 0) + 1;
        if (!pData.flags.nuker) pData.flags.nuker = { count: 0, lastDetectionTime: 0 };
        pData.flags.nuker.count++;
        pData.flags.nuker.lastDetectionTime = Date.now();
        warnPlayer(player, `Potential Nuker detected. Broke ${brokenBlocksInWindow} blocks in ~${timeWindow}ms.`);
        notifyAdmins(`Flagged for Nuker (${brokenBlocksInWindow} blocks in ~${timeWindow}ms).`, player, pData);
        // The old debugLog for violation was already good.
        debugLog(`Nuker VIOLATION: ${player.nameTag} broke ${brokenBlocksInWindow} blocks in ~${timeWindow}ms. Events (ms ago): ${pData.blockBreakEvents.map(ts => now - ts).join(', ')}`, watchedPrefix);

        pData.blockBreakEvents = [];
    }
}

/**
 * Checks if a player is trying to use or place a banned item based on configured lists.
 * If a banned action is detected, the event is cancelled, and warnings/notifications are issued.
 * @param {mc.Player} player The player performing the action.
 * @param {mc.ItemStack | undefined} itemStack The item stack involved in the action.
 * @param {{ cancel: boolean }} eventData The event data object from `itemUse` or `itemUseOn` (must have a `cancel` property).
 * @param {"use" | "place"} actionType Indicates the type of action ("use" or "place").
 * @param {import('../main.js').PlayerAntiCheatData} pData Player-specific data for flagging and logging.
 *        Requires `pData.isWatched`, `pData.flags`, `pData.lastFlagType`. Can be null if pData is not available.
 */
export function checkIllegalItems(player, itemStack, eventData, actionType, pData) {
    // pData might be null if not available where this is called, so check for pData?.isWatched
    const watchedPrefix = pData?.isWatched ? player.nameTag : null;

    // Section: Prerequisite Checks
    if (!itemStack) {
        debugLog(`Illegal item check skipped: no itemStack provided.`, watchedPrefix);
        return;
    }

    const itemId = itemStack.typeId;
    debugLog(`Checking illegal item. Action: ${actionType}, Item: ${itemId}.`, watchedPrefix);

    // Section: Placement Check
    if (actionType === "place") {
        if (BANNED_ITEMS_PLACE.includes(itemId)) {
            if (pData) { // Ensure pData is available before trying to use it
                pData.lastFlagType = "illegalItem";
                pData.flags.totalFlags = (pData.flags.totalFlags || 0) + 1;
                if (!pData.flags.illegalItem) pData.flags.illegalItem = { count: 0, lastDetectionTime: 0 };
                pData.flags.illegalItem.count++;
                pData.flags.illegalItem.lastDetectionTime = Date.now();
                notifyAdmins(`Attempted to place banned item: ${itemId.replace("minecraft:", "")}.`, player, pData);
            } else {
                // Fallback notification if pData isn't passed (should ideally always be passed)
                notifyAdmins(`Player ${player.nameTag} attempted to place banned item: ${itemId.replace("minecraft:", "")}.`);
            }
            warnPlayer(player, `You cannot place the item: ${itemId.replace("minecraft:", "")}.`);
            debugLog(`Illegal place attempt: VIOLATION - tried to place ${itemId}. Event cancelled.`, watchedPrefix);
            eventData.cancel = true;
        }
    }
    // Section: Usage Check
    else if (actionType === "use") {
        if (BANNED_ITEMS_USE.includes(itemId)) {
            if (pData) { // Ensure pData is available
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
            debugLog(`Illegal use attempt: VIOLATION - tried to use ${itemId}. Event cancelled.`, watchedPrefix);
            eventData.cancel = true;
        }
    }
    // Section: Unknown Action Type
    else {
        debugLog(`Unknown actionType '${actionType}' in checkIllegalItems with item ${itemId}.`, watchedPrefix);
    }
}
