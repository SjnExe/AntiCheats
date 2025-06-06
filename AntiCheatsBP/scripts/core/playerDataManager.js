import * as mc from '@minecraft/server';
import { debugLog, warnPlayer, notifyAdmins } from '../utils/playerUtils.js';

const playerData = new Map();

/** @todo Add JSDoc */
export function getPlayerData(playerId) {
    return playerData.get(playerId);
}

/** @todo Add JSDoc */
export function getAllPlayerDataValues() {
    return playerData.values();
}

/** @todo Add JSDoc */
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

/** @todo Add JSDoc */
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

/** @todo Add JSDoc */
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
            consecutiveOnGroundSpeedingTicks: pData.consecutiveOnGroundSpeedingTicks,
            muteInfo: pData.muteInfo,
            banInfo: pData.banInfo,
            lastCombatInteractionTime: pData.lastCombatInteractionTime, // ADDED
        };
        await savePlayerDataToDynamicProperties(player, persistedPData);
    } else {
        debugLog(`PDM:prepSave: No runtime pData for ${player.nameTag}.`, player.nameTag);
    }
}

/** @todo Add JSDoc */
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
        lastCombatInteractionTime: 0, // ADDED
        blockBreakEvents: [],
        recentMessages: [],
        flags: {
            totalFlags: 0,
            fly: { count: 0, lastDetectionTime: 0 },
            speed: { count: 0, lastDetectionTime: 0 },
            nofall: { count: 0, lastDetectionTime: 0 },
            reach: { count: 0, lastDetectionTime: 0 },
            cps: { count: 0, lastDetectionTime: 0 },
            nuker: { count: 0, lastDetectionTime: 0 },
            illegalItem: { count: 0, lastDetectionTime: 0 },
            illegalCharInChat: { count: 0, lastDetectionTime: 0 },
            longMessage: { count: 0, lastDetectionTime: 0 },
            spamRepeat: { count: 0, lastDetectionTime: 0 }
        },
        lastFlagType: "",
        isWatched: false,
        lastPitch: player.getRotation().x, // Initialize with current rotation
        lastYaw: player.getRotation().y,   // Initialize with current rotation
        lastAttackTick: 0,
        recentHits: [],
        muteInfo: null,
        banInfo: null,
    };
}

/** @todo Add JSDoc */
export async function ensurePlayerDataInitialized(player, currentTick) {
    if (playerData.has(player.id)) {
        return playerData.get(player.id);
    }

    let newPData = initializeDefaultPlayerData(player, currentTick);
    const loadedData = await loadPlayerDataFromDynamicProperties(player);

    if (loadedData) {
        debugLog(`PDM:ensureInit: Loaded data for ${player.nameTag}. Merging.`, player.nameTag);
        newPData = { ...newPData, ...loadedData }; // Merge, loadedData might overwrite some defaults if they were persisted
        // Ensure flags object and totalFlags are valid after merge
        newPData.flags = { ...initializeDefaultPlayerData(player, currentTick).flags, ...loadedData.flags };
        if (typeof newPData.flags.totalFlags !== 'number') newPData.flags.totalFlags = 0;

        // Re-initialize session-only fields that should not be persisted
        newPData.lastPosition = player.location;
        newPData.previousPosition = player.location;
        newPData.velocity = player.getVelocity();
        newPData.previousVelocity = { x: 0, y: 0, z: 0 };
        newPData.consecutiveOffGroundTicks = loadedData.consecutiveOffGroundTicks || 0; // Persisted, so load or default
        newPData.fallDistance = loadedData.fallDistance || 0; // Persisted
        newPData.lastOnGroundTick = currentTick; // Session specific
        newPData.lastOnGroundPosition = player.location; // Session specific
        newPData.consecutiveOnGroundSpeedingTicks = loadedData.consecutiveOnGroundSpeedingTicks || 0; // Persisted
        newPData.isTakingFallDamage = false; // Session specific
        newPData.lastPitch = player.getRotation().x; // Session specific
        newPData.lastYaw = player.getRotation().y;   // Session specific
        newPData.lastAttackTick = 0; // Session specific
        newPData.recentHits = []; // Session specific
        newPData.recentMessages = []; // Session specific
        // lastCombatInteractionTime will be loaded if present in loadedData, otherwise defaults from initializeDefaultPlayerData
        newPData.lastCombatInteractionTime = loadedData.lastCombatInteractionTime || 0;

    } else {
        debugLog(`PDM:ensureInit: No persisted data for ${player.nameTag}. Fresh init.`, player.nameTag);
    }

    if (newPData.muteInfo && newPData.muteInfo.unmuteTime !== Infinity && Date.now() >= newPData.muteInfo.unmuteTime) {
        debugLog(`PDM:ensureInit: Mute for ${newPData.playerNameTag || player.nameTag} expired on load. Clearing.`, newPData.isWatched ? (newPData.playerNameTag || player.nameTag) : null);
        newPData.muteInfo = null;
    }

    if (newPData.banInfo && newPData.banInfo.unbanTime !== Infinity && Date.now() >= newPData.banInfo.unbanTime) {
        debugLog(`PDM:ensureInit: Ban for ${newPData.playerNameTag || player.nameTag} expired on load. Clearing.`, newPData.isWatched ? (newPData.playerNameTag || player.nameTag) : null);
        newPData.banInfo = null;
    }

    playerData.set(player.id, newPData);
    return newPData;
}

/** @todo Add JSDoc */
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

/** @todo Add JSDoc */
export function updateTransientPlayerData(player, pData, currentTick) {
    const rotation = player.getRotation();
    pData.lastPitch = rotation.x;
    pData.lastYaw = rotation.y;

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

/** @todo Add JSDoc */
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
    pData.flags.totalFlags = (pData.flags.totalFlags || 0) + 1; // Ensure totalFlags is a number
    pData.lastFlagType = flagType;

    const fullReason = `${reasonMessage} ${detailsForNotify}`.trim();
    warnPlayer(player, reasonMessage);
    notifyAdmins(`Flagged ${player.nameTag} for ${flagType}. ${detailsForNotify}`, player, pData);
    debugLog(`FLAG: ${player.nameTag} for ${flagType}. Reason: ${fullReason}. Total: ${pData.flags.totalFlags}. Count[${flagType}]: ${pData.flags[flagType].count}`, player.nameTag);

    prepareAndSavePlayerData(player);
}

/** @todo Add JSDoc */
export function addMute(player, durationMs, reason) {
    if (!player || typeof durationMs !== 'number' || durationMs <= 0) {
        debugLog(`PDM:addMute: Invalid arguments - player: ${player?.nameTag}, durationMs: ${durationMs}`, player?.nameTag);
        return false;
    }
    const pData = getPlayerData(player.id);
    if (!pData) {
        debugLog(`PDM:addMute: No pData for player ${player.nameTag}. Cannot mute.`, player.nameTag);
        return false;
    }
    const unmuteTime = (durationMs === Infinity) ? Infinity : Date.now() + durationMs;
    const muteReason = reason || "Muted by admin.";
    pData.muteInfo = { unmuteTime, reason: muteReason };
    prepareAndSavePlayerData(player);
    let logMsg = `PDM:addMute: Player ${player.nameTag} muted. Reason: ${muteReason}.`;
    if (durationMs === Infinity) logMsg += " Duration: Permanent";
    else logMsg += ` Unmute time: ${new Date(unmuteTime).toISOString()}`;
    debugLog(logMsg, pData.isWatched ? player.nameTag : null);
    return true;
}

/** @todo Add JSDoc */
export function removeMute(player) {
    if (!player) { debugLog(`PDM:removeMute: Invalid player object provided.`); return false; }
    const pData = getPlayerData(player.id);
    if (!pData) { debugLog(`PDM:removeMute: No pData for player ${player.nameTag}. Cannot unmute.`, player.nameTag); return false; }
    if (pData.muteInfo) {
        pData.muteInfo = null;
        prepareAndSavePlayerData(player);
        debugLog(`PDM:removeMute: Player ${player.nameTag} unmuted.`, pData.isWatched ? player.nameTag : null);
        return true;
    }
    debugLog(`PDM:removeMute: Player ${player.nameTag} was not muted or already unmuted.`, pData.isWatched ? player.nameTag : null);
    return false;
}

/** @todo Add JSDoc */
export function getMuteInfo(player) {
    if (!player) { return null; }
    const pData = getPlayerData(player.id);
    if (!pData || !pData.muteInfo) { return null; }
    const mute = pData.muteInfo;
    if (mute.unmuteTime !== Infinity && Date.now() >= mute.unmuteTime) {
        pData.muteInfo = null;
        prepareAndSavePlayerData(player);
        debugLog(`PDM:getMuteInfo: Mute for player ${player.nameTag} expired and removed.`, pData.isWatched ? player.nameTag : null);
        return null;
    }
    return mute;
}

/** @todo Add JSDoc */
export function isMuted(player) {
    return getMuteInfo(player) !== null;
}

/** @todo Add JSDoc */
export function addBan(player, durationMs, reason) {
    if (!player || typeof durationMs !== 'number' || durationMs <= 0) {
        debugLog(`PDM:addBan: Invalid arguments - player: ${player?.nameTag}, durationMs: ${durationMs}`, player?.nameTag);
        return false;
    }
    const pData = getPlayerData(player.id);
    if (!pData) {
        debugLog(`PDM:addBan: No pData for player ${player.nameTag}. Cannot ban.`, player.nameTag);
        return false;
    }
    const unbanTime = (durationMs === Infinity) ? Infinity : Date.now() + durationMs;
    const banReason = reason || "Banned by admin.";
    pData.banInfo = { unbanTime, reason: banReason };
    prepareAndSavePlayerData(player);
    let logMsg = `PDM:addBan: Player ${player.nameTag} banned. Reason: ${banReason}.`;
    if (durationMs === Infinity) logMsg += " Duration: Permanent";
    else logMsg += ` Unban time: ${new Date(unbanTime).toISOString()}`;
    debugLog(logMsg, pData.isWatched ? player.nameTag : null);
    return true;
}

/** @todo Add JSDoc */
export function removeBan(player) {
    if (!player) { debugLog(`PDM:removeBan: Invalid player object provided.`); return false; }
    const pData = getPlayerData(player.id);
    if (!pData) { debugLog(`PDM:removeBan: No pData for player ${player.nameTag}. Cannot unban.`, player.nameTag); return false; }
    if (pData.banInfo) {
        pData.banInfo = null;
        prepareAndSavePlayerData(player);
        debugLog(`PDM:removeBan: Player ${player.nameTag} unbanned.`, pData.isWatched ? player.nameTag : null);
        return true;
    }
    debugLog(`PDM:removeBan: Player ${player.nameTag} was not banned or already unbanned.`, pData.isWatched ? player.nameTag : null);
    return false;
}

/** @todo Add JSDoc */
export function getBanInfo(player) {
    if (!player) { return null; }
    const pData = getPlayerData(player.id);
    if (!pData || !pData.banInfo) { return null; }
    const currentBanInfo = pData.banInfo;
    if (currentBanInfo.unbanTime !== Infinity && Date.now() >= currentBanInfo.unbanTime) {
        pData.banInfo = null;
        prepareAndSavePlayerData(player);
        debugLog(`PDM:getBanInfo: Ban for player ${player.nameTag} expired and removed.`, pData.isWatched ? player.nameTag : null);
        return null;
    }
    return currentBanInfo;
}

/** @todo Add JSDoc */
export function isBanned(player) {
    return getBanInfo(player) !== null;
}

/** @todo Add JSDoc */
export function setPlayerData(playerId, data) {
    if (!playerId || !data) {
        debugLog("PDM:setPlayerData: Invalid playerId or data.", null);
        return;
    }
    playerData.set(playerId, data);
}
