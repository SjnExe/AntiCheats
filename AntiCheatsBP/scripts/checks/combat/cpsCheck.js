import * as mc from '@minecraft/server';
// Removed direct imports: addFlag, debugLog, config values.

/**
 * @typedef {import('../../core/playerDataManager.js').PlayerAntiCheatData} PlayerAntiCheatData
 */

/**
 * Checks if a player is clicking/attacking at an abnormally high rate (CPS - Clicks Per Second).
 * @param {mc.Player} player The player instance to check.
 * @param {PlayerAntiCheatData} pData Player-specific data.
 * @param {object} config The server configuration object.
 * @param {object} playerUtils Utility functions for players.
 * @param {object} playerDataManager Manager for player data.
 * @param {object} logManager Manager for logging.
 * @param {function} executeCheckAction Function to execute defined actions for a check.
 */
export async function checkCPS(player, pData, config, playerUtils, playerDataManager, logManager, executeCheckAction) {
    if (!config.enableCpsCheck) return;
    const watchedPrefix = pData?.isWatched ? player.nameTag : null;

    if (!pData || !pData.attackEvents) {
        // if (playerUtils.debugLog && watchedPrefix) playerUtils.debugLog(`CPSCheck: No attackEvents for ${player.nameTag}.`, watchedPrefix);
        return;
    }

    const now = Date.now();
    const windowStartTime = now - config.cpsCalculationWindowMs;

    // Filter attack events to the current calculation window
    pData.attackEvents = pData.attackEvents.filter(timestamp => timestamp >= windowStartTime);

    // Calculate CPS based on events within the window.
    // Note: If cpsCalculationWindowMs is 1000ms, this is direct CPS.
    // If it's different, this count is "events in X ms".
    // The original logic implies this is the value to compare against maxCpsThreshold.
    const eventsInWindow = pData.attackEvents.length;
    // For a true CPS value if window is not 1s: const actualCPS = eventsInWindow / (config.cpsCalculationWindowMs / 1000);

    if (pData.isWatched && eventsInWindow > 0 && playerUtils.debugLog) {
        playerUtils.debugLog(`CPSCheck: Processing for ${player.nameTag}. EventsInWindow=${eventsInWindow}. WindowMs=${config.cpsCalculationWindowMs}`, watchedPrefix);
    }

    if (eventsInWindow > config.maxCpsThreshold) {
        const violationDetails = {
            cpsCount: eventsInWindow, // This is "events in window"
            windowSeconds: (config.cpsCalculationWindowMs / 1000).toFixed(1),
            threshold: config.maxCpsThreshold,
            // Optional: include a sample of event timings for detailed logs if needed
            // eventTimingsMsAgo: pData.attackEvents.map(ts => now - ts).slice(0, 5).join(', ') // Example: first 5
        };
        const dependencies = { config, playerDataManager, playerUtils, logManager };
        await executeCheckAction(player, "combat_cps_high", violationDetails, dependencies);

        // Optional: Clear attackEvents after flagging to prevent re-flagging on the exact same set,
        // or let them naturally phase out by the time window.
        // pData.attackEvents = [];
    }
}
