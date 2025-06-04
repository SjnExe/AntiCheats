import * as mc from '@minecraft/server';
import { addFlag } from '../../core/playerDataManager.js';
import { debugLog } from '../../utils/playerUtils.js';
import {
    enableCpsCheck, // Renamed
    maxCpsThreshold, // Renamed
    cpsCalculationWindowMs // Renamed
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
    if (!enableCpsCheck) return; // Renamed
    const watchedPrefix = pData?.isWatched ? player.nameTag : null;

    if (!pData || !pData.attackEvents) {
        return;
    }

    const now = Date.now();
    const windowStartTime = now - cpsCalculationWindowMs; // Renamed

    pData.attackEvents = pData.attackEvents.filter(timestamp => timestamp >= windowStartTime);
    const currentCPS = pData.attackEvents.length;

    if (pData.isWatched && currentCPS > 0) {
        debugLog(`CPSCheck: Processing for ${player.nameTag}. CurrentCPS=${currentCPS}. EventsInWindow: ${pData.attackEvents.length}`, watchedPrefix);
    }

    if (currentCPS > maxCpsThreshold) { // Renamed
        addFlag(
            player,
            "cps",
            `Potential AutoClicker detected. CPS: ${currentCPS}.`,
            `Threshold: ${maxCpsThreshold}, Events (ms ago): [${pData.attackEvents.map(ts => now - ts).join(', ')}]` // Renamed
        );
    }
}
