import * as mc from '@minecraft/server';
// Removed direct imports for playerDataManager, playerUtils, config

/**
 * @typedef {import('../../core/playerDataManager.js').PlayerAntiCheatData} PlayerAntiCheatData
 */

/**
 * Checks for Multi-Target Killaura by analyzing recent hit patterns.
 * @param {mc.Player} player The attacking player.
 * @param {PlayerAntiCheatData} pData Player-specific anti-cheat data.
 * @param {mc.Entity} targetEntity The entity that was just hurt by the player.
 * @param {object} config The configuration object.
 * @param {object} playerUtils Utility functions for players.
 * @param {object} playerDataManager Manager for player data.
 * @param {object} logManager Manager for logging.
 * @param {function} executeCheckAction Function to execute defined actions for a check.
 */
export async function checkMultiTarget(player, pData, targetEntity, config, playerUtils, playerDataManager, logManager, executeCheckAction) {
    if (!config.enableMultiTargetCheck) return;

    const watchedPrefix = pData.isWatched ? player.nameTag : null;
    const now = Date.now();

    if (!pData.recentHits) {
        pData.recentHits = [];
    }

    // Ensure targetEntity and its id are valid before proceeding
    if (!targetEntity || typeof targetEntity.id === 'undefined') {
        if (playerUtils.debugLog && watchedPrefix) {
            playerUtils.debugLog(`MultiTargetCheck: Invalid targetEntity or targetEntity.id for ${player.nameTag}.`, watchedPrefix);
        }
        return; // Cannot process this hit without a valid target ID
    }

    const newHit = {
        entityId: targetEntity.id, // Use targetEntity.id directly
        timestamp: now,
    };
    pData.recentHits.push(newHit);

    // Filter hits to the current window
    pData.recentHits = pData.recentHits.filter(hit => (now - hit.timestamp) <= config.multiTargetWindowMs);

    // Trim history if it exceeds max size
    if (pData.recentHits.length > config.multiTargetMaxHistory) {
        pData.recentHits = pData.recentHits.slice(pData.recentHits.length - config.multiTargetMaxHistory);
    }

    // Not enough hits yet to trigger a check
    if (pData.recentHits.length < config.multiTargetThreshold) {
        return;
    }

    const distinctTargets = new Set();
    for (const hit of pData.recentHits) {
        distinctTargets.add(hit.entityId);
    }

    if (pData.isWatched && playerUtils.debugLog) {
        playerUtils.debugLog(`MultiTargetCheck: Processing for ${player.nameTag}. HitsInWindow=${pData.recentHits.length}, DistinctTargets=${distinctTargets.size}`, watchedPrefix);
    }

    if (distinctTargets.size >= config.multiTargetThreshold) {
        const violationDetails = {
            targetsHit: distinctTargets.size,
            windowSeconds: (config.multiTargetWindowMs / 1000).toFixed(1),
            threshold: config.multiTargetThreshold,
            // Example: include IDs of distinct targets for logging, truncated if too many
            targetIdsSample: Array.from(distinctTargets).slice(0, 5).join(', ')
        };
        const dependencies = { config, playerDataManager, playerUtils, logManager };
        await executeCheckAction(player, "combat_multitarget_aura", violationDetails, dependencies);

        if (pData.isWatched && playerUtils.debugLog) {
            playerUtils.debugLog(`Multi-Aura Flag: ${player.nameTag} hit ${distinctTargets.size} targets in ${config.multiTargetWindowMs}ms. RecentHits: ${JSON.stringify(pData.recentHits.map(h=>h.entityId))}`, watchedPrefix);
        }

        // Clear recent hits after flagging to prevent immediate re-flagging on the same set of hits
        pData.recentHits = [];
    }
}
