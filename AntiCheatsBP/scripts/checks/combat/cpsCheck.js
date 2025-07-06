/**
 * @file Checks for abnormally high Clicks Per Second (CPS) or attack rates.
 */

/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').CommandDependencies} CommandDependencies
 */

/**
 * Checks if a player is clicking or attacking at an abnormally high rate (CPS).
 *
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

    const maxThreshold = config.maxCpsThreshold ?? 20;
    // Ensure actionProfileKey is camelCase, standardizing from config
    const rawActionProfileKey = config.cpsHighActionProfileName ?? 'combatCpsHigh'; // Default is already camelCase
    const actionProfileKey = rawActionProfileKey
        .replace(/([-_][a-z0-9])/ig, ($1) => $1.toUpperCase().replace('-', '').replace('_', ''))
        .replace(/^[A-Z]/, (match) => match.toLowerCase());

    if (eventsInWindow > maxThreshold) {
        const violationDetails = {
            cpsCount: eventsInWindow.toString(),
            windowSeconds: (calculationWindowMs / 1000).toFixed(1),
            threshold: maxThreshold.toString(),
        };
        await actionManager.executeCheckAction(player, actionProfileKey, violationDetails, dependencies);
    }
}
