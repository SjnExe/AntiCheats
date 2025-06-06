import * as mc from '@minecraft/server';
// Removed: import { addFlag } from '../../core/playerDataManager.js';
// Removed: import { debugLog } from '../../utils/playerUtils.js';
// Config values are accessed via the config object passed as a parameter.

/**
 * @typedef {import('../../core/playerDataManager.js').PlayerAntiCheatData} PlayerAntiCheatData
 */

/**
 * Checks for Nuker hacks by analyzing the rate of block breaking by a player.
 * @param {mc.Player} player The player instance to check.
 * @param {PlayerAntiCheatData} pData Player-specific data.
 * @param {object} config The server configuration object.
 * @param {object} playerUtils Utility functions for players.
 * @param {object} playerDataManager Manager for player data.
 * @param {object} logManager Manager for logging.
 * @param {function} executeCheckAction Function to execute defined actions for a check.
 */
export async function checkNuker(player, pData, config, playerUtils, playerDataManager, logManager, executeCheckAction) {
    if (!config.enableNukerCheck) return;
    const watchedPrefix = pData?.isWatched ? player.nameTag : null;

    if (!pData || !pData.blockBreakEvents) {
        // if (playerUtils.debugLog && watchedPrefix) playerUtils.debugLog(`NukerCheck: No blockBreakEvents for ${player.nameTag}.`, watchedPrefix);
        return;
    }

    const now = Date.now();
    // Filter events to the current check window
    pData.blockBreakEvents = pData.blockBreakEvents.filter(timestamp => now - timestamp < config.nukerCheckIntervalMs);
    const brokenBlocksInWindow = pData.blockBreakEvents.length;

    if (pData.isWatched && brokenBlocksInWindow > 0 && playerUtils.debugLog) {
        playerUtils.debugLog(`NukerCheck: Processing for ${player.nameTag}. Broke ${brokenBlocksInWindow} blocks in last ${config.nukerCheckIntervalMs}ms.`, watchedPrefix);
    }

    if (brokenBlocksInWindow > config.nukerMaxBreaksShortInterval) {
        const violationDetails = {
            blocksBroken: brokenBlocksInWindow,
            checkWindowMs: config.nukerCheckIntervalMs,
            // blockBreakEventData is not directly passed to this tick-based check.
            // If needed, the last broken block type could be stored in pData from eventHandlers.js
            // For now, keeping it simple as the check is primarily rate-based.
            lastBrokenBlockType: pData.lastBrokenBlockType || "N/A" // Assuming pData might store this
        };
        const dependencies = { config, playerDataManager, playerUtils, logManager };
        await executeCheckAction(player, "world_nuker", violationDetails, dependencies);

        // Reset or clear events after flagging to prevent immediate re-flagging on the same events
        pData.blockBreakEvents = [];
    }
}
