/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').Dependencies} Dependencies
 * @typedef {import('../../types.js').EventSpecificData} EventSpecificData
 */

// Constants for magic numbers
const defaultMultiTargetMaxHistory = 20;
const defaultMultiTargetThreshold = 3;
const distinctTargetsSampleLimitMulti = 5;

/**
 * Checks for Multi-Target Killaura by analyzing recent hit entity patterns.
 * @param {import('@minecraft/server').Player} player The attacking player.
 * @param {PlayerAntiCheatData} pData The player's data.
 * @param {Dependencies} dependencies The command dependencies.
 * @param {EventSpecificData} eventSpecificData Event-specific data.
 */
export async function checkMultiTarget(player, pData, dependencies, eventSpecificData) {
    const { config, playerUtils, actionManager } = dependencies;
    const targetEntity = eventSpecificData?.targetEntity;
    const playerName = player?.name ?? 'UnknownPlayer';

    if (!config?.enableMultiTargetCheck) {
        return;
    }
    if (!pData) {
        playerUtils?.debugLog(`[MultiTargetCheck] Skipping for ${playerName}: pData is null.`, playerName, dependencies);
        return;
    }


    const watchedPlayerName = pData.isWatched ? playerName : null;
    const now = Date.now();

    if (!targetEntity || typeof targetEntity.id === 'undefined' || !targetEntity.isValid()) {
        playerUtils?.debugLog(`[MultiTargetCheck] Invalid or undefined targetEntity for ${playerName}.`, watchedPlayerName, dependencies);
        return;
    }

    pData.recentHits ??= [];

    const newHit = {
        entityId: targetEntity.id,
        timestamp: now,
        entityType: targetEntity.typeId,
    };
    pData.recentHits.push(newHit);
    pData.isDirtyForSave = true;

    const windowMs = config?.multiTargetWindowMs ?? 1000; // 1000 is fine (in ignore list)
    const maxHistory = config?.multiTargetMaxHistory ?? defaultMultiTargetMaxHistory;

    const originalCountBeforeTimeFilter = pData.recentHits.length;
    pData.recentHits = pData.recentHits.filter(hit => (now - hit.timestamp) <= windowMs);
    if (pData.recentHits.length !== originalCountBeforeTimeFilter) {
        pData.isDirtyForSave = true;
    }

    if (pData.recentHits.length > maxHistory) {
        pData.recentHits = pData.recentHits.slice(pData.recentHits.length - maxHistory);
        pData.isDirtyForSave = true;
    }

    const threshold = config?.multiTargetThreshold ?? defaultMultiTargetThreshold;

    if (pData.recentHits.length < threshold) {
        return;
    }

    const distinctTargets = new Set();
    for (const hit of pData.recentHits) {
        distinctTargets.add(hit.entityId);
    }

    if (pData.isWatched) {
        playerUtils?.debugLog(`[MultiTargetCheck] Processing for ${playerName}. HitsInWindow=${pData.recentHits.length}, DistinctTargets=${distinctTargets.size}, Threshold=${threshold}`, watchedPlayerName, dependencies);
    }

    if (distinctTargets.size >= threshold) {
        const violationDetails = {
            targetsHit: distinctTargets.size.toString(),
            windowSeconds: (windowMs / 1000).toFixed(1), // 1000 is fine
            threshold: threshold.toString(),
            targetIdsSample: Array.from(distinctTargets).slice(0, distinctTargetsSampleLimitMulti).join(', '),
        };
        const actionProfileKey = config?.multiTargetActionProfileName ?? 'combatMultiTargetAura';

        await actionManager?.executeCheckAction(player, actionProfileKey, violationDetails, dependencies);

        playerUtils?.debugLog(`[MultiTargetCheck] Multi-Aura Flag: ${playerName} hit ${distinctTargets.size} distinct targets in ${windowMs}ms. RecentHits IDs: ${JSON.stringify(pData.recentHits.map(h => h.entityId))}`, watchedPlayerName, dependencies);

        // Clear the recent hits for the player to reset the check for the next window.
        pData.recentHits = [];
        pData.isDirtyForSave = true;
    }
}
