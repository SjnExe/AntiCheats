/**
 * Manages all player-specific data used by the AntiCheat system. This includes runtime data (pData),
 * persistence via dynamic properties, and helper functions for data manipulation like adding flags,
 * mutes, and bans.
 */
import * as mc from '@minecraft/server';
import { processAutoModActions } from './automodManager.js';

const playerData = new Map();

const persistedPlayerDataKeys = [
    "flags", "isWatched", "lastFlagType", "playerNameTag",
    "attackEvents", "lastAttackTime", "blockBreakEvents",
    "consecutiveOffGroundTicks", "fallDistance",
    "consecutiveOnGroundSpeedingTicks", "muteInfo", "banInfo",
    "lastCombatInteractionTime", "lastViolationDetailsMap", "automodState"
];

export function getPlayerData(playerId) {
    return playerData.get(playerId);
}

export function getAllPlayerDataValues() {
    return playerData.values();
}

export async function savePlayerDataToDynamicProperties(player, pDataToSave, dependencies) {
    const { playerUtils } = dependencies;
    if (!player || !pDataToSave) {
        playerUtils.debugLog("PDM:save: Invalid player or pDataToSave", player?.nameTag, dependencies); // Corrected order
        return false;
    }
    const dynamicPropertyKey = "anticheat:pdata_v1";
    let jsonString;
    try {
        jsonString = JSON.stringify(pDataToSave);
    } catch (error) {
        playerUtils.debugLog(`PDM:save: Fail stringify ${player.nameTag}. E: ${error}`, dependencies, player.nameTag);
        return false;
    }
    if (jsonString.length > 32760) {
        playerUtils.debugLog(`PDM:save: pData too large for ${player.nameTag} (${jsonString.length}b). Cannot save to dynamic properties.`, dependencies, player.nameTag);
        return false;
    }
    try {
        player.setDynamicProperty(dynamicPropertyKey, jsonString);
        return true;
    } catch (error) {
        playerUtils.debugLog(`PDM:save: Fail setDynamicProp for ${player.nameTag}. E: ${error}`, dependencies, player.nameTag);
        if (error.message) playerUtils.debugLog(`PDM:save: Error message: ${error.message}`, player.nameTag, dependencies);
        return false;
    }
}

export async function loadPlayerDataFromDynamicProperties(player, dependencies) {
    const { playerUtils } = dependencies;
    if (!player) {
        playerUtils.debugLog("PDM:load: Invalid player object provided.", null, dependencies); // Corrected order
        return null;
    }
    const dynamicPropertyKey = "anticheat:pdata_v1";
    let jsonString;
    try {
        jsonString = player.getDynamicProperty(dynamicPropertyKey);
    } catch (error) {
        playerUtils.debugLog(`PDM:load: Failed to getDynamicProperty for ${player.nameTag}. E: ${error}`, dependencies, player.nameTag);
        if (error.message) playerUtils.debugLog(`PDM:load: Error message: ${error.message}`, player.nameTag, dependencies);
        return null;
    }

    if (typeof jsonString === 'string') {
        try {
            const parsedData = JSON.parse(jsonString);
            playerUtils.debugLog(`PDM:load: Successfully loaded and parsed data for ${player.nameTag}.`, player.nameTag, dependencies);
            return parsedData;
        } catch (error) {
            playerUtils.debugLog(`PDM:load: Failed to parse JSON for ${player.nameTag}. JSON: "${jsonString}". E: ${error}`, player.nameTag, dependencies);
            if (error.message) playerUtils.debugLog(`PDM:load: Parse error message: ${error.message}`, player.nameTag, dependencies);
            return null;
        }
    } else if (typeof jsonString === 'undefined') {
        playerUtils.debugLog(`PDM:load: No dynamic property '${dynamicPropertyKey}' found for ${player.nameTag}.`, player.nameTag, dependencies);
        return null;
    } else {
        playerUtils.debugLog(`PDM:load: Unexpected data type for dynamic property '${dynamicPropertyKey}' for ${player.nameTag}: ${typeof jsonString}`, player.nameTag, dependencies);
        return null;
    }
}

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
        playerUtils.debugLog(`PDM:prepSave: No runtime pData found for ${player.nameTag}. Cannot save.`, player.nameTag, dependencies);
    }
}

export function initializeDefaultPlayerData(player, currentTick, dependencies) {
    const { playerUtils } = dependencies;
    playerUtils.debugLog(`Initializing default pData for ${player.nameTag} (ID: ${player.id})`, player.nameTag, dependencies);
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
        playerUtils.debugLog(`Merged persisted pData for ${player.nameTag}. Session-only fields (e.g., lastAttackTick, recentHits, isUsingConsumable, etc.) reset to defaults.`, dependencies, player.nameTag);
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
    } else {
        playerUtils.debugLog(`PDM:ensureInit: No persisted data for ${player.nameTag}. Using fresh default data.`, player.nameTag, dependencies);
    }

    if (newPData.muteInfo && newPData.muteInfo.unmuteTime !== Infinity && Date.now() >= newPData.muteInfo.unmuteTime) {
        playerUtils.debugLog(`PDM:ensureInit: Mute for ${newPData.playerNameTag || player.nameTag} expired on load. Clearing.`, newPData.isWatched ? (newPData.playerNameTag || player.nameTag) : null, dependencies);
        newPData.muteInfo = null;
        newPData.isDirtyForSave = true;
    }
    if (newPData.banInfo && newPData.banInfo.unbanTime !== Infinity && Date.now() >= newPData.banInfo.unbanTime) {
        playerUtils.debugLog(`PDM:ensureInit: Ban for ${newPData.playerNameTag || player.nameTag} expired on load. Clearing.`, newPData.isWatched ? (newPData.playerNameTag || player.nameTag) : null, dependencies);
        newPData.banInfo = null;
        newPData.isDirtyForSave = true;
    }
    playerData.set(player.id, newPData);
    return newPData;
}

export function cleanupActivePlayerData(activePlayers, dependencies) {
    const { playerUtils } = dependencies;
    const activePlayerIds = new Set();
    for (const player of activePlayers) {
        activePlayerIds.add(player.id);
    }
    for (const playerId of playerData.keys()) {
        if (!activePlayerIds.has(playerId)) {
            const removedPData = playerData.get(playerId);
            playerUtils.debugLog(`PDM:cleanup: Removed runtime data for ${removedPData?.playerNameTag || playerId}.`, removedPData?.isWatched ? (removedPData.playerNameTag || playerId) : null, dependencies);
            playerData.delete(playerId);
        }
    }
}

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
                if (pData.isWatched && config.enableDebugLogging) { // Simplified playerUtils.debugLog
                    playerUtils.debugLog(`[PlayerDataManager] Player ${pData.playerNameTag || player.nameTag} on slime block at tick ${currentTick}.`, pData.playerNameTag || player.nameTag, dependencies);
                }
            }
        } catch (e) {
            logManager.addLog({ // Simplified
                actionType: 'error',
                message: e.message,
                player: pData.playerNameTag || player.nameTag,
                context: 'slime_block_check'
            }, dependencies);
            if (config.enableDebugLogging) { // Simplified playerUtils.debugLog
                playerUtils.debugLog(`[PlayerDataManager] Error checking for slime block under ${pData.playerNameTag || player.nameTag}: ${e.message}`, pData.playerNameTag || player.nameTag, dependencies);
            } else { // Simplified
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
        playerUtils.debugLog(`Transient update for ${pData.playerNameTag || player.nameTag} (Tick: ${currentTick}): ${JSON.stringify(transientSnapshot)}`, pData.playerNameTag || player.nameTag, dependencies);
    }
}

export async function addFlag(player, flagType, reasonMessage, detailsForNotify = "", dependencies) {
    const { playerUtils, getString, config, logManager } = dependencies;
    const pData = getPlayerData(player.id);
    if (!pData) {
        playerUtils.debugLog(`PDM:addFlag: No pData for ${player.nameTag}. Cannot add flag: ${flagType}.`, player.nameTag, dependencies);
        return;
    }
    if (!pData.flags[flagType]) {
        playerUtils.debugLog(`PDM:addFlag: New flagType "${flagType}" for ${player.nameTag}. Initializing structure in pData.flags.`, player.nameTag, dependencies);
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
        playerUtils.debugLog(`PDM:addFlag: Stored violation details for ${flagType} on ${player.nameTag}: ${JSON.stringify(pData.lastViolationDetailsMap[flagType])}`, player.nameTag, dependencies);
    }
    pData.isDirtyForSave = true;

    const notifyString = (typeof detailsForNotify === 'object' && detailsForNotify !== null)
                         ? (detailsForNotify.originalDetailsForNotify || ("Item: " + String(detailsForNotify.itemTypeId)))
                         : detailsForNotify;
    const fullReasonForLog = `${reasonMessage} ${notifyString}`.trim();

    playerUtils.warnPlayer(player, reasonMessage);
    playerUtils.notifyAdmins(`Flagged ${player.nameTag} for ${flagType}. ${notifyString}`, dependencies, player, pData);
    playerUtils.debugLog(`FLAG: ${player.nameTag} for ${flagType}. Reason: "${fullReasonForLog}". Total Flags: ${pData.flags.totalFlags}. Count[${flagType}]: ${pData.flags[flagType].count}`, player.nameTag, dependencies);

    if (config && config.enableAutoMod && config.automodConfig) {
        try {
            if (pData.isWatched) { // Simplified debugLog
                playerUtils.debugLog(`addFlag: Calling processAutoModActions for ${player.nameTag}, checkType: ${flagType}`, player.nameTag, dependencies);
            }
            await processAutoModActions(player, pData, flagType, dependencies);
        } catch (e) {
            console.error(`[PlayerDataManager] Error calling processAutoModActions from addFlag for ${player.nameTag} / ${flagType}: ${e.stack || e}`);
            playerUtils.debugLog(`Error in processAutoModActions called from addFlag: ${e.stack || e}`, player.nameTag, dependencies);
        }
    } else if (pData.isWatched) { // Simplified debugLog
        const autoModEnabled = config ? config.enableAutoMod : 'N/A (no config in deps)';
        const autoModConfigPresent = !!config?.automodConfig;
        playerUtils.debugLog(`addFlag: Skipping processAutoModActions for ${player.nameTag} (checkType: ${flagType}). enableAutoMod: ${autoModEnabled}, automodConfig present: ${autoModConfigPresent}.`, player.nameTag, dependencies);
    }
}

export function addMute(player, durationMs, reason, mutedBy = "Unknown", isAutoMod = false, triggeringCheckType = null, dependencies) {
    const { playerUtils, getString } = dependencies;
    if (!player || typeof durationMs !== 'number' || durationMs <= 0) {
        playerUtils.debugLog(`[PlayerDataManager] addMute: Invalid arguments provided. Player: ${player?.nameTag}, Duration: ${durationMs}`, player?.nameTag, dependencies);
        return false;
    }
    const pData = getPlayerData(player.id);
    if (!pData) {
        playerUtils.debugLog(`[PlayerDataManager] addMute: No pData found for player ${player.nameTag}. Cannot apply mute.`, player.nameTag, dependencies);
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
    playerUtils.debugLog(logMsg, pData.isWatched ? player.nameTag : null, dependencies);
    return true;
}

export function removeMute(player, dependencies) {
    const { playerUtils } = dependencies;
    if (!player) {
        playerUtils.debugLog(`[PlayerDataManager] removeMute: Invalid player object provided.`, null, dependencies);
        return false;
    }
    const pData = getPlayerData(player.id);
    if (!pData) {
        playerUtils.debugLog(`[PlayerDataManager] removeMute: No pData found for player ${player.nameTag}. Cannot unmute.`, player.nameTag, dependencies);
        return false;
    }
    if (pData.muteInfo) {
        pData.muteInfo = null;
        pData.isDirtyForSave = true;
        playerUtils.debugLog(`[PlayerDataManager] removeMute: Player ${player.nameTag} has been unmuted.`, pData.isWatched ? player.nameTag : null, dependencies);
        return true;
    } else {
        playerUtils.debugLog(`[PlayerDataManager] removeMute: Player ${player.nameTag} was not muted or already unmuted. No action taken.`, pData.isWatched ? player.nameTag : null, dependencies);
        return false;
    }
}

export function getMuteInfo(player, dependencies) {
    const { playerUtils } = dependencies;
    if (!player) return null;
    const pData = getPlayerData(player.id);
    if (!pData || !pData.muteInfo) return null;
    const mute = pData.muteInfo;
    if (mute.unmuteTime !== Infinity && Date.now() >= mute.unmuteTime) {
        pData.muteInfo = null;
        pData.isDirtyForSave = true;
        playerUtils.debugLog(`[PlayerDataManager] getMuteInfo: Mute for player ${player.nameTag} expired and has been removed.`, pData.isWatched ? player.nameTag : null, dependencies);
        return null;
    }
    return mute;
}

export function isMuted(player, dependencies) {
    return getMuteInfo(player, dependencies) !== null;
}

export function addBan(player, durationMs, reason, bannedBy = "Unknown", isAutoMod = false, triggeringCheckType = null, dependencies) {
    const { playerUtils, getString } = dependencies;
    if (!player || typeof durationMs !== 'number' || durationMs <= 0 || typeof bannedBy !== 'string') {
        playerUtils.debugLog(`PDM:addBan: Invalid arguments. Player: ${player?.nameTag}, Duration: ${durationMs}, BannedBy: ${bannedBy}`, player?.nameTag, dependencies);
        return false;
    }
    const pData = getPlayerData(player.id);
    if (!pData) {
        playerUtils.debugLog(`PDM:addBan: No pData for ${player.nameTag}. Cannot apply ban.`, player.nameTag, dependencies);
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
    playerUtils.debugLog(logMsg, pData.isWatched ? player.nameTag : null, dependencies);
    return true;
}

export function removeBan(player, dependencies) {
    const { playerUtils } = dependencies;
    if (!player) {
        playerUtils.debugLog(`PDM:removeBan: Invalid player object provided.`, null, dependencies);
        return false;
    }
    const pData = getPlayerData(player.id);
    if (!pData) {
        playerUtils.debugLog(`PDM:removeBan: No pData found for player ${player.nameTag}. Cannot unban.`, player.nameTag, dependencies);
        return false;
    }
    if (pData.banInfo) {
        pData.banInfo = null;
        pData.isDirtyForSave = true;
        playerUtils.debugLog(`PDM:removeBan: Player ${player.nameTag} has been unbanned.`, pData.isWatched ? player.nameTag : null, dependencies);
        return true;
    } else {
        playerUtils.debugLog(`PDM:removeBan: Player ${player.nameTag} was not banned or already unbanned. No action taken.`, pData.isWatched ? player.nameTag : null, dependencies);
        return false;
    }
}

export function getBanInfo(player, dependencies) {
    const { playerUtils } = dependencies;
    if (!player) return null;
    const pData = getPlayerData(player.id);
    if (!pData || !pData.banInfo) return null;
    const currentBanInfo = pData.banInfo;
    if (currentBanInfo.unbanTime !== Infinity && Date.now() >= currentBanInfo.unbanTime) {
        pData.banInfo = null;
        pData.isDirtyForSave = true;
        playerUtils.debugLog(`PDM:getBanInfo: Ban for player ${player.nameTag} expired and has been removed.`, pData.isWatched ? player.nameTag : null, dependencies);
        return null;
    }
    return currentBanInfo;
}

export function isBanned(player, dependencies) {
    return getBanInfo(player, dependencies) !== null;
}

export function setPlayerData(playerId, data, dependencies) {
    const { playerUtils } = dependencies;
    if (!playerId || !data) {
        if (playerUtils) { // Simplified
            playerUtils.debugLog("PDM:setPlayerData: Invalid playerId or data provided. Cannot set player data.", null, dependencies);
        } else {
            console.warn("PDM:setPlayerData: Invalid playerId or data provided. Cannot set player data. (playerUtils not in deps)");
        }
        return;
    }
    playerData.set(playerId, data);
}

export async function saveDirtyPlayerData(player, dependencies) {
    const { playerUtils } = dependencies;
    if (!player) return false;
    const pData = playerData.get(player.id);
    if (pData && pData.isDirtyForSave) {
        playerUtils.debugLog(`PDM:saveDirty: Saving dirty data for ${player.nameTag}.`, pData.isWatched ? player.nameTag : null, dependencies);
        await prepareAndSavePlayerData(player, dependencies);
        pData.isDirtyForSave = false;
        return true;
    }
    return false;
}

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
    playerUtils.debugLog(`[PlayerDataManager] Cleared ${clearedCount} flags and reset AutoMod state for checkType '${checkType}' for player ${player.nameTag}.`, playerContext, dependencies);
}

export function clearExpiredItemUseStates(pData, dependencies) {
    const { currentTick, config, playerUtils } = dependencies;

    if (pData.isUsingConsumable && (currentTick - (pData.lastItemUseTick || 0) > config.itemUseStateClearTicks)) {
        if (pData.isWatched) { // Simplified debugLog
            playerUtils.debugLog(`[PlayerDataManager] StateConflict: Auto-clearing isUsingConsumable for ${pData.playerNameTag || 'UnknownPlayer'} after timeout. Tick: ${currentTick}`, pData.playerNameTag, dependencies);
        }
        pData.isUsingConsumable = false;
        pData.isDirtyForSave = true;
    }

    if (pData.isChargingBow && (currentTick - (pData.lastItemUseTick || 0) > config.itemUseStateClearTicks)) {
        if (pData.isWatched) { // Simplified debugLog
            playerUtils.debugLog(`[PlayerDataManager] StateConflict: Auto-clearing isChargingBow for ${pData.playerNameTag || 'UnknownPlayer'} after timeout. Tick: ${currentTick}`, pData.playerNameTag, dependencies);
        }
        pData.isChargingBow = false;
        pData.isDirtyForSave = true;
    }

    if (pData.isUsingShield && (currentTick - (pData.lastItemUseTick || 0) > config.itemUseStateClearTicks)) {
        if (pData.isWatched) { // Simplified debugLog
            playerUtils.debugLog(`[PlayerDataManager] StateConflict: Auto-clearing isUsingShield for ${pData.playerNameTag || 'UnknownPlayer'} after timeout. Tick: ${currentTick}`, pData.playerNameTag, dependencies);
        }
        pData.isUsingShield = false;
        pData.isDirtyForSave = true;
    }
}
