/**
 * @file AntiCheatsBP/scripts/checks/combat/multiTargetCheck.js
 * Implements a check to detect Killaura-like behavior where a player rapidly hits multiple distinct targets.
 * @version 1.1.0
 */

/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').CommandDependencies} CommandDependencies
 * @typedef {import('../../types.js').EventSpecificData} EventSpecificData
 */

/**
 * Checks for Multi-Target Killaura by analyzing recent hit entity patterns.
 * It tracks entities hit by the player within a configured time window and flags
 * if the number of distinct entities exceeds a threshold.
 * @param {import('@minecraft/server').Player} player - The attacking player.
 * @param {PlayerAntiCheatData} pData - Player-specific anti-cheat data, containing `recentHits`.
 * @param {CommandDependencies} dependencies - Object containing necessary dependencies like config, playerUtils, executeCheckAction, etc.
 * @param {EventSpecificData} eventSpecificData - Data specific to the event, expects `targetEntity`.
 * @returns {Promise<void>}
 */
export async function checkMultiTarget(
    player,
    pData,
    dependencies,
    eventSpecificData
) {
    const { config, playerUtils, playerDataManager, logManager, actionManager, currentTick } = dependencies;
    const targetEntity = eventSpecificData?.targetEntity;

    if (!config.enableMultiTargetCheck || !pData) {
        return;
    }

    const watchedPrefix = pData.isWatched ? player.nameTag : null;
    const now = Date.now(); // Time-sensitive check

    if (!targetEntity || typeof targetEntity.id === 'undefined') {
        playerUtils.debugLog?.(`MultiTargetCheck: Invalid targetEntity or targetEntity.id for ${player.nameTag}.`, watchedPrefix);
        return;
    }

    pData.recentHits = pData.recentHits || [];

    const newHit = {
        entityId: String(targetEntity.id),
        timestamp: now,
    };
    pData.recentHits.push(newHit);
    pData.isDirtyForSave = true;

    const windowMs = config.multiTargetWindowMs ?? 1000;
    const maxHistory = config.multiTargetMaxHistory ?? 20;

    const originalCountBeforeTimeFilter = pData.recentHits.length;
    pData.recentHits = pData.recentHits.filter(hit => (now - hit.timestamp) <= windowMs);
    if (pData.recentHits.length !== originalCountBeforeTimeFilter) {
        pData.isDirtyForSave = true;
    }

    if (pData.recentHits.length > maxHistory) {
        pData.recentHits = pData.recentHits.slice(pData.recentHits.length - maxHistory);
        pData.isDirtyForSave = true;
    }

    const threshold = config.multiTargetThreshold ?? 3;

    if (pData.recentHits.length < threshold) {
        return;
    }

    const distinctTargets = new Set();
    for (const hit of pData.recentHits) {
        distinctTargets.add(hit.entityId);
    }

    playerUtils.debugLog?.(\`MultiTargetCheck: Processing for \${player.nameTag}. HitsInWindow=\${pData.recentHits.length}, DistinctTargets=\${distinctTargets.size}\`, watchedPrefix);

    if (distinctTargets.size >= threshold) {
        const violationDetails = {
            targetsHit: distinctTargets.size.toString(),
            windowSeconds: (windowMs / 1000).toFixed(1),
            threshold: threshold.toString(),
            targetIdsSample: Array.from(distinctTargets).slice(0, 5).join(', ')
        };

        await actionManager.executeCheckAction(player, "combatMultitargetAura", violationDetails, dependencies);

        playerUtils.debugLog?.(\`Multi-Aura Flag: \${player.nameTag} hit \${distinctTargets.size} targets in \${windowMs}ms. RecentHits IDs: \${JSON.stringify(pData.recentHits.map(h => h.entityId))}\`, watchedPrefix);

        pData.recentHits = [];
        pData.isDirtyForSave = true;
    }
}
