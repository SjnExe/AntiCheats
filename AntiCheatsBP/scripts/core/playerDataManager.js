import * as mc from '@minecraft/server';
import { debugLog, warnPlayer, notifyAdmins } from '../utils/playerUtils.js';
// import * as config from '../config.js'; // Not directly used in this file after addFlag was simplified

// It's better to define these structures here or in a dedicated types.js file
// For now, we remove the problematic JSDoc imports from main.js
// Assume structure for PlayerFlagData: { count: number, lastDetectionTime: number }
// Assume structure for PlayerAntiCheatData: (complex, includes .flags, .isWatched, etc.)

const playerData = new Map();

export function getPlayerData(playerId) {
    return playerData.get(playerId);
}

export function getAllPlayerDataValues() { // Added for uiManager
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
        // debugLog(`PDM:save: Success ${player.nameTag}.`, player.nameTag); // Can be too spammy
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
        const persistedPData = {
            flags: pData.flags,
            isWatched: pData.isWatched,
            lastFlagType: pData.lastFlagType,
            playerNameTag: pData.playerNameTag,
            attackEvents: pData.attackEvents,
            lastAttackTime: pData.lastAttackTime,
            blockBreakEvents: pData.blockBreakEvents,
            consecutiveOffGroundTicks: pData.consecutiveOffGroundTicks,
            fallDistance: pData.fallDistance,
            consecutiveOnGroundSpeedingTicks: pData.consecutiveOnGroundSpeedingTicks
        };
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
            illegalItem: { count: 0, lastDetectionTime: 0 }
        },
        lastFlagType: "",
        isWatched: false
    };
}

export async function ensurePlayerDataInitialized(player, currentTick) {
    if (playerData.has(player.id)) {
        return playerData.get(player.id);
    }
    const loadedData = await loadPlayerDataFromDynamicProperties(player);
    let newPData = initializeDefaultPlayerData(player, currentTick);
    if (loadedData) {
        debugLog(`PDM:ensureInit: Loaded data for ${player.nameTag}. Merging.`, player.nameTag);
        newPData.flags = loadedData.flags || newPData.flags;
        newPData.isWatched = typeof loadedData.isWatched === 'boolean' ? loadedData.isWatched : newPData.isWatched;
        newPData.lastFlagType = loadedData.lastFlagType || newPData.lastFlagType;
        newPData.playerNameTag = loadedData.playerNameTag || newPData.playerNameTag;
        newPData.attackEvents = loadedData.attackEvents || [];
        newPData.lastAttackTime = loadedData.lastAttackTime || 0;
        newPData.blockBreakEvents = loadedData.blockBreakEvents || [];
        newPData.consecutiveOffGroundTicks = loadedData.consecutiveOffGroundTicks || 0;
        newPData.fallDistance = loadedData.fallDistance || 0;
        newPData.consecutiveOnGroundSpeedingTicks = loadedData.consecutiveOnGroundSpeedingTicks || 0;
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
    pData.previousVelocity = {...pData.velocity}; // Ensure deep copy for objects/vectors if necessary
    pData.velocity = player.getVelocity();
    pData.previousPosition = {...pData.lastPosition}; // Ensure deep copy
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
        debugLog(`PDM:addFlag: Invalid flagType "${flagType}" for ${player.nameTag}. Initializing.`, player.nameTag);
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
