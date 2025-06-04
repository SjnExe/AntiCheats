import * as mc from '@minecraft/server';
import { addFlag } from '../../core/playerDataManager.js';
import { debugLog } from '../../utils/playerUtils.js';
import {
    ENABLE_CPS_CHECK,
    MAX_CPS_THRESHOLD,
    CPS_CALCULATION_WINDOW_MS
} from '../../config.js';

/**
 * @typedef {import('../../core/playerDataManager.js').PlayerAntiCheatData} PlayerAntiCheatData
 */

/**
 * Checks if a player is clicking/attacking at an abnormally high rate (CPS - Clicks Per Second).
 * @param {mc.Player} player The player instance to check.
 * @param {PlayerAntiCheatData} pData Player-specific data.
 */
export function checkCPS(player, pData) {
    if (!ENABLE_CPS_CHECK) return;
    const watchedPrefix = pData?.isWatched ? player.nameTag : null;

    if (!pData || !pData.attackEvents) {
        // debugLog(`CPSCheck: Skipped for ${player.nameTag} - pData or attackEvents missing.`, watchedPrefix);
        return;
    }

    const now = Date.now();
    const windowStartTime = now - CPS_CALCULATION_WINDOW_MS;

    // Filter attack events to the defined time window
    pData.attackEvents = pData.attackEvents.filter(timestamp => timestamp >= windowStartTime);
    const currentCPS = pData.attackEvents.length;

    if (pData.isWatched && currentCPS > 0) { // Log activity only if watched and active
        debugLog(`CPSCheck: Processing for ${player.nameTag}. CurrentCPS=${currentCPS}. Events in window: ${pData.attackEvents.length}`, watchedPrefix);
    }

    if (currentCPS > MAX_CPS_THRESHOLD) {
        addFlag(
            player,
            "cps",
            `Potential AutoClicker detected. CPS: ${currentCPS}.`,
            `Threshold: ${MAX_CPS_THRESHOLD}, Events: [${pData.attackEvents.map(ts => now - ts).join(', ')}ms ago]`
        );
        // Potentially clear attackEvents here or let it naturally phase out to avoid re-flagging for same burst.
        // For now, let it phase out. If re-flagging is an issue, pData.attackEvents = []; could be added.
    }
}
