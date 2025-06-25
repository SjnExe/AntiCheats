/**
 * @file Implements a check to detect if a player is attacking entities from an excessive distance.
 */
import * as mc from '@minecraft/server';

/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').CommandDependencies} CommandDependencies
 * @typedef {import('../../types.js').EventSpecificData} EventSpecificData
 */

/**
 * Checks if a player is attacking an entity from an excessive distance (Reach).
 * Calculates the distance between the player's eye location and the target entity's location,
 * then compares it against configured maximums based on game mode, with a buffer.
 *
 * @async
 * @param {mc.Player} player - The attacking player instance.
 * @param {PlayerAntiCheatData} pData - Player-specific anti-cheat data for the attacker.
 * @param {CommandDependencies} dependencies - Object containing necessary dependencies.
 * @param {EventSpecificData} eventSpecificData - Data specific to the event, expects `targetEntity` and `gameMode`.
 * @returns {Promise<void>}
 */
export async function checkReach(player, pData, dependencies, eventSpecificData) {
    const { config, playerUtils, actionManager } = dependencies; // Removed unused playerDataManager, logManager
    const targetEntity = eventSpecificData?.targetEntity;
    const gameMode = eventSpecificData?.gameMode; // Assumed to be mc.GameMode enum value

    if (!config.enableReachCheck) {
        return;
    }

    const watchedPrefix = pData?.isWatched ? player.nameTag : null;

    if (!player || !targetEntity || !player.location || !targetEntity.location || typeof player.getHeadLocation !== 'function' || typeof gameMode === 'undefined') {
        playerUtils.debugLog('[ReachCheck] Prerequisites (player, targetEntity, locations, getHeadLocation method, or gameMode) not met.', watchedPrefix, dependencies);
        return;
    }

    const eyeLocation = player.getHeadLocation();
    const distanceToTarget = eyeLocation.distance(targetEntity.location);

    if (pData?.isWatched) {
        playerUtils.debugLog(`[ReachCheck] ${player.nameTag} distance to ${targetEntity.typeId}: ${distanceToTarget.toFixed(2)}. Mode: ${mc.GameMode[gameMode]}.`, watchedPrefix, dependencies);
    }

    let maxReachDistBase;
    switch (gameMode) {
        case mc.GameMode.creative:
            maxReachDistBase = config.reachDistanceCreative ?? 6.0;
            break;
        case mc.GameMode.survival: // Fall-through
        case mc.GameMode.adventure:
            maxReachDistBase = config.reachDistanceSurvival ?? 4.5;
            break;
        default:
            playerUtils.debugLog(`[ReachCheck] Unsupported game mode '${mc.GameMode[gameMode]}' for player ${player.nameTag}.`, watchedPrefix, dependencies);
            return; // Do not check for spectator or unknown modes
    }

    const reachBuffer = config.reachBuffer ?? 0.5;
    const maxAllowedReach = maxReachDistBase + reachBuffer;

    if (pData?.isWatched) {
        playerUtils.debugLog(`[ReachCheck] ${player.nameTag}: BaseReach: ${maxReachDistBase.toFixed(2)}, Buffer: ${reachBuffer.toFixed(2)}, MaxAllowedReach: ${maxAllowedReach.toFixed(3)}, ActualDist: ${distanceToTarget.toFixed(3)}`, player.nameTag, dependencies);
    }

    if (distanceToTarget > maxAllowedReach) {
        const violationDetails = {
            distance: distanceToTarget.toFixed(2),
            maxAllowed: maxAllowedReach.toFixed(2),
            baseMax: maxReachDistBase.toFixed(2),
            buffer: reachBuffer.toFixed(2),
            targetEntityType: targetEntity.typeId,
            targetEntityName: targetEntity.nameTag || targetEntity.typeId.replace('minecraft:', ''),
            playerGameMode: String(gameMode), // Store the enum value as string for logging/details
        };
        // Standardized action profile key, should be sourced from config
        const actionProfileKey = config.reachCheckActionProfileName ?? 'combatReachAttack';
        await actionManager.executeCheckAction(player, actionProfileKey, violationDetails, dependencies);
    }
}
