import * as mc from '@minecraft/server';
import * as playerDataManager from '../../../core/playerDataManager.js';
import * as playerUtils from '../../../utils/playerUtils.js';
import * as config from '../../../config.js';

/**
 * @typedef {import('../../../core/playerDataManager.js').PlayerAntiCheatData} PlayerAntiCheatData
 */

/**
 * Checks for Multi-Target Killaura by analyzing recent hit patterns.
 * @param {mc.Player} player The attacking player.
 * @param {PlayerAntiCheatData} pData Player-specific anti-cheat data.
 * @param {mc.Entity} targetEntity The entity that was just hurt by the player.
 * @param {object} config The configuration object.
 */
export function checkMultiTarget(player, pData, targetEntity, config) {
    if (!config.ENABLE_MULTI_TARGET_CHECK) return;

    const watchedPrefix = pData.isWatched ? player.nameTag : null;
    const now = Date.now();

    // Ensure recentHits array is initialized
    if (!pData.recentHits) {
        pData.recentHits = [];
    }

    // Add current hit
    const newHit = {
        entityId: targetEntity.id,
        timestamp: now,
        // Storing location can be useful for debugging or future enhancements (e.g., proximity checks)
        // location: { x: targetEntity.location.x, y: targetEntity.location.y, z: targetEntity.location.z }
    };
    pData.recentHits.push(newHit);

    // Prune old hits from recentHits based on time window
    pData.recentHits = pData.recentHits.filter(hit => (now - hit.timestamp) <= config.MULTI_TARGET_WINDOW_MS);

    // Prune recentHits if it exceeds max history length
    if (pData.recentHits.length > config.MULTI_TARGET_MAX_HISTORY) {
        pData.recentHits = pData.recentHits.slice(pData.recentHits.length - config.MULTI_TARGET_MAX_HISTORY);
    }

    // Not enough hits in the window to perform a check
    if (pData.recentHits.length < config.MULTI_TARGET_THRESHOLD) {
        // if (pData.isWatched) {
        //     playerUtils.debugLog(`MultiTargetCheck: Not enough hits (${pData.recentHits.length}) in window for ${player.nameTag}.`, watchedPrefix);
        // }
        return;
    }

    // Analyze hits for distinct targets
    const distinctTargets = new Set();
    for (const hit of pData.recentHits) {
        distinctTargets.add(hit.entityId);
    }

    if (pData.isWatched) {
        playerUtils.debugLog(`MultiTargetCheck: Processing for ${player.nameTag}. HitsInWindow=${pData.recentHits.length}, DistinctTargets=${distinctTargets.size}`, watchedPrefix);
    }

    if (distinctTargets.size >= config.MULTI_TARGET_THRESHOLD) {
        playerDataManager.addFlag(
            player,
            "multiAura", // New flag type
            config.FLAG_REASON_MULTI_AURA,
            // config.FLAG_INCREMENT_MULTI_AURA, // Assuming addFlag handles increment or uses a default
            `Hit ${distinctTargets.size} unique targets in ${config.MULTI_TARGET_WINDOW_MS}ms.`
        );

        if (pData.isWatched) {
            playerUtils.debugLog(`Multi-Aura Flag: ${player.nameTag} hit ${distinctTargets.size} targets in ${config.MULTI_TARGET_WINDOW_MS}ms. RecentHits: ${JSON.stringify(pData.recentHits.map(h=>h.entityId))}`, watchedPrefix);
        }

        // Optionally clear recentHits after detection to prevent immediate re-flagging from the same set of hits.
        // This makes the check detect new sets of multi-target attacks rather than repeatedly flagging one burst.
        pData.recentHits = [];
    }
}
