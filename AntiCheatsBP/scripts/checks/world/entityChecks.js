/**
 * @file Implements checks related to entity spawning and interactions, primarily for AntiGrief.
 */
import * as mc from '@minecraft/server';

/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData;
 * @typedef {import('../../types.js').CommandDependencies} CommandDependencies;
 * @typedef {import('../../types.js').Config} Config;
 */

/**
 * Checks for entity spamming based on spawn rate of monitored entity types by a player.
 * This is typically called when an entity is spawned, and the potential spawner is identified.
 *
 * @async
 * @param {mc.Player | null} potentialPlayer - The player suspected of spawning the entity, if known.
 * @param {string} entityType - The typeId of the spawned entity (e.g., 'minecraft:boat').
 * @param {PlayerAntiCheatData | null} pData - Player-specific anti-cheat data for the `potentialPlayer`.
 * @param {CommandDependencies} dependencies - The standard dependencies object.
 * @returns {Promise<boolean>} True if spam was detected and an action (like entity removal) might be needed, false otherwise.
 */
export async function checkEntitySpam(potentialPlayer, entityType, pData, dependencies) {
    const { config, playerUtils, actionManager } = dependencies; // Removed unused playerDataManager, logManager

    if (!config.enableEntitySpamAntiGrief) {
        return false;
    }

    const watchedPrefix = pData?.isWatched && potentialPlayer ? potentialPlayer.nameTag : null;

    if (!potentialPlayer) {
        playerUtils.debugLog('[EntitySpamCheck] Check skipped, potentialPlayer is null.', null, dependencies);
        return false;
    }

    if (!pData) {
        playerUtils.debugLog(`[EntitySpamCheck] Check skipped for player ${potentialPlayer.nameTag}, pData is null/undefined.`, potentialPlayer.nameTag, dependencies);
        return false;
    }

    if (config.entitySpamBypassInCreative && potentialPlayer.gameMode === mc.GameMode.creative) {
        playerUtils.debugLog(`[EntitySpamCheck] Check bypassed for ${potentialPlayer.nameTag} (Creative mode).`, potentialPlayer.nameTag, dependencies);
        return false;
    }

    if (!config.entitySpamMonitoredEntityTypes || config.entitySpamMonitoredEntityTypes.length === 0) {
        playerUtils.debugLog('[EntitySpamCheck] Check skipped, no monitored entity types configured.', null, dependencies);
        return false;
    }

    if (!config.entitySpamMonitoredEntityTypes.includes(entityType)) {
        playerUtils.debugLog(`[EntitySpamCheck] Entity type ${entityType} not monitored for spam.`, watchedPrefix, dependencies);
        return false;
    }

    pData.recentEntitySpamTimestamps = pData.recentEntitySpamTimestamps || {};
    pData.recentEntitySpamTimestamps[entityType] = pData.recentEntitySpamTimestamps[entityType] || [];

    const currentTime = Date.now();
    pData.recentEntitySpamTimestamps[entityType].push(currentTime);
    pData.isDirtyForSave = true;

    const windowMs = config.entitySpamTimeWindowMs || 2000; // Default 2 seconds
    const originalCount = pData.recentEntitySpamTimestamps[entityType].length;

    pData.recentEntitySpamTimestamps[entityType] = pData.recentEntitySpamTimestamps[entityType].filter(
        ts => (currentTime - ts) <= windowMs
    );

    if (pData.recentEntitySpamTimestamps[entityType].length !== originalCount) {
        pData.isDirtyForSave = true; // Mark as dirty if array was modified
    }

    const maxSpawns = config.entitySpamMaxSpawnsInWindow || 5; // Default max 5 spawns
    const actionProfileKey = 'worldAntigriefEntityspam'; // Standardized key

    if (pData.recentEntitySpamTimestamps[entityType].length > maxSpawns) {
        const violationDetails = {
            playerName: potentialPlayer.nameTag, // For message template convenience
            entityType: entityType,
            count: pData.recentEntitySpamTimestamps[entityType].length.toString(),
            maxSpawns: maxSpawns.toString(),
            windowMs: windowMs.toString(),
            actionTaken: config.entitySpamAction ?? 'flag_only', // Informative, actual action decided by profile
        };

        await actionManager.executeCheckAction(potentialPlayer, actionProfileKey, violationDetails, dependencies);

        playerUtils.debugLog(`[EntitySpamCheck] Flagged ${potentialPlayer.nameTag} for spawning ${entityType}. Count: ${pData.recentEntitySpamTimestamps[entityType].length}/${maxSpawns}`, watchedPrefix, dependencies);

        // Reset timestamps for this entity type after flagging to prevent immediate re-flagging
        pData.recentEntitySpamTimestamps[entityType] = [];
        pData.isDirtyForSave = true;
        return true;
    }

    return false;
}
