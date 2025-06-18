/**
 * @file AntiCheatsBP/scripts/core/playerDataManager.js
 * Manages all player-specific data used by the AntiCheat system. This includes runtime data (pData),
 * persistence via dynamic properties, and helper functions for data manipulation like adding flags,
 * mutes, and bans.
 * @version 1.1.1
 */
import * as mc from '@minecraft/server';
// warnPlayer, notifyAdmins, getString will come from 'dependencies' once all functions are refactored.
// debugLog from playerUtils is used via dependencies where available, or the global import for module-level calls.
import { debugLog as globalDebugLog } from '../utils/playerUtils.js'; // Renamed to avoid conflict
// getString is removed as addMute, addBan etc. will get it from dependencies. Other direct uses need checking or refactoring.
import { processAutoModActions } from './automodManager.js';


const playerData = new Map();

/** @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData */

const persistedPlayerDataKeys = [
    "flags", "isWatched", "lastFlagType", "playerNameTag",
    "attackEvents", "lastAttackTime", "blockBreakEvents",
    "consecutiveOffGroundTicks", "fallDistance",
    "consecutiveOnGroundSpeedingTicks", "muteInfo", "banInfo",
    "lastCombatInteractionTime", "lastViolationDetailsMap", "automodState"
];

/**
 * Retrieves a player's anti-cheat data.
 * @param {string} playerId - The ID of the player.
 * @returns {PlayerAntiCheatData | undefined} The player's data, or undefined if not found.
 */
export function getPlayerData(playerId) {
    return playerData.get(playerId);
}

/**
 * Retrieves all player data objects currently managed.
 * @returns {IterableIterator<PlayerAntiCheatData>} An iterator for all player data values.
 */
export function getAllPlayerDataValues() {
    return playerData.values();
}

/**
 * Saves specified player data to dynamic properties.
 * @param {mc.Player} player - The player whose data is being saved.
 * @param {object} pDataToSave - The player data object to save (typically a subset of PlayerAntiCheatData).
 * @param {import('../../types.js').CommandDependencies} dependencies - Standard dependencies object.
 * @returns {Promise<boolean>} True if saving was successful, false otherwise.
 */
export async function savePlayerDataToDynamicProperties(player, pDataToSave, dependencies) {
    const { playerUtils } = dependencies;
    if (!player || !pDataToSave) {
        playerUtils.debugLog(dependencies, "PDM:save: Invalid player or pDataToSave", player?.nameTag);
        return false;
    }
    const dynamicPropertyKey = "anticheat:pdata_v1";
    let jsonString;
    try {
        jsonString = JSON.stringify(pDataToSave);
    } catch (error) {
        playerUtils.debugLog(dependencies, `PDM:save: Fail stringify ${player.nameTag}. E: ${error}`, player.nameTag);
        return false;
    }
    if (jsonString.length > 32760) {
        playerUtils.debugLog(dependencies, `PDM:save: pData too large for ${player.nameTag} (${jsonString.length}b). Cannot save to dynamic properties.`, player.nameTag);
        return false;
    }
    try {
        player.setDynamicProperty(dynamicPropertyKey, jsonString);
        return true;
    } catch (error) {
        playerUtils.debugLog(dependencies, `PDM:save: Fail setDynamicProp for ${player.nameTag}. E: ${error}`, player.nameTag);
        if (error.message) playerUtils.debugLog(dependencies, `PDM:save: Error message: ${error.message}`, player.nameTag);
        return false;
    }
}

/**
 * Loads player data from dynamic properties.
 * @param {mc.Player} player - The player whose data is being loaded.
 * @param {import('../../types.js').CommandDependencies} dependencies - Standard dependencies object.
 * @returns {Promise<object|null>} The loaded player data object, or null if not found or an error occurs.
 */
export async function loadPlayerDataFromDynamicProperties(player, dependencies) {
    const { playerUtils } = dependencies;
    if (!player) {
        playerUtils.debugLog(dependencies, "PDM:load: Invalid player object provided.");
        return null;
    }
    const dynamicPropertyKey = "anticheat:pdata_v1";
    let jsonString;
    try {
        jsonString = player.getDynamicProperty(dynamicPropertyKey);
    } catch (error) {
        playerUtils.debugLog(dependencies, `PDM:load: Failed to getDynamicProperty for ${player.nameTag}. E: ${error}`, player.nameTag);
        if (error.message) playerUtils.debugLog(dependencies, `PDM:load: Error message: ${error.message}`, player.nameTag);
        return null;
    }

    if (typeof jsonString === 'string') {
        try {
            const parsedData = JSON.parse(jsonString);
            playerUtils.debugLog(dependencies, `PDM:load: Successfully loaded and parsed data for ${player.nameTag}.`, player.nameTag);
            return parsedData;
        } catch (error) {
            playerUtils.debugLog(dependencies, `PDM:load: Failed to parse JSON for ${player.nameTag}. JSON: "${jsonString}". E: ${error}`, player.nameTag);
            if (error.message) playerUtils.debugLog(dependencies, `PDM:load: Parse error message: ${error.message}`, player.nameTag);
            return null;
        }
    } else if (typeof jsonString === 'undefined') {
        playerUtils.debugLog(dependencies, `PDM:load: No dynamic property '${dynamicPropertyKey}' found for ${player.nameTag}.`, player.nameTag);
        return null;
    } else {
        playerUtils.debugLog(dependencies, `PDM:load: Unexpected data type for dynamic property '${dynamicPropertyKey}' for ${player.nameTag}: ${typeof jsonString}`, player.nameTag);
        return null;
    }
}

/**
 * Prepares and saves the full runtime player data (pData) to persistent storage.
 * This typically involves filtering for persistable keys.
 * @param {mc.Player} player - The player whose data is to be saved.
 * @param {import('../../types.js').CommandDependencies} dependencies - Standard dependencies object.
 * @returns {Promise<void>}
 */
export async function prepareAndSavePlayerData(player, dependencies) {
    const { playerUtils } = dependencies;
    if (!player) return;
    const pData = playerData.get(player.id);
    if (pData) {
        const persistedPData = {};
        for (const key of persistedPlayerDataKeys) {
            if (Object.prototype.hasOwnProperty.call(pData, key)) {
                persistedPData[key] = pData[key];
            }
        }
        await savePlayerDataToDynamicProperties(player, persistedPData, dependencies);
    } else {
        playerUtils.debugLog(dependencies, `PDM:prepSave: No runtime pData found for ${player.nameTag}. Cannot save.`, player.nameTag);
    }
}

/**
 * Initializes and returns a new default PlayerAntiCheatData object for a player.
 * @param {mc.Player} player - The player for whom to initialize data.
 * @param {number} currentTick - The current game tick.
 * @param {import('../../types.js').CommandDependencies} dependencies - Standard dependencies object.
 * @returns {PlayerAntiCheatData} The default player data object.
 */
export function initializeDefaultPlayerData(player, currentTick, dependencies) {
    const { playerUtils } = dependencies;
    playerUtils.debugLog(dependencies, `Initializing default pData for ${player.nameTag} (ID: ${player.id})`, player.nameTag);
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
            chatSpamFast: { count: 0, lastDetectionTime: 0 },
            chatSpamMaxWords: { count: 0, lastDetectionTime: 0 },
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
        joinTime: 0,
        lastGameMode: player.gameMode,
        lastDimensionId: player.dimension.id,
        isDirtyForSave: false,
        lastViolationDetailsMap: {},
        automodState: {},
        lastCheckNameSpoofTick: 0,
        lastCheckAntiGMCTick: 0,
        lastCheckNetherRoofTick: 0,
        lastCheckAutoToolTick: 0,
        lastCheckFlatRotationBuildingTick: 0,
    };
}

/**
 * Ensures that a player's data is initialized, loading from persistence if available,
 * or creating default data otherwise.
 * @param {mc.Player} player - The player instance.
 * @param {number} currentTick - The current game tick, used if initializing default data.
 * @param {import('../../types.js').CommandDependencies} dependencies - Standard dependencies object.
 * @returns {Promise<PlayerAntiCheatData>} The player's anti-cheat data.
 */
export async function ensurePlayerDataInitialized(player, currentTick, dependencies) {
    const { playerUtils } = dependencies;
    if (playerData.has(player.id)) {
        return playerData.get(player.id);
    }

    let newPData = initializeDefaultPlayerData(player, currentTick, dependencies);
    const loadedData = await loadPlayerDataFromDynamicProperties(player, dependencies);

    if (loadedData) {
        playerUtils.debugLog(dependencies, `Merged persisted pData for ${player.nameTag}. Session-only fields (e.g., lastAttackTick, recentHits, isUsingConsumable, etc.) reset to defaults.`, player.nameTag);
        newPData = { ...newPData, ...loadedData };
        const defaultFlags = initializeDefaultPlayerData(player, currentTick, dependencies).flags;
        newPData.flags = { ...defaultFlags, ...loadedData.flags };
        if (typeof newPData.flags.totalFlags !== 'number' || isNaN(newPData.flags.totalFlags)) {
            newPData.flags.totalFlags = 0;
            for (const flagKey in newPData.flags) {
                if (flagKey !== "totalFlags" && newPData.flags[flagKey] && typeof newPData.flags[flagKey].count === 'number') {
                    newPData.flags.totalFlags += newPData.flags[flagKey].count;
                }
            }
        }
        if (!newPData.lastViolationDetailsMap) {
            newPData.lastViolationDetailsMap = {};
        }
        if (!newPData.automodState) {
            newPData.automodState = {};
        }
        if (typeof newPData.joinTime === 'undefined') newPData.joinTime = 0;
        if (typeof newPData.lastGameMode === 'undefined') newPData.lastGameMode = player.gameMode;
        if (typeof newPData.lastDimensionId === 'undefined') newPData.lastDimensionId = player.dimension.id;
        newPData.isDirtyForSave = false;
        newPData.lastPosition = player.location;
        newPData.previousPosition = player.location;
        newPData.velocity = player.getVelocity();
        newPData.previousVelocity = { x: 0, y: 0, z: 0 };
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
        newPData.lastSelectedSlotChangeTick = currentTick;
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
        newPData.lastCombatInteractionTime = loadedData.lastCombatInteractionTime || 0;
        if (typeof newPData.lastCheckNameSpoofTick === 'undefined') newPData.lastCheckNameSpoofTick = 0;
        if (typeof newPData.lastCheckAntiGMCTick === 'undefined') newPData.lastCheckAntiGMCTick = 0;
        if (typeof newPData.lastCheckNetherRoofTick === 'undefined') newPData.lastCheckNetherRoofTick = 0;
        if (typeof newPData.lastCheckAutoToolTick === 'undefined') newPData.lastCheckAutoToolTick = 0;
        if (typeof newPData.lastCheckFlatRotationBuildingTick === 'undefined') newPData.lastCheckFlatRotationBuildingTick = 0;
        if (typeof newPData.lastOnSlimeBlockTick === 'undefined') newPData.lastOnSlimeBlockTick = 0;
    } else {
        playerUtils.debugLog(dependencies, `PDM:ensureInit: No persisted data for ${player.nameTag}. Using fresh default data.`, player.nameTag);
    }

    if (newPData.muteInfo && newPData.muteInfo.unmuteTime !== Infinity && Date.now() >= newPData.muteInfo.unmuteTime) {
        playerUtils.debugLog(dependencies, `PDM:ensureInit: Mute for ${newPData.playerNameTag || player.nameTag} expired on load. Clearing.`, newPData.isWatched ? (newPData.playerNameTag || player.nameTag) : null);
        newPData.muteInfo = null;
        newPData.isDirtyForSave = true;
    }
    if (newPData.banInfo && newPData.banInfo.unbanTime !== Infinity && Date.now() >= newPData.banInfo.unbanTime) {
        playerUtils.debugLog(dependencies, `PDM:ensureInit: Ban for ${newPData.playerNameTag || player.nameTag} expired on load. Clearing.`, newPData.isWatched ? (newPData.playerNameTag || player.nameTag) : null);
        newPData.banInfo = null;
        newPData.isDirtyForSave = true;
    }
    playerData.set(player.id, newPData);
    return newPData;
}

/**
 * Removes runtime data for players who are no longer online.
 * @param {mc.Player[]} activePlayers - An array of currently active players.
 * @param {import('../../types.js').CommandDependencies} dependencies - Standard dependencies object.
 * @returns {void}
 */
export function cleanupActivePlayerData(activePlayers, dependencies) {
    const { playerUtils } = dependencies;
    const activePlayerIds = new Set();
    for (const player of activePlayers) {
        activePlayerIds.add(player.id);
    }
    for (const playerId of playerData.keys()) {
        if (!activePlayerIds.has(playerId)) {
            const removedPData = playerData.get(playerId);
            playerUtils.debugLog(dependencies, `PDM:cleanup: Removed runtime data for ${removedPData?.playerNameTag || playerId}.`, removedPData?.isWatched ? (removedPData.playerNameTag || playerId) : null);
            playerData.delete(playerId);
        }
    }
}

/**
 * Updates transient (non-persisted, per-session) player data fields.
 * This is typically called every tick for each online player.
 * @param {mc.Player} player - The player instance.
 * @param {PlayerAntiCheatData} pData - The player's current anti-cheat data.
 * @param {import('../../types.js').CommandDependencies} dependencies - Standard dependencies object.
 * @returns {void}
 */
export function updateTransientPlayerData(player, pData, dependencies) {
    const { currentTick, playerUtils, config, logManager } = dependencies;

    const rotation = player.getRotation();
    pData.lastPitch = rotation.x;
    pData.lastYaw = rotation.y;
    pData.previousVelocity = { ...pData.velocity };
    pData.velocity = player.getVelocity();
    pData.previousPosition = { ...pData.lastPosition };
    pData.lastPosition = player.location;
    if (!pData.playerNameTag) {
        pData.playerNameTag = player.nameTag;
    }
    if (player.isOnGround) {
        pData.consecutiveOffGroundTicks = 0;
        pData.lastOnGroundTick = currentTick;
        pData.lastOnGroundPosition = player.location;

        try {
            const feetPos = { x: Math.floor(pData.lastPosition.x), y: Math.floor(pData.lastPosition.y), z: Math.floor(pData.lastPosition.z) };
            const blockBelowFeet = player.dimension.getBlock({x: feetPos.x, y: feetPos.y -1, z: feetPos.z});
            const blockAtFeet = player.dimension.getBlock(feetPos);

            if ((blockBelowFeet && blockBelowFeet.typeId === 'minecraft:slime_block') || (blockAtFeet && blockAtFeet.typeId === 'minecraft:slime_block')) {
                pData.lastOnSlimeBlockTick = currentTick;
                if (playerUtils.debugLog && pData.isWatched && config.enableDebugLogging) {
                    playerUtils.debugLog(dependencies, `[PlayerDataManager] Player ${pData.playerNameTag || player.nameTag} on slime block at tick ${currentTick}.`, pData.playerNameTag || player.nameTag);
                }
            }
        } catch (e) {
            if (logManager && logManager.addLog) {
                logManager.addLog('error', {
                    message: e.message,
                    player: pData.playerNameTag || player.nameTag,
                    context: 'slime_block_check'
                }, dependencies);
            }
            if (playerUtils.debugLog && config.enableDebugLogging) {
                playerUtils.debugLog(dependencies, `[PlayerDataManager] Error checking for slime block under ${pData.playerNameTag || player.nameTag}: ${e.message}`, pData.playerNameTag || player.nameTag);
            } else if (!logManager || !logManager.addLog) {
                console.warn(`[PlayerDataManager] Error checking for slime block under ${pData.playerNameTag || player.nameTag}: ${e.message}`);
            }
        }

    } else {
        pData.consecutiveOffGroundTicks++;
    }
    if (player.selectedSlotIndex !== pData.previousSelectedSlotIndex) {
        pData.lastSelectedSlotChangeTick = currentTick;
        pData.previousSelectedSlotIndex = player.selectedSlotIndex;
    }
    if (pData.lastGameMode !== player.gameMode) {
        pData.lastGameMode = player.gameMode;
        pData.isDirtyForSave = true;
    }
    if (pData.lastDimensionId !== player.dimension.id) {
        pData.lastDimensionId = player.dimension.id;
        pData.isDirtyForSave = true;
    }
    if (pData.isWatched) {
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
        playerUtils.debugLog(dependencies, `Transient update for ${pData.playerNameTag || player.nameTag} (Tick: ${currentTick}): ${JSON.stringify(transientSnapshot)}`, pData.playerNameTag || player.nameTag);
    }
}

/**
 * Adds a flag to a player's data, processes automod actions, and notifies relevant parties.
 * @param {mc.Player} player - The player to flag.
 * @param {string} flagType - The type of flag (e.g., "fly", "speed").
 * @param {string} reasonMessage - The reason for the flag, often shown to the player.
 * @param {string | object} [detailsForNotify=""] - Additional details for notifications or logs.
 *                                                 If an object with itemTypeId, it's stored in lastViolationDetailsMap.
 * @param {import('../../types.js').CommandDependencies} dependencies - Standard dependencies object.
 * @returns {Promise<void>}
 */
export async function addFlag(player, flagType, reasonMessage, detailsForNotify = "", dependencies) {
    const { playerUtils, getString, config, logManager } = dependencies;
    const pData = getPlayerData(player.id);
    if (!pData) {
        playerUtils.debugLog(dependencies, `PDM:addFlag: No pData for ${player.nameTag}. Cannot add flag: ${flagType}.`, player.nameTag);
        return;
    }
    if (!pData.flags[flagType]) {
        playerUtils.debugLog(dependencies, `PDM:addFlag: New flagType "${flagType}" for ${player.nameTag}. Initializing structure in pData.flags.`, player.nameTag);
        pData.flags[flagType] = { count: 0, lastDetectionTime: 0 };
    }
    pData.flags[flagType].count++;
    pData.flags[flagType].lastDetectionTime = Date.now();
    pData.flags.totalFlags = (pData.flags.totalFlags || 0) + 1;
    pData.lastFlagType = flagType;

    if (typeof detailsForNotify === 'object' && detailsForNotify !== null && detailsForNotify.itemTypeId) {
        if (!pData.lastViolationDetailsMap) {
            pData.lastViolationDetailsMap = {};
        }
        pData.lastViolationDetailsMap[flagType] = {
            itemTypeId: detailsForNotify.itemTypeId,
            quantityFound: detailsForNotify.quantityFound || 0,
            timestamp: Date.now()
        };
        playerUtils.debugLog(dependencies, `PDM:addFlag: Stored violation details for ${flagType} on ${player.nameTag}: ${JSON.stringify(pData.lastViolationDetailsMap[flagType])}`, player.nameTag);
    }

    pData.isDirtyForSave = true;

    const notifyString = (typeof detailsForNotify === 'object' && detailsForNotify !== null)
                         ? (detailsForNotify.originalDetailsForNotify || ("Item: " + String(detailsForNotify.itemTypeId)))
                         : detailsForNotify;
    const fullReasonForLog = `${reasonMessage} ${notifyString}`.trim();

    playerUtils.warnPlayer(player, reasonMessage);
    playerUtils.notifyAdmins(`Flagged ${player.nameTag} for ${flagType}. ${notifyString}`, dependencies, player, pData);
    playerUtils.debugLog(dependencies, `FLAG: ${player.nameTag} for ${flagType}. Reason: "${fullReasonForLog}". Total Flags: ${pData.flags.totalFlags}. Count[${flagType}]: ${pData.flags[flagType].count}`, player.nameTag);

    if (config && config.enableAutoMod && config.automodConfig) {
        try {
            if (playerUtils.debugLog && pData.isWatched) {
                playerUtils.debugLog(dependencies, `addFlag: Calling processAutoModActions for ${player.nameTag}, checkType: ${flagType}`, player.nameTag);
            }
            await processAutoModActions(player, pData, flagType, dependencies);
        } catch (e) {
            console.error(`[PlayerDataManager] Error calling processAutoModActions from addFlag for ${player.nameTag} / ${flagType}: ${e.stack || e}`);
            if (playerUtils.debugLog) {
                playerUtils.debugLog(dependencies, `Error in processAutoModActions called from addFlag: ${e.stack || e}`, player.nameTag);
            }
        }
    } else if (playerUtils.debugLog && pData.isWatched) {
        const autoModEnabled = config ? config.enableAutoMod : 'N/A (no config in deps)';
        const autoModConfigPresent = !!config?.automodConfig;
        playerUtils.debugLog(dependencies, `addFlag: Skipping processAutoModActions for ${player.nameTag} (checkType: ${flagType}). enableAutoMod: ${autoModEnabled}, automodConfig present: ${autoModConfigPresent}.`, player.nameTag);
    }
}

/**
 * Adds a mute to a player's data.
 * @param {mc.Player} player - The player to mute.
 * @param {number} durationMs - The duration of the mute in milliseconds. Use Infinity for permanent.
 * @param {string} reason - The reason for the mute.
 * @param {string} [mutedBy="Unknown"] - Who issued the mute.
 * @param {boolean} [isAutoMod=false] - Was this mute issued by AutoMod.
 * @param {string|null} [triggeringCheckType=null] - If by AutoMod, which checkType.
 * @param {import('../../types.js').CommandDependencies} dependencies - Standard dependencies object.
 * @returns {boolean} True if the mute was successfully added, false otherwise.
 */
export function addMute(player, durationMs, reason, mutedBy = "Unknown", isAutoMod = false, triggeringCheckType = null, dependencies) {
    const { playerUtils, getString } = dependencies;

    if (!player || typeof durationMs !== 'number' || durationMs <= 0) {
        playerUtils.debugLog(dependencies, `[PlayerDataManager] addMute: Invalid arguments provided. Player: ${player?.nameTag}, Duration: ${durationMs}`, player?.nameTag);
        return false;
    }
    const pData = getPlayerData(player.id);
    if (!pData) {
        playerUtils.debugLog(dependencies, `[PlayerDataManager] addMute: No pData found for player ${player.nameTag}. Cannot apply mute.`, player.nameTag);
        return false;
    }
    const unmuteTime = (durationMs === Infinity) ? Infinity : Date.now() + durationMs;
    const muteReason = reason || getString("playerData.mute.defaultReason");
    pData.muteInfo = {
        unmuteTime,
        reason: muteReason,
        mutedBy: mutedBy,
        isAutoMod: isAutoMod,
        triggeringCheckType: triggeringCheckType
    };
    pData.isDirtyForSave = true;
    let logMsg = `[PlayerDataManager] addMute: Player ${player.nameTag} muted by ${mutedBy}. Reason: "${muteReason}". AutoMod: ${isAutoMod}. CheckType: ${triggeringCheckType || 'N/A'}.`;
    if (durationMs === Infinity) {
        logMsg += " Duration: Permanent.";
    } else {
        logMsg += ` Unmute time: ${new Date(unmuteTime).toISOString()}.`;
    }
    playerUtils.debugLog(dependencies, logMsg, pData.isWatched ? player.nameTag : null);
    return true;
}

/**
 * Removes a mute from a player's data.
 * @param {mc.Player} player - The player to unmute.
 * @param {import('../../types.js').CommandDependencies} dependencies - Standard dependencies object.
 * @returns {boolean} True if the mute was successfully removed or if the player was not muted, false on error.
 */
export function removeMute(player, dependencies) {
    const { playerUtils } = dependencies;
    if (!player) {
        playerUtils.debugLog(dependencies, `[PlayerDataManager] removeMute: Invalid player object provided.`);
        return false;
    }
    const pData = getPlayerData(player.id);
    if (!pData) {
        playerUtils.debugLog(dependencies, `[PlayerDataManager] removeMute: No pData found for player ${player.nameTag}. Cannot unmute.`, player.nameTag);
        return false;
    }
    if (pData.muteInfo) {
        pData.muteInfo = null;
        pData.isDirtyForSave = true;
        playerUtils.debugLog(dependencies, `[PlayerDataManager] removeMute: Player ${player.nameTag} has been unmuted.`, pData.isWatched ? player.nameTag : null);
        return true;
    } else {
        playerUtils.debugLog(dependencies, `[PlayerDataManager] removeMute: Player ${player.nameTag} was not muted or already unmuted. No action taken.`, pData.isWatched ? player.nameTag : null);
        return false;
    }
}

/**
 * Retrieves a player's current mute information, if any.
 * Automatically clears expired mutes.
 * @param {mc.Player} player - The player whose mute info to retrieve.
 * @param {import('../../types.js').CommandDependencies} dependencies - Standard dependencies object.
 * @returns {object | null} The mute information object (e.g., { unmuteTime, reason }), or null if not muted or mute expired.
 */
export function getMuteInfo(player, dependencies) {
    const { playerUtils } = dependencies;
    if (!player) return null;
    const pData = getPlayerData(player.id);
    if (!pData || !pData.muteInfo) return null;
    const mute = pData.muteInfo;
    if (mute.unmuteTime !== Infinity && Date.now() >= mute.unmuteTime) {
        pData.muteInfo = null;
        pData.isDirtyForSave = true;
        playerUtils.debugLog(dependencies, `[PlayerDataManager] getMuteInfo: Mute for player ${player.nameTag} expired and has been removed.`, pData.isWatched ? player.nameTag : null);
        return null;
    }
    return mute;
}

/**
 * Checks if a player is currently muted.
 * @param {mc.Player} player - The player to check.
 * @param {import('../../types.js').CommandDependencies} dependencies - Standard dependencies object.
 * @returns {boolean} True if the player is muted, false otherwise.
 */
export function isMuted(player, dependencies) {
    return getMuteInfo(player, dependencies) !== null;
}

/**
 * Adds a ban to a player's data.
 * @param {mc.Player} player - The player to ban.
 * @param {number} durationMs - The duration of the ban in milliseconds. Use Infinity for permanent.
 * @param {string} reason - The reason for the ban.
 * @param {string} [bannedBy="Unknown"] - The name of the admin or system component that issued the ban.
 * @param {boolean} [isAutoMod=false] - Was this ban issued by AutoMod.
 * @param {string|null} [triggeringCheckType=null] - If by AutoMod, which checkType.
 * @param {import('../../types.js').CommandDependencies} dependencies - Standard dependencies object.
 * @returns {boolean} True if the ban was successfully added, false otherwise.
 */
export function addBan(player, durationMs, reason, bannedBy = "Unknown", isAutoMod = false, triggeringCheckType = null, dependencies) {
    const { playerUtils, getString } = dependencies;

    if (!player || typeof durationMs !== 'number' || durationMs <= 0 || typeof bannedBy !== 'string') {
        playerUtils.debugLog(dependencies, `PDM:addBan: Invalid arguments. Player: ${player?.nameTag}, Duration: ${durationMs}, BannedBy: ${bannedBy}`, player?.nameTag);
        return false;
    }
    const pData = getPlayerData(player.id);
    if (!pData) {
        playerUtils.debugLog(dependencies, `PDM:addBan: No pData for ${player.nameTag}. Cannot apply ban.`, player.nameTag);
        return false;
    }
    const currentTime = Date.now();
    const unbanTime = (durationMs === Infinity) ? Infinity : currentTime + durationMs;
    const banReason = reason || getString("playerData.ban.defaultReason");
    pData.banInfo = {
        xuid: player.id,
        playerName: player.nameTag,
        banTime: currentTime,
        unbanTime,
        reason: banReason,
        bannedBy: bannedBy,
        isAutoMod: isAutoMod,
        triggeringCheckType: triggeringCheckType
    };
    pData.isDirtyForSave = true;
    let logMsg = `PDM:addBan: Player ${player.nameTag} (XUID: ${player.id}) banned by ${bannedBy}. Reason: "${banReason}". AutoMod: ${isAutoMod}. CheckType: ${triggeringCheckType || 'N/A'}.`;
    if (durationMs === Infinity) {
        logMsg += " Duration: Permanent.";
    } else {
        logMsg += ` Unban time: ${new Date(unbanTime).toISOString()}.`;
    }
    playerUtils.debugLog(dependencies, logMsg, pData.isWatched ? player.nameTag : null);
    return true;
}

/**
 * Removes a ban from a player's data.
 * @param {mc.Player} player - The player to unban.
 * @param {import('../../types.js').CommandDependencies} dependencies - Standard dependencies object.
 * @returns {boolean} True if the ban was successfully removed or if the player was not banned, false on error.
 */
export function removeBan(player, dependencies) {
    const { playerUtils } = dependencies;
    if (!player) {
        playerUtils.debugLog(dependencies, `PDM:removeBan: Invalid player object provided.`);
        return false;
    }
    const pData = getPlayerData(player.id);
    if (!pData) {
        playerUtils.debugLog(dependencies, `PDM:removeBan: No pData found for player ${player.nameTag}. Cannot unban.`, player.nameTag);
        return false;
    }
    if (pData.banInfo) {
        pData.banInfo = null;
        pData.isDirtyForSave = true;
        playerUtils.debugLog(dependencies, `PDM:removeBan: Player ${player.nameTag} has been unbanned.`, pData.isWatched ? player.nameTag : null);
        return true;
    } else {
        playerUtils.debugLog(dependencies, `PDM:removeBan: Player ${player.nameTag} was not banned or already unbanned. No action taken.`, pData.isWatched ? player.nameTag : null);
        return false;
    }
}

/**
 * Retrieves a player's current ban information, if any.
 * Automatically clears expired bans.
 * @param {mc.Player} player - The player whose ban info to retrieve.
 * @param {import('../../types.js').CommandDependencies} dependencies - Standard dependencies object.
 * @returns {object | null} The ban information object (e.g., { xuid, playerName, banTime, unbanTime, reason, bannedBy }), or null if not banned or ban expired.
 */
export function getBanInfo(player, dependencies) {
    const { playerUtils } = dependencies;
    if (!player) return null;
    const pData = getPlayerData(player.id);
    if (!pData || !pData.banInfo) return null;
    const currentBanInfo = pData.banInfo;
    if (currentBanInfo.unbanTime !== Infinity && Date.now() >= currentBanInfo.unbanTime) {
        pData.banInfo = null;
        pData.isDirtyForSave = true;
        playerUtils.debugLog(dependencies, `PDM:getBanInfo: Ban for player ${player.nameTag} expired and has been removed.`, pData.isWatched ? player.nameTag : null);
        return null;
    }
    return currentBanInfo;
}

/**
 * Checks if a player is currently banned.
 * @param {mc.Player} player - The player to check.
 * @param {import('../../types.js').CommandDependencies} dependencies - Standard dependencies object.
 * @returns {boolean} True if the player is banned, false otherwise.
 */
export function isBanned(player, dependencies) {
    return getBanInfo(player, dependencies) !== null;
}

/**
 * Directly sets the runtime data for a player. Used internally or for specific scenarios like data migration.
 * @param {string} playerId - The ID of the player.
 * @param {PlayerAntiCheatData} data - The player data object to set.
 * @returns {void}
 */
export function setPlayerData(playerId, data) {
    if (!playerId || !data) {
        globalDebugLog("PDM:setPlayerData: Invalid playerId or data provided. Cannot set player data.", null); // Uses global for now
        return;
    }
    playerData.set(playerId, data);
}

/**
 * Saves player data to persistent storage if it has been marked as dirty.
 * Resets the isDirtyForSave flag upon successful save.
 * @param {mc.Player} player - The player whose data to potentially save.
 * @param {import('../../types.js').CommandDependencies} dependencies - Standard dependencies object.
 * @returns {Promise<boolean>} True if data was saved, false if no data needed saving or an error occurred.
 */
export async function saveDirtyPlayerData(player, dependencies) {
    const { playerUtils } = dependencies;
    if (!player) return false;
    const pData = playerData.get(player.id);
    if (pData && pData.isDirtyForSave) {
        playerUtils.debugLog(dependencies, `PDM:saveDirty: Saving dirty data for ${player.nameTag}.`, pData.isWatched ? player.nameTag : null);
        await prepareAndSavePlayerData(player, dependencies);
        pData.isDirtyForSave = false;
        return true;
    }
    return false;
}

/**
 * Clears flags and resets AutoMod state for a specific checkType for a player.
 * @param {import('@minecraft/server').Player} player The player.
 * @param {string} checkType The checkType whose flags need to be cleared.
 * @param {import('../../types.js').CommandDependencies} dependencies - Standard dependencies object.
 */
export async function clearFlagsForCheckType(player, checkType, dependencies) {
    const { playerUtils } = dependencies;
    if (!player || !checkType) return;
    const pData = getPlayerData(player.id);
    if (!pData) return;

    let clearedCount = 0;
    if (pData.flags && pData.flags[checkType]) {
        clearedCount = pData.flags[checkType].count || 0;
        if (pData.flags.totalFlags && typeof pData.flags.totalFlags === 'number') {
            pData.flags.totalFlags = Math.max(0, pData.flags.totalFlags - clearedCount);
        }
        pData.flags[checkType].count = 0;
    }

    if (pData.automodState && pData.automodState[checkType]) {
        pData.automodState[checkType] = { lastActionThreshold: 0, lastActionTimestamp: 0 };
    }

    pData.isDirtyForSave = true;

    const playerContext = pData.isWatched ? player.nameTag : null;
    playerUtils.debugLog(dependencies, `[PlayerDataManager] Cleared ${clearedCount} flags and reset AutoMod state for checkType '${checkType}' for player ${player.nameTag}.`, playerContext);
}

/**
 * Clears item use states (consumable, bow, shield) if they have expired.
 * @param {PlayerAntiCheatData} pData - The player's anti-cheat data object.
 * @param {import('../../types.js').CommandDependencies} dependencies - Standard dependencies object.
 */
export function clearExpiredItemUseStates(pData, dependencies) {
    const { currentTick, config, playerUtils } = dependencies;

    if (pData.isUsingConsumable && (currentTick - (pData.lastItemUseTick || 0) > config.itemUseStateClearTicks)) {
        if (playerUtils.debugLog && pData.isWatched) {
            playerUtils.debugLog(dependencies, `[PlayerDataManager] StateConflict: Auto-clearing isUsingConsumable for ${pData.playerNameTag || 'UnknownPlayer'} after timeout. Tick: ${currentTick}`, pData.playerNameTag);
        }
        pData.isUsingConsumable = false;
        pData.isDirtyForSave = true;
    }

    if (pData.isChargingBow && (currentTick - (pData.lastItemUseTick || 0) > config.itemUseStateClearTicks)) {
        if (playerUtils.debugLog && pData.isWatched) {
            playerUtils.debugLog(dependencies, `[PlayerDataManager] StateConflict: Auto-clearing isChargingBow for ${pData.playerNameTag || 'UnknownPlayer'} after timeout. Tick: ${currentTick}`, pData.playerNameTag);
        }
        pData.isChargingBow = false;
        pData.isDirtyForSave = true;
    }

    if (pData.isUsingShield && (currentTick - (pData.lastItemUseTick || 0) > config.itemUseStateClearTicks)) {
        if (playerUtils.debugLog && pData.isWatched) {
            playerUtils.debugLog(dependencies, `[PlayerDataManager] StateConflict: Auto-clearing isUsingShield for ${pData.playerNameTag || 'UnknownPlayer'} after timeout. Tick: ${currentTick}`, pData.playerNameTag);
        }
        pData.isUsingShield = false;
        pData.isDirtyForSave = true;
    }
}
