/**
 * @file AntiCheatsBP/scripts/checks/combat/reachCheck.js
 * Implements a check to detect if a player is attacking entities from an excessive distance.
 * @version 1.1.0
 */
import * as mc from '@minecraft/server';
/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').CommandDependencies} CommandDependencies
 * @typedef {import('../../types.js').EventSpecificData} EventSpecificData
 */
/**
 * Checks if a player is attacking an entity from an excessive distance (Reach).
 * Calculates the distance between the player's eye location and the target entity's location.
 * @param {mc.Player} player - The attacking player instance.
 * @param {PlayerAntiCheatData} pData - Player-specific anti-cheat data for the attacker.
 * @param {CommandDependencies} dependencies - Object containing necessary dependencies like config, playerUtils, executeCheckAction, etc.
 * @param {EventSpecificData} eventSpecificData - Data specific to the event, expects `targetEntity` and `gameMode`.
 * @returns {Promise<void>}
 */
export async function checkReach(
    player,
    pData,
    dependencies,
    eventSpecificData
) {
    const { config, playerUtils, playerDataManager, logManager, actionManager } = dependencies;
    const targetEntity = eventSpecificData?.targetEntity;
    const gameMode = eventSpecificData?.gameMode;

    if (!config.enableReachCheck) {
        return;
    }

    const watchedPrefix = pData?.isWatched ? player.nameTag : null;

    if (!player || !targetEntity || !player.location || !targetEntity.location || typeof player.getHeadLocation !== 'function' || typeof gameMode === 'undefined') {
        playerUtils.debugLog("[ReachCheck] Prerequisites (player, targetEntity, locations, getHeadLocation method, or gameMode) not met.", watchedPrefix, dependencies);
        return;
    }

    const eyeLocation = player.getHeadLocation();
    const distanceToTarget = eyeLocation.distance(targetEntity.location);

    if (pData?.isWatched) {
        playerUtils.debugLog(`[ReachCheck] ${player.nameTag} distance to ${targetEntity.typeId}: ${distanceToTarget.toFixed(2)}. Mode: ${gameMode}.`, watchedPrefix, dependencies);
    }

    let maxReachDistBase;
    switch (gameMode) {
        case mc.GameMode.creative:
            maxReachDistBase = config.reachDistanceCreative ?? 6.0;
            break;
        case mc.GameMode.survival:
        case mc.GameMode.adventure:
            maxReachDistBase = config.reachDistanceSurvival ?? 4.5;
            break;
        default:
            playerUtils.debugLog(`[ReachCheck] Unsupported game mode "${gameMode}" for player ${player.nameTag}.`, watchedPrefix, dependencies);
            return;
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
            playerGameMode: String(gameMode)
        };
        await actionManager.executeCheckAction(player, "combatReachAttack", violationDetails, dependencies);
    }
}
