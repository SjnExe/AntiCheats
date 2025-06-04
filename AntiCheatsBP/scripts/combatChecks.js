/**
 * @file combatChecks.js
 * Contains functions for detecting combat-related hacks such as Reach and high CPS (AutoClicker).
 */

import * as mc from '@minecraft/server';
import { warnPlayer, notifyAdmins, debugLog } from './playerUtils.js';
import { REACH_DISTANCE_SURVIVAL, REACH_DISTANCE_CREATIVE, MAX_CPS_THRESHOLD } from './config.js';

/**
 * Checks if a player is attacking an entity from an excessive distance (Reach).
 * Calculates distance from attacker's eye location to victim's location and compares against configured limits based on game mode.
 * @param {mc.Player} player The attacking player instance.
 * @param {mc.Entity} targetEntity The entity that was attacked/hurt.
 * @param {mc.GameMode} gameMode The attacker's current game mode.
 * @param {import('../main.js').PlayerAntiCheatData} pData Player-specific data for the attacker, used for flagging and logging.
 *        Requires `pData.isWatched`, `pData.flags`, `pData.lastFlagType`.
 */
export function checkReach(player, targetEntity, gameMode, pData) {
    const watchedPrefix = pData?.isWatched ? player.nameTag : null; // pData might be null if called incorrectly

    // Section: Prerequisite Checks
    if (!player || !targetEntity || !player.location || !targetEntity.location || !player.getHeadLocation) {
        debugLog("Reach check prerequisites not met (player, target, locations, or head location missing).", watchedPrefix);
        return;
    }
    if (!pData) { // pData is essential for flagging
        debugLog("Reach check cannot proceed: pData for attacker is missing.", watchedPrefix);
        return;
    }

    // Section: Distance Calculation
    const eyeLocation = player.getHeadLocation();
    const effectiveDistance = eyeLocation.distance(targetEntity.location);
    debugLog(`Reach check: Dist=${effectiveDistance.toFixed(2)} to ${targetEntity.typeId}. Player mode: ${gameMode}.`, watchedPrefix);


    // Section: Determine Max Allowed Reach
    let maxReach;
    if (gameMode === mc.GameMode.creative) {
        maxReach = REACH_DISTANCE_CREATIVE;
    } else if (gameMode === mc.GameMode.survival || gameMode === mc.GameMode.adventure) {
        maxReach = REACH_DISTANCE_SURVIVAL;
    } else {
        debugLog(`Reach check not applicable for game mode: ${gameMode}`, watchedPrefix);
        return;
    }

    // Section: Violation Check
    const reachBuffer = 0.5; // Buffer for minor discrepancies
    if (effectiveDistance > (maxReach + reachBuffer)) {
        pData.lastFlagType = "reach";
        pData.flags.totalFlags = (pData.flags.totalFlags || 0) + 1;
        if (!pData.flags.reach) pData.flags.reach = { count: 0, lastDetectionTime: 0 };
        pData.flags.reach.count++;
        pData.flags.reach.lastDetectionTime = Date.now();
        warnPlayer(player, `Potential reach hack detected. Distance: ${effectiveDistance.toFixed(2)}m, Max: ${maxReach}m`);
        notifyAdmins(`Flagged for Reach. Dist: ${effectiveDistance.toFixed(2)}m to ${targetEntity.typeId}. Mode: ${gameMode}`, player, pData);
        // The old debugLog call was already quite detailed and good.
        debugLog(`Violation: ${player.nameTag} at ${effectiveDistance.toFixed(2)}m to ${targetEntity.typeId}. Max allowed: ${maxReach}. Mode: ${gameMode}`, watchedPrefix);
    }
}

/**
 * Checks if a player is clicking/attacking at an abnormally high rate (CPS - Clicks Per Second).
 * Calculates CPS based on attack event timestamps stored in `pData.attackEvents`.
 * @param {mc.Player} player The player instance to check.
 * @param {import('../main.js').PlayerAntiCheatData} pData Player-specific data, including attack event timestamps and flags.
 *        Requires `pData.isWatched`, `pData.attackEvents`, `pData.flags`, `pData.lastFlagType`.
 */
export function checkCPS(player, pData) {
    const watchedPrefix = pData?.isWatched ? player.nameTag : null;

    // Section: Prerequisite Checks
    if (!pData || !pData.attackEvents) {
        debugLog(`CPS check skipped: pData or attackEvents missing.`, watchedPrefix);
        return;
    }

    // Section: Timestamp Management & CPS Calculation
    const now = Date.now();
    const oneSecondAgo = now - 1000;

    // Filter attack events to the last second
    pData.attackEvents = pData.attackEvents.filter(timestamp => timestamp >= oneSecondAgo);
    const currentCPS = pData.attackEvents.length;

    if (currentCPS > 0) { // Only log if there's activity to avoid spamming logs
        debugLog(`CPS check: CurrentCPS=${currentCPS}. Events in window: ${pData.attackEvents.length}`, watchedPrefix);
    }

    // Section: Threshold Check
    if (currentCPS > MAX_CPS_THRESHOLD) {
        pData.lastFlagType = "cps";
        pData.flags.totalFlags = (pData.flags.totalFlags || 0) + 1;
        if (!pData.flags.cps) pData.flags.cps = { count: 0, lastDetectionTime: 0 };
        pData.flags.cps.count++;
        pData.flags.cps.lastDetectionTime = Date.now();
        warnPlayer(player, `Potential AutoClicker detected. CPS: ${currentCPS} (Threshold: ${MAX_CPS_THRESHOLD})`);
        notifyAdmins(`Flagged for High CPS: ${currentCPS} (Threshold: ${MAX_CPS_THRESHOLD})`, player, pData);
        // The old debugLog call was already quite detailed.
        debugLog(`High CPS: ${player.nameTag} - ${currentCPS} events in last second. Events: [${pData.attackEvents.join(', ')}]`, watchedPrefix);
    }
}
