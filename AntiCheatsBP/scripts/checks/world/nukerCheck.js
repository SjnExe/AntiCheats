/**
 * @file AntiCheatsBP/scripts/checks/world/nukerCheck.js
 * Implements a check to detect Nuker hacks by analyzing the rate of block breaking by a player.
 * Relies on `pData.blockBreakEvents` (an array of timestamps) being populated by block break event handlers.
 * @version 1.1.0
 */

/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').CommandDependencies} CommandDependencies
 */

/**
 * Checks for Nuker-like behavior by analyzing the rate of block breaking.
 * It filters `pData.blockBreakEvents` to a configured time window and flags if the count exceeds a threshold.
 *
 * @param {import('@minecraft/server').Player} player - The player instance to check.
 * @param {PlayerAntiCheatData} pData - Player-specific anti-cheat data, expected to contain `blockBreakEvents`.
 * @param {CommandDependencies} dependencies - Object containing necessary dependencies.
 * @returns {Promise<void>}
 */
export async function checkNuker(
    player,
    pData,
    dependencies
) {
    const { config, playerUtils, playerDataManager, logManager, actionManager } = dependencies;

    if (!config.enableNukerCheck || !pData) {
        return;
    }

    pData.blockBreakEvents = pData.blockBreakEvents || [];
    if (!Array.isArray(pData.blockBreakEvents)) {
        pData.blockBreakEvents = [];
    }

    const watchedPrefix = pData.isWatched ? player.nameTag : null;
    const now = Date.now();
    const checkIntervalMs = config.nukerCheckIntervalMs ?? 200;

    const originalEventCount = pData.blockBreakEvents.length;
    pData.blockBreakEvents = pData.blockBreakEvents.filter(timestamp => (now - timestamp) < checkIntervalMs);

    if (pData.blockBreakEvents.length !== originalEventCount) {
        pData.isDirtyForSave = true;
    }

    const brokenBlocksInWindow = pData.blockBreakEvents.length;

    if (pData.isWatched && brokenBlocksInWindow > 0) { // playerUtils.debugLog is implicitly available via dependencies
        playerUtils.debugLog(`[NukerCheck] Processing for ${player.nameTag}. Broke ${brokenBlocksInWindow} blocks in last ${checkIntervalMs}ms.`, dependencies, watchedPrefix);
    }

    const maxBreaks = config.nukerMaxBreaksShortInterval ?? 4;

    if (brokenBlocksInWindow > maxBreaks) {
        if (pData.isWatched) { // playerUtils.debugLog is implicitly available via dependencies
            const eventSummary = pData.blockBreakEvents.slice(-5).map(ts => now - ts).join(', ');
            playerUtils.debugLog(`[NukerCheck] ${player.nameTag}: Flagging. EventsInWindow: ${brokenBlocksInWindow}, Threshold: ${maxBreaks}, TimeWindow: ${checkIntervalMs}ms. Recent Event Ages (ms from now): [${eventSummary}]`, dependencies, player.nameTag);
        }
        const violationDetails = {
            blocksBroken: brokenBlocksInWindow.toString(),
            checkWindowMs: checkIntervalMs.toString(),
            threshold: maxBreaks.toString(),
            // lastBrokenBlockType: pData.lastBrokenBlockType ?? "N/A"
        };

        const nukerActionProfile = config.nukerActionProfileName ?? "worldNuker";
        // Pass the main 'dependencies' object to executeCheckAction
        await actionManager.executeCheckAction(player, nukerActionProfile, violationDetails, dependencies);

        pData.blockBreakEvents = [];
        pData.isDirtyForSave = true;
    }
}
