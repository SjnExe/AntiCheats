/**
 * @file AntiCheatsBP/scripts/checks/world/nukerCheck.js
 * Implements a check to detect Nuker hacks by analyzing the rate of block breaking by a player.
 * Relies on `pData.blockBreakEvents` (an array of timestamps) being populated by block break event handlers.
 * @version 1.0.1
 */

import * as mc from '@minecraft/server';

/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').Config} Config
 * @typedef {import('../../types.js').PlayerUtils} PlayerUtils
 * @typedef {import('../../types.js').PlayerDataManager} PlayerDataManager
 * @typedef {import('../../types.js').LogManager} LogManager
 * @typedef {import('../../types.js').ExecuteCheckAction} ExecuteCheckAction
 */

/**
 * Checks for Nuker-like behavior by analyzing the rate of block breaking.
 * It filters `pData.blockBreakEvents` to a configured time window and flags if the count exceeds a threshold.
 *
 * @param {mc.Player} player - The player instance to check.
 * @param {PlayerAntiCheatData} pData - Player-specific anti-cheat data, expected to contain `blockBreakEvents`.
 * @param {Config} config - The server configuration object, with `enableNukerCheck`,
 *                          `nukerCheckIntervalMs`, and `nukerMaxBreaksShortInterval`.
 * @param {PlayerUtils} playerUtils - Utility functions for player interactions.
 * @param {PlayerDataManager} playerDataManager - Manager for player data.
 * @param {LogManager} logManager - Manager for logging.
 * @param {ExecuteCheckAction} executeCheckAction - Function to execute defined actions for a check.
 * @returns {Promise<void>}
 */
export async function checkNuker(
    player,
    pData,
    config,
    playerUtils,
    playerDataManager,
    logManager,
    executeCheckAction
) {
    if (!config.enableNukerCheck || !pData) {
        return;
    }

    pData.blockBreakEvents = pData.blockBreakEvents || [];
    if (!Array.isArray(pData.blockBreakEvents)) {
        pData.blockBreakEvents = []; // Should not happen if initialized correctly
    }

    const watchedPrefix = pData.isWatched ? player.nameTag : null;
    const now = Date.now();
    const checkIntervalMs = config.nukerCheckIntervalMs ?? 200;

    // Filter events to the current check window, also prunes old events.
    const originalEventCount = pData.blockBreakEvents.length;
    pData.blockBreakEvents = pData.blockBreakEvents.filter(timestamp => (now - timestamp) < checkIntervalMs);

    if (pData.blockBreakEvents.length !== originalEventCount) {
        pData.isDirtyForSave = true;
    }

    const brokenBlocksInWindow = pData.blockBreakEvents.length;

    if (pData.isWatched && brokenBlocksInWindow > 0 && playerUtils.debugLog) {
        playerUtils.debugLog(`NukerCheck: Processing for ${player.nameTag}. Broke ${brokenBlocksInWindow} blocks in last ${checkIntervalMs}ms.`, watchedPrefix);
    }

    const maxBreaks = config.nukerMaxBreaksShortInterval ?? 4;

    if (brokenBlocksInWindow > maxBreaks) {
        if (pData.isWatched && playerUtils.debugLog) {
            const eventSummary = pData.blockBreakEvents.slice(-5).map(ts => now - ts).join(', '); // Show last 5 event ages relative to now
            playerUtils.debugLog(`NukerCheck ${player.nameTag}: Flagging. EventsInWindow: ${brokenBlocksInWindow}, Threshold: ${maxBreaks}, TimeWindow: ${checkIntervalMs}ms. Recent Event Ages (ms from now): [${eventSummary}]`, player.nameTag);
        }
        const violationDetails = {
            blocksBroken: brokenBlocksInWindow.toString(),
            checkWindowMs: checkIntervalMs.toString(),
            threshold: maxBreaks.toString(),
            // lastBrokenBlockType: pData.lastBrokenBlockType ?? "N/A" // This field is not standard in pData yet
        };
        const dependencies = { config, playerDataManager, playerUtils, logManager }; // Construct dependencies for executeCheckAction
        const nukerActionProfile = config.nukerActionProfileName ?? "worldNuker";
        await executeCheckAction(player, nukerActionProfile, violationDetails, dependencies);

        // Reset events after flagging to prevent immediate re-flagging and act as a cooldown.
        pData.blockBreakEvents = [];
        pData.isDirtyForSave = true;
    }
}
