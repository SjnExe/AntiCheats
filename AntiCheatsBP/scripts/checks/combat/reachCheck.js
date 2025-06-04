import * as mc from '@minecraft/server';
import { addFlag } from '../../core/playerDataManager.js';
import { debugLog } from '../../utils/playerUtils.js';
import {
    enableReachCheck, // Renamed
    reachDistanceSurvival, // Renamed
    reachDistanceCreative, // Renamed
    reachBuffer // Renamed
} from '../../config.js';

/**
 * @typedef {import('../../core/playerDataManager.js').PlayerAntiCheatData} PlayerAntiCheatData
 */

/**
 * Checks if a player is attacking an entity from an excessive distance (Reach).
 * @param {mc.Player} player The attacking player instance.
 * @param {mc.Entity} targetEntity The entity that was attacked/hurt.
 * @param {mc.GameMode} gameMode The attacker's current game mode.
 * @param {PlayerAntiCheatData} pData Player-specific data.
 */
export function checkReach(player, targetEntity, gameMode, pData) {
    if (!enableReachCheck) return; // Renamed
    const watchedPrefix = pData?.isWatched ? player.nameTag : null;

    if (!player || !targetEntity || !player.location || !targetEntity.location || !player.getHeadLocation) {
        debugLog("ReachCheck: Prerequisites not met.", watchedPrefix);
        return;
    }

    const eyeLocation = player.getHeadLocation();
    const effectiveDistance = eyeLocation.distance(targetEntity.location);

    if (pData.isWatched) {
        debugLog(`ReachCheck: ${player.nameTag} Dist=${effectiveDistance.toFixed(2)} to ${targetEntity.typeId}. Mode: ${gameMode}.`, watchedPrefix);
    }

    let maxReachDist; // Renamed variable to avoid conflict with config
    if (gameMode === mc.GameMode.creative) {
        maxReachDist = reachDistanceCreative; // Renamed
    } else if (gameMode === mc.GameMode.survival || gameMode === mc.GameMode.adventure) {
        maxReachDist = reachDistanceSurvival; // Renamed
    } else {
        return;
    }

    if (effectiveDistance > (maxReachDist + reachBuffer)) { // Renamed
        addFlag(
            player,
            "reach",
            `Potential reach hack detected. Distance: ${effectiveDistance.toFixed(2)}m.`,
            `Max: ${maxReachDist}m, Target: ${targetEntity.typeId}, Mode: ${gameMode}`
        );
    }
}
