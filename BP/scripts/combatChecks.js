import * as mc from '@minecraft/server';
import { warnPlayer, notifyAdmins, debugLog } from './playerUtils.js';
import { REACH_DISTANCE_SURVIVAL, REACH_DISTANCE_CREATIVE, MAX_CPS_THRESHOLD } from './config.js';

export function checkReach(player, targetEntity, gameMode, pData) { // Added pData
    // player is the attacker (mc.Player)
    // targetEntity is the entity that was hurt (mc.Entity)
    // gameMode is the player's current game mode (mc.GameMode enum)
    // pData is the attacker's data from playerData map

    if (!player || !targetEntity || !player.location || !targetEntity.location || !player.getHeadLocation || !pData) { // Added pData check
        debugLog("Reach check prerequisites not met (player, target, locations, head location, or pData missing).");
        return;
    }

    // Using eye location for the attacker and target's main location.
    const eyeLocation = player.getHeadLocation();
    const effectiveDistance = eyeLocation.distance(targetEntity.location);

    let maxReach;
    // Ensure gameMode is compared against mc.GameMode enum members
    if (gameMode === mc.GameMode.creative) {
        maxReach = REACH_DISTANCE_CREATIVE;
    } else if (gameMode === mc.GameMode.survival || gameMode === mc.GameMode.adventure) {
        maxReach = REACH_DISTANCE_SURVIVAL;
    } else {
        // debugLog(`Reach check not applicable for game mode: ${gameMode}`);
        return; // Not checking for other modes like spectator or unknown
    }

    // Add a small buffer for calculations and server-client sync
    const reachBuffer = 0.5;
    if (effectiveDistance > (maxReach + reachBuffer)) {
        pData.lastFlagType = "reach";
        pData.flags.totalFlags = (pData.flags.totalFlags || 0) + 1;
        if (!pData.flags.reach) pData.flags.reach = { count: 0, lastDetectionTime: 0 };
        pData.flags.reach.count++;
        pData.flags.reach.lastDetectionTime = Date.now();
        warnPlayer(player, `Potential reach hack detected. Distance: ${effectiveDistance.toFixed(2)}m, Max: ${maxReach}m`);
        notifyAdmins(`Flagged for Reach. Dist: ${effectiveDistance.toFixed(2)}m to ${targetEntity.typeId}. Mode: ${gameMode}`, player, pData);
        debugLog(`Reach violation: ${player.nameTag} at ${effectiveDistance.toFixed(2)}m to ${targetEntity.typeId}. Max allowed: ${maxReach}. Mode: ${gameMode}`);
    }
}

export function checkCPS(player, pData) {
    if (!pData || !pData.attackEvents) {
        // debugLog(`CPS check skipped for ${player.nameTag}: pData or attackEvents missing.`);
        return;
    }

    const now = Date.now();
    const oneSecondAgo = now - 1000; // 1000 milliseconds = 1 second

    // Remove attack timestamps older than 1 second
    pData.attackEvents = pData.attackEvents.filter(timestamp => timestamp >= oneSecondAgo);

    const currentCPS = pData.attackEvents.length;

    if (currentCPS > MAX_CPS_THRESHOLD) {
        pData.lastFlagType = "cps";
        pData.flags.totalFlags = (pData.flags.totalFlags || 0) + 1;
        if (!pData.flags.cps) pData.flags.cps = { count: 0, lastDetectionTime: 0 };
        pData.flags.cps.count++;
        pData.flags.cps.lastDetectionTime = Date.now();
        warnPlayer(player, `Potential AutoClicker detected. CPS: ${currentCPS} (Threshold: ${MAX_CPS_THRESHOLD})`);
        notifyAdmins(`Flagged for High CPS: ${currentCPS} (Threshold: ${MAX_CPS_THRESHOLD})`, player, pData);
        debugLog(`High CPS: ${player.nameTag} - ${currentCPS} events in last second. Events: [${pData.attackEvents.join(', ')}]`);

        // Optional: To prevent spamming notifications for a single continuous burst,
        // one might add a cooldown mechanism here for this specific player.
        // For example, update pData.lastCpsFlagTime = now; and check against it.
        // For now, keeping it simple as per prompt.
    }
    // else {
        // Optional: Log normal CPS if needed for balancing or monitoring
        // if (currentCPS > 0) { // Only log if there were recent attacks
        //     debugLog(`Player ${player.nameTag} CPS: ${currentCPS}`);
        // }
    // }
}
