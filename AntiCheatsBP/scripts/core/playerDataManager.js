import * as mc from '@minecraft/server';
import { debugLog, warnPlayer, notifyAdmins } from '../utils/playerUtils.js';

const playerData = new Map();

/**
 * Retrieves the anti-cheat data for a specific player by their ID.
 * @param {string} playerId - The ID of the player.
 * @returns {import('../types.js').PlayerAntiCheatData | undefined} The player's anti-cheat data, or undefined if not found.
 */
export function getPlayerData(playerId) {
    return playerData.get(playerId);
}

/**
 * Retrieves all player anti-cheat data currently in memory.
 * @returns {IterableIterator<import('../types.js').PlayerAntiCheatData>} An iterator for all player data values.
 */
export function getAllPlayerDataValues() {
    return playerData.values();
}

/**
 * Saves a subset of player's anti-cheat data to their dynamic properties for persistence.
 * @param {mc.Player} player - The player object.
 * @param {object} pDataToSave - The portion of PlayerAntiCheatData to save.
 * @returns {Promise<boolean>} True if saving was successful, false otherwise.
 */
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

/**
 * Loads player's anti-cheat data from their dynamic properties.
 * @param {mc.Player} player - The player object.
 * @returns {Promise<object | null>} The parsed player data object, or null if not found or an error occurs.
 */
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

/**
 * Prepares a subset of the runtime player data and saves it to dynamic properties.
 * @param {mc.Player} player - The player whose data needs to be saved.
 * @returns {Promise<void>}
 */
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

/**
 * Initializes a new default PlayerAntiCheatData object for a player.
 * @param {mc.Player} player - The player object.
 * @param {number} currentTick - The current game tick.
 * @returns {import('../types.js').PlayerAntiCheatData} The default player data object.
 */
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
        isUsingConsumable: false,
        isChargingBow: false,
        isUsingShield: false,
        lastItemUseTick: 0,
        recentBlockPlacements: [],
        lastPillarBaseY: 0,
        consecutivePillarBlocks: 0,
        lastPillarTick: 0,
        currentPillarX: null,
        currentPillarZ: null,
        consecutiveDownwardBlocks: 0,
        lastDownwardScaffoldTick: 0,
        lastDownwardScaffoldBlockLocation: null,
        muteInfo: null,
        banInfo: null,
    };
}

/**
 * Ensures that a player has their anti-cheat data initialized, loading from persistence if available or creating new data.
 * Also handles expiry of mutes/bans found in persisted data.
 * @param {mc.Player} player - The player object.
 * @param {number} currentTick - The current game tick, used for initializing some fields.
 * @returns {Promise<import('../types.js').PlayerAntiCheatData>} The initialized or loaded player data.
 */
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
        newPData.isUsingConsumable = false; // Session specific
        newPData.isChargingBow = false; // Session specific
        newPData.isUsingShield = false; // Session specific
        newPData.lastItemUseTick = 0; // Session specific
        newPData.recentBlockPlacements = []; // Session specific
        newPData.lastPillarBaseY = 0; // Session specific
        newPData.consecutivePillarBlocks = 0; // Session specific
        newPData.lastPillarTick = 0; // Session specific
        newPData.currentPillarX = null; // Session specific
        newPData.currentPillarZ = null; // Session specific
        newPData.consecutiveDownwardBlocks = 0; // Session specific
        newPData.lastDownwardScaffoldTick = 0; // Session specific
        newPData.lastDownwardScaffoldBlockLocation = null; // Session specific
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

/**
 * Cleans up runtime player data for players who are no longer in the game.
 * @param {mc.Player[]} activePlayers - An array of currently active player objects.
 * @returns {void}
 */
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

/**
 * Updates transient (session-only) player data that changes frequently, like position and velocity.
 * @param {mc.Player} player - The player object.
 * @param {import('../types.js').PlayerAntiCheatData} pData - The player's current anti-cheat data.
 * @param {number} currentTick - The current game tick.
 * @returns {void}
 */
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

/**
 * Adds a flag to a player's data, warns them, and notifies admins.
 * Also handles saving the updated player data.
 * @param {mc.Player} player - The player to flag.
 * @param {string} flagType - The type of flag (e.g., "fly", "speed").
 * @param {string} reasonMessage - The message/reason for the flag, shown to the player.
 * @param {string} [detailsForNotify=""] - Additional details for admin notifications.
 * @returns {void}
 */
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

/**
 * Adds a mute to a player's data. Mute information is persisted.
 * @param {mc.Player} player - The player to mute.
 * @param {number | Infinity} durationMs - The duration of the mute in milliseconds, or Infinity for permanent.
 * @param {string} reason - The reason for the mute.
 * @returns {boolean} True if the mute was successfully applied, false otherwise.
 */
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

/**
 * Removes a mute from a player's data.
 * @param {mc.Player} player - The player to unmute.
 * @returns {boolean} True if the player was unmuted, false if they were not muted or an error occurred.
 */
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

/**
 * Retrieves a player's current mute information, clearing it if expired.
 * @param {mc.Player} player - The player whose mute info is requested.
 * @returns {{unmuteTime: number | Infinity, reason: string} | null} The mute information object, or null if not muted or expired.
 */
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

/**
 * Checks if a player is currently muted.
 * @param {mc.Player} player - The player to check.
 * @returns {boolean} True if the player is muted, false otherwise.
 */
export function isMuted(player) {
    return getMuteInfo(player) !== null;
}

/**
 * Adds a ban to a player's data. Ban information is persisted.
 * @param {mc.Player} player - The player to ban.
 * @param {number | Infinity} durationMs - The duration of the ban in milliseconds, or Infinity for permanent.
 * @param {string} reason - The reason for the ban.
 * @returns {boolean} True if the ban was successfully applied, false otherwise.
 */
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

/**
 * Removes a ban from a player's data.
 * @param {mc.Player} player - The player to unban.
 * @returns {boolean} True if the player was unbanned, false if they were not banned or an error occurred.
 */
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

/**
 * Retrieves a player's current ban information, clearing it if expired.
 * @param {mc.Player} player - The player whose ban info is requested.
 * @returns {{unbanTime: number | Infinity, reason: string} | null} The ban information object, or null if not banned or expired.
 */
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

/**
 * Checks if a player is currently banned.
 * @param {mc.Player} player - The player to check.
 * @returns {boolean} True if the player is banned, false otherwise.
 */
export function isBanned(player) {
    return getBanInfo(player) !== null;
}

/**
 * Sets or updates the runtime anti-cheat data for a specific player.
 * Primarily used when initializing or loading data.
 * @param {string} playerId - The ID of the player.
 * @param {import('../types.js').PlayerAntiCheatData} data - The player data to set.
 * @returns {void}
 */
export function setPlayerData(playerId, data) {
    if (!playerId || !data) {
        debugLog("PDM:setPlayerData: Invalid playerId or data.", null);
        return;
    }
    playerData.set(playerId, data);
}
