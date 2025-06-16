/**
 * @file AntiCheatsBP/scripts/checks/world/entityChecks.js
 * Implements checks related to entity spawning and interactions.
 * @version 1.0.0
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
 * Checks for entity spamming based on spawn rate of monitored entity types by a player.
 * @param {mc.Player | null} potentialPlayer - The player suspected of spawning the entity, if known.
 * @param {string} entityType - The typeId of the spawned entity.
 * @param {Config} config - The server configuration object.
 * @param {PlayerAntiCheatData | null} pData - Player-specific anti-cheat data (if potentialPlayer is known).
 * @param {PlayerUtils} playerUtils - Utility functions for player interactions.
 * @param {PlayerDataManager} playerDataManager - Manager for player data.
 * @param {LogManager} logManager - Manager for logging.
 * @param {ExecuteCheckAction} executeCheckAction - Function to execute defined actions for a check.
 * @param {number} currentTick - The current game tick.
 * @returns {Promise<boolean>} True if spam was detected and action might be needed on the entity, false otherwise.
 */
export async function checkEntitySpam(
    potentialPlayer,
    entityType,
    config,
    pData,
    playerUtils,
    playerDataManager,
    logManager,
    executeCheckAction,
    currentTick
) {
    if (!config.enableEntitySpamAntiGrief) {
        return false;
    }

    if (!potentialPlayer) {
        // If player is unknown, we can't do player-specific rate limiting with the current pData structure.
        // Future: Could implement a global rate limit for certain anonymous spawns if needed.
        playerUtils.debugLog?.("EntitySpam: Check skipped, potentialPlayer is null.", null);
        return false;
    }

    if (!pData) {
        playerUtils.debugLog?.(`EntitySpam: Check skipped for player ${potentialPlayer.nameTag}, pData is null/undefined.`, potentialPlayer.nameTag);
        return false; // pData is required for player-specific tracking
    }

    if (config.entitySpamBypassInCreative && potentialPlayer.gameMode === mc.GameMode.creative) {
        playerUtils.debugLog?.(`EntitySpam: Check bypassed for ${potentialPlayer.nameTag} (Creative mode).`, potentialPlayer.nameTag);
        return false;
    }

    if (!config.entitySpamMonitoredEntityTypes || config.entitySpamMonitoredEntityTypes.length === 0) {
        playerUtils.debugLog?.("EntitySpam: Check skipped, no monitored entity types configured.", null);
        return false; // No types to monitor
    }

    if (!config.entitySpamMonitoredEntityTypes.includes(entityType)) {
        playerUtils.debugLog?.(`EntitySpam: Entity type ${entityType} not monitored for spam.`, null);
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
        const actionDependencies = { config, playerDataManager, playerUtils, logManager };
        const violationDetails = {
            playerName: potentialPlayer.nameTag,
            entityType: entityType,
            count: pData.recentEntitySpamTimestamps[entityType].length.toString(),
            maxSpawns: maxSpawns.toString(),
            windowMs: windowMs.toString(),
            actionTaken: config.entitySpamAction
        };

        await executeCheckAction(potentialPlayer, "worldAntigriefEntityspam", violationDetails, actionDependencies);

        playerUtils.debugLog?.(`EntitySpam: Flagged ${potentialPlayer.nameTag} for spawning ${entityType}. Count: ${pData.recentEntitySpamTimestamps[entityType].length}/${maxSpawns}`, pData.isWatched ? potentialPlayer.nameTag : null);

        pData.recentEntitySpamTimestamps[entityType] = []; // Clear timestamps for this entity type after flagging
        pData.isDirtyForSave = true;
        return true; // Spam detected
    }

    return false; // No spam detected
}
