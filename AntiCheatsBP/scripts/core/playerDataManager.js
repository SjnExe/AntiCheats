/**
 * @file Manages all player-specific data used by the AntiCheat system.
 * This includes runtime data (pData), persistence via dynamic properties,
 * and helper functions for data manipulation like adding flags, mutes, and bans.
 */
import * as mc from '@minecraft/server';
import { processAutoModActions } from './automodManager.js';

/**
 * In-memory cache for player data.
 * @type {Map<string, import('../types.js').PlayerAntiCheatData>}
 */
const playerData = new Map();

/**
 * Keys from PlayerAntiCheatData that are persisted to dynamic properties.
 * Other keys are considered transient session data.
 */
const persistedPlayerDataKeys = [
    'flags', 'isWatched', 'lastFlagType', 'playerNameTag',
    'attackEvents', 'lastAttackTime', 'blockBreakEvents',
    'consecutiveOffGroundTicks', 'fallDistance',
    'consecutiveOnGroundSpeedingTicks', 'muteInfo', 'banInfo',
    'lastCombatInteractionTime', 'lastViolationDetailsMap', 'automodState',
    'joinTime',
    'lastKnownNameTag', 'lastNameTagChangeTick', 'deathMessageToShowOnSpawn',
    'lastCheckNameSpoofTick', 'lastCheckAntiGmcTick', 'lastCheckNetherRoofTick',
    'lastCheckAutoToolTick', 'lastCheckFlatRotationBuildingTick', 'lastRenderDistanceCheckTick',
];

/**
 * Retrieves the runtime AntiCheat data for a given player ID.
 * @param {string} playerId The ID of the player.
 * @returns {import('../types.js').PlayerAntiCheatData | undefined}
 */
export function getPlayerData(playerId) {
    return playerData.get(playerId);
}

/**
 * Saves a subset of player data (persisted keys) to the player's dynamic properties.
 * @param {import('@minecraft/server').Player} player
 * @param {object} pDataToSave Data containing only keys to be persisted.
 * @param {import('../types.js').CommandDependencies} dependencies
 * @returns {Promise<boolean>} True if saving was successful.
 */
export async function savePlayerDataToDynamicProperties(player, pDataToSave, dependencies) {
    const { playerUtils } = dependencies;
    if (!player || !pDataToSave) {
        playerUtils.debugLog('PDM:save: Invalid player or pDataToSave', player?.nameTag, dependencies);
        return false;
    }
    const dynamicPropertyKey = 'anticheat:pdata_v1';
    let jsonString;
    try {
        jsonString = JSON.stringify(pDataToSave);
    } catch (error) {
        playerUtils.debugLog(`PDM:save: Fail stringify ${player.nameTag}. E: ${error.message}`, player.nameTag, dependencies);
        console.error(`[PlayerDataManager] Error stringifying pData for ${player.nameTag}: ${error.stack || error}`);
        dependencies.logManager.addLog({
            actionType: 'errorPdataStringify',
            context: 'PlayerDataManager.savePlayerDataToDynamicProperties',
            targetName: player.nameTag,
            details: `Error: ${error.message}`,
            error: error.stack || error.message
        }, dependencies);
        return false;
    }
    if (jsonString.length > 32760) { // Buffer for safety, limit is 32767
        playerUtils.debugLog(`PDM:save: pData too large for ${player.nameTag} (${jsonString.length}b). Cannot save to dynamic properties.`, player.nameTag, dependencies);
        console.warn(`[PlayerDataManager] pData for ${player.nameTag} exceeds dynamic property size limit.`);
        return false;
    }
    try {
        player.setDynamicProperty(dynamicPropertyKey, jsonString);
        return true;
    } catch (error) {
        playerUtils.debugLog(`PDM:save: Fail setDynamicProp for ${player.nameTag}. E: ${error.message}`, player.nameTag, dependencies);
        console.error(`[PlayerDataManager] Error setting dynamic property for ${player.nameTag}: ${error.stack || error}`);
        dependencies.logManager.addLog({
            actionType: 'errorPdataSetProperty',
            context: 'PlayerDataManager.savePlayerDataToDynamicProperties',
            targetName: player.nameTag,
            details: `Error: ${error.message}`,
            error: error.stack || error.message
        }, dependencies);
        return false;
    }
}

/**
 * Loads player data from dynamic properties.
 * @param {import('@minecraft/server').Player} player
 * @param {import('../types.js').CommandDependencies} dependencies
 * @returns {Promise<object | null>} The loaded player data object, or null.
 */
export async function loadPlayerDataFromDynamicProperties(player, dependencies) {
    const { playerUtils } = dependencies;
    if (!player) {
        playerUtils.debugLog('PDM:load: Invalid player object provided.', null, dependencies);
        return null;
    }
    const dynamicPropertyKey = 'anticheat:pdata_v1';
    let jsonString;
    try {
        jsonString = player.getDynamicProperty(dynamicPropertyKey);
    } catch (error) {
        playerUtils.debugLog(`PDM:load: Failed to getDynamicProperty for ${player.nameTag}. E: ${error.message}`, player.nameTag, dependencies);
        console.error(`[PlayerDataManager] Error getting dynamic property for ${player.nameTag}: ${error.stack || error}`);
        dependencies.logManager.addLog({
            actionType: 'errorPdataGetProperty',
            context: 'PlayerDataManager.loadPlayerDataFromDynamicProperties',
            targetName: player.nameTag,
            details: `Error: ${error.message}`,
            error: error.stack || error.message
        }, dependencies);
        return null;
    }
    if (typeof jsonString === 'string') {
        try {
            const parsedData = JSON.parse(jsonString);
            playerUtils.debugLog(`PDM:load: Successfully loaded and parsed data for ${player.nameTag}.`, player.nameTag, dependencies);
            return parsedData;
        } catch (error) {
            playerUtils.debugLog(`PDM:load: Failed to parse JSON for ${player.nameTag}. JSON: '${jsonString}'. E: ${error.message}`, player.nameTag, dependencies);
            console.error(`[PlayerDataManager] Error parsing pData JSON for ${player.nameTag}: ${error.stack || error}`);
            dependencies.logManager.addLog({
                actionType: 'errorPdataParse',
                context: 'PlayerDataManager.loadPlayerDataFromDynamicProperties',
                targetName: player.nameTag,
                details: `Error: ${error.message}. JSON: ${jsonString.substring(0, 100)}...`,
                error: error.stack || error.message
            }, dependencies);
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

/**
 * Prepares and saves the persistable parts of a player's AntiCheat data.
 * @param {import('@minecraft/server').Player} player
 * @param {import('../types.js').CommandDependencies} dependencies
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
        playerUtils.debugLog(`PDM:prepSave: No runtime pData found for ${player.nameTag}. Cannot save.`, player.nameTag, dependencies);
    }
}

/**
 * Initializes a new default PlayerAntiCheatData object for a player.
 * @param {import('@minecraft/server').Player} player
 * @param {number} currentTick
 * @param {import('../types.js').CommandDependencies} dependencies
 * @returns {import('../types.js').PlayerAntiCheatData}
 */
export function initializeDefaultPlayerData(player, currentTick, dependencies) {
    const { playerUtils } = dependencies;
    playerUtils.debugLog(`Initializing default pData for ${player.nameTag} (ID: ${player.id})`, player.nameTag, dependencies);
    return {
        id: player.id,
        playerNameTag: player.nameTag,
        lastPosition: { ...player.location },
        previousPosition: { ...player.location },
        velocity: { ...player.getVelocity() },
        previousVelocity: { x: 0, y: 0, z: 0 },
        consecutiveOffGroundTicks: 0,
        fallDistance: 0,
        lastOnGroundTick: currentTick,
        lastOnGroundPosition: { ...player.location },
        consecutiveOnGroundSpeedingTicks: 0,
        isTakingFallDamage: false,
        attackEvents: [],
        lastAttackTime: 0,
        lastCombatInteractionTime: 0,
        blockBreakEvents: [],
        recentMessages: [],
        flags: {
            totalFlags: 0,
            movementFlyHover: { count: 0, lastDetectionTime: 0 },
            movementSpeedGround: { count: 0, lastDetectionTime: 0 },
            movementNoFall: { count: 0, lastDetectionTime: 0 },
            movementNoSlow: { count: 0, lastDetectionTime: 0 },
            movementInvalidSprint: { count: 0, lastDetectionTime: 0 },
            movementNetherRoof: { count: 0, lastDetectionTime: 0 },
            movementHighYVelocity: { count: 0, lastDetectionTime: 0 },
            movementSustainedFly: { count: 0, lastDetectionTime: 0 },
            combatReachAttack: { count: 0, lastDetectionTime: 0 },
            combatCpsHigh: { count: 0, lastDetectionTime: 0 },
            combatViewSnapPitch: { count: 0, lastDetectionTime: 0 },
            combatViewSnapYaw: { count: 0, lastDetectionTime: 0 },
            combatInvalidPitch: { count: 0, lastDetectionTime: 0 },
            combatMultitargetAura: { count: 0, lastDetectionTime: 0 },
            combatAttackWhileSleeping: { count: 0, lastDetectionTime: 0 },
            combatAttackWhileConsuming: { count: 0, lastDetectionTime: 0 },
            combatAttackWhileBowCharging: { count: 0, lastDetectionTime: 0 },
            combatAttackWhileShielding: { count: 0, lastDetectionTime: 0 },
            combatLog: { count: 0, lastDetectionTime: 0 },
            worldNuker: { count: 0, lastDetectionTime: 0 },
            worldIllegalItemUse: { count: 0, lastDetectionTime: 0 },
            worldIllegalItemPlace: { count: 0, lastDetectionTime: 0 },
            worldTowerBuild: { count: 0, lastDetectionTime: 0 },
            worldFlatRotationBuilding: { count: 0, lastDetectionTime: 0 },
            worldDownwardScaffold: { count: 0, lastDetectionTime: 0 },
            worldAirPlace: { count: 0, lastDetectionTime: 0 },
            worldFastPlace: { count: 0, lastDetectionTime: 0 },
            worldAutoTool: { count: 0, lastDetectionTime: 0 },
            worldInstaBreakUnbreakable: { count: 0, lastDetectionTime: 0 },
            worldInstaBreakSpeed: { count: 0, lastDetectionTime: 0 },
            actionFastUse: { count: 0, lastDetectionTime: 0 },
            playerNameSpoof: { count: 0, lastDetectionTime: 0 },
            playerAntiGmc: { count: 0, lastDetectionTime: 0 },
            playerInventoryMod: { count: 0, lastDetectionTime: 0 },
            playerInventoryModSwitchUse: { count: 0, lastDetectionTime: 0 },
            playerInventoryModMoveLocked: { count: 0, lastDetectionTime: 0 },
            playerSelfHurt: { count: 0, lastDetectionTime: 0 },
            playerClientAnomaly: { count: 0, lastDetectionTime: 0 },
            playerChatStateViolation: { count: 0, lastDetectionTime: 0 },
            chatSpamFast: { count: 0, lastDetectionTime: 0 },
            chatSpamMaxWords: { count: 0, lastDetectionTime: 0 },
            chatLanguageViolation: { count: 0, lastDetectionTime: 0 },
            chatAdvertising: { count: 0, lastDetectionTime: 0 },
            chatCapsAbuse: { count: 0, lastDetectionTime: 0 },
            chatCharRepeat: { count: 0, lastDetectionTime: 0 },
            chatSymbolSpam: { count: 0, lastDetectionTime: 0 },
            chatContentRepeat: { count: 0, lastDetectionTime: 0 },
            chatUnicodeAbuse: { count: 0, lastDetectionTime: 0 },
            chatGibberish: { count: 0, lastDetectionTime: 0 },
            chatExcessiveMentions: { count: 0, lastDetectionTime: 0 },
            chatImpersonationAttempt: { count: 0, lastDetectionTime: 0 },
            chatNewline: { count: 0, lastDetectionTime: 0 },
            chatMaxlength: { count: 0, lastDetectionTime: 0 },
            antiGriefTnt: { count: 0, lastDetectionTime: 0 },
            antiGriefWither: { count: 0, lastDetectionTime: 0 },
            antiGriefFire: { count: 0, lastDetectionTime: 0 },
            antiGriefLava: { count: 0, lastDetectionTime: 0 },
            antiGriefWater: { count: 0, lastDetectionTime: 0 },
            antiGriefBlockspam: { count: 0, lastDetectionTime: 0 },
            antiGriefEntityspam: { count: 0, lastDetectionTime: 0 },
            antiGriefBlockspamDensity: { count: 0, lastDetectionTime: 0 },
            antiGriefPistonLag: { count: 0, lastDetectionTime: 0 },
        },
        lastFlagType: '',
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
        // Effect-related transient states
        jumpBoostAmplifier: 0,
        hasSlowFalling: false,
        hasLevitation: false,
        speedAmplifier: -1, // -1 indicates no speed effect or level 0
        blindnessTicks: 0,  // Remaining duration in ticks
        // Other transient states
        lastTookDamageTick: 0,
        lastUsedElytraTick: 0,
        lastUsedRiptideTick: 0,
        lastOnSlimeBlockTick: 0,
        previousSelectedSlotIndex: player.selectedSlotIndex,
        lastSelectedSlotChangeTick: 0,
        isAttemptingBlockBreak: false,
        breakingBlockTypeId: null,
        slotAtBreakAttemptStart: player.selectedSlotIndex,
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
        // Punishment info
        muteInfo: null,
        banInfo: null,
        // Session info
        joinTime: Date.now(),
        lastGameMode: player.gameMode,
        lastDimensionId: player.dimension.id,
        // Internal state
        isDirtyForSave: true,
        lastViolationDetailsMap: {},
        automodState: {},
        // Per-check tick trackers for intervals
        lastCheckNameSpoofTick: 0,
        lastCheckAntiGmcTick: 0,
        lastCheckNetherRoofTick: 0,
        lastCheckAutoToolTick: 0,
        lastCheckFlatRotationBuildingTick: 0,
        lastRenderDistanceCheckTick: 0,
    };
}

/**
 * Ensures that a player's data is initialized, loading from persistence if available,
 * or creating default data otherwise. Merges loaded data with defaults for transient fields.
 * @param {import('@minecraft/server').Player} player
 * @param {number} currentTick Current game tick, used if initializing default data.
 * @param {import('../types.js').CommandDependencies} dependencies
 * @returns {Promise<import('../types.js').PlayerAntiCheatData>}
 */
export async function ensurePlayerDataInitialized(player, currentTick, dependencies) {
    const { playerUtils } = dependencies;
    if (playerData.has(player.id)) {
        const existingPData = playerData.get(player.id);
        existingPData.lastPosition = { ...player.location };
        existingPData.previousPosition = { ...player.location };
        existingPData.velocity = { ...player.getVelocity() };
        existingPData.lastGameMode = player.gameMode;
        existingPData.lastDimensionId = player.dimension.id;
        return existingPData;
    }
    let newPData = initializeDefaultPlayerData(player, currentTick, dependencies);
    const loadedData = await loadPlayerDataFromDynamicProperties(player, dependencies);
    if (loadedData) {
        playerUtils.debugLog(`Merging persisted pData for ${player.nameTag}. Session-only fields reset/re-initialized.`, player.nameTag, dependencies);
        const defaultPDataForMerge = initializeDefaultPlayerData(player, currentTick, dependencies);
        newPData = { ...defaultPDataForMerge, ...loadedData };
        newPData.flags = { ...defaultPDataForMerge.flags, ...loadedData.flags };
        if (typeof newPData.flags.totalFlags !== 'number' || isNaN(newPData.flags.totalFlags)) {
            newPData.flags.totalFlags = 0;
            for (const flagKey in newPData.flags) {
                if (flagKey !== 'totalFlags' && newPData.flags[flagKey] && typeof newPData.flags[flagKey].count === 'number') {
                    newPData.flags.totalFlags += newPData.flags[flagKey].count;
                }
            }
        }
        newPData.lastViolationDetailsMap = loadedData.lastViolationDetailsMap || {};
        newPData.automodState = loadedData.automodState || {};
        newPData.playerNameTag = player.nameTag;
        newPData.lastKnownNameTag = loadedData.lastKnownNameTag || player.nameTag;
        newPData.lastNameTagChangeTick = loadedData.lastNameTagChangeTick || currentTick;
        newPData.joinTime = loadedData.joinTime || Date.now();
        newPData.isDirtyForSave = false;
    } else {
        playerUtils.debugLog(`PDM:ensureInit: No persisted data for ${player.nameTag}. Using fresh default data.`, player.nameTag, dependencies);
        newPData.isDirtyForSave = true;
    }
    if (newPData.muteInfo && newPData.muteInfo.unmuteTime !== Infinity && Date.now() >= newPData.muteInfo.unmuteTime) {
        playerUtils.debugLog(`PDM:ensureInit: Mute for ${newPData.playerNameTag} expired on load. Clearing.`, newPData.isWatched ? newPData.playerNameTag : null, dependencies);
        newPData.muteInfo = null;
        newPData.isDirtyForSave = true;
    }
    if (newPData.banInfo && newPData.banInfo.unbanTime !== Infinity && Date.now() >= newPData.banInfo.unbanTime) {
        playerUtils.debugLog(`PDM:ensureInit: Ban for ${newPData.playerNameTag} expired on load. Clearing.`, newPData.isWatched ? newPData.playerNameTag : null, dependencies);
        newPData.banInfo = null;
        newPData.isDirtyForSave = true;
    }
    playerData.set(player.id, newPData);
    return newPData;
}

/**
 * Removes runtime data for players who are no longer online.
 * @param {Array<import('@minecraft/server').Player>} activePlayers
 * @param {import('../types.js').CommandDependencies} dependencies
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
            playerUtils.debugLog(`PDM:cleanup: Removed runtime data for ${removedPData?.playerNameTag || playerId}.`, removedPData?.isWatched ? (removedPData.playerNameTag || playerId) : null, dependencies);
            playerData.delete(playerId);
        }
    }
}

/**
 * Updates transient (per-tick) player data fields.
 * @param {import('@minecraft/server').Player} player
 * @param {import('../types.js').PlayerAntiCheatData} pData
 * @param {import('../types.js').CommandDependencies} dependencies
 */
export function updateTransientPlayerData(player, pData, dependencies) {
    const { currentTick, playerUtils, config, logManager } = dependencies;

    const rotation = player.getRotation();
    pData.lastPitch = rotation.x;
    pData.lastYaw = rotation.y;
    pData.previousVelocity = { ...pData.velocity };
    pData.velocity = { ...player.getVelocity() };
    pData.previousPosition = { ...pData.lastPosition };
    pData.lastPosition = { ...player.location };
    if (!pData.playerNameTag || pData.playerNameTag !== player.nameTag) {
        pData.playerNameTag = player.nameTag;
        pData.isDirtyForSave = true;
    }
    if (player.isOnGround) {
        pData.consecutiveOffGroundTicks = 0;
        pData.lastOnGroundTick = currentTick;
        pData.lastOnGroundPosition = { ...player.location };
        try {
            const feetPos = { x: Math.floor(pData.lastPosition.x), y: Math.floor(pData.lastPosition.y), z: Math.floor(pData.lastPosition.z) };
            const blockBelowFeet = player.dimension.getBlock({ x: feetPos.x, y: feetPos.y - 1, z: feetPos.z });
            const blockAtFeet = player.dimension.getBlock(feetPos);
            if ((blockBelowFeet && blockBelowFeet.typeId === 'minecraft:slime_block') || (blockAtFeet && blockAtFeet.typeId === 'minecraft:slime_block')) {
                pData.lastOnSlimeBlockTick = currentTick;
                if (pData.isWatched && config.enableDebugLogging) {
                    playerUtils.debugLog(`[PlayerDataManager] Player ${pData.playerNameTag} on slime block at tick ${currentTick}.`, pData.playerNameTag, dependencies);
                }
            }
        } catch (e) {
            logManager.addLog({
                actionType: 'error',
                message: e.message,
                player: pData.playerNameTag,
                context: 'slime_block_check',
            }, dependencies);
            console.warn(`[PlayerDataManager] Error checking for slime block under ${pData.playerNameTag}: ${e.message}`);
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
    const effects = player.getEffects();
    pData.jumpBoostAmplifier = effects.find(eff => eff.typeId === 'jump_boost')?.amplifier ?? 0;
    pData.hasSlowFalling = !!effects.find(eff => eff.typeId === 'slow_falling');
    pData.hasLevitation = !!effects.find(eff => eff.typeId === 'levitation');
    pData.speedAmplifier = effects.find(eff => eff.typeId === 'speed')?.amplifier ?? -1;
    pData.blindnessTicks = effects.find(eff => eff.typeId === 'blindness')?.duration ?? 0;
    if (pData.isWatched && config.enableDebugLogging) {
        const transientSnapshot = {
            vx: pData.velocity.x.toFixed(3),
            vy: pData.velocity.y.toFixed(3),
            vz: pData.velocity.z.toFixed(3),
            pitch: pData.lastPitch.toFixed(3),
            yaw: pData.lastYaw.toFixed(3),
            isSprinting: player.isSprinting,
            isSneaking: player.isSneaking,
            isOnGround: player.isOnGround,
            fallDistance: player.fallDistance.toFixed(3),
            jumpBoost: pData.jumpBoostAmplifier,
            slowFalling: pData.hasSlowFalling,
            levitation: pData.hasLevitation,
            speedAmp: pData.speedAmplifier,
        };
        playerUtils.debugLog(`Transient update for ${pData.playerNameTag} (Tick: ${currentTick}): ${JSON.stringify(transientSnapshot)}`, pData.playerNameTag, dependencies);
    }
}

/**
 * Adds a flag to a player's data and triggers AutoMod processing.
 * @param {import('@minecraft/server').Player} player
 * @param {string} flagType Standardized camelCase flag type.
 * @param {string} reasonMessage Base reason message for the flag.
 * @param {string | object} [detailsForNotify=''] Additional details or structured data.
 * @param {import('../types.js').CommandDependencies} dependencies
 */
export async function addFlag(player, flagType, reasonMessage, detailsForNotify = '', dependencies) {
    const { playerUtils, config, logManager } = dependencies;
    const pData = getPlayerData(player.id);

    if (!pData) {
        playerUtils.debugLog(`PDM:addFlag: No pData for ${player.nameTag}. Cannot add flag: ${flagType}.`, player.nameTag, dependencies);
        return;
    }

    if (!pData.flags[flagType]) {
        playerUtils.debugLog(`PDM:addFlag: New flagType '${flagType}' for ${player.nameTag}. Initializing structure in pData.flags.`, player.nameTag, dependencies);
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
            timestamp: Date.now(),
        };
        playerUtils.debugLog(`PDM:addFlag: Stored violation details for ${flagType} on ${player.nameTag}: ${JSON.stringify(pData.lastViolationDetailsMap[flagType])}`, player.nameTag, dependencies);
    }
    pData.isDirtyForSave = true;

    const notifyString = (typeof detailsForNotify === 'object' && detailsForNotify !== null) ?
        (detailsForNotify.originalDetailsForNotify || (`Item: ${String(detailsForNotify.itemTypeId)}`)) :
        detailsForNotify;
    const fullReasonForLog = `${reasonMessage} ${notifyString}`.trim();

    playerUtils.warnPlayer(player, reasonMessage);
    playerUtils.notifyAdmins(`Flagged ${player.nameTag} for ${flagType}. ${notifyString}`, dependencies, player, pData);
    playerUtils.debugLog(`FLAG: ${player.nameTag} for ${flagType}. Reason: '${fullReasonForLog}'. Total Flags: ${pData.flags.totalFlags}. Count[${flagType}]: ${pData.flags[flagType].count}`, player.nameTag, dependencies);

    if (config?.enableAutoMod && config?.automodConfig) {
        try {
            if (pData.isWatched) {
                playerUtils.debugLog(`addFlag: Calling processAutoModActions for ${player.nameTag}, checkType: ${flagType}`, player.nameTag, dependencies);
            }
            await processAutoModActions(player, pData, flagType, dependencies);
        } catch (e) {
            console.error(`[PlayerDataManager] Error calling processAutoModActions from addFlag for ${player.nameTag} / ${flagType}: ${e.stack || e}`);
            playerUtils.debugLog(`Error in processAutoModActions called from addFlag: ${e.stack || e}`, player.nameTag, dependencies);
            logManager.addLog({ actionType: 'error', context: 'playerDataManager.addFlag.processAutoMod', details: e.message }, dependencies);
        }
    } else if (pData.isWatched) {
        const autoModEnabled = config ? config.enableAutoMod : 'N/A (config missing)';
        const autoModConfigPresent = !!config?.automodConfig;
        playerUtils.debugLog(`addFlag: Skipping processAutoModActions for ${player.nameTag} (checkType: ${flagType}). enableAutoMod: ${autoModEnabled}, automodConfig present: ${autoModConfigPresent}.`, player.nameTag, dependencies);
    }
}

/**
 * Adds a mute record to a player's data.
 * @param {import('@minecraft/server').Player} player
 * @param {number | Infinity} durationMs Duration in ms, or Infinity for permanent.
 * @param {string} reason
 * @param {string} [mutedBy='Unknown']
 * @param {boolean} [isAutoMod=false]
 * @param {string|null} [triggeringCheckType=null]
 * @param {import('../types.js').CommandDependencies} dependencies
 * @returns {boolean} True if mute was successfully added.
 */
export function addMute(player, durationMs, reason, mutedBy = 'Unknown', isAutoMod = false, triggeringCheckType = null, dependencies) {
    const { playerUtils, getString } = dependencies;
    if (!player || typeof durationMs !== 'number' || (durationMs <= 0 && durationMs !== Infinity)) {
        playerUtils.debugLog(`[PlayerDataManager] addMute: Invalid arguments provided. Player: ${player?.nameTag}, Duration: ${durationMs}`, player?.nameTag, dependencies);
        return false;
    }
    const pData = getPlayerData(player.id);
    if (!pData) {
        playerUtils.debugLog(`[PlayerDataManager] addMute: No pData found for player ${player.nameTag}. Cannot apply mute.`, player.nameTag, dependencies);
        return false;
    }

    const unmuteTime = (durationMs === Infinity) ? Infinity : Date.now() + durationMs;
    const muteReason = reason || getString('playerData.mute.defaultReason');

    pData.muteInfo = {
        unmuteTime,
        reason: muteReason,
        mutedBy: mutedBy,
        isAutoMod: isAutoMod,
        triggeringCheckType: triggeringCheckType,
    };
    pData.isDirtyForSave = true;

    let logMsg = `[PlayerDataManager] addMute: Player ${player.nameTag} muted by ${mutedBy}. Reason: '${muteReason}'. AutoMod: ${isAutoMod}. CheckType: ${triggeringCheckType || 'N/A'}.`;
    if (durationMs === Infinity) {
        logMsg += ' Duration: Permanent.';
    } else {
        logMsg += ` Unmute time: ${new Date(unmuteTime).toISOString()}.`;
    }
    playerUtils.debugLog(logMsg, pData.isWatched ? player.nameTag : null, dependencies);
    return true;
}

/**
 * Removes a mute record from a player's data.
 * @param {import('@minecraft/server').Player} player
 * @param {import('../types.js').CommandDependencies} dependencies
 * @returns {boolean} True if player was unmuted.
 */
export function removeMute(player, dependencies) {
    const { playerUtils } = dependencies;
    if (!player) {
        playerUtils.debugLog('[PlayerDataManager] removeMute: Invalid player object provided.', null, dependencies);
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

/**
 * Retrieves a player's current mute information, clearing it if expired.
 * @param {import('@minecraft/server').Player} player
 * @param {import('../types.js').CommandDependencies} dependencies
 * @returns {import('../types.js').PlayerMuteInfo | null}
 */
export function getMuteInfo(player, dependencies) {
    const { playerUtils } = dependencies;
    if (!player) return null;

    const pData = getPlayerData(player.id);
    if (!pData || !pData.muteInfo) return null;

    const mute = pData.muteInfo;
    if (mute.unmuteTime !== Infinity && Date.now() >= mute.unmuteTime) {
        pData.muteInfo = null; // Expired mute
        pData.isDirtyForSave = true;
        playerUtils.debugLog(`[PlayerDataManager] getMuteInfo: Mute for player ${player.nameTag} expired and has been removed.`, pData.isWatched ? player.nameTag : null, dependencies);
        return null;
    }
    return mute;
}

/**
 * Checks if a player is currently muted.
 * @param {import('@minecraft/server').Player} player
 * @param {import('../types.js').CommandDependencies} dependencies
 * @returns {boolean}
 */
export function isMuted(player, dependencies) {
    return getMuteInfo(player, dependencies) !== null;
}

/**
 * Adds a ban record to a player's data.
 * @param {import('@minecraft/server').Player} player
 * @param {number | Infinity} durationMs Duration in ms, or Infinity for permanent.
 * @param {string} reason
 * @param {string} [bannedBy='Unknown']
 * @param {boolean} [isAutoMod=false]
 * @param {string|null} [triggeringCheckType=null]
 * @param {import('../types.js').CommandDependencies} dependencies
 * @returns {boolean} True if ban was successfully added.
 */
export function addBan(player, durationMs, reason, bannedBy = 'Unknown', isAutoMod = false, triggeringCheckType = null, dependencies) {
    const { playerUtils, getString } = dependencies;
    if (!player || typeof durationMs !== 'number' || (durationMs <= 0 && durationMs !== Infinity) || typeof bannedBy !== 'string') {
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
    const banReason = reason || getString('playerData.ban.defaultReason');

    pData.banInfo = {
        xuid: player.id,
        playerName: player.nameTag,
        banTime: currentTime,
        unbanTime,
        reason: banReason,
        bannedBy: bannedBy,
        isAutoMod: isAutoMod,
        triggeringCheckType: triggeringCheckType,
    };
    pData.isDirtyForSave = true;

    let logMsg = `PDM:addBan: Player ${player.nameTag} (XUID: ${player.id}) banned by ${bannedBy}. Reason: '${banReason}'. AutoMod: ${isAutoMod}. CheckType: ${triggeringCheckType || 'N/A'}.`;
    if (durationMs === Infinity) {
        logMsg += ' Duration: Permanent.';
    } else {
        logMsg += ` Unban time: ${new Date(unbanTime).toISOString()}.`;
    }
    playerUtils.debugLog(logMsg, pData.isWatched ? player.nameTag : null, dependencies);
    return true;
}

/**
 * Removes a ban record from a player's data.
 * @param {import('@minecraft/server').Player} player
 * @param {import('../types.js').CommandDependencies} dependencies
 * @returns {boolean} True if player was unbanned.
 */
export function removeBan(player, dependencies) {
    const { playerUtils } = dependencies;
    if (!player) {
        playerUtils.debugLog('PDM:removeBan: Invalid player object provided.', null, dependencies);
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

/**
 * Retrieves a player's current ban information, clearing it if expired.
 * @param {import('@minecraft/server').Player} player
 * @param {import('../types.js').CommandDependencies} dependencies
 * @returns {import('../types.js').PlayerBanInfo | null}
 */
export function getBanInfo(player, dependencies) {
    const { playerUtils } = dependencies;
    if (!player) return null;

    const pData = getPlayerData(player.id);
    if (!pData || !pData.banInfo) return null;

    const currentBanInfo = pData.banInfo;
    if (currentBanInfo.unbanTime !== Infinity && Date.now() >= currentBanInfo.unbanTime) {
        pData.banInfo = null; // Expired ban
        pData.isDirtyForSave = true;
        playerUtils.debugLog(`PDM:getBanInfo: Ban for player ${player.nameTag} expired and has been removed.`, pData.isWatched ? player.nameTag : null, dependencies);
        return null;
    }
    return currentBanInfo;
}

/**
 * Checks if a player is currently banned.
 * @param {import('@minecraft/server').Player} player
 * @param {import('../types.js').CommandDependencies} dependencies
 * @returns {boolean}
 */
export function isBanned(player, dependencies) {
    return getBanInfo(player, dependencies) !== null;
}

/**
 * Saves player data if it has been marked as dirty.
 * @param {import('@minecraft/server').Player} player
 * @param {import('../types.js').CommandDependencies} dependencies
 * @returns {Promise<boolean>} True if data was saved or not dirty, false on save error.
 */
export async function saveDirtyPlayerData(player, dependencies) {
    const { playerUtils } = dependencies;
    if (!player) return false;

    const pData = playerData.get(player.id);
    if (pData && pData.isDirtyForSave) {
        playerUtils.debugLog(`PDM:saveDirty: Saving dirty data for ${player.nameTag}.`, pData.isWatched ? player.nameTag : null, dependencies);
        const success = await prepareAndSavePlayerData(player, dependencies);
        if (success) {
            pData.isDirtyForSave = false;
        }
        return success;
    }
    return true; // Not dirty, effectively "saved"
}

/**
 * Clears all flags and resets AutoMod state for a specific check type for a player.
 * @param {import('@minecraft/server').Player} player
 * @param {string} checkType The check type whose flags to clear.
 * @param {import('../types.js').CommandDependencies} dependencies
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
        // Optionally reset lastDetectionTime: pData.flags[checkType].lastDetectionTime = 0;
    }

    if (pData.automodState && pData.automodState[checkType]) {
        pData.automodState[checkType] = { lastActionThreshold: 0, lastActionTimestamp: 0 };
    }
    pData.isDirtyForSave = true;

    const playerContext = pData.isWatched ? player.nameTag : null;
    playerUtils.debugLog(`[PlayerDataManager] Cleared ${clearedCount} flags and reset AutoMod state for checkType '${checkType}' for player ${player.nameTag}.`, playerContext, dependencies);
}

/**
 * Clears transient item use state flags if they persist beyond a configured timeout.
 * @param {import('../types.js').PlayerAntiCheatData} pData
 * @param {import('../types.js').CommandDependencies} dependencies
 */
export function clearExpiredItemUseStates(pData, dependencies) {
    const { currentTick, config, playerUtils } = dependencies;

    if (pData.isUsingConsumable && (currentTick - (pData.lastItemUseTick || 0) > config.itemUseStateClearTicks)) {
        if (pData.isWatched) {
            playerUtils.debugLog(`[PlayerDataManager] StateConflict: Auto-clearing isUsingConsumable for ${pData.playerNameTag || 'UnknownPlayer'} after timeout. Tick: ${currentTick}`, pData.playerNameTag, dependencies);
        }
        pData.isUsingConsumable = false;
        pData.isDirtyForSave = true;
    }

    if (pData.isChargingBow && (currentTick - (pData.lastItemUseTick || 0) > config.itemUseStateClearTicks)) {
        if (pData.isWatched) {
            playerUtils.debugLog(`[PlayerDataManager] StateConflict: Auto-clearing isChargingBow for ${pData.playerNameTag || 'UnknownPlayer'} after timeout. Tick: ${currentTick}`, pData.playerNameTag, dependencies);
        }
        pData.isChargingBow = false;
        pData.isDirtyForSave = true;
    }

    if (pData.isUsingShield && (currentTick - (pData.lastItemUseTick || 0) > config.itemUseStateClearTicks)) {
        if (pData.isWatched) {
            playerUtils.debugLog(`[PlayerDataManager] StateConflict: Auto-clearing isUsingShield for ${pData.playerNameTag || 'UnknownPlayer'} after timeout. Tick: ${currentTick}`, pData.playerNameTag, dependencies);
        }
        pData.isUsingShield = false;
        pData.isDirtyForSave = true;
    }
}
