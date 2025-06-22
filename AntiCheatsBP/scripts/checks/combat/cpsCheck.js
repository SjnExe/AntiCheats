/**
 * @file AntiCheatsBP/scripts/checks/combat/cpsCheck.js
 * Checks for abnormally high Clicks Per Second (CPS) or attack rates.
 * @version 1.1.0
 */
/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').CommandDependencies} CommandDependencies
 * @typedef {import('../../types.js').EventSpecificData} EventSpecificData
 */
/**
 * Checks if a player is clicking or attacking at an abnormally high rate (CPS).
 * This function analyzes attack event timestamps stored in `pData.attackEvents`.
 * @param {import('@minecraft/server').Player} player - The player instance to check.
 * @param {PlayerAntiCheatData} pData - Player-specific anti-cheat data, containing `attackEvents`.
 * @param {CommandDependencies} dependencies - Object containing necessary dependencies like config, playerUtils, executeCheckAction, etc.
 * @param {EventSpecificData} [eventSpecificData] - Optional data specific to the event that triggered this check (unused by CPS).
 * @returns {Promise<void>}
 */
export async function checkCPS(
    player,
    pData,
    dependencies,
    eventSpecificData
) {
    const { config, playerUtils, playerDataManager, logManager, actionManager, currentTick } = dependencies;

    if (!config.enableCPSCheck) {
        return;
    }

    if (!pData || !Array.isArray(pData.attackEvents)) {
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
        playerUtils.debugLog(`[CPSCheck] Processing for ${player.nameTag}. EventsInWindow=${eventsInWindow}. WindowMs=${calculationWindowMs}`, watchedPrefix, dependencies);
    }

    const maxThreshold = config.maxCpsThreshold ?? 20;

    if (eventsInWindow > maxThreshold) {
        const violationDetails = {
            cpsCount: eventsInWindow.toString(),
            windowSeconds: (calculationWindowMs / 1000).toFixed(1),
            threshold: maxThreshold.toString(),
        };
        await actionManager.executeCheckAction(player, "combatCpsHigh", violationDetails, dependencies);
    }
}
