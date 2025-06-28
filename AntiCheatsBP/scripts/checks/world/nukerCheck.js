/**
 * @file Implements a check to detect Nuker hacks by analyzing the rate of block breaking by a player.
 * Relies on `pData.blockBreakEvents` (an array of timestamps) being populated by block break event handlers.
 */

/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData;
 * @typedef {import('../../types.js').CommandDependencies} CommandDependencies;
 * @typedef {import('../../types.js').Config} Config;
 */

/**
 * Checks for Nuker-like behavior by analyzing the rate of block breaking.
 * It filters `pData.blockBreakEvents` to a configured time window and flags if the count exceeds a threshold.
 * This check is typically run on a tick-based interval.
 *
 * @async
 * @param {import('@minecraft/server').Player} player - The player instance to check.
 * @param {PlayerAntiCheatData} pData - Player-specific anti-cheat data, expected to contain `blockBreakEvents`.
 * @param {CommandDependencies} dependencies - Object containing necessary dependencies.
 * @returns {Promise<void>}
 */
export async function checkNuker(player, pData, dependencies) {
    const { config, playerUtils, actionManager } = dependencies;

    if (!config.enableNukerCheck || !pData) {
        return;
    }

    pData.blockBreakEvents = pData.blockBreakEvents || [];
    if (!Array.isArray(pData.blockBreakEvents)) {
        playerUtils.debugLog(`[NukerCheck] pData.blockBreakEvents for ${player.nameTag} is not an array. Resetting.`, player.nameTag, dependencies);
        pData.blockBreakEvents = [];
        pData.isDirtyForSave = true; // Mark for saving if structure was corrected
    }

    const watchedPrefix = pData.isWatched ? player.nameTag : null;
    const now = Date.now();
    const checkIntervalMs = config.nukerCheckIntervalMs ?? 200; // Time window to check break rate

    const originalEventCount = pData.blockBreakEvents.length;
    pData.blockBreakEvents = pData.blockBreakEvents.filter(timestamp => (now - timestamp) < checkIntervalMs);

    if (pData.blockBreakEvents.length !== originalEventCount) {
        pData.isDirtyForSave = true; // Mark for saving if array was modified
    }

    const brokenBlocksInWindow = pData.blockBreakEvents.length;

    if (pData.isWatched && brokenBlocksInWindow > 0) {
        playerUtils.debugLog(`[NukerCheck] Processing for ${player.nameTag}. Broke ${brokenBlocksInWindow} blocks in last ${checkIntervalMs}ms.`, watchedPrefix, dependencies);
    }

    const maxBreaks = config.nukerMaxBreaksShortInterval ?? 4; // Max blocks allowed in interval
    const actionProfileKey = config.nukerActionProfileName ?? 'worldNuker'; // Standardized key

    if (brokenBlocksInWindow > maxBreaks) {
        if (pData.isWatched || config.enableDebugLogging) { // More detailed log for watched/debug
            const eventSummary = pData.blockBreakEvents.slice(-5).map(ts => now - ts).join(', '); // Ages of last 5 events
            playerUtils.debugLog(`[NukerCheck] ${player.nameTag}: Flagging. EventsInWindow: ${brokenBlocksInWindow}, Threshold: ${maxBreaks}, TimeWindow: ${checkIntervalMs}ms. Recent Event Ages (ms from now): [${eventSummary}]`, watchedPrefix, dependencies);
        }
        const violationDetails = {
            blocksBroken: brokenBlocksInWindow.toString(),
            checkWindowMs: checkIntervalMs.toString(),
            threshold: maxBreaks.toString(),
        };

        await actionManager.executeCheckAction(player, actionProfileKey, violationDetails, dependencies);

        // Reset break events after flagging to prevent immediate re-flagging for the same burst
        pData.blockBreakEvents = [];
        pData.isDirtyForSave = true;
    }
}
