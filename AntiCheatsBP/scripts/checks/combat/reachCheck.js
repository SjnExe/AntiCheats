/**
 * @file Detects if a player is attacking entities from an excessive distance.
 * @module AntiCheatsBP/scripts/checks/combat/reachCheck
 */
import * as mc from '@minecraft/server';

/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').Dependencies} Dependencies
 * @typedef {import('../../types.js').EventSpecificData} EventSpecificData
 */

// Constants for magic numbers
const playerHitboxAdjustment = 0.4;
const defaultEntityHitboxAdjustment = 0.5;
const loggingDecimalPlaces = 3;
const defaultCreativeReach = 6.0;
const defaultSurvivalReach = 3.0;
const defaultReachBuffer = 0.5;
const violationDetailDecimalPlaces = 2;

/**
 * Checks if a player is attacking an entity from an excessive distance.
 * @param {import('@minecraft/server').Player} player The attacking player.
 * @param {PlayerAntiCheatData} pData The attacker's data.
 * @param {Dependencies} dependencies The command dependencies.
 * @param {EventSpecificData} eventSpecificData Event-specific data.
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

    const approximateHitboxAdjustment = targetEntity.typeId === 'minecraft:player' ? playerHitboxAdjustment : defaultEntityHitboxAdjustment;
    distanceToTargetOrigin = Math.max(0, distanceToTargetOrigin - approximateHitboxAdjustment); // 0 is fine


    if (pData?.isWatched) {
        playerUtils?.debugLog(`[ReachCheck] ${playerName} distance to ${targetEntity.typeId} origin (adjusted): ${distanceToTargetOrigin.toFixed(loggingDecimalPlaces)}. Mode: ${mc.GameMode[gameMode]}. Eye: ${eyeLocation.x.toFixed(1)},${eyeLocation.y.toFixed(1)},${eyeLocation.z.toFixed(1)}. TargetLoc: ${targetEntity.location.x.toFixed(1)},${targetEntity.location.y.toFixed(1)},${targetEntity.location.z.toFixed(1)}`, watchedPlayerName, dependencies);
    }

    let maxReachDistBase;
    switch (gameMode) {
        case mc.GameMode.creative:
            maxReachDistBase = config?.reachDistanceCreative ?? defaultCreativeReach;
            break;
        case mc.GameMode.survival:
        case mc.GameMode.adventure:
            maxReachDistBase = config?.reachDistanceSurvival ?? defaultSurvivalReach;
            break;
        default:
            playerUtils?.debugLog(`[ReachCheck] Unsupported game mode '${mc.GameMode[gameMode]}' for player ${playerName}. Skipping reach check.`, watchedPlayerName, dependencies);
            return;
    }

    const reachBuffer = config?.reachBuffer ?? defaultReachBuffer;
    const maxAllowedReach = maxReachDistBase + reachBuffer;

    if (pData?.isWatched) {
        playerUtils?.debugLog(`[ReachCheck] ${playerName}: BaseReach: ${maxReachDistBase.toFixed(2)}, Buffer: ${reachBuffer.toFixed(2)}, MaxAllowedReach: ${maxAllowedReach.toFixed(loggingDecimalPlaces)}, ActualAdjustedDist: ${distanceToTargetOrigin.toFixed(loggingDecimalPlaces)}`, watchedPlayerName, dependencies);
    }

    if (distanceToTargetOrigin > maxAllowedReach) {
        const violationDetails = {
            distance: distanceToTargetOrigin.toFixed(loggingDecimalPlaces),
            maxAllowed: maxAllowedReach.toFixed(loggingDecimalPlaces),
            baseMax: maxReachDistBase.toFixed(violationDetailDecimalPlaces),
            buffer: reachBuffer.toFixed(violationDetailDecimalPlaces),
            targetEntityType: targetEntity.typeId,
            targetEntityName: targetEntity.nameTag || targetEntity.typeId.replace('minecraft:', ''),
            playerGameMode: mc.GameMode[gameMode] ?? String(gameMode),
        };
        const actionProfileKey = config?.reachCheckActionProfileName ?? 'combatReachAttack';

        await actionManager?.executeCheckAction(player, actionProfileKey, violationDetails, dependencies);
        playerUtils?.debugLog(`[ReachCheck] Flagged ${playerName} for reach. Distance: ${distanceToTargetOrigin.toFixed(loggingDecimalPlaces)}, Max: ${maxAllowedReach.toFixed(loggingDecimalPlaces)}`, watchedPlayerName, dependencies);
    }
}
