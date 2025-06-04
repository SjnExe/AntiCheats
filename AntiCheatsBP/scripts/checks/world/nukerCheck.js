import * as mc from '@minecraft/server';
import { addFlag } from '../../core/playerDataManager.js';
import { debugLog } from '../../utils/playerUtils.js';
import {
    ENABLE_NUKER_CHECK,
    NUKER_MAX_BREAKS_SHORT_INTERVAL,
    NUKER_CHECK_INTERVAL_MS
} from '../../config.js';

/**
 * @typedef {import('../../core/playerDataManager.js').PlayerAntiCheatData} PlayerAntiCheatData
 */

/**
 * Checks for Nuker hacks by analyzing the rate of block breaking by a player.
 * @param {mc.Player} player The player instance to check.
 * @param {PlayerAntiCheatData} pData Player-specific data.
 */
export function checkNuker(player, pData) {
    if (!ENABLE_NUKER_CHECK) return;
    const watchedPrefix = pData?.isWatched ? player.nameTag : null;

    if (!pData || !pData.blockBreakEvents) {
        // debugLog(`NukerCheck: Skipped for ${player.nameTag} - pData or blockBreakEvents missing.`, watchedPrefix);
        return;
    }

    const now = Date.now();
    // Filter block break events to the defined time window
    pData.blockBreakEvents = pData.blockBreakEvents.filter(timestamp => now - timestamp < NUKER_CHECK_INTERVAL_MS);
    const brokenBlocksInWindow = pData.blockBreakEvents.length;

    if (pData.isWatched && brokenBlocksInWindow > 0) { // Log activity only if watched and active
        debugLog(`NukerCheck: Processing for ${player.nameTag}. Broke ${brokenBlocksInWindow} blocks in last ${NUKER_CHECK_INTERVAL_MS}ms.`, watchedPrefix);
    }

    if (brokenBlocksInWindow > NUKER_MAX_BREAKS_SHORT_INTERVAL) {
        addFlag(
            player,
            "nuker",
            `Potential Nuker detected. Broke ${brokenBlocksInWindow} blocks quickly.`,
            `Count: ${brokenBlocksInWindow} in ~${NUKER_CHECK_INTERVAL_MS}ms. Events (ms ago): ${pData.blockBreakEvents.map(ts => now - ts).join(', ')}`
        );
        // Clear events after flagging to prevent immediate re-flagging on the same set of breaks.
        pData.blockBreakEvents = [];
    }
}
