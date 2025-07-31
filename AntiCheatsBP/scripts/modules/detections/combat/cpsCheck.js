/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').CommandDependencies} CommandDependencies
 */

/**
 * Checks if a player is clicking at an abnormally high rate (CPS).
 * @param {import('@minecraft/server').Player} player The player to check.
 * @param {PlayerAntiCheatData} pData The player's data.
 * @param {CommandDependencies} dependencies The command dependencies.
 */
export async function checkCps(player, pData, dependencies) {
    const { config, playerUtils, actionManager } = dependencies;

    if (!config.enableCpsCheck) {
        return;
    }

    if (!pData || !Array.isArray(pData.attackEvents)) {
        playerUtils.debugLog(`[CpsCheck] Skipping for ${player.name}: pData or pData.attackEvents is invalid.`, player.name, dependencies);
        return;
    }

    const watchedPrefix = pData.isWatched ? player.name : null;
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
        playerUtils.debugLog(`[CpsCheck] Processing for ${player.name}. EventsInWindow=${eventsInWindow}. WindowMs=${calculationWindowMs}`, watchedPrefix, dependencies);
    }

    const maxThreshold = config.maxCpsThreshold ?? 20;
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
