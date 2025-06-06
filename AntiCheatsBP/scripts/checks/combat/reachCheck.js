import * as mc from '@minecraft/server';
// Removed: import { addFlag } from '../../core/playerDataManager.js';
// Removed: import { debugLog } from '../../utils/playerUtils.js';
// Config values are accessed via the config object passed as a parameter.

/**
 * @typedef {import('../../core/playerDataManager.js').PlayerAntiCheatData} PlayerAntiCheatData
 */

/**
 * Checks if a player is attacking an entity from an excessive distance (Reach).
 * @param {mc.Player} player The attacking player instance.
 * @param {mc.Entity} targetEntity The entity that was attacked/hurt.
 * @param {mc.GameMode} gameMode The attacker's current game mode.
 * @param {PlayerAntiCheatData} pData Player-specific data for the attacker.
 * @param {object} config The server configuration object.
 * @param {object} playerUtils Utility functions for players.
 * @param {object} playerDataManager Manager for player data.
 * @param {object} logManager Manager for logging.
 * @param {function} executeCheckAction Function to execute defined actions for a check.
 */
export async function checkReach(player, targetEntity, gameMode, pData, config, playerUtils, playerDataManager, logManager, executeCheckAction) {
    if (!config.enableReachCheck) return;
    const watchedPrefix = pData?.isWatched ? player.nameTag : null;

    // Ensure pData is available, primarily for isWatched status.
    // If pData is crucial for other logic not present here, this check might need adjustment.
    if (!pData) {
        if (playerUtils.debugLog) playerUtils.debugLog(`ReachCheck: Missing pData for ${player.nameTag}. Cannot perform check.`, null);
        return;
    }

    if (!player || !targetEntity || !player.location || !targetEntity.location || !player.getHeadLocation) {
        if (playerUtils.debugLog) playerUtils.debugLog("ReachCheck: Prerequisites (player, target, locations) not met.", watchedPrefix);
        return;
    }

    const eyeLocation = player.getHeadLocation();
    const effectiveDistance = eyeLocation.distance(targetEntity.location);

    if (pData.isWatched && playerUtils.debugLog) {
        playerUtils.debugLog(`ReachCheck: ${player.nameTag} Dist=${effectiveDistance.toFixed(2)} to ${targetEntity.typeId}. Mode: ${gameMode}.`, watchedPrefix);
    }

    let maxReachDist;
    if (gameMode === mc.GameMode.creative) {
        maxReachDist = config.reachDistanceCreative;
    } else if (gameMode === mc.GameMode.survival || gameMode === mc.GameMode.adventure) {
        maxReachDist = config.reachDistanceSurvival;
    } else {
        // Unsupported game mode for this check
        if (playerUtils.debugLog) playerUtils.debugLog(`ReachCheck: Unsupported game mode ${gameMode} for ${player.nameTag}.`, watchedPrefix);
        return;
    }

    const configuredMaxReachWithBuffer = maxReachDist + config.reachBuffer;

    if (effectiveDistance > configuredMaxReachWithBuffer) {
        const violationDetails = {
            distance: effectiveDistance.toFixed(2),
            maxAllowed: configuredMaxReachWithBuffer.toFixed(2), // Max allowed including buffer
            rawMaxConfig: maxReachDist.toFixed(2), // Max before buffer
            targetEntityId: targetEntity.typeId,
            targetEntityName: targetEntity.nameTag || targetEntity.typeId.replace('minecraft:', ''), // Fallback to typeId if nameTag is empty
            playerGameMode: gameMode.toString() // Convert GameMode enum to string for details
        };
        const dependencies = { config, playerDataManager, playerUtils, logManager };
        await executeCheckAction(player, "example_reach_attack", violationDetails, dependencies);
    }
}
