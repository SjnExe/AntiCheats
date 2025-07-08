/**
 * @file Implements a check to detect Nuker hacks by analyzing the rate of block breaking by a player.
 * @module AntiCheatsBP/scripts/checks/world/nukerCheck
 * Relies on `pData.blockBreakEvents` (an array of timestamps) being populated by block break event handlers.
 */

// Constants for magic numbers
const DEFAULT_NUKER_CHECK_INTERVAL_MS = 200;
const DEFAULT_NUKER_MAX_BREAKS_SHORT_INTERVAL = 4;
const NUKER_DEBUG_EVENT_SUMMARY_COUNT = 5;

/**
 * Checks for Nuker-like behavior by analyzing the rate of block breaking.
 * It filters `pData.blockBreakEvents` to a configured time window and flags if the count exceeds a threshold.
 * This check is typically run on a tick-based interval.
 * @async
 * @param {import('@minecraft/server').Player} player - The player instance to check.
 * @param {import('../../types.js').PlayerAntiCheatData} pData - Player-specific anti-cheat data, expected to contain `blockBreakEvents`.
 * @param {import('../../types.js').Dependencies} dependencies - Object containing necessary dependencies.
 * @returns {Promise<void>}
 */
export async function checkNuker(player, pData, dependencies) {
    const { config, playerUtils, actionManager } = dependencies;

    if (!config.enableNukerCheck || !pData) {
        return;
    }

    pData.blockBreakEvents ??= [];
    if (!Array.isArray(pData.blockBreakEvents)) {
        playerUtils.debugLog(`[NukerCheck] pData.blockBreakEvents for ${player.nameTag} is not an array. Resetting.`, player.nameTag, dependencies);
        pData.blockBreakEvents = [];
        pData.isDirtyForSave = true;
    }

    const watchedPrefix = pData.isWatched ? player.nameTag : null;
    const now = Date.now();
    const checkIntervalMs = config.nukerCheckIntervalMs ?? DEFAULT_NUKER_CHECK_INTERVAL_MS;

    const originalEventCount = pData.blockBreakEvents.length;
    pData.blockBreakEvents = pData.blockBreakEvents.filter(timestamp => (now - timestamp) < checkIntervalMs);

    if (pData.blockBreakEvents.length !== originalEventCount) {
        pData.isDirtyForSave = true;
    }

    const brokenBlocksInWindow = pData.blockBreakEvents.length;

    if (pData.isWatched && brokenBlocksInWindow > 0) {
        playerUtils.debugLog(`[NukerCheck] Processing for ${player.nameTag}. Broke ${brokenBlocksInWindow} blocks in last ${checkIntervalMs}ms.`, watchedPrefix, dependencies);
    }

    const maxBreaks = config.nukerMaxBreaksShortInterval ?? DEFAULT_NUKER_MAX_BREAKS_SHORT_INTERVAL;
    const rawActionProfileKey = config.nukerActionProfileName ?? 'worldNuker';
    const actionProfileKey = rawActionProfileKey
        .replace(/([-_][a-z0-9])/ig, ($1) => $1.toUpperCase().replace('-', '').replace('_', ''))
        .replace(/^[A-Z]/, (match) => match.toLowerCase());

    if (brokenBlocksInWindow > maxBreaks) {
        if (pData.isWatched || config.enableDebugLogging) {
            const eventSummary = pData.blockBreakEvents.slice(-NUKER_DEBUG_EVENT_SUMMARY_COUNT).map(ts => now - ts).join(', ');
            playerUtils.debugLog(`[NukerCheck] ${player.nameTag}: Flagging. EventsInWindow: ${brokenBlocksInWindow}, Threshold: ${maxBreaks}, TimeWindow: ${checkIntervalMs}ms. Recent Event Ages (ms from now): [${eventSummary}]`, watchedPrefix, dependencies);
        }
        const violationDetails = {
            blocksBroken: brokenBlocksInWindow.toString(),
            checkWindowMs: checkIntervalMs.toString(),
            threshold: maxBreaks.toString(),
        };

        await actionManager.executeCheckAction(player, actionProfileKey, violationDetails, dependencies);

        const pDataToUpdate = pData; // Re-affirm pData reference
        pDataToUpdate.blockBreakEvents = [];
        pDataToUpdate.isDirtyForSave = true;
    }
}
