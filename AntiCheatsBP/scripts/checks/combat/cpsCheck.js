/**
 * @file Checks for abnormally high Clicks Per Second (CPS) or attack rates.
 */

/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').CommandDependencies} CommandDependencies
 * @typedef {import('../../types.js').EventSpecificData} EventSpecificData
 */

/**
 * Checks if a player is clicking or attacking at an abnormally high rate (CPS).
 * This function analyzes attack event timestamps stored in `pData.attackEvents`.
 *
 * @async
 * @param {import('@minecraft/server').Player} player - The player instance to check.
 * @param {PlayerAntiCheatData} pData - Player-specific anti-cheat data, containing `attackEvents`.
 * @param {CommandDependencies} dependencies - Object containing necessary dependencies like config, playerUtils, actionManager, etc.
 * @param {EventSpecificData} [eventSpecificData] - Optional data specific to the event that triggered this check (unused by CPS check).
 * @returns {Promise<void>}
 */
export async function checkCPS(player, pData, dependencies, eventSpecificData) {
    const { config, playerUtils, actionManager } = dependencies; // Removed unused playerDataManager, logManager, currentTick

    if (!config.enableCPSCheck) {
        return;
    }

    if (!pData || !Array.isArray(pData.attackEvents)) {
        playerUtils.debugLog(`[CPSCheck] Skipping for ${player.nameTag}: pData or pData.attackEvents is invalid.`, player.nameTag, dependencies);
        return;
    }

    const watchedPrefix = pData.isWatched ? player.nameTag : null;
    const now = Date.now();
    const calculationWindowMs = config.cpsCalculationWindowMs ?? 1000;
    const windowStartTime = now - calculationWindowMs;

    const originalEventCount = pData.attackEvents.length;
    // Filter events to keep only those within the calculation window
    pData.attackEvents = pData.attackEvents.filter(timestamp => timestamp >= windowStartTime);

    if (pData.attackEvents.length !== originalEventCount) {
        pData.isDirtyForSave = true; // Mark for saving if the array was modified
    }

    const eventsInWindow = pData.attackEvents.length;

    if (pData.isWatched && eventsInWindow > 0) {
        playerUtils.debugLog(`[CPSCheck] Processing for ${player.nameTag}. EventsInWindow=${eventsInWindow}. WindowMs=${calculationWindowMs}`, watchedPrefix, dependencies);
    }

    const maxThreshold = config.maxCpsThreshold ?? 20;
    const actionProfileKey = config.cpsHighActionProfileName ?? 'combatCpsHigh'; // Standardized key, ensure this key exists in config

    if (eventsInWindow > maxThreshold) {
        const violationDetails = {
            cpsCount: eventsInWindow.toString(),
            windowSeconds: (calculationWindowMs / 1000).toFixed(1),
            threshold: maxThreshold.toString(),
        };
        await actionManager.executeCheckAction(player, actionProfileKey, violationDetails, dependencies);
        // Message cancellation is not applicable here as this check runs on tick, not directly on a cancellable event.
    }
}
