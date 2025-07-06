/**
 * @file Implements a check to detect if a player is attacking entities from an excessive distance.
 */
import * as mc from '@minecraft/server';

/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').Dependencies} Dependencies
 * @typedef {import('../../types.js').EventSpecificData} EventSpecificData
 */

/**
 * Checks if a player is attacking an entity from an excessive distance (Reach).
 * Calculates the distance between the player's eye location and the target entity's bounding box,
 * then compares it against configured maximums based on game mode, with a buffer.
 *
 * @async
 * @param {import('@minecraft/server').Player} player - The attacking player instance.
 * @param {PlayerAntiCheatData} pData - Player-specific anti-cheat data for the attacker.
 * @param {Dependencies} dependencies - Object containing necessary dependencies.
 * @param {EventSpecificData} eventSpecificData - Data specific to the event, expects `targetEntity` and `gameMode`.
 * @returns {Promise<void>}
 */
export async function checkReach(player, pData, dependencies, eventSpecificData) {
    const { config, playerUtils, actionManager } = dependencies;
    const targetEntity = eventSpecificData?.targetEntity;
    const gameMode = eventSpecificData?.gameMode;
    const playerName = player?.nameTag ?? 'UnknownPlayer';

    if (!config?.enableReachCheck) {
        return;
    }

    const watchedPlayerName = pData?.isWatched ? playerName : null;

    if (!player?.isValid() || !targetEntity?.isValid() || !player.location || !targetEntity.location || typeof player.getHeadLocation !== 'function' || typeof gameMode === 'undefined') {
        playerUtils?.debugLog(`[ReachCheck] Prerequisites for ${playerName} not met (player, targetEntity, locations, getHeadLocation method, or gameMode invalid/undefined).`, watchedPlayerName, dependencies);
        return;
    }

    const eyeLocation = player.getHeadLocation();

    const vectorToTarget = mc.Vector.subtract(targetEntity.location, eyeLocation);
    let distanceToTargetOrigin = vectorToTarget.length();

    const approximateHitboxAdjustment = targetEntity.typeId === 'minecraft:player' ? 0.4 : 0.5;
    distanceToTargetOrigin = Math.max(0, distanceToTargetOrigin - approximateHitboxAdjustment);


    if (pData?.isWatched) {
        playerUtils?.debugLog(`[ReachCheck] ${playerName} distance to ${targetEntity.typeId} origin (adjusted): ${distanceToTargetOrigin.toFixed(3)}. Mode: ${mc.GameMode[gameMode]}. Eye: ${eyeLocation.x.toFixed(1)},${eyeLocation.y.toFixed(1)},${eyeLocation.z.toFixed(1)}. TargetLoc: ${targetEntity.location.x.toFixed(1)},${targetEntity.location.y.toFixed(1)},${targetEntity.location.z.toFixed(1)}`, watchedPlayerName, dependencies);
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

    if (pData?.isWatched) {
        playerUtils?.debugLog(`[ReachCheck] ${playerName}: BaseReach: ${maxReachDistBase.toFixed(2)}, Buffer: ${reachBuffer.toFixed(2)}, MaxAllowedReach: ${maxAllowedReach.toFixed(3)}, ActualAdjustedDist: ${distanceToTargetOrigin.toFixed(3)}`, watchedPlayerName, dependencies);
    }

    if (distanceToTargetOrigin > maxAllowedReach) {
        const violationDetails = {
            distance: distanceToTargetOrigin.toFixed(3),
            maxAllowed: maxAllowedReach.toFixed(3),
            baseMax: maxReachDistBase.toFixed(2),
            buffer: reachBuffer.toFixed(2),
            targetEntityType: targetEntity.typeId,
            targetEntityName: targetEntity.nameTag || targetEntity.typeId.replace('minecraft:', ''),
            playerGameMode: mc.GameMode[gameMode] ?? String(gameMode),
        };
        const rawActionProfileKey = config?.reachCheckActionProfileName ?? 'combatReachAttack';
        const actionProfileKey = rawActionProfileKey
            .replace(/([-_][a-z0-9])/ig, ($1) => $1.toUpperCase().replace('-', '').replace('_', ''))
            .replace(/^[A-Z]/, (match) => match.toLowerCase());

        await actionManager?.executeCheckAction(player, actionProfileKey, violationDetails, dependencies);
        playerUtils?.debugLog(`[ReachCheck] Flagged ${playerName} for reach. Distance: ${distanceToTargetOrigin.toFixed(3)}, Max: ${maxAllowedReach.toFixed(3)}`, watchedPlayerName, dependencies);
    }
}
