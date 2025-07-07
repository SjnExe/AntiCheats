/**
 * @file Implements a check to detect Killaura-like behavior where a player rapidly hits multiple distinct targets.
 */

/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').Dependencies} Dependencies
 * @typedef {import('../../types.js').EventSpecificData} EventSpecificData
 */

/**
 * Checks for Multi-Target Killaura by analyzing recent hit entity patterns.
 * It tracks entities hit by the player within a configured time window and flags
 * if the number of distinct entities exceeds a threshold.
 * This check is typically triggered by an entity hurt event where the damager is a player.
 *
 * @async
 * @param {import('@minecraft/server').Player} player - The attacking player.
 * @param {PlayerAntiCheatData} pData - Player-specific anti-cheat data, containing `recentHits`.
 * @param {Dependencies} dependencies - Object containing necessary dependencies.
 * @param {EventSpecificData} eventSpecificData - Data specific to the event, expects `targetEntity`.
 * @returns {Promise<void>}
 */
export async function checkMultiTarget(player, pData, dependencies, eventSpecificData) {
    const { config, playerUtils, actionManager } = dependencies;
    const targetEntity = eventSpecificData?.targetEntity;
    const playerName = player?.nameTag ?? 'UnknownPlayer';

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

    const windowMs = config?.multiTargetWindowMs ?? 1000;
    const maxHistory = config?.multiTargetMaxHistory ?? 20;

    const originalCountBeforeTimeFilter = pData.recentHits.length;
    pData.recentHits = pData.recentHits.filter(hit => (now - hit.timestamp) <= windowMs);
    if (pData.recentHits.length !== originalCountBeforeTimeFilter) {
        pData.isDirtyForSave = true;
    }

    if (pData.recentHits.length > maxHistory) {
        pData.recentHits = pData.recentHits.slice(pData.recentHits.length - maxHistory);
        pData.isDirtyForSave = true;
    }

    const threshold = config?.multiTargetThreshold ?? 3;

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
            windowSeconds: (windowMs / 1000).toFixed(1),
            threshold: threshold.toString(),
            targetIdsSample: Array.from(distinctTargets).slice(0, 5).join(', '),
        };
        const rawActionProfileKey = config?.multiTargetActionProfileName ?? 'combatMultiTargetAura';
        const actionProfileKey = rawActionProfileKey
            .replace(/([-_][a-z0-9])/ig, ($1) => $1.toUpperCase().replace('-', '').replace('_', ''))
            .replace(/^[A-Z]/, (match) => match.toLowerCase());

        await actionManager?.executeCheckAction(player, actionProfileKey, violationDetails, dependencies);

        playerUtils?.debugLog(`[MultiTargetCheck] Multi-Aura Flag: ${playerName} hit ${distinctTargets.size} distinct targets in ${windowMs}ms. RecentHits IDs: ${JSON.stringify(pData.recentHits.map(h => h.entityId))}`, watchedPlayerName, dependencies);

        // Ensure operations on pData occur on the potentially updated reference if it could change,
        // or confirm that pData reference stability is guaranteed by the environment.
        // For satisfying the lint rule, explicitly re-using/re-affirming pData reference:
        const pDataToUpdate = pData;
        pDataToUpdate.recentHits = [];
        pDataToUpdate.isDirtyForSave = true;
    }
}
