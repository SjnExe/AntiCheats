import * as mc from '@minecraft/server';
import { addFlag } from '../../core/playerDataManager.js';
import { debugLog } from '../../utils/playerUtils.js'; // Only debugLog is needed from playerUtils directly
import {
    ENABLE_REACH_CHECK,
    REACH_DISTANCE_SURVIVAL,
    REACH_DISTANCE_CREATIVE,
    REACH_BUFFER
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
    if (!ENABLE_REACH_CHECK) return;
    const watchedPrefix = pData?.isWatched ? player.nameTag : null;

    if (!player || !targetEntity || !player.location || !targetEntity.location || !player.getHeadLocation) {
        // This debug log is fine here as it's about pre-requisite failure, not a cheat detection
        debugLog("ReachCheck: Prerequisites not met (player, target, locations, or head location missing).", watchedPrefix);
        return;
    }
    // pData is already checked by the caller (handleEntityHurt) before calling checks.
    // if (!pData) {
    //     debugLog("ReachCheck: Cannot proceed: pData for attacker is missing.", watchedPrefix);
    //     return;
    // }

    const eyeLocation = player.getHeadLocation();
    const effectiveDistance = eyeLocation.distance(targetEntity.location);

    if (pData.isWatched) { // Log details only if watched
        debugLog(`ReachCheck: Processing for ${player.nameTag}. Dist=${effectiveDistance.toFixed(2)} to ${targetEntity.typeId}. Mode: ${gameMode}.`, watchedPrefix);
    }

    let maxReach;
    if (gameMode === mc.GameMode.creative) {
        maxReach = REACH_DISTANCE_CREATIVE;
    } else if (gameMode === mc.GameMode.survival || gameMode === mc.GameMode.adventure) {
        maxReach = REACH_DISTANCE_SURVIVAL;
    } else {
        // debugLog(`ReachCheck: Not applicable for game mode: ${gameMode}`, watchedPrefix);
        return; // Not a cheat, just not applicable
    }

    if (effectiveDistance > (maxReach + REACH_BUFFER)) {
        addFlag(
            player,
            "reach",
            `Potential reach hack detected. Distance: ${effectiveDistance.toFixed(2)}m.`,
            `Max: ${maxReach}m, Target: ${targetEntity.typeId}, Mode: ${gameMode}`
        );
    }
}
