/**
 * @file AntiCheatsBP/scripts/core/playerDataManager.js
 * Manages all player-specific data used by the AntiCheat system. This includes runtime data (pData),
 * persistence via dynamic properties, and helper functions for data manipulation like adding flags,
 * mutes, and bans.
 * @version 1.1.0
 */
import * as mc from '@minecraft/server';
import { debugLog, warnPlayer, notifyAdmins } from '../utils/playerUtils.js';
import { processAutoModActions } from './automodManager.js';
import * as config from '../config.js';
import * as automodConfig from '../automodConfig.js'; // Assuming automodConfig.js will be created at this path
// playerUtils is already partially imported (debugLog, warnPlayer, notifyAdmins),
// but automodManager expects it as an object. We'll construct it for the call.

/**
 * @type {Map<string, import('../types.js').PlayerAntiCheatData>}
 * In-memory store for player anti-cheat data.
 * Key: Player ID (string)
 * Value: PlayerAntiCheatData object
 */
const playerData = new Map();

/**
 * @const {string[]} persistedPlayerDataKeys
 * Defines the list of keys from the PlayerAntiCheatData object that should be persisted
 * to dynamic properties when a player leaves or data is saved.
 * This helps in reducing the amount of data stored and ensures only relevant
 * long-term information is kept.
 */
const persistedPlayerDataKeys = [
    "flags", "isWatched", "lastFlagType", "playerNameTag",
    "attackEvents", "lastAttackTime", "blockBreakEvents",
    "consecutiveOffGroundTicks", "fallDistance",
    "consecutiveOnGroundSpeedingTicks", "muteInfo", "banInfo",
    "lastCombatInteractionTime"
];

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
 * @param {Partial<import('../types.js').PlayerAntiCheatData>} pDataToSave - The portion of PlayerAntiCheatData to save.
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
    // Minecraft dynamic property string length limit is 32767 bytes.
    if (jsonString.length > 32760) { // Leave a small buffer
        debugLog(`PDM:save: pData too large for ${player.nameTag} (${jsonString.length}b). Cannot save to dynamic properties.`, player.nameTag);
        return false;
    }
    try {
        player.setDynamicProperty(dynamicPropertyKey, jsonString);
        return true;
    } catch (error) {
        debugLog(`PDM:save: Fail setDynamicProp for ${player.nameTag}. E: ${error}`, player.nameTag);
        if (error.message) debugLog(`PDM:save: Error message: ${error.message}`, player.nameTag);
        return false;
    }
}

/**
 * Loads player's anti-cheat data from their dynamic properties.
 * @param {mc.Player} player - The player object.
 * @returns {Promise<Partial<import('../types.js').PlayerAntiCheatData> | null>} The parsed player data object, or null if not found or an error occurs.
 */
export async function loadPlayerDataFromDynamicProperties(player) {
    if (!player) {
        debugLog("PDM:load: Invalid player object provided.");
        return null;
    }
    const dynamicPropertyKey = "anticheat:pdata_v1";
    let jsonString;
    try {
        jsonString = player.getDynamicProperty(dynamicPropertyKey);
    } catch (error) {
        debugLog(`PDM:load: Failed to getDynamicProperty for ${player.nameTag}. E: ${error}`, player.nameTag);
        if (error.message) debugLog(`PDM:load: Error message: ${error.message}`, player.nameTag);
        return null;
    }

    if (typeof jsonString === 'string') {
        try {
            const parsedData = JSON.parse(jsonString);
            debugLog(`PDM:load: Successfully loaded and parsed data for ${player.nameTag}.`, player.nameTag);
            return parsedData;
        } catch (error) {
            debugLog(`PDM:load: Failed to parse JSON for ${player.nameTag}. JSON: "${jsonString}". E: ${error}`, player.nameTag);
            if (error.message) debugLog(`PDM:load: Parse error message: ${error.message}`, player.nameTag);
            return null;
        }
    } else if (typeof jsonString === 'undefined') {
        debugLog(`PDM:load: No dynamic property '${dynamicPropertyKey}' found for ${player.nameTag}.`, player.nameTag);
        return null;
    } else {
        debugLog(`PDM:load: Unexpected data type for dynamic property '${dynamicPropertyKey}' for ${player.nameTag}: ${typeof jsonString}`, player.nameTag);
        return null;
    }
}

/**
 * Prepares a subset of the runtime player data containing only persisted keys and saves it to dynamic properties.
 * @param {mc.Player} player - The player whose data needs to be prepared and saved.
 * @returns {Promise<void>} A promise that resolves when the operation is complete.
 */
export async function prepareAndSavePlayerData(player) {
    if (!player) return;
    const pData = playerData.get(player.id);
    if (pData) {
        const persistedPData = {};
        for (const key of persistedPlayerDataKeys) {
            if (Object.prototype.hasOwnProperty.call(pData, key)) {
                persistedPData[key] = pData[key];
            }
        }
        await savePlayerDataToDynamicProperties(player, persistedPData);
    } else {
        debugLog(`PDM:prepSave: No runtime pData found for ${player.nameTag}. Cannot save.`, player.nameTag);
    }
}

/**
 * Initializes a new default PlayerAntiCheatData object for a player.
 * This object contains all fields necessary for tracking player behavior and state for anti-cheat checks.
 * @param {mc.Player} player - The player object for whom to initialize data.
 * @param {number} currentTick - The current game tick, used for initializing time-sensitive fields.
 * @returns {import('../types.js').PlayerAntiCheatData} The default player data object.
 */
export function initializeDefaultPlayerData(player, currentTick) {
    debugLog(`Initializing default pData for ${player.nameTag} (ID: ${player.id})`, player.nameTag);
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
        lastCombatInteractionTime: 0,
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
            spamRepeat: { count: 0, lastDetectionTime: 0 },
            chat_spam_fast: { count: 0, lastDetectionTime: 0 },
            chat_spam_max_words: { count: 0, lastDetectionTime: 0 },
            // Add new specific flag types here as needed
        },
        lastFlagType: "",
        isWatched: false,
        lastChatMessageTimestamp: 0,
        lastPitch: player.getRotation().x,
        lastYaw: player.getRotation().y,
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
        itemUseTimestamps: {},
        recentPlaceTimestamps: [],
        lastJumpBoostLevel: 0,
        lastSlowFallingTicks: 0,
        lastLevitationTicks: 0,
        lastTookDamageTick: 0,
        lastUsedElytraTick: 0,
        lastUsedRiptideTick: 0,
        lastOnSlimeBlockTick: 0,
        lastBlindnessTicks: 0,
        previousSelectedSlotIndex: player.selectedSlotIndex,
        lastSelectedSlotChangeTick: 0,
        isAttemptingBlockBreak: false,
        breakingBlockTypeId: null,
        slotAtBreakAttemptStart: 0,
        breakAttemptTick: 0,
        switchedToOptimalToolForBreak: false,
        optimalToolSlotForLastBreak: null,
        lastBreakCompleteTick: 0,
        breakingBlockLocation: null,
        blockBrokenWithOptimalTypeId: null,
        optimalToolTypeIdForLastBreak: null,
        breakStartTimeMs: 0,
        breakStartTickGameTime: 0,
        expectedBreakDurationTicks: 0,
        toolUsedForBreakAttempt: null,
        lastKnownNameTag: player.nameTag,
        lastNameTagChangeTick: currentTick,
        muteInfo: null,
        banInfo: null,
        isDirtyForSave: false,
    };
}

/**
 * Ensures that a player has their anti-cheat data initialized.
 * It attempts to load persisted data from dynamic properties. If found, it merges this
 * with a fresh default data object, prioritizing persisted values for relevant fields
 * and re-initializing session-specific fields. If no persisted data is found,
 * it uses a fresh default data object. Also handles expiry of mutes/bans.
 * @param {mc.Player} player - The player object for whom to ensure data initialization.
 * @param {number} currentTick - The current game tick, used for initializing time-sensitive fields.
 * @returns {Promise<import('../types.js').PlayerAntiCheatData>} The initialized or loaded player data.
 */
export async function ensurePlayerDataInitialized(player, currentTick) {
    if (playerData.has(player.id)) {
        return playerData.get(player.id);
    }

    let newPData = initializeDefaultPlayerData(player, currentTick);
    const loadedData = await loadPlayerDataFromDynamicProperties(player);

    if (loadedData) {
        debugLog(`Merged persisted pData for ${player.nameTag}. Session-only fields (e.g., lastAttackTick, recentHits, isUsingConsumable, etc.) reset to defaults.`, player.nameTag);

        // Merge loaded data into newPData. Persisted fields will overwrite defaults.
        newPData = { ...newPData, ...loadedData };

        // Ensure flags object and totalFlags are valid after merge
        // Start with fresh default flags, then merge any loaded flags over them.
        const defaultFlags = initializeDefaultPlayerData(player, currentTick).flags;
        newPData.flags = { ...defaultFlags, ...loadedData.flags };
        if (typeof newPData.flags.totalFlags !== 'number' || isNaN(newPData.flags.totalFlags)) {
            newPData.flags.totalFlags = 0;
            // Recalculate totalFlags from individual flag counts if necessary
            for (const flagKey in newPData.flags) {
                if (flagKey !== "totalFlags" && newPData.flags[flagKey] && typeof newPData.flags[flagKey].count === 'number') {
                    newPData.flags.totalFlags += newPData.flags[flagKey].count;
                }
            }
        }

        newPData.isDirtyForSave = false; // Data just loaded, not dirty yet

        // Re-initialize session-only fields that should not carry over from persisted data or need resetting
        newPData.lastPosition = player.location;
        newPData.previousPosition = player.location;
        newPData.velocity = player.getVelocity();
        newPData.previousVelocity = { x: 0, y: 0, z: 0 };
        // consecutiveOffGroundTicks, fallDistance, consecutiveOnGroundSpeedingTicks are intentionally loaded from persistedData
        newPData.lastOnGroundTick = currentTick;
        newPData.lastOnGroundPosition = player.location;
        newPData.isTakingFallDamage = false;
        newPData.lastPitch = player.getRotation().x;
        newPData.lastYaw = player.getRotation().y;
        newPData.lastAttackTick = 0;
        newPData.recentHits = [];
        newPData.isUsingConsumable = false;
        newPData.isChargingBow = false;
        newPData.isUsingShield = false;
        newPData.lastItemUseTick = 0;
        newPData.recentBlockPlacements = [];
        newPData.lastPillarBaseY = 0;
        newPData.consecutivePillarBlocks = 0;
        newPData.lastPillarTick = 0;
        newPData.currentPillarX = null;
        newPData.currentPillarZ = null;
        newPData.consecutiveDownwardBlocks = 0;
        newPData.lastDownwardScaffoldTick = 0;
        newPData.lastDownwardScaffoldBlockLocation = null;
        newPData.itemUseTimestamps = {};
        newPData.recentPlaceTimestamps = [];
        newPData.lastJumpBoostLevel = 0;
        newPData.lastSlowFallingTicks = 0;
        newPData.lastLevitationTicks = 0;
        newPData.lastTookDamageTick = 0;
        newPData.lastUsedElytraTick = 0;
        newPData.lastUsedRiptideTick = 0;
        newPData.lastOnSlimeBlockTick = 0;
        newPData.lastBlindnessTicks = 0;
        newPData.previousSelectedSlotIndex = player.selectedSlotIndex;
        newPData.lastSelectedSlotChangeTick = currentTick; // Reset to current to avoid false positives on join
        newPData.isAttemptingBlockBreak = false;
        newPData.breakingBlockTypeId = null;
        newPData.slotAtBreakAttemptStart = player.selectedSlotIndex;
        newPData.breakAttemptTick = 0;
        newPData.switchedToOptimalToolForBreak = false;
        newPData.optimalToolSlotForLastBreak = null;
        newPData.lastBreakCompleteTick = 0;
        newPData.breakingBlockLocation = null;
        newPData.blockBrokenWithOptimalTypeId = null;
        newPData.optimalToolTypeIdForLastBreak = null;
        newPData.breakStartTimeMs = 0;
        newPData.breakStartTickGameTime = 0;
        newPData.expectedBreakDurationTicks = 0;
        newPData.toolUsedForBreakAttempt = null;
        newPData.lastKnownNameTag = player.nameTag;
        newPData.lastNameTagChangeTick = currentTick;
        newPData.recentMessages = [];
        // lastCombatInteractionTime is loaded if present, otherwise defaults from initializeDefaultPlayerData
        newPData.lastCombatInteractionTime = loadedData.lastCombatInteractionTime || 0;

    } else {
        debugLog(`PDM:ensureInit: No persisted data for ${player.nameTag}. Using fresh default data.`, player.nameTag);
    }

    // Check for expired mutes/bans after loading/initializing
    if (newPData.muteInfo && newPData.muteInfo.unmuteTime !== Infinity && Date.now() >= newPData.muteInfo.unmuteTime) {
        debugLog(`PDM:ensureInit: Mute for ${newPData.playerNameTag || player.nameTag} expired on load. Clearing.`, newPData.isWatched ? (newPData.playerNameTag || player.nameTag) : null);
        newPData.muteInfo = null;
        newPData.isDirtyForSave = true; // Mark dirty if mute was cleared
    }

    if (newPData.banInfo && newPData.banInfo.unbanTime !== Infinity && Date.now() >= newPData.banInfo.unbanTime) {
        debugLog(`PDM:ensureInit: Ban for ${newPData.playerNameTag || player.nameTag} expired on load. Clearing.`, newPData.isWatched ? (newPData.playerNameTag || player.nameTag) : null);
        newPData.banInfo = null;
        newPData.isDirtyForSave = true; // Mark dirty if ban was cleared
    }

    playerData.set(player.id, newPData);
    return newPData;
}

/**
 * Cleans up runtime player data for players who are no longer present in the game.
 * This is typically called periodically to free up memory.
 * @param {mc.Player[]} activePlayers - An array of currently active (online) player objects.
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
 * Updates transient (session-only) player data that changes frequently, such as position,
 * velocity, and on-ground status. This should be called every tick for each player.
 * @param {mc.Player} player - The player object.
 * @param {import('../types.js').PlayerAntiCheatData} pData - The player's current anti-cheat data object to be updated.
 * @param {number} currentTick - The current game tick.
 * @returns {void}
 */
export function updateTransientPlayerData(player, pData, currentTick) {
    const rotation = player.getRotation();
    pData.lastPitch = rotation.x;
    pData.lastYaw = rotation.y;

    pData.previousVelocity = { ...pData.velocity };
    pData.velocity = player.getVelocity();
    pData.previousPosition = { ...pData.lastPosition };
    pData.lastPosition = player.location;

    if (!pData.playerNameTag) { // Ensure playerNameTag is set, e.g., if loaded from older data
        pData.playerNameTag = player.nameTag;
    }

    if (player.isOnGround) {
        pData.consecutiveOffGroundTicks = 0;
        pData.lastOnGroundTick = currentTick;
        pData.lastOnGroundPosition = player.location;
    } else {
        pData.consecutiveOffGroundTicks++;
    }

    if (player.selectedSlotIndex !== pData.previousSelectedSlotIndex) {
        pData.lastSelectedSlotChangeTick = currentTick;
        pData.previousSelectedSlotIndex = player.selectedSlotIndex;
    }

    if (pData.isWatched) { // debugLog itself will check enableDebugLogging
        const transientSnapshot = {
            vx: player.getVelocity().x.toFixed(3),
            vy: player.getVelocity().y.toFixed(3),
            vz: player.getVelocity().z.toFixed(3),
            pitch: pData.lastPitch.toFixed(3),
            yaw: pData.lastYaw.toFixed(3),
            isSprinting: player.isSprinting,
            isSneaking: player.isSneaking,
            isOnGround: player.isOnGround,
            fallDistance: player.fallDistance.toFixed(3)
        };
        debugLog(`Transient update for ${player.nameTag} (Tick: ${currentTick}): ${JSON.stringify(transientSnapshot)}`, player.nameTag);
    }
}

/**
 * Adds a flag to a player's anti-cheat data, warns the player, and notifies administrators.
 * Marks the player's data as dirty, requiring a save.
 * @param {mc.Player} player - The player to flag.
 * @param {string} flagType - The type of flag (e.g., "fly", "speed", "combat_cps"). This should correspond to a key in `pData.flags`.
 * @param {string} reasonMessage - The message/reason for the flag, shown to the player.
 * @param {string} [detailsForNotify=""] - Additional details to include in admin notifications.
 * @returns {void}
 */
export function addFlag(player, flagType, reasonMessage, detailsForNotify = "") {
    const pData = getPlayerData(player.id);
    if (!pData) {
        debugLog(`PDM:addFlag: No pData for ${player.nameTag}. Cannot add flag: ${flagType}.`, player.nameTag);
        return;
    }
    if (!pData.flags[flagType]) {
        debugLog(`PDM:addFlag: New flagType "${flagType}" for ${player.nameTag}. Initializing structure in pData.flags.`, player.nameTag);
        pData.flags[flagType] = { count: 0, lastDetectionTime: 0 };
    }
    pData.flags[flagType].count++;
    pData.flags[flagType].lastDetectionTime = Date.now();
    pData.flags.totalFlags = (pData.flags.totalFlags || 0) + 1;
    pData.lastFlagType = flagType;
    pData.isDirtyForSave = true;

    const fullReason = `${reasonMessage} ${detailsForNotify}`.trim();
    warnPlayer(player, reasonMessage); // Assumes warnPlayer is available from playerUtils
    notifyAdmins(`Flagged ${player.nameTag} for ${flagType}. ${detailsForNotify}`, player, pData); // Assumes notifyAdmins is available
    debugLog(`FLAG: ${player.nameTag} for ${flagType}. Reason: "${fullReason}". Total Flags: ${pData.flags.totalFlags}. Count[${flagType}]: ${pData.flags[flagType].count}`, player.nameTag);

    // Prepare dependencies for AutoModManager
    const automodDependencies = {
        config: config, // The main config module/object
        automodConfig: automodConfig, // The automod specific config
        playerUtils: { debugLog, warnPlayer, notifyAdmins }, // Constructing playerUtils object
        logManager: null // logManager is not directly available in addFlag's current scope
    };

    try {
        // Call processAutoModActions. checkType is 'flagType' in this context.
        processAutoModActions(player, pData, flagType, automodDependencies);
    } catch (e) {
        console.error(`[playerDataManager] Error calling processAutoModActions for ${player.nameTag}: ${e}\n${e.stack}`);
        // debugLog is directly available in this file
        debugLog(`Error during processAutoModActions for ${player.nameTag}, checkType ${flagType}: ${e}`, player.nameTag);
        // Decide if failure in automod should affect anything else. Usually, it should be self-contained.
    }
}

/**
 * Adds a mute to a player's data. Mute information is persisted.
 * @param {mc.Player} player - The player to mute.
 * @param {number | Infinity} durationMs - The duration of the mute in milliseconds. Use `Infinity` for a permanent mute.
 * @param {string} reason - The reason for the mute.
 * @returns {boolean} True if the mute was successfully applied, false otherwise (e.g., invalid arguments, no player data).
 */
export function addMute(player, durationMs, reason) {
    if (!player || typeof durationMs !== 'number' || durationMs <= 0) {
        debugLog(`PDM:addMute: Invalid arguments provided. Player: ${player?.nameTag}, Duration: ${durationMs}`, player?.nameTag);
        return false;
    }
    const pData = getPlayerData(player.id);
    if (!pData) {
        debugLog(`PDM:addMute: No pData found for player ${player.nameTag}. Cannot apply mute.`, player.nameTag);
        return false;
    }

    const unmuteTime = (durationMs === Infinity) ? Infinity : Date.now() + durationMs;
    const muteReason = reason || "Muted by admin.";
    pData.muteInfo = { unmuteTime, reason: muteReason };
    pData.isDirtyForSave = true;

    let logMsg = `PDM:addMute: Player ${player.nameTag} muted. Reason: "${muteReason}".`;
    if (durationMs === Infinity) {
        logMsg += " Duration: Permanent.";
    } else {
        logMsg += ` Unmute time: ${new Date(unmuteTime).toISOString()}.`;
    }
    debugLog(logMsg, pData.isWatched ? player.nameTag : null);
    return true;
}

/**
 * Removes an active mute from a player's data. Marks data as dirty if a mute was removed.
 * @param {mc.Player} player - The player to unmute.
 * @returns {boolean} True if the player was successfully unmuted, false if they were not muted or an error occurred.
 */
export function removeMute(player) {
    if (!player) {
        debugLog(`PDM:removeMute: Invalid player object provided.`);
        return false;
    }
    const pData = getPlayerData(player.id);
    if (!pData) {
        debugLog(`PDM:removeMute: No pData found for player ${player.nameTag}. Cannot unmute.`, player.nameTag);
        return false;
    }

    if (pData.muteInfo) {
        pData.muteInfo = null;
        pData.isDirtyForSave = true;
        debugLog(`PDM:removeMute: Player ${player.nameTag} has been unmuted.`, pData.isWatched ? player.nameTag : null);
        return true;
    } else {
        debugLog(`PDM:removeMute: Player ${player.nameTag} was not muted or already unmuted. No action taken.`, pData.isWatched ? player.nameTag : null);
        return false;
    }
}

/**
 * Retrieves a player's current mute information. If the mute has expired, it is cleared.
 * @param {mc.Player} player - The player whose mute information is requested.
 * @returns {import('../types.js').PlayerMuteInfo | null} The mute information object (with `unmuteTime` and `reason`),
 * or `null` if the player is not muted or their mute has expired.
 */
export function getMuteInfo(player) {
    if (!player) return null;
    const pData = getPlayerData(player.id);
    if (!pData || !pData.muteInfo) return null;

    const mute = pData.muteInfo;
    if (mute.unmuteTime !== Infinity && Date.now() >= mute.unmuteTime) {
        pData.muteInfo = null; // Clear expired mute
        pData.isDirtyForSave = true;
        debugLog(`PDM:getMuteInfo: Mute for player ${player.nameTag} expired and has been removed.`, pData.isWatched ? player.nameTag : null);
        return null;
    }
    return mute;
}

/**
 * Checks if a player is currently muted, considering mute expiration.
 * @param {mc.Player} player - The player to check.
 * @returns {boolean} True if the player is currently muted, false otherwise.
 */
export function isMuted(player) {
    return getMuteInfo(player) !== null;
}

/**
 * Adds a ban to a player's data. Ban information is persisted.
 * @param {mc.Player} player - The player to ban.
 * @param {number | Infinity} durationMs - The duration of the ban in milliseconds. Use `Infinity` for a permanent ban.
 * @param {string} reason - The reason for the ban.
 * @param {string} bannedBy - The nameTag of the admin issuing the ban.
 * @returns {boolean} True if the ban was successfully applied, false otherwise.
 */
export function addBan(player, durationMs, reason, bannedBy) {
    if (!player || typeof durationMs !== 'number' || durationMs <= 0 || typeof bannedBy !== 'string') {
        debugLog(`PDM:addBan: Invalid arguments. Player: ${player?.nameTag}, Duration: ${durationMs}, BannedBy: ${bannedBy}`, player?.nameTag);
        return false;
    }
    const pData = getPlayerData(player.id);
    if (!pData) {
        debugLog(`PDM:addBan: No pData for ${player.nameTag}. Cannot apply ban.`, player.nameTag);
        return false;
    }

    const currentTime = Date.now();
    const unbanTime = (durationMs === Infinity) ? Infinity : currentTime + durationMs;
    const banReason = reason || "Banned by admin.";

    pData.banInfo = {
        xuid: player.id, // Assuming player.id is the XUID
        playerName: player.nameTag,
        banTime: currentTime,
        unbanTime,
        reason: banReason,
        bannedBy: bannedBy
    };
    pData.isDirtyForSave = true;

    let logMsg = `PDM:addBan: Player ${player.nameTag} (XUID: ${player.id}) banned by ${bannedBy}. Reason: "${banReason}".`;
    if (durationMs === Infinity) {
        logMsg += " Duration: Permanent.";
    } else {
        logMsg += ` Unban time: ${new Date(unbanTime).toISOString()}.`;
    }
    debugLog(logMsg, pData.isWatched ? player.nameTag : null);
    return true;
}

/**
 * Removes an active ban from a player's data. Marks data as dirty if a ban was removed.
 * @param {mc.Player} player - The player to unban.
 * @returns {boolean} True if the player was successfully unbanned, false if they were not banned or an error occurred.
 */
export function removeBan(player) {
    if (!player) {
        debugLog(`PDM:removeBan: Invalid player object provided.`);
        return false;
    }
    const pData = getPlayerData(player.id);
    if (!pData) {
        debugLog(`PDM:removeBan: No pData found for player ${player.nameTag}. Cannot unban.`, player.nameTag);
        return false;
    }

    if (pData.banInfo) {
        pData.banInfo = null;
        pData.isDirtyForSave = true;
        debugLog(`PDM:removeBan: Player ${player.nameTag} has been unbanned.`, pData.isWatched ? player.nameTag : null);
        return true;
    } else {
        debugLog(`PDM:removeBan: Player ${player.nameTag} was not banned or already unbanned. No action taken.`, pData.isWatched ? player.nameTag : null);
        return false;
    }
}

/**
 * Retrieves a player's current ban information. If the ban has expired, it is cleared.
 * @param {mc.Player} player - The player whose ban information is requested.
 * @returns {import('../types.js').PlayerBanInfo | null} The ban information object (with `unbanTime` and `reason`),
 * or `null` if the player is not banned or their ban has expired.
 */
export function getBanInfo(player) {
    if (!player) return null;
    const pData = getPlayerData(player.id);
    if (!pData || !pData.banInfo) return null;

    const currentBanInfo = pData.banInfo;
    if (currentBanInfo.unbanTime !== Infinity && Date.now() >= currentBanInfo.unbanTime) {
        pData.banInfo = null; // Clear expired ban
        pData.isDirtyForSave = true;
        debugLog(`PDM:getBanInfo: Ban for player ${player.nameTag} expired and has been removed.`, pData.isWatched ? player.nameTag : null);
        return null;
    }
    return currentBanInfo;
}

/**
 * Checks if a player is currently banned, considering ban expiration.
 * @param {mc.Player} player - The player to check.
 * @returns {boolean} True if the player is currently banned, false otherwise.
 */
export function isBanned(player) {
    return getBanInfo(player) !== null;
}

/**
 * Sets or updates the runtime anti-cheat data for a specific player in the in-memory store.
 * This is primarily used when initializing or loading data into the manager.
 * @param {string} playerId - The ID of the player.
 * @param {import('../types.js').PlayerAntiCheatData} data - The player data object to set.
 * @returns {void}
 */
export function setPlayerData(playerId, data) {
    if (!playerId || !data) {
        debugLog("PDM:setPlayerData: Invalid playerId or data provided. Cannot set player data.", null);
        return;
    }
    playerData.set(playerId, data);
}

/**
 * Saves player data to dynamic properties if it has been marked as dirty (`isDirtyForSave` is true).
 * Resets the `isDirtyForSave` flag to false after a successful save attempt.
 * @param {mc.Player} player - The player whose data might need saving.
 * @returns {Promise<boolean>} True if data was saved (or attempted to be saved), false if player or pData is invalid, or if data was not dirty.
 */
export async function saveDirtyPlayerData(player) {
    if (!player) return false;
    const pData = playerData.get(player.id);

    if (pData && pData.isDirtyForSave) {
        debugLog(`PDM:saveDirty: Saving dirty data for ${player.nameTag}.`, pData.isWatched ? player.nameTag : null);
        await prepareAndSavePlayerData(player); // This function handles the actual saving
        pData.isDirtyForSave = false; // Reset flag regardless of save success to avoid save loops on non-critical errors
        return true;
    }
    return false; // Not dirty, or no pData
}

[end of AntiCheatsBP/scripts/core/playerDataManager.js]
