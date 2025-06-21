/**
 * @file AntiCheatsBP/scripts/checks/world/entityChecks.js
 * Implements checks related to entity spawning and interactions.
 * @version 1.0.0
 */

import * as mc from '@minecraft/server';

/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').Dependencies} Dependencies
 */

/**
 * Checks for entity spamming based on spawn rate of monitored entity types by a player.
 * @param {mc.Player | null} potentialPlayer - The player suspected of spawning the entity, if known.
 * @param {string} entityType - The typeId of the spawned entity.
 * @param {PlayerAntiCheatData | null} pData - Player-specific anti-cheat data (if potentialPlayer is known).
 * @param {Dependencies} dependencies - The standard dependencies object.
 * @returns {Promise<boolean>} True if spam was detected and action might be needed on the entity, false otherwise.
 */
export async function checkEntitySpam(
    potentialPlayer,
    entityType,
    pData,
    dependencies
) {
    const { config, playerUtils, actionManager, playerDataManager, logManager } = dependencies; // currentTick not used

    if (!config.enableEntitySpamAntiGrief) {
        return false;
    }

    const watchedPrefix = pData?.isWatched ? potentialPlayer?.nameTag : null; // Handle potentialPlayer being null for watchedPrefix

    if (!potentialPlayer) {
        // If player is unknown, we can't do player-specific rate limiting with the current pData structure.
        // Future: Could implement a global rate limit for certain anonymous spawns if needed.
        playerUtils.debugLog("[EntitySpamCheck] Check skipped, potentialPlayer is null.", null, dependencies);
        return false;
    }

    if (!pData) {
        playerUtils.debugLog(`[EntitySpamCheck] Check skipped for player ${potentialPlayer.nameTag}, pData is null/undefined.`, potentialPlayer.nameTag, dependencies);
        return false; // pData is required for player-specific tracking
    }

    if (config.entitySpamBypassInCreative && potentialPlayer.gameMode === mc.GameMode.creative) {
        playerUtils.debugLog(`[EntitySpamCheck] Check bypassed for ${potentialPlayer.nameTag} (Creative mode).`, potentialPlayer.nameTag, dependencies);
        return false;
    }

    if (!config.entitySpamMonitoredEntityTypes || config.entitySpamMonitoredEntityTypes.length === 0) {
        playerUtils.debugLog("[EntitySpamCheck] Check skipped, no monitored entity types configured.", null, dependencies);
        return false; // No types to monitor
    }

    if (!config.entitySpamMonitoredEntityTypes.includes(entityType)) {
        playerUtils.debugLog(`[EntitySpamCheck] Entity type ${entityType} not monitored for spam.`, null, dependencies);
        return false; // Not a monitored entity type
    }

    pData.recentEntitySpamTimestamps = pData.recentEntitySpamTimestamps || {};
    pData.recentEntitySpamTimestamps[entityType] = pData.recentEntitySpamTimestamps[entityType] || [];

    const currentTime = Date.now();
    pData.recentEntitySpamTimestamps[entityType].push(currentTime);
    pData.isDirtyForSave = true;

    const windowMs = config.entitySpamTimeWindowMs || 2000;
    const originalCount = pData.recentEntitySpamTimestamps[entityType].length;

    pData.recentEntitySpamTimestamps[entityType] = pData.recentEntitySpamTimestamps[entityType].filter(
        ts => (currentTime - ts) <= windowMs
    );

    if (pData.recentEntitySpamTimestamps[entityType].length !== originalCount) {
        pData.isDirtyForSave = true;
    }

    const maxSpawns = config.entitySpamMaxSpawnsInWindow || 5;

    if (pData.recentEntitySpamTimestamps[entityType].length > maxSpawns) {
        // Pass the full dependencies object to executeCheckAction
        const violationDetails = {
            playerName: potentialPlayer.nameTag,
            entityType: entityType,
            count: pData.recentEntitySpamTimestamps[entityType].length.toString(),
            maxSpawns: maxSpawns.toString(),
            windowMs: windowMs.toString(),
            actionTaken: config.entitySpamAction
        };

        await actionManager.executeCheckAction(potentialPlayer, "worldAntigriefEntityspam", violationDetails, dependencies);

        playerUtils.debugLog(`[EntitySpamCheck] Flagged ${potentialPlayer.nameTag} for spawning ${entityType}. Count: ${pData.recentEntitySpamTimestamps[entityType].length}/${maxSpawns}`, pData.isWatched ? potentialPlayer.nameTag : null, dependencies);

        pData.recentEntitySpamTimestamps[entityType] = []; // Clear timestamps for this entity type after flagging
        pData.isDirtyForSave = true;
        return true; // Spam detected
    }

    return false; // No spam detected
}
