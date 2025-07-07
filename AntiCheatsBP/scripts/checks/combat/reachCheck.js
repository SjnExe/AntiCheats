/**
 * @file Implements a check to detect if a player is attacking entities from an excessive distance.
 */
import * as mc from '@minecraft/server';

/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').Dependencies} Dependencies
 * @typedef {import('../../types.js').EventSpecificData} EventSpecificData
 */

// Constants for magic numbers
const PLAYER_HITBOX_ADJUSTMENT = 0.4;
const DEFAULT_ENTITY_HITBOX_ADJUSTMENT = 0.5;
const LOGGING_DECIMAL_PLACES = 3; // Used for .toFixed() in logs and violation details
const DEFAULT_CREATIVE_REACH = 6.0;
const DEFAULT_SURVIVAL_REACH = 3.0;
const DEFAULT_REACH_BUFFER = 0.5;
const VIOLATION_DETAIL_DECIMAL_PLACES = 2;

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

    const approximateHitboxAdjustment = targetEntity.typeId === 'minecraft:player' ? PLAYER_HITBOX_ADJUSTMENT : DEFAULT_ENTITY_HITBOX_ADJUSTMENT;
    distanceToTargetOrigin = Math.max(0, distanceToTargetOrigin - approximateHitboxAdjustment); // 0 is fine


    if (pData?.isWatched) {
        playerUtils?.debugLog(`[ReachCheck] ${playerName} distance to ${targetEntity.typeId} origin (adjusted): ${distanceToTargetOrigin.toFixed(LOGGING_DECIMAL_PLACES)}. Mode: ${mc.GameMode[gameMode]}. Eye: ${eyeLocation.x.toFixed(1)},${eyeLocation.y.toFixed(1)},${eyeLocation.z.toFixed(1)}. TargetLoc: ${targetEntity.location.x.toFixed(1)},${targetEntity.location.y.toFixed(1)},${targetEntity.location.z.toFixed(1)}`, watchedPlayerName, dependencies);
    }

    let maxReachDistBase;
    switch (gameMode) {
        case mc.GameMode.creative:
            maxReachDistBase = config?.reachDistanceCreative ?? DEFAULT_CREATIVE_REACH;
            break;
        case mc.GameMode.survival:
        case mc.GameMode.adventure:
            maxReachDistBase = config?.reachDistanceSurvival ?? DEFAULT_SURVIVAL_REACH;
            break;
        default:
            playerUtils?.debugLog(`[ReachCheck] Unsupported game mode '${mc.GameMode[gameMode]}' for player ${playerName}. Skipping reach check.`, watchedPlayerName, dependencies);
            return;
    }

    const reachBuffer = config?.reachBuffer ?? DEFAULT_REACH_BUFFER;
    const maxAllowedReach = maxReachDistBase + reachBuffer;

    if (pData?.isWatched) {
        playerUtils?.debugLog(`[ReachCheck] ${playerName}: BaseReach: ${maxReachDistBase.toFixed(2)}, Buffer: ${reachBuffer.toFixed(2)}, MaxAllowedReach: ${maxAllowedReach.toFixed(LOGGING_DECIMAL_PLACES)}, ActualAdjustedDist: ${distanceToTargetOrigin.toFixed(LOGGING_DECIMAL_PLACES)}`, watchedPlayerName, dependencies);
    }

    if (distanceToTargetOrigin > maxAllowedReach) {
        const violationDetails = {
            distance: distanceToTargetOrigin.toFixed(LOGGING_DECIMAL_PLACES),
            maxAllowed: maxAllowedReach.toFixed(LOGGING_DECIMAL_PLACES),
            baseMax: maxReachDistBase.toFixed(VIOLATION_DETAIL_DECIMAL_PLACES),
            buffer: reachBuffer.toFixed(VIOLATION_DETAIL_DECIMAL_PLACES),
            targetEntityType: targetEntity.typeId,
            targetEntityName: targetEntity.nameTag || targetEntity.typeId.replace('minecraft:', ''),
            playerGameMode: mc.GameMode[gameMode] ?? String(gameMode),
        };
        const rawActionProfileKey = config?.reachCheckActionProfileName ?? 'combatReachAttack';
        const actionProfileKey = rawActionProfileKey
            .replace(/([-_][a-z0-9])/ig, ($1) => $1.toUpperCase().replace('-', '').replace('_', ''))
            .replace(/^[A-Z]/, (match) => match.toLowerCase());

        await actionManager?.executeCheckAction(player, actionProfileKey, violationDetails, dependencies);
        playerUtils?.debugLog(`[ReachCheck] Flagged ${playerName} for reach. Distance: ${distanceToTargetOrigin.toFixed(LOGGING_DECIMAL_PLACES)}, Max: ${maxAllowedReach.toFixed(LOGGING_DECIMAL_PLACES)}`, watchedPlayerName, dependencies);
    }
}
