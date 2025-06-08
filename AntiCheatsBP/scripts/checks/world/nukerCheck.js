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
 * @param {number} currentTick - The current game tick (not directly used in this check's core logic).
 * @returns {Promise<void>}
 */
export async function checkNuker(
    player,
    pData,
    config,
    playerUtils,
    playerDataManager,
    logManager,
    executeCheckAction,
    currentTick // Not directly used by this check's core logic
) {
    if (!config.enableNukerCheck || !pData) { // Added null check for pData
        return;
    }

    // Ensure blockBreakEvents array exists and is initialized if needed
    pData.blockBreakEvents = pData.blockBreakEvents || [];
    if (!Array.isArray(pData.blockBreakEvents)) { // Should not happen if initialized correctly
        pData.blockBreakEvents = [];
    }

    const watchedPrefix = pData.isWatched ? player.nameTag : null;
    const now = Date.now();
    const checkIntervalMs = config.nukerCheckIntervalMs ?? 200; // Default to 200ms window

    // Filter events to the current check window; this also prunes old events.
    const originalEventCount = pData.blockBreakEvents.length;
    pData.blockBreakEvents = pData.blockBreakEvents.filter(timestamp => (now - timestamp) < checkIntervalMs);

    if (pData.blockBreakEvents.length !== originalEventCount) {
        pData.isDirtyForSave = true; // Mark as dirty if the array was modified
    }

    const brokenBlocksInWindow = pData.blockBreakEvents.length;

    if (pData.isWatched && brokenBlocksInWindow > 0 && playerUtils.debugLog) {
        playerUtils.debugLog(`NukerCheck: Processing for ${player.nameTag}. Broke ${brokenBlocksInWindow} blocks in last ${checkIntervalMs}ms.`, watchedPrefix);
    }

    const maxBreaks = config.nukerMaxBreaksShortInterval ?? 4; // Default to 4 blocks

    if (brokenBlocksInWindow > maxBreaks) {
        const violationDetails = {
            blocksBroken: brokenBlocksInWindow.toString(),
            checkWindowMs: checkIntervalMs.toString(),
            threshold: maxBreaks.toString(),
            // lastBrokenBlockType: pData.lastBrokenBlockType ?? "N/A" // This field is not standard in pData yet
        };
        const dependencies = { config, playerDataManager, playerUtils, logManager };
        const nukerActionProfile = config.nukerActionProfileName ?? "world_nuker";
        await executeCheckAction(player, nukerActionProfile, violationDetails, dependencies);

        // Reset events after flagging to prevent immediate re-flagging on the same set of breaks
        // and to act as a form of cooldown for this specific detection.
        pData.blockBreakEvents = [];
        pData.isDirtyForSave = true; // Mark as dirty due to clearing
    }
}
