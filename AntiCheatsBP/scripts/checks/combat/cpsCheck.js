/**
 * @file Checks for abnormally high Clicks Per Second (CPS) or attack rates.
 * @module AntiCheatsBP/scripts/checks/combat/cpsCheck
 */

/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').CommandDependencies} CommandDependencies
 */

// Constants for magic numbers
const defaultMaxCpsThreshold = 20;

/**
 * Checks if a player is clicking or attacking at an abnormally high rate (CPS).
 * @async
 * @param {import('@minecraft/server').Player} player - The player instance to check.
 * @param {PlayerAntiCheatData} pData - Player-specific anti-cheat data, containing `attackEvents`.
 * @param {CommandDependencies} dependencies - Object containing necessary dependencies like config, playerUtils, actionManager, etc.
 * @returns {Promise<void>}
 */
export async function checkCps(player, pData, dependencies) {
    const { config, playerUtils, actionManager } = dependencies;

    if (!config.enableCpsCheck) {
        return;
    }

    if (!pData || !Array.isArray(pData.attackEvents)) {
        playerUtils.debugLog(`[CpsCheck] Skipping for ${player.nameTag}: pData or pData.attackEvents is invalid.`, player.nameTag, dependencies);
        return;
    }

    const watchedPrefix = pData.isWatched ? player.nameTag : null;
    const now = Date.now();
    const calculationWindowMs = config.cpsCalculationWindowMs ?? 1000;
    const windowStartTime = now - calculationWindowMs;

    const originalEventCount = pData.attackEvents.length;
    pData.attackEvents = pData.attackEvents.filter(timestamp => timestamp >= windowStartTime);

    if (pData.attackEvents.length !== originalEventCount) {
        pData.isDirtyForSave = true;
    }

    const eventsInWindow = pData.attackEvents.length;

    if (pData.isWatched && eventsInWindow > 0) {
        playerUtils.debugLog(`[CpsCheck] Processing for ${player.nameTag}. EventsInWindow=${eventsInWindow}. WindowMs=${calculationWindowMs}`, watchedPrefix, dependencies);
    }

    const maxThreshold = config.maxCpsThreshold ?? defaultMaxCpsThreshold;
    const actionProfileKey = config.cpsHighActionProfileName ?? 'combatCpsHigh';

    if (eventsInWindow > maxThreshold) {
        const violationDetails = {
            cpsCount: eventsInWindow.toString(),
            windowSeconds: (calculationWindowMs / 1000).toFixed(1),
            threshold: maxThreshold.toString(),
        };
        await actionManager.executeCheckAction(player, actionProfileKey, violationDetails, dependencies);
    }
}
