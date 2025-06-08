/**
 * @file AntiCheatsBP/scripts/checks/combat/multiTargetCheck.js
 * Implements a check to detect Killaura-like behavior where a player rapidly hits multiple distinct targets.
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
 * Checks for Multi-Target Killaura by analyzing recent hit entity patterns.
 * It tracks entities hit by the player within a configured time window and flags
 * if the number of distinct entities exceeds a threshold.
 * @param {mc.Player} player - The attacking player.
 * @param {PlayerAntiCheatData} pData - Player-specific anti-cheat data, containing `recentHits`.
 * @param {mc.Entity} targetEntity - The entity that was just hurt by the player.
 * @param {Config} config - The server configuration object, with settings like `enableMultiTargetCheck`,
 *                          `multiTargetWindowMs`, `multiTargetMaxHistory`, `multiTargetThreshold`.
 * @param {PlayerUtils} playerUtils - Utility functions for player interactions.
 * @param {PlayerDataManager} playerDataManager - Manager for player data.
 * @param {LogManager} logManager - Manager for logging.
 * @param {ExecuteCheckAction} executeCheckAction - Function to execute defined actions for a check.
 * @param {number} currentTick - The current game tick (not directly used in this check's core logic but available).
 * @returns {Promise<void>}
 */
export async function checkMultiTarget(
    player,
    pData,
    targetEntity,
    config,
    playerUtils,
    playerDataManager,
    logManager,
    executeCheckAction,
    currentTick // Not directly used by this check's logic itself
) {
    if (!config.enableMultiTargetCheck || !pData) { // Added null check for pData
        return;
    }

    const watchedPrefix = pData.isWatched ? player.nameTag : null;
    const now = Date.now();

    // Ensure targetEntity and its id are valid before proceeding.
    // targetEntity.id can be a number (e.g., for players on some Bedrock versions) or string.
    // We need a consistent identifier. Entity.id is typically a string in newer @minecraft/server.
    if (!targetEntity || typeof targetEntity.id === 'undefined') {
        playerUtils.debugLog?.(`MultiTargetCheck: Invalid targetEntity or targetEntity.id for ${player.nameTag}.`, watchedPrefix);
        return;
    }

    pData.recentHits = pData.recentHits || [];

    const newHit = {
        entityId: String(targetEntity.id), // Ensure entityId is stored as a string for consistent Set behavior
        timestamp: now,
    };
    pData.recentHits.push(newHit);
    pData.isDirtyForSave = true;

    const windowMs = config.multiTargetWindowMs ?? 1000;
    const maxHistory = config.multiTargetMaxHistory ?? 20;

    // Filter hits to the current window first
    const originalCountBeforeTimeFilter = pData.recentHits.length;
    pData.recentHits = pData.recentHits.filter(hit => (now - hit.timestamp) <= windowMs);
    if (pData.recentHits.length !== originalCountBeforeTimeFilter) {
        pData.isDirtyForSave = true;
    }

    // Then, trim history if it still exceeds max size after time filtering
    if (pData.recentHits.length > maxHistory) {
        pData.recentHits = pData.recentHits.slice(pData.recentHits.length - maxHistory);
        pData.isDirtyForSave = true;
    }

    const threshold = config.multiTargetThreshold ?? 3;

    // Not enough hits yet to trigger a check (after filtering)
    if (pData.recentHits.length < threshold) {
        return;
    }

    const distinctTargets = new Set();
    for (const hit of pData.recentHits) {
        distinctTargets.add(hit.entityId);
    }

    playerUtils.debugLog?.(`MultiTargetCheck: Processing for ${player.nameTag}. HitsInWindow=${pData.recentHits.length}, DistinctTargets=${distinctTargets.size}`, watchedPrefix);

    if (distinctTargets.size >= threshold) {
        const violationDetails = {
            targetsHit: distinctTargets.size.toString(),
            windowSeconds: (windowMs / 1000).toFixed(1),
            threshold: threshold.toString(),
            targetIdsSample: Array.from(distinctTargets).slice(0, 5).join(', ') // Sample of involved entity IDs
        };
        const dependencies = { config, playerDataManager, playerUtils, logManager };
        await executeCheckAction(player, "combat_multitarget_aura", violationDetails, dependencies);

        playerUtils.debugLog?.(`Multi-Aura Flag: ${player.nameTag} hit ${distinctTargets.size} targets in ${windowMs}ms. RecentHits IDs: ${JSON.stringify(pData.recentHits.map(h => h.entityId))}`, watchedPrefix);

        // Clear recent hits after flagging to prevent immediate re-flagging on the exact same set of hits.
        // This acts as a sort of local cooldown for this specific detection pattern.
        pData.recentHits = [];
        pData.isDirtyForSave = true;
    }
}
