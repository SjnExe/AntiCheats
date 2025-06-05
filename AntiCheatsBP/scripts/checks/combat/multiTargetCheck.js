import * as mc from '@minecraft/server';
import * as playerDataManager from '../../core/playerDataManager.js';
import * as playerUtils from '../../utils/playerUtils.js';
import * as config from '../../config.js';

/**
 * @typedef {import('../../core/playerDataManager.js').PlayerAntiCheatData} PlayerAntiCheatData
 */

/**
 * Checks for Multi-Target Killaura by analyzing recent hit patterns.
 * @param {mc.Player} player The attacking player.
 * @param {PlayerAntiCheatData} pData Player-specific anti-cheat data.
 * @param {mc.Entity} targetEntity The entity that was just hurt by the player.
 * @param {object} config The configuration object.
 */
export function checkMultiTarget(player, pData, targetEntity, config) {
    if (!config.enableMultiTargetCheck) return; // Renamed

    const watchedPrefix = pData.isWatched ? player.nameTag : null;
    const now = Date.now();

    if (!pData.recentHits) {
        pData.recentHits = [];
    }

    const newHit = {
        entityId: targetEntity.id,
        timestamp: now,
    };
    pData.recentHits.push(newHit);

    pData.recentHits = pData.recentHits.filter(hit => (now - hit.timestamp) <= config.multiTargetWindowMs); // Renamed

    if (pData.recentHits.length > config.multiTargetMaxHistory) { // Renamed
        pData.recentHits = pData.recentHits.slice(pData.recentHits.length - config.multiTargetMaxHistory); // Renamed
    }

    if (pData.recentHits.length < config.multiTargetThreshold) { // Renamed
        return;
    }

    const distinctTargets = new Set();
    for (const hit of pData.recentHits) {
        distinctTargets.add(hit.entityId);
    }

    if (pData.isWatched) {
        playerUtils.debugLog(`MultiTargetCheck: Processing for ${player.nameTag}. HitsInWindow=${pData.recentHits.length}, DistinctTargets=${distinctTargets.size}`, watchedPrefix);
    }

    if (distinctTargets.size >= config.multiTargetThreshold) { // Renamed
        playerDataManager.addFlag(
            player,
            "multiAura",
            config.flagReasonMultiAura, // Renamed
            `Hit ${distinctTargets.size} unique targets in ${config.multiTargetWindowMs}ms.` // Renamed
        );

        if (pData.isWatched) {
            playerUtils.debugLog(`Multi-Aura Flag: ${player.nameTag} hit ${distinctTargets.size} targets in ${config.multiTargetWindowMs}ms. RecentHits: ${JSON.stringify(pData.recentHits.map(h=>h.entityId))}`, watchedPrefix); // Renamed
        }

        pData.recentHits = [];
    }
}
