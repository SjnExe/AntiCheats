/**
 * @file AntiCheatsBP/scripts/checks/combat/cpsCheck.js
 * Checks for abnormally high Clicks Per Second (CPS) or attack rates.
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
 * Checks if a player is clicking or attacking at an abnormally high rate (CPS).
 * This function analyzes attack event timestamps stored in `pData.attackEvents`.
 * @param {mc.Player} player - The player instance to check.
 * @param {PlayerAntiCheatData} pData - Player-specific anti-cheat data, containing `attackEvents`.
 * @param {Config} config - The server configuration object, with `enableCpsCheck`, `cpsCalculationWindowMs`, `maxCpsThreshold`.
 * @param {PlayerUtils} playerUtils - Utility functions for player interactions.
 * @param {PlayerDataManager} playerDataManager - Manager for player data.
 * @param {LogManager} logManager - Manager for logging.
 * @param {ExecuteCheckAction} executeCheckAction - Function to execute defined actions for a check.
 * @param {number} currentTick - The current game tick (not directly used in this check's core logic but available).
 * @returns {Promise<void>}
 */
export async function checkCPS(
    player,
    pData,
    config,
    playerUtils,
    playerDataManager,
    logManager,
    executeCheckAction,
    currentTick // Not directly used by CPS logic but part of standard signature
) {
    if (!config.enableCPSCheck) {
        return;
    }

    // Ensure pData and attackEvents array exist. Attack events are added in handleEntityHurt.
    if (!pData || !Array.isArray(pData.attackEvents)) {
        // This might happen if pData is not fully initialized or if attackEvents is missing.
        return;
    }

    const watchedPrefix = pData.isWatched ? player.nameTag : null;
    const now = Date.now();
    const calculationWindowMs = config.cpsCalculationWindowMs ?? 1000;
    const windowStartTime = now - calculationWindowMs;

    // Filter attack events to keep only those within the current calculation window.
    // This also prunes old events from the array.
    const originalEventCount = pData.attackEvents.length;
    pData.attackEvents = pData.attackEvents.filter(timestamp => timestamp >= windowStartTime);

    // If the array was modified by the filter, mark pData as dirty.
    if (pData.attackEvents.length !== originalEventCount) {
        pData.isDirtyForSave = true;
    }

    const eventsInWindow = pData.attackEvents.length;

    if (pData.isWatched && eventsInWindow > 0 && playerUtils.debugLog) {
        playerUtils.debugLog(`CPSCheck: Processing for ${player.nameTag}. EventsInWindow=${eventsInWindow}. WindowMs=${calculationWindowMs}`, watchedPrefix);
    }

    const maxThreshold = config.maxCpsThreshold ?? 20;

    if (eventsInWindow > maxThreshold) {
        const violationDetails = {
            cpsCount: eventsInWindow.toString(), // Actual number of clicks/attacks in the defined window
            windowSeconds: (calculationWindowMs / 1000).toFixed(1),
            threshold: maxThreshold.toString(),
        };

        const dependencies = { config, playerDataManager, playerUtils, logManager };
        await executeCheckAction(player, "combatCpsHigh", violationDetails, dependencies);
    }
}
