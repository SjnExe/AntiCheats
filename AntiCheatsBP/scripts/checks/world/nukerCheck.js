import * as mc from '@minecraft/server';
import { addFlag } from '../../core/playerDataManager.js';
import { debugLog } from '../../utils/playerUtils.js';
import {
    enableNukerCheck, // Renamed
    nukerMaxBreaksShortInterval, // Renamed
    nukerCheckIntervalMs // Renamed
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
    if (!enableNukerCheck) return; // Renamed
    const watchedPrefix = pData?.isWatched ? player.nameTag : null;

    if (!pData || !pData.blockBreakEvents) {
        return;
    }

    const now = Date.now();
    pData.blockBreakEvents = pData.blockBreakEvents.filter(timestamp => now - timestamp < nukerCheckIntervalMs); // Renamed
    const brokenBlocksInWindow = pData.blockBreakEvents.length;

    if (pData.isWatched && brokenBlocksInWindow > 0) {
        debugLog(`NukerCheck: Processing for ${player.nameTag}. Broke ${brokenBlocksInWindow} blocks in last ${nukerCheckIntervalMs}ms.`, watchedPrefix); // Renamed
    }

    if (brokenBlocksInWindow > nukerMaxBreaksShortInterval) { // Renamed
        addFlag(
            player,
            "nuker",
            `Potential Nuker detected. Broke ${brokenBlocksInWindow} blocks quickly.`,
            `Count: ${brokenBlocksInWindow} in ~${nukerCheckIntervalMs}ms. Events (ms ago): ${pData.blockBreakEvents.map(ts => now - ts).join(', ')}` // Renamed
        );
        pData.blockBreakEvents = [];
    }
}
