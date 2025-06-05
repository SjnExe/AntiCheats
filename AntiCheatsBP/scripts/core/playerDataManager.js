import * as mc from '@minecraft/server';
import { debugLog, warnPlayer, notifyAdmins } from '../utils/playerUtils.js';

// PlayerAntiCheatData structure (for clarity, formal JSDoc/TS types would be in a types.js)
// {
//   playerNameTag: string,
//   lastPosition: Vector3, previousPosition: Vector3,
//   velocity: Vector3, previousVelocity: Vector3,
//   consecutiveOffGroundTicks: number, fallDistance: number,
//   lastOnGroundTick: number, lastOnGroundPosition: Vector3,
//   consecutiveOnGroundSpeedingTicks: number, isTakingFallDamage: boolean,
//   attackEvents: number[], lastAttackTime: number,
//   blockBreakEvents: number[],
//   flags: {
//     totalFlags: number,
//     fly: { count: number, lastDetectionTime: number },
//     // ... other specific flags
//   },
//   lastFlagType: string, isWatched: boolean,
//   lastPitch: number, lastYaw: number,         // NEW SESSION-ONLY
//   lastAttackTick: number, recentHits: any[]  // NEW SESSION-ONLY
// }

const playerData = new Map();

export function getPlayerData(playerId) {
    return playerData.get(playerId);
}

export function getAllPlayerDataValues() {
    return playerData.values();
}

export async function savePlayerDataToDynamicProperties(player, pDataToSave) {
    if (!player || !pDataToSave) {
        debugLog("PDM:save: Invalid player or pDataToSave", player?.nameTag);
        return false;
    }
    const dynamicPropertyKey = "anticheat:pdata_v1";
    let jsonString;
    try {
        jsonString = JSON.stringify(pDataToSave);
    } catch (error) {
        debugLog(`PDM:save: Fail stringify ${player.nameTag}. E: ${error}`, player.nameTag);
        return false;
    }
    if (jsonString.length > 32760) {
        debugLog(`PDM:save: pData too large ${player.nameTag} (${jsonString.length}b).`, player.nameTag);
        return false;
    }
    try {
        player.setDynamicProperty(dynamicPropertyKey, jsonString);
        return true;
    } catch (error) {
        debugLog(`PDM:save: Fail setDynamicProp ${player.nameTag}. E: ${error}`, player.nameTag);
        if (error.message) debugLog(`PDM:save: Error message: ${error.message}`, player.nameTag);
        return false;
    }
}

export async function loadPlayerDataFromDynamicProperties(player) {
    if (!player) {
        debugLog("PDM:load: Invalid player");
        return null;
    }
    const dynamicPropertyKey = "anticheat:pdata_v1";
    let jsonString;
    try {
        jsonString = player.getDynamicProperty(dynamicPropertyKey);
    } catch (error) {
        debugLog(`PDM:load: Fail getDynamicProp ${player.nameTag}. E: ${error}`, player.nameTag);
        if (error.message) debugLog(`PDM:load: Error message: ${error.message}`, player.nameTag);
        return null;
    }
    if (typeof jsonString === 'string') {
        try {
            const parsedData = JSON.parse(jsonString);
            debugLog(`PDM:load: Success ${player.nameTag}.`, player.nameTag);
            return parsedData;
        } catch (error) {
            debugLog(`PDM:load: Fail parse JSON ${player.nameTag}. JSON: "${jsonString}". E: ${error}`, player.nameTag);
            if (error.message) debugLog(`PDM:load: Parse error message: ${error.message}`, player.nameTag);
            return null;
        }
    } else if (typeof jsonString === 'undefined') {
        debugLog(`PDM:load: No prop '${dynamicPropertyKey}' for ${player.nameTag}.`, player.nameTag);
        return null;
    } else {
        debugLog(`PDM:load: Unexpected type for prop '${dynamicPropertyKey}' for ${player.nameTag}: ${typeof jsonString}`, player.nameTag);
        return null;
    }
}

export async function prepareAndSavePlayerData(player) {
    if (!player) return;
    const pData = playerData.get(player.id);
    if (pData) {
        const persistedPData = { // Only include fields meant for persistence
            flags: pData.flags,
            isWatched: pData.isWatched,
            lastFlagType: pData.lastFlagType,
            playerNameTag: pData.playerNameTag,
            // Persisted violation tracking fields
            attackEvents: pData.attackEvents,
            lastAttackTime: pData.lastAttackTime,
            blockBreakEvents: pData.blockBreakEvents,
            consecutiveOffGroundTicks: pData.consecutiveOffGroundTicks, // May be reset on load if preferred
            fallDistance: pData.fallDistance, // May be reset on load
            consecutiveOnGroundSpeedingTicks: pData.consecutiveOnGroundSpeedingTicks // May be reset on load
        };
        // lastPitch, lastYaw, lastAttackTick, recentHits are NOT saved as they are session-only.
        await savePlayerDataToDynamicProperties(player, persistedPData);
    } else {
        debugLog(`PDM:prepSave: No runtime pData for ${player.nameTag}.`, player.nameTag);
    }
}

export function initializeDefaultPlayerData(player, currentTick) {
    return {
        playerNameTag: player.nameTag,
        lastPosition: player.location,
        previousPosition: player.location,
        velocity: player.getVelocity(),
        previousVelocity: { x: 0, y: 0, z: 0 },
        consecutiveOffGroundTicks: 0,
        fallDistance: 0,
        lastOnGroundTick: currentTick,
        lastOnGroundPosition: player.location,
        consecutiveOnGroundSpeedingTicks: 0,
        isTakingFallDamage: false,
        attackEvents: [],
        lastAttackTime: 0,
        blockBreakEvents: [],
        flags: {
            totalFlags: 0,
            fly: { count: 0, lastDetectionTime: 0 },
            speed: { count: 0, lastDetectionTime: 0 },
            nofall: { count: 0, lastDetectionTime: 0 },
            reach: { count: 0, lastDetectionTime: 0 },
            cps: { count: 0, lastDetectionTime: 0 },
            nuker: { count: 0, lastDetectionTime: 0 },
            illegalItem: { count: 0, lastDetectionTime: 0 },
            illegalCharInChat: { count: 0, lastDetectionTime: 0 }
            // New Killaura/Aimbot related flags will be added here by their checks if not pre-defined
        },
        lastFlagType: "",
        isWatched: false,
        // New session-only fields
        lastPitch: 0,
        lastYaw: 0,
        lastAttackTick: 0,
        recentHits: [],
    };
}

export async function ensurePlayerDataInitialized(player, currentTick) {
    if (playerData.has(player.id)) {
        return playerData.get(player.id);
    }

    let newPData = initializeDefaultPlayerData(player, currentTick); // Start with fresh defaults, including session-only
    const loadedData = await loadPlayerDataFromDynamicProperties(player);

    if (loadedData) {
        debugLog(`PDM:ensureInit: Loaded data for ${player.nameTag}. Merging.`, player.nameTag);
        // Merge persisted fields from loadedData
        newPData.flags = loadedData.flags || newPData.flags;
        newPData.isWatched = typeof loadedData.isWatched === 'boolean' ? loadedData.isWatched : newPData.isWatched;
        newPData.lastFlagType = loadedData.lastFlagType || newPData.lastFlagType;
        newPData.playerNameTag = loadedData.playerNameTag || newPData.playerNameTag;

        newPData.attackEvents = loadedData.attackEvents || [];
        newPData.lastAttackTime = loadedData.lastAttackTime || 0;
        newPData.blockBreakEvents = loadedData.blockBreakEvents || [];

        // For counters that might be persisted but should ideally be session-logic driven if starting fresh:
        // If they are part of persistedPData, they will be loaded.
        // If they are *not* part of persistedPData, they will keep their fresh default from initializeDefaultPlayerData.
        // The current persistedPData includes these, so they will be loaded if present.
        // If we wanted them to always reset per session, they'd be excluded from persistedPData.
        newPData.consecutiveOffGroundTicks = loadedData.consecutiveOffGroundTicks || 0;
        newPData.fallDistance = loadedData.fallDistance || 0;
        newPData.consecutiveOnGroundSpeedingTicks = loadedData.consecutiveOnGroundSpeedingTicks || 0;

        // Session-specific fields are already set to defaults by initializeDefaultPlayerData.
        // No need to merge them from loadedData, as they should be fresh each session.
        // If they were accidentally saved in an old version, they'll be overwritten by the fresh defaults.
    } else {
        debugLog(`PDM:ensureInit: No persisted data for ${player.nameTag}. Fresh init.`, player.nameTag);
    }
    playerData.set(player.id, newPData);
    return newPData;
}

export function cleanupActivePlayerData(activePlayers) {
    const activePlayerIds = new Set();
    for (const player of activePlayers) {
        activePlayerIds.add(player.id);
    }
    for (const playerId of playerData.keys()) {
        if (!activePlayerIds.has(playerId)) {
            const removedPData = playerData.get(playerId);
            debugLog(`PDM:cleanup: Removed runtime data for ${removedPData?.playerNameTag || playerId}.`, removedPData?.isWatched ? (removedPData.playerNameTag || playerId) : null);
            playerData.delete(playerId);
        }
    }
}

export function updateTransientPlayerData(player, pData, currentTick) {
    // Update pitch/yaw for rotation checks
    const viewDirection = player.getViewDirection();
    const rotation = player.getRotation();
    pData.lastPitch = rotation.x; // Pitch
    pData.lastYaw = rotation.y;   // Yaw

    pData.previousVelocity = {...pData.velocity};
    pData.velocity = player.getVelocity();
    pData.previousPosition = {...pData.lastPosition};
    pData.lastPosition = player.location;

    if (!pData.playerNameTag) pData.playerNameTag = player.nameTag;

    if (player.isOnGround) {
        pData.consecutiveOffGroundTicks = 0;
        pData.lastOnGroundTick = currentTick;
        pData.lastOnGroundPosition = player.location;
    } else {
        pData.consecutiveOffGroundTicks++;
    }
}

export function addFlag(player, flagType, reasonMessage, detailsForNotify = "") {
    const pData = getPlayerData(player.id);
    if (!pData) {
        debugLog(`PDM:addFlag: No pData for ${player.nameTag}. Cannot add flag ${flagType}.`, player.nameTag);
        return;
    }
    if (!pData.flags[flagType]) {
        debugLog(`PDM:addFlag: New flagType "${flagType}" for ${player.nameTag}. Initializing.`, player.nameTag);
        pData.flags[flagType] = { count: 0, lastDetectionTime: 0 };
    }
    pData.flags[flagType].count++;
    pData.flags[flagType].lastDetectionTime = Date.now();
    pData.flags.totalFlags++;
    pData.lastFlagType = flagType;

    const fullReason = `${reasonMessage} ${detailsForNotify}`.trim();
    warnPlayer(player, reasonMessage);
    notifyAdmins(`Flagged ${player.nameTag} for ${flagType}. ${detailsForNotify}`, player, pData);
    debugLog(`FLAG: ${player.nameTag} for ${flagType}. Reason: ${fullReason}. Total: ${pData.flags.totalFlags}. Count[${flagType}]: ${pData.flags[flagType].count}`, player.nameTag);

    prepareAndSavePlayerData(player);
}
