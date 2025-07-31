import * as mc from '@minecraft/server';

/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').Dependencies} Dependencies
 * @typedef {import('../../types.js').EventSpecificData} EventSpecificData
 */

/**
 * Checks if a player is attacking an entity from an excessive distance.
 * This check uses a raycast from the player's view to find the first entity.
 * If the attacked entity is not the first one in the line of sight, it could indicate a reach violation.
 * @param {import('@minecraft/server').Player} player The attacking player.
 * @param {PlayerAntiCheatData} pData The attacker's data.
 * @param {Dependencies} dependencies The command dependencies.
 * @param {EventSpecificData} eventSpecificData Event-specific data.
 */
export async function checkReach(player, pData, dependencies, eventSpecificData) {
    const { config, playerUtils } = dependencies;
    const targetEntity = eventSpecificData?.targetEntity;
    const gameMode = eventSpecificData?.gameMode;
    const playerName = player?.name ?? 'UnknownPlayer';

    if (!config?.enableReachCheck) return;

    const watchedPlayerName = pData?.isWatched ? playerName : null;

    if (!player?.isValid() || !targetEntity?.isValid() || typeof gameMode === 'undefined') {
        playerUtils?.debugLog(`[ReachCheck] Prerequisites for ${playerName} not met (player, targetEntity, or gameMode invalid/undefined).`, watchedPlayerName, dependencies);
        return;
    }

    let maxReachDistBase;
    switch (gameMode) {
        case mc.GameMode.creative:
            maxReachDistBase = config?.reachDistanceCreative ?? 6.0;
            break;
        case mc.GameMode.survival:
        case mc.GameMode.adventure:
            maxReachDistBase = config?.reachDistanceSurvival ?? 3.0;
            break;
        default:
            playerUtils?.debugLog(`[ReachCheck] Unsupported game mode '${mc.GameMode[gameMode]}' for player ${playerName}. Skipping reach check.`, watchedPlayerName, dependencies);
            return;
    }

    const reachBuffer = config?.reachBuffer ?? 0.5;
    const maxAllowedReach = maxReachDistBase + reachBuffer;

    const eyeLocation = player.getEyeLocation();
    const distanceToTarget = eyeLocation.distance(targetEntity.location);

    if (pData?.isWatched) {
        playerUtils?.debugLog(`[ReachCheck] ${playerName}: GameMode: ${mc.GameMode[gameMode]}, MaxAllowed: ${maxAllowedReach.toFixed(2)}, ActualDist: ${distanceToTarget.toFixed(2)}`, watchedPlayerName, dependencies);
    }

    // Perform two independent checks: one for pure distance, one for line-of-sight obstruction.
    const isDistanceViolation = distanceToTarget > maxAllowedReach;

    const viewEntities = player.getEntitiesFromViewDirection({ maxDistance: 10 });
    const firstEntity = viewEntities.length > 0 ? viewEntities[0].entity : null;
    const isLineOfSightViolation = !firstEntity || firstEntity.id !== targetEntity.id;

    if (pData?.isWatched) {
        playerUtils?.debugLog(`[ReachCheck] ${playerName}: DistOK: ${!isDistanceViolation}, LoSOK: ${!isLineOfSightViolation}. First entity in view: ${firstEntity?.typeId ?? 'None'}. Target: ${targetEntity.typeId}`, watchedPlayerName, dependencies);
    }

    // A violation occurs if the distance is too great OR if the line of sight is obstructed.
    if (isDistanceViolation || isLineOfSightViolation) {
        const violationReason = isDistanceViolation ? (isLineOfSightViolation ? 'Distance and Line-of-Sight' : 'Distance') : 'Line-of-Sight';

        const violationDetails = {
            reason: violationReason,
            distance: distanceToTarget.toFixed(3),
            maxAllowed: maxAllowedReach.toFixed(3),
            baseMax: maxReachDistBase.toFixed(2),
            buffer: reachBuffer.toFixed(2),
            targetEntityType: targetEntity.typeId,
            targetEntityName: targetEntity.nameTag || targetEntity.typeId.replace('minecraft:', ''),
            playerGameMode: mc.GameMode[gameMode] ?? String(gameMode),
            firstEntityInView: firstEntity ? `${firstEntity.typeId} (ID: ${firstEntity.id})` : 'None',
        };
        await dependencies.flagManager?.flag(player, 'reach', violationDetails, dependencies);
        playerUtils?.debugLog(`[ReachCheck] Flagged ${playerName} for reach. Reason: ${violationReason}. Distance: ${distanceToTarget.toFixed(3)}, Max: ${maxAllowedReach.toFixed(3)}.`, watchedPlayerName, dependencies);
    }
}
