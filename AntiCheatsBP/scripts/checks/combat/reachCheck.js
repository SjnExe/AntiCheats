/**
 * @file AntiCheatsBP/scripts/checks/combat/reachCheck.js
 * Implements a check to detect if a player is attacking entities from an excessive distance.
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
 * Checks if a player is attacking an entity from an excessive distance (Reach).
 * Calculates the distance between the player's eye location and the target entity's location.
 * @param {mc.Player} player - The attacking player instance.
 * @param {mc.Entity} targetEntity - The entity that was attacked/hurt.
 * @param {mc.GameMode} gameMode - The attacker's current game mode (e.g., survival, creative).
 * @param {PlayerAntiCheatData} pData - Player-specific anti-cheat data for the attacker.
 * @param {Config} config - The server configuration object, containing reach distance limits and buffer.
 * @param {PlayerUtils} playerUtils - Utility functions for player interactions.
 * @param {PlayerDataManager} playerDataManager - Manager for player data.
 * @param {LogManager} logManager - Manager for logging.
 * @param {ExecuteCheckAction} executeCheckAction - Function to execute defined actions for a check.
 * @returns {Promise<void>}
 */
export async function checkReach(
    player,
    targetEntity,
    gameMode,
    pData,
    config,
    playerUtils,
    playerDataManager,
    logManager,
    executeCheckAction
) {
    if (!config.enableReachCheck) {
        return;
    }

    // pData might be null if ensurePlayerDataInitialized hasn't run for this player yet in the calling context.
    // For reach check, pData is primarily used for isWatched status for debug logging.
    // If pData itself were necessary for limits or state, this check would need to be more robust.
    const watchedPrefix = pData?.isWatched ? player.nameTag : null;

    if (!player || !targetEntity || !player.location || !targetEntity.location || typeof player.getHeadLocation !== 'function') {
        playerUtils.debugLog?.("ReachCheck: Prerequisites (player, targetEntity, locations, or getHeadLocation method) not met.", watchedPrefix);
        return;
    }

    const eyeLocation = player.getHeadLocation();
    // Entity.location is typically the base/feet of the entity. For more precision, one might consider
    // the entity's bounding box, but eye-to-origin distance is a common approach for reach checks.
    const distanceToTarget = eyeLocation.distance(targetEntity.location);

    if (pData?.isWatched && playerUtils.debugLog) {
        playerUtils.debugLog(`ReachCheck: ${player.nameTag} distance to ${targetEntity.typeId}: ${distanceToTarget.toFixed(2)}. Mode: ${gameMode}.`, watchedPrefix);
    }

    let maxReachDistBase;
    switch (gameMode) {
        case mc.GameMode.creative:
            maxReachDistBase = config.reachDistanceCreative ?? 6.0;
            break;
        case mc.GameMode.survival:
        case mc.GameMode.adventure: // Same reach as survival
            maxReachDistBase = config.reachDistanceSurvival ?? 4.5;
            break;
        default:
            playerUtils.debugLog?.(`ReachCheck: Unsupported game mode "${gameMode}" for player ${player.nameTag}.`, watchedPrefix);
            return; // Do not check reach for other game modes like spectator.
    }

    const reachBuffer = config.reachBuffer ?? 0.5;
    const maxAllowedReach = maxReachDistBase + reachBuffer;

    if (pData?.isWatched && playerUtils.debugLog) {
        playerUtils.debugLog(`ReachCheck ${player.nameTag}: BaseReach: ${maxReachDistBase.toFixed(2)}, Buffer: ${reachBuffer.toFixed(2)}, MaxAllowedReach: ${maxAllowedReach.toFixed(3)}, ActualDist: ${distanceToTarget.toFixed(3)}`, player.nameTag);
    }

    if (distanceToTarget > maxAllowedReach) {
        const violationDetails = {
            distance: distanceToTarget.toFixed(2),
            maxAllowed: maxAllowedReach.toFixed(2),
            baseMax: maxReachDistBase.toFixed(2), // Max reach before buffer
            buffer: reachBuffer.toFixed(2),
            targetEntityType: targetEntity.typeId,
            targetEntityName: targetEntity.nameTag || targetEntity.typeId.replace('minecraft:', ''), // Use nameTag or formatted typeId
            playerGameMode: String(gameMode) // Store game mode as string
        };

        const dependencies = { config, playerDataManager, playerUtils, logManager };
        // The action profile name "example_reach_attack" seems like a placeholder.
        // It should ideally be configurable, e.g., config.reachCheckActionProfileName ?? "combat_reach"
        await executeCheckAction(player, "combatReachAttack", violationDetails, dependencies);
    }
}
