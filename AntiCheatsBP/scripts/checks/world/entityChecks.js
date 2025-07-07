/**
 * @file Implements checks related to entity spawning and interactions, primarily for AntiGrief.
 */
import * as mc from '@minecraft/server';

// Constants for magic numbers
const DEFAULT_ENTITY_SPAM_TIME_WINDOW_MS = 2000;
const DEFAULT_ENTITY_SPAM_MAX_SPAWNS_IN_WINDOW = 5;

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
    const { config, playerUtils, actionManager } = dependencies;

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

    pData.recentEntitySpamTimestamps ??= {};
    pData.recentEntitySpamTimestamps[entityType] ??= [];

    const currentTime = Date.now();
    pData.recentEntitySpamTimestamps[entityType].push(currentTime);
    pData.isDirtyForSave = true;

    const windowMs = config.entitySpamTimeWindowMs || DEFAULT_ENTITY_SPAM_TIME_WINDOW_MS;
    const originalCount = pData.recentEntitySpamTimestamps[entityType].length;

    pData.recentEntitySpamTimestamps[entityType] = pData.recentEntitySpamTimestamps[entityType].filter(
        ts => (currentTime - ts) <= windowMs,
    );

    if (pData.recentEntitySpamTimestamps[entityType].length !== originalCount) {
        pData.isDirtyForSave = true;
    }

    const maxSpawns = config.entitySpamMaxSpawnsInWindow || DEFAULT_ENTITY_SPAM_MAX_SPAWNS_IN_WINDOW;
    const rawActionProfileKey = config.entitySpamActionProfileName ?? 'worldAntiGriefEntityspam';
    const actionProfileKey = rawActionProfileKey
        .replace(/([-_][a-z0-9])/ig, ($1) => $1.toUpperCase().replace('-', '').replace('_', ''))
        .replace(/^[A-Z]/, (match) => match.toLowerCase());

    if (pData.recentEntitySpamTimestamps[entityType].length > maxSpawns) {
        const violationDetails = {
            playerName: potentialPlayer.nameTag,
            entityType: entityType,
            count: pData.recentEntitySpamTimestamps[entityType].length.toString(),
            maxSpawns: maxSpawns.toString(),
            windowMs: windowMs.toString(),
            actionTaken: config.entitySpamAction ?? 'flagOnly',
        };

        await actionManager.executeCheckAction(potentialPlayer, actionProfileKey, violationDetails, dependencies);

        playerUtils.debugLog(`[EntitySpamCheck] Flagged ${potentialPlayer.nameTag} for spawning ${entityType}. Count: ${pData.recentEntitySpamTimestamps[entityType].length}/${maxSpawns}`, watchedPrefix, dependencies);

        pData.recentEntitySpamTimestamps[entityType] = [];
        pData.isDirtyForSave = true;
        return true;
    }

    return false;
}
