/**
 * @file Manages all player-specific data used by the AntiCheat system.
 * @module AntiCheatsBP/scripts/core/playerDataManager
 * This includes runtime data (pData), persistence via dynamic properties,
 * and helper functions for data manipulation like adding flags, mutes, and bans.
 * All flagType strings should be camelCase.
 */
import * as mc from '@minecraft/server';
import { processAutoModActions } from './automodManager.js';
import { checkActionProfiles } from './actionProfiles.js';

// Constants
const jsonSampleLogLength = 200;
const ticksPerSecond = 20;
const decimalPlacesForDebugSnapshot = 3;
const pendingFlagPurgesDpKey = 'anticheat:pending_flag_purges_v1';


/** @type {Map<string, import('../types.js').PlayerAntiCheatData>} In-memory cache for player data. */
const playerData = new Map();

const dynamicPropertyKeyV1 = 'anticheat:pdata_v1';
const dynamicPropertySizeLimit = 32760;

/**
 * Keys from PlayerAntiCheatData that are persisted to dynamic properties.
 */
const persistedPlayerDataKeys = [
    'flags', 'isWatched', 'lastFlagType', 'playerNameTag',
    'blockBreakEvents',
    'consecutiveOffGroundTicks', 'fallDistance',
    'consecutiveOnGroundSpeedingTicks', 'muteInfo', 'banInfo',
    'lastCombatInteractionTime', 'lastViolationDetailsMap', 'automodState',
    'joinTime', 'firstEverLoginTime', 'joinCount',
    'lastKnownNameTag', 'lastNameTagChangeTick', 'deathMessageToShowOnSpawn',
    'lastCheckNameSpoofTick', 'lastCheckAntiGmcTick', 'lastCheckNetherRoofTick',
    'lastCheckAutoToolTick', 'lastCheckFlatRotationBuildingTick', 'lastRenderDistanceCheckTick',
    'lastChatMessageTimestamp',
    'recentHits',
    'itemUseTimestamps',
    'lastUsedElytraTick',
    'lastOnSlimeBlockTick',
    'recentEntitySpamTimestamps',
];

export function getPlayerData(playerId) {
    return playerData.get(playerId);
}

export function scheduleFlagPurge(playerIdentifier, dependencies) {
    const { playerUtils, logManager } = dependencies;
    const { debugLog } = playerUtils;
    const { addLog } = logManager;

    if (!playerIdentifier || typeof playerIdentifier !== 'string' || playerIdentifier.trim() === '') {
        console.warn('[PlayerDataManager.scheduleFlagPurge] Invalid playerIdentifier provided.');
        debugLog(`[PlayerDataManager.scheduleFlagPurge] Attempted to schedule purge with invalid identifier: '${playerIdentifier}'`, null, dependencies);
        return false;
    }

    try {
        const rawPendingPurges = mc.world.getDynamicProperty(pendingFlagPurgesDpKey);
        let pendingPurges = [];

        if (typeof rawPendingPurges === 'string' && rawPendingPurges.length > 0) {
            try {
                pendingPurges = JSON.parse(rawPendingPurges);
                if (!Array.isArray(pendingPurges)) {
                    pendingPurges = [];
                }
            } catch (parseError) {
                addLog({ actionType: 'system_error', context: 'scheduleFlagPurge_json_parse_fail', details: `Failed to parse pendingFlagPurgesDpKey. Error: ${parseError.message}. Key: ${pendingFlagPurgesDpKey}`, errorStack: parseError.stack || parseError.toString() }, dependencies);
                pendingPurges = [];
            }
        } else if (rawPendingPurges !== undefined) {
            pendingPurges = [];
        }

        if (!pendingPurges.includes(playerIdentifier)) {
            pendingPurges.push(playerIdentifier);
            mc.world.setDynamicProperty(pendingFlagPurgesDpKey, JSON.stringify(pendingPurges));
            debugLog(`[PlayerDataManager.scheduleFlagPurge] Scheduled flag purge for '${playerIdentifier}'. Pending list size: ${pendingPurges.length}`, null, dependencies);
            return true;
        }
        debugLog(`[PlayerDataManager.scheduleFlagPurge] Flag purge for '${playerIdentifier}' was already scheduled.`, null, dependencies);
        return true;
    } catch (error) {
        addLog({ actionType: 'system_error', context: 'scheduleFlagPurge_dp_access_fail', details: `Error with pendingFlagPurgesDpKey. Error: ${error.message}. Key: ${pendingFlagPurgesDpKey}`, errorStack: error.stack || error.toString() }, dependencies);
        return false;
    }
}

function _handleDynamicPropertyError(callingFunction, operation, playerName, error, dependencies, additionalDetails = {}) {
    const { playerUtils, logManager } = dependencies;
    const { debugLog } = playerUtils;
    const { addLog } = logManager;
    const baseMessage = `[PlayerDataManager.${callingFunction}] Error during ${operation} for ${playerName}`;

    console.error(`${baseMessage}: ${error.stack || error}`);
    debugLog(`${baseMessage}. Error: ${error.message}`, playerName, dependencies);

    let opType = 'unknown';
    if (operation.toLowerCase().includes('json.parse')) opType = 'parse';
    else if (operation.toLowerCase().includes('json.stringify')) opType = 'stringify';
    else if (operation.toLowerCase().includes('getdynamicproperty')) opType = 'get';
    else if (operation.toLowerCase().includes('setdynamicproperty')) opType = 'set';

    const actionType = `error.pdm.dp${opType.charAt(0).toUpperCase() + opType.slice(1)}`;
    const errorCode = `PDM_DP_${opType.toUpperCase()}_FAIL`;

    addLog({ actionType, context: `playerDataManager.${callingFunction}`, targetName: playerName, details: { errorCode, message: error.message, rawErrorStack: error.stack, meta: { originalOperation: operation, ...additionalDetails }}}, dependencies);
}

export function savePlayerDataToDynamicProperties(player, pDataToSave, dependencies) {
    const { debugLog } = dependencies.playerUtils;
    const playerName = player?.nameTag ?? player?.id ?? 'UnknownPlayer';

    if (!player?.isValid() || !pDataToSave) {
        debugLog(`[PlayerDataManager.savePlayerDataToDynamicProperties] Invalid player or pDataToSave for ${playerName}.`, playerName, dependencies);
        return false;
    }

    let jsonString;
    try {
        jsonString = JSON.stringify(pDataToSave);
    } catch (error) {
        _handleDynamicPropertyError('savePlayerDataToDynamicProperties', 'JSON.stringify', playerName, error, dependencies, { dataToSave: typeof pDataToSave });
        return false;
    }

    if (jsonString.length > dynamicPropertySizeLimit) {
        console.warn(`[PlayerDataManager.savePlayerDataToDynamicProperties] pData for ${playerName} too large (${jsonString.length}b). Cannot save.`);
        debugLog(`[PlayerDataManager.savePlayerDataToDynamicProperties] pData for ${playerName} exceeds size limit. Size: ${jsonString.length}b.`, playerName, dependencies);
        return false;
    }

    try {
        player.setDynamicProperty(dynamicPropertyKeyV1, jsonString);
        return true;
    } catch (error) {
        _handleDynamicPropertyError('savePlayerDataToDynamicProperties', 'player.setDynamicProperty', playerName, error, dependencies, { propertyKey: dynamicPropertyKeyV1, jsonLength: jsonString.length });
        return false;
    }
}

export function loadPlayerDataFromDynamicProperties(player, dependencies) {
    const { debugLog } = dependencies.playerUtils;
    const playerName = player?.nameTag ?? player?.id ?? 'UnknownPlayer';

    if (!player?.isValid()) {
        debugLog('[PlayerDataManager.loadPlayerDataFromDynamicProperties] Invalid player object.', null, dependencies);
        return null;
    }

    let jsonString;
    try {
        jsonString = player.getDynamicProperty(dynamicPropertyKeyV1);
    } catch (error) {
        _handleDynamicPropertyError('loadPlayerDataFromDynamicProperties', 'player.getDynamicProperty', playerName, error, dependencies, { propertyKey: dynamicPropertyKeyV1 });
        return null;
    }

    if (typeof jsonString === 'string') {
        try {
            const parsedData = JSON.parse(jsonString);
            debugLog(`[PlayerDataManager.loadPlayerDataFromDynamicProperties] Loaded and parsed data for ${playerName}.`, playerName, dependencies);
            return parsedData;
        } catch (error) {
            _handleDynamicPropertyError('loadPlayerDataFromDynamicProperties', 'JSON.parse', playerName, error, dependencies, { jsonSample: jsonString.substring(0, jsonSampleLogLength) + (jsonString.length > jsonSampleLogLength ? '...' : '') });
            return null;
        }
    } else if (jsonString === undefined) {
        debugLog(`[PlayerDataManager.loadPlayerDataFromDynamicProperties] No dynamic property '${dynamicPropertyKeyV1}' for ${playerName}.`, playerName, dependencies);
        return null;
    } else {
        debugLog(`[PlayerDataManager.loadPlayerDataFromDynamicProperties] Unexpected data type for '${dynamicPropertyKeyV1}' for ${playerName}: ${typeof jsonString}`, playerName, dependencies);
        return null;
    }
}

export async function prepareAndSavePlayerData(player, dependencies) {
    const { debugLog } = dependencies.playerUtils;
    const playerName = player?.nameTag ?? player?.id ?? 'UnknownPlayer';

    if (!player?.isValid()) {
        debugLog(`[PlayerDataManager.prepareAndSavePlayerData] Invalid player object for ${playerName}. Cannot save.`, playerName, dependencies);
        return;
    }

    const pData = playerData.get(player.id);
    if (pData) {
        const persistedPData = {};
        for (const key of persistedPlayerDataKeys) {
            if (Object.prototype.hasOwnProperty.call(pData, key) && pData[key] !== undefined) {
                persistedPData[key] = pData[key];
            }
        }
        await savePlayerDataToDynamicProperties(player, persistedPData, dependencies);
    } else {
        debugLog(`[PlayerDataManager.prepareAndSavePlayerData] No runtime pData for ${playerName}. Cannot save.`, playerName, dependencies);
    }
}

const dynamicallyGeneratedFlagTypes = new Set();
for (const checkKey in checkActionProfiles) {
    if (Object.prototype.hasOwnProperty.call(checkActionProfiles, checkKey)) {
        const profile = checkActionProfiles[checkKey];
        if (profile && typeof profile.flag === 'object' && profile.flag !== null) {
            if (typeof profile.flag.type === 'string' && profile.flag.type.length > 0) {
                dynamicallyGeneratedFlagTypes.add(profile.flag.type);
            } else {
                dynamicallyGeneratedFlagTypes.add(checkKey);
            }
        }
    }
}
const allKnownFlagTypes = Array.from(dynamicallyGeneratedFlagTypes);

export function initializeDefaultPlayerData(player, dependencies) {
    const { playerUtils, currentTick } = dependencies;
    const { debugLog } = playerUtils;
    const playerName = player?.nameTag ?? player?.id ?? 'UnknownPlayer';
    debugLog(`[PlayerDataManager.initializeDefaultPlayerData] Initializing for ${playerName} (ID: ${player.id}) at tick ${currentTick}`, playerName, dependencies);

    const defaultFlags = { totalFlags: 0 };
    for (const flagKey of allKnownFlagTypes) {
        defaultFlags[flagKey] = { count: 0, lastDetectionTime: 0 };
    }

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
        chatMessageHistory: [],
        flags: defaultFlags,
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
        jumpBoostAmplifier: 0,
        hasSlowFalling: false,
        hasLevitation: false,
        speedAmplifier: -1,
        blindnessTicks: 0,
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
        muteInfo: null,
        banInfo: null,
        firstEverLoginTime: Date.now(),
        joinTime: Date.now(),
        lastGameMode: player.gameMode,
        lastDimensionId: player.dimension.id,
        isDirtyForSave: true,
        lastViolationDetailsMap: {},
        automodState: {},
        deathMessageToShowOnSpawn: null,
        recentEntitySpamTimestamps: {},
        lastCheckNameSpoofTick: 0,
        lastCheckAntiGmcTick: 0,
        lastCheckNetherRoofTick: 0,
        lastCheckAutoToolTick: 0,
        lastCheckFlatRotationBuildingTick: 0,
        lastRenderDistanceCheckTick: 0,
        slimeCheckErrorLogged: false,
    };
}

export async function ensurePlayerDataInitialized(player, dependencies) {
    const { playerUtils, logManager, currentTick } = dependencies;
    const { debugLog, sendMessage, getString } = playerUtils;
    const { addLog } = logManager;
    const playerName = player?.nameTag ?? player?.id ?? 'UnknownPlayer';

    if (playerData.has(player.id)) {
        const existingPData = playerData.get(player.id);
        existingPData.lastPosition = { ...player.location };
        existingPData.previousPosition = { ...player.location };
        existingPData.velocity = { ...player.getVelocity() };
        existingPData.lastGameMode = player.gameMode;
        existingPData.lastDimensionId = player.dimension.id;
        existingPData.playerNameTag = player.nameTag;
        return existingPData;
    }

    let newPData = initializeDefaultPlayerData(player, dependencies);
    const loadedData = await loadPlayerDataFromDynamicProperties(player, dependencies);

    if (loadedData && typeof loadedData === 'object') {
        debugLog(`[PlayerDataManager.ensurePlayerDataInitialized] Merging persisted pData for ${playerName}.`, playerName, dependencies);
        const defaultPDataForMerge = initializeDefaultPlayerData(player, dependencies);
        newPData = { ...defaultPDataForMerge, ...loadedData };

        newPData.flags = { ...defaultPDataForMerge.flags, ...(loadedData.flags || {}) };
        if (typeof newPData.flags.totalFlags !== 'number' || isNaN(newPData.flags.totalFlags)) {
            newPData.flags.totalFlags = 0;
            for (const flagKey in newPData.flags) {
                if (Object.prototype.hasOwnProperty.call(newPData.flags, flagKey) && flagKey !== 'totalFlags' && newPData.flags[flagKey] && typeof newPData.flags[flagKey].count === 'number') {
                    newPData.flags.totalFlags += newPData.flags[flagKey].count;
                }
            }
        }
        newPData.lastViolationDetailsMap = { ...(defaultPDataForMerge.lastViolationDetailsMap || {}), ...(loadedData.lastViolationDetailsMap || {}) };
        newPData.automodState = { ...(defaultPDataForMerge.automodState || {}), ...(loadedData.automodState || {}) };
        newPData.playerNameTag = player.nameTag;
        newPData.lastKnownNameTag = loadedData.lastKnownNameTag ?? player.nameTag;
        newPData.lastNameTagChangeTick = loadedData.lastNameTagChangeTick ?? currentTick;
        newPData.joinTime = loadedData.joinTime ?? newPData.joinTime;
        newPData.firstEverLoginTime = loadedData.firstEverLoginTime ?? newPData.firstEverLoginTime;
        newPData.joinCount = loadedData.joinCount ?? newPData.joinCount;
        newPData.isDirtyForSave = false;
    } else {
        debugLog(`[PlayerDataManager.ensurePlayerDataInitialized] No persisted data for ${playerName}. Using fresh default data.`, playerName, dependencies);
    }

    if (newPData.muteInfo && newPData.muteInfo.unmuteTime !== Infinity && Date.now() >= newPData.muteInfo.unmuteTime) {
        debugLog(`[PlayerDataManager.ensurePlayerDataInitialized] Mute for ${newPData.playerNameTag} expired on load/ensure. Clearing.`, newPData.isWatched ? newPData.playerNameTag : null, dependencies);
        newPData.muteInfo = null;
        newPData.isDirtyForSave = true;
    }
    if (newPData.banInfo && newPData.banInfo.unbanTime !== Infinity && Date.now() >= newPData.banInfo.unbanTime) {
        debugLog(`[PlayerDataManager.ensurePlayerDataInitialized] Ban for ${newPData.playerNameTag} expired on load/ensure. Clearing.`, newPData.isWatched ? newPData.playerNameTag : null, dependencies);
        newPData.banInfo = null;
        newPData.isDirtyForSave = true;
    }

    try {
        const rawPendingPurges = mc.world.getDynamicProperty(pendingFlagPurgesDpKey);
        let pendingPurges = [];
        let purgesListModified = false;

        if (typeof rawPendingPurges === 'string' && rawPendingPurges.length > 0) {
            try {
                pendingPurges = JSON.parse(rawPendingPurges);
                if (!Array.isArray(pendingPurges)) pendingPurges = [];
            } catch (e) {
                console.error(`[PlayerDataManager.ensurePlayerDataInitialized] Error parsing pending purges list for ${playerName}: ${e.message}. Resetting list.`);
                pendingPurges = [];
            }
        }

        const playerIdentifierForPurge = newPData.lastKnownNameTag || newPData.playerNameTag;
        const purgeIndex = pendingPurges.indexOf(playerIdentifierForPurge);

        if (purgeIndex > -1) {
            debugLog(`[PlayerDataManager.ensurePlayerDataInitialized] Found pending flag purge for ${playerIdentifierForPurge}. Processing...`, newPData.isWatched ? playerIdentifierForPurge : null, dependencies);
            const oldTotalFlags = newPData.flags?.totalFlags ?? 0;
            const defaultPlayerDataForFlags = initializeDefaultPlayerData(player, dependencies);
            newPData.flags = JSON.parse(JSON.stringify(defaultPlayerDataForFlags.flags));
            newPData.lastFlagType = '';
            newPData.lastViolationDetailsMap = {};
            newPData.automodState = {};
            newPData.isDirtyForSave = true;
            pendingPurges.splice(purgeIndex, 1);
            purgesListModified = true;
            mc.world.setDynamicProperty(pendingFlagPurgesDpKey, JSON.stringify(pendingPurges));
            sendMessage(player, getString('playerDataManager.offlinePurgeCompleteNotification', dependencies));
            addLog({ actionType: 'flagsPurgedOfflineOnJoin', adminName: 'System (Scheduled Purge)', targetName: playerIdentifierForPurge, targetId: player.id, details: `Flags purged on join due to scheduled request. Old total flags: ${oldTotalFlags}.`, context: 'PlayerDataManager.ensurePlayerDataInitialized' }, dependencies);
            debugLog(`[PlayerDataManager.ensurePlayerDataInitialized] Successfully processed scheduled flag purge for ${playerIdentifierForPurge}. Old total flags: ${oldTotalFlags}.`, newPData.isWatched ? playerIdentifierForPurge : null, dependencies);
        } else if (purgesListModified) {
            mc.world.setDynamicProperty(pendingFlagPurgesDpKey, JSON.stringify(pendingPurges));
        }
    } catch (e) {
        addLog({ actionType: 'system_error', context: 'ensurePlayerDataInitialized_pending_purge_fail', details: `Player ${playerName}: Error processing pendingFlagPurgesDpKey. Error: ${e.message}`, errorStack: e.stack || e.toString() }, dependencies);
    }

    playerData.set(player.id, newPData);
    return newPData;
}

export function cleanupActivePlayerData(activePlayers, dependencies) {
    const { playerUtils } = dependencies;
    const { debugLog } = playerUtils;
    const activePlayerIds = new Set(activePlayers.filter(p => p?.isValid()).map(p => p.id));

    for (const playerId of playerData.keys()) {
        if (!activePlayerIds.has(playerId)) {
            const removedPData = playerData.get(playerId);
            const playerNameForLog = removedPData?.playerNameTag ?? playerId;
            debugLog(`[PlayerDataManager.cleanupActivePlayerData] Removed runtime data for ${playerNameForLog}.`, removedPData?.isWatched ? playerNameForLog : null, dependencies);
            playerData.delete(playerId);
        }
    }
}

export function updateTransientPlayerData(player, pData, dependencies) {
    const { currentTick, config, playerUtils, logManager } = dependencies;
    const { debugLog } = playerUtils;
    const { addLog } = logManager;
    const playerName = player?.nameTag ?? pData?.playerNameTag ?? 'UnknownPlayer';

    const rotation = player.getRotation();
    pData.lastPitch = rotation.x;
    pData.lastYaw = rotation.y;
    pData.previousVelocity = { ...(pData.velocity || { x: 0, y: 0, z: 0 }) };
    pData.velocity = { ...player.getVelocity() };
    pData.previousPosition = { ...(pData.lastPosition || player.location) };
    pData.lastPosition = { ...player.location };

    if (pData.playerNameTag !== player.nameTag) {
        pData.playerNameTag = player.nameTag;
        pData.isDirtyForSave = true;
    }

    if (player.isOnGround) {
        pData.consecutiveOffGroundTicks = 0;
        pData.lastOnGroundTick = currentTick;
        pData.lastOnGroundPosition = { ...player.location };
        let feetPos = { x: 0, y: 0, z: 0 };
        try {
            feetPos = { x: Math.floor(pData.lastPosition.x), y: Math.floor(pData.lastPosition.y), z: Math.floor(pData.lastPosition.z) };
            const blockBelowFeet = player.dimension?.getBlock(feetPos.offset(0, -1, 0));
            const blockAtFeet = player.dimension?.getBlock(feetPos);

            if (blockBelowFeet?.typeId === 'minecraft:slime' || blockAtFeet?.typeId === 'minecraft:slime') {
                pData.lastOnSlimeBlockTick = currentTick;
                if (pData.isWatched && config?.enableDebugLogging) {
                    debugLog(`[PlayerDataManager.updateTransientPlayerData] Player ${playerName} on slime block at tick ${currentTick}.`, playerName, dependencies);
                }
            }
        } catch (e) {
            if (!pData.slimeCheckErrorLogged) {
                addLog({ actionType: 'errorPlayerDataManagerSlimeCheck', context: 'playerDataManager.updateTransientPlayerData.slimeBlockCheck', targetName: playerName, details: { errorMessage: e.message, stack: e.stack, feetPos }}, dependencies);
                pData.slimeCheckErrorLogged = true;
            }
        }
    } else {
        pData.consecutiveOffGroundTicks++;
        pData.slimeCheckErrorLogged = false;
    }

    if (player.selectedSlotIndex !== pData.previousSelectedSlotIndex) {
        pData.lastSelectedSlotChangeTick = currentTick;
        pData.previousSelectedSlotIndex = player.selectedSlotIndex;
    }

    if (pData.lastGameMode !== player.gameMode) pData.lastGameMode = player.gameMode;
    if (pData.lastDimensionId !== player.dimension.id) pData.lastDimensionId = player.dimension.id;

    const effects = player.getEffects();
    pData.jumpBoostAmplifier = effects?.find(eff => eff.typeId === 'minecraft:jump_boost')?.amplifier ?? 0;
    pData.hasSlowFalling = !!effects?.find(eff => eff.typeId === 'minecraft:slow_falling');
    pData.hasLevitation = !!effects?.find(eff => eff.typeId === 'minecraft:levitation');
    pData.speedAmplifier = effects?.find(eff => eff.typeId === 'minecraft:speed')?.amplifier ?? -1;
    pData.blindnessTicks = effects?.find(eff => eff.typeId === 'minecraft:blindness')?.duration ?? 0;

    if (pData.isWatched && config?.enableDebugLogging && (currentTick % ticksPerSecond === 0)) {
        const transientSnapshot = {
            vx: pData.velocity.x.toFixed(3), vy: pData.velocity.y.toFixed(3), vz: pData.velocity.z.toFixed(3),
            pitch: pData.lastPitch.toFixed(3), yaw: pData.lastYaw.toFixed(3),
            sprinting: player.isSprinting, sneaking: player.isSneaking, onGround: player.isOnGround,
            fallDist: player.fallDistance.toFixed(3),
            jumpBoost: pData.jumpBoostAmplifier, slowFall: pData.hasSlowFalling, lev: pData.hasLevitation, speedAmp: pData.speedAmplifier,
        };
        debugLog(`${playerName} (Tick: ${currentTick}) Snapshot: ${JSON.stringify(transientSnapshot)}`, playerName, dependencies);
    }
}

export async function addFlag(player, flagType, reasonMessage, dependencies, detailsForNotify = '') {
    const { playerUtils, config, logManager } = dependencies;
    const { debugLog, warnPlayer, getString, notifyAdmins } = playerUtils;
    const { addLog } = logManager;
    const playerName = player?.nameTag ?? player?.id ?? 'UnknownPlayer';

    if (!player?.isValid()) {
        debugLog(`[PlayerDataManager.addFlag] Invalid player for flag: ${flagType}.`, playerName, dependencies);
        return;
    }
    const pData = getPlayerData(player.id);
    if (!pData) {
        debugLog(`[PlayerDataManager.addFlag] No pData for ${playerName}. Cannot add flag: ${flagType}.`, playerName, dependencies);
        return;
    }

    const standardizedFlagType = flagType.replace(/([-_][a-z0-9])/ig, ($1) => $1.toUpperCase().replace('-', '').replace('_', '')).replace(/^[A-Z]/, (match) => match.toLowerCase());

    pData.flags[standardizedFlagType] ??= { count: 0, lastDetectionTime: 0 };
    pData.flags[standardizedFlagType].count++;
    pData.flags[standardizedFlagType].lastDetectionTime = Date.now();
    pData.flags.totalFlags = (pData.flags.totalFlags || 0) + 1;
    pData.lastFlagType = standardizedFlagType;
    pData.isDirtyForSave = true;

    const notifyString = (typeof detailsForNotify === 'object' && detailsForNotify !== null) ? (detailsForNotify.originalDetailsForNotify || `Item: ${String(detailsForNotify.itemTypeId || 'N/A')}`) : String(detailsForNotify);

    warnPlayer(player, reasonMessage, dependencies);
    if (config.notifications?.notifyOnPlayerFlagged !== false) {
        const baseNotifyMsg = getString('playerData.notify.flagged', { flagType: standardizedFlagType, details: notifyString });
        notifyAdmins(baseNotifyMsg, dependencies, player, pData);
    }
    debugLog(`[PlayerDataManager.addFlag] ${playerName} flagged for ${standardizedFlagType}. Total: ${pData.flags.totalFlags}`, playerName, dependencies);

    if (config?.enableAutoMod && automodConfig) { // Direct reference to imported automodConfig
        try {
            await processAutoModActions(player, pData, standardizedFlagType, dependencies);
        } catch (e) {
            debugLog(`[PlayerDataManager.addFlag] Error in processAutoModActions: ${e.stack || e}`, playerName, dependencies);
            addLog({ actionType: 'errorPlayerDataManagerAutomodProcess', context: 'playerDataManager.addFlag', targetName: playerName, details: { checkType: standardizedFlagType, errorMessage: e.message, stack: e.stack }}, dependencies);
        }
    }
}

function _addPlayerStateRestriction(player, pData, stateType, durationMs, reason, restrictedBy, isAutoMod, triggeringCheckType, dependencies) {
    const { playerUtils } = dependencies;
    const { debugLog, getString } = playerUtils;
    const playerName = pData.playerNameTag;

    const expiryTime = (durationMs === Infinity) ? Infinity : Date.now() + durationMs;
    const actualReason = reason || getString(`playerData.${stateType}.defaultReason`);

    const restrictionInfo = {
        reason: actualReason,
        [stateType === 'ban' ? 'bannedBy' : 'mutedBy']: restrictedBy,
        isAutoMod,
        triggeringCheckType,
        [stateType === 'ban' ? 'unbanTime' : 'unmuteTime']: expiryTime,
    };

    if (stateType === 'ban') {
        restrictionInfo.xuid = player.id;
        restrictionInfo.playerName = playerName;
        restrictionInfo.banTime = Date.now();
    }

    pData[stateType === 'ban' ? 'banInfo' : 'muteInfo'] = restrictionInfo;
    pData.isDirtyForSave = true;

    let logMsg = `[PlayerDataManager._addPlayerStateRestriction] Player ${playerName} ${stateType}d by ${restrictedBy}. Reason: '${actualReason}'. Duration: ${durationMs === Infinity ? 'Permanent' : new Date(expiryTime).toISOString()}`;
    debugLog(logMsg, pData.isWatched ? playerName : null, dependencies);
    return true;
}

function _removePlayerStateRestriction(pData, stateType, dependencies) {
    const { debugLog } = dependencies.playerUtils;
    const playerName = pData.playerNameTag;
    const infoKey = stateType === 'ban' ? 'banInfo' : 'muteInfo';

    if (pData[infoKey]) {
        pData[infoKey] = null;
        pData.isDirtyForSave = true;
        debugLog(`[PlayerDataManager._removePlayerStateRestriction] Player ${playerName} un${stateType}d.`, pData.isWatched ? playerName : null, dependencies);
        return true;
    }
    debugLog(`[PlayerDataManager._removePlayerStateRestriction] Player ${playerName} was not ${stateType}d. No action.`, pData.isWatched ? playerName : null, dependencies);
    return false;
}

function _getPlayerStateRestriction(pData, stateType, dependencies) {
    const { debugLog } = dependencies.playerUtils;
    const playerName = pData.playerNameTag;
    const infoKey = stateType === 'ban' ? 'banInfo' : 'muteInfo';
    const expiryKey = stateType === 'ban' ? 'unbanTime' : 'unmuteTime';

    const restriction = pData[infoKey];
    if (!restriction) return null;

    if (restriction[expiryKey] !== Infinity && Date.now() >= restriction[expiryKey]) {
        pData[infoKey] = null;
        pData.isDirtyForSave = true;
        debugLog(`[PlayerDataManager._getPlayerStateRestriction] ${stateType} for ${playerName} expired and removed.`, pData.isWatched ? playerName : null, dependencies);
        return null;
    }
    return restriction;
}

export function addMute(player, durationMs, reason, dependencies, mutedBy = 'Unknown', isAutoMod = false, triggeringCheckType = null) {
    const { debugLog } = dependencies.playerUtils;
    const playerName = player?.nameTag ?? player?.id ?? 'UnknownPlayer';

    if (!player?.isValid() || typeof durationMs !== 'number' || (durationMs <= 0 && durationMs !== Infinity) || typeof mutedBy !== 'string') {
        debugLog(`[PlayerDataManager.addMute] Invalid args for ${playerName}.`, playerName, dependencies);
        return false;
    }
    const pData = getPlayerData(player.id);
    if (!pData) {
        debugLog(`[PlayerDataManager.addMute] No pData for ${playerName}.`, playerName, dependencies);
        return false;
    }
    return _addPlayerStateRestriction(player, pData, 'mute', durationMs, reason, mutedBy, isAutoMod, triggeringCheckType, dependencies);
}

export function removeMute(player, dependencies) {
    const { debugLog } = dependencies.playerUtils;
    const playerName = player?.nameTag ?? player?.id ?? 'UnknownPlayer';

    if (!player?.isValid()) {
        debugLog(`[PlayerDataManager.removeMute] Invalid player object for ${playerName}.`, playerName, dependencies);
        return false;
    }
    const pData = getPlayerData(player.id);
    if (!pData) {
        debugLog(`[PlayerDataManager.removeMute] No pData for ${playerName}.`, playerName, dependencies);
        return false;
    }
    return _removePlayerStateRestriction(pData, 'mute', dependencies);
}

export function getMuteInfo(player, dependencies) {
    if (!player?.isValid()) return null;
    const pData = getPlayerData(player.id);
    if (!pData) return null;
    return _getPlayerStateRestriction(pData, 'mute', dependencies);
}

export function isMuted(player, dependencies) {
    return getMuteInfo(player, dependencies) !== null;
}

export function addBan(player, durationMs, reason, dependencies, bannedBy = 'Unknown', isAutoMod = false, triggeringCheckType = null) {
    const { debugLog } = dependencies.playerUtils;
    const playerName = player?.nameTag ?? player?.id ?? 'UnknownPlayer';

    if (!player?.isValid() || typeof durationMs !== 'number' || (durationMs <= 0 && durationMs !== Infinity) || typeof bannedBy !== 'string') {
        debugLog(`[PlayerDataManager.addBan] Invalid args for ${playerName}.`, playerName, dependencies);
        return false;
    }
    const pData = getPlayerData(player.id);
    if (!pData) {
        debugLog(`[PlayerDataManager.addBan] No pData for ${playerName}.`, playerName, dependencies);
        return false;
    }
    return _addPlayerStateRestriction(player, pData, 'ban', durationMs, reason, bannedBy, isAutoMod, triggeringCheckType, dependencies);
}

export function removeBan(player, dependencies) {
    const { debugLog } = dependencies.playerUtils;
    const playerName = player?.nameTag ?? player?.id ?? 'UnknownPlayer';

    if (!player?.isValid()) {
        debugLog(`[PlayerDataManager.removeBan] Invalid player object for ${playerName}.`, playerName, dependencies);
        return false;
    }
    const pData = getPlayerData(player.id);
    if (!pData) {
        debugLog(`[PlayerDataManager.removeBan] No pData for ${playerName}.`, playerName, dependencies);
        return false;
    }
    return _removePlayerStateRestriction(pData, 'ban', dependencies);
}

export function getBanInfo(player, dependencies) {
    if (!player?.isValid()) return null;
    const pData = getPlayerData(player.id);
    if (!pData) return null;
    return _getPlayerStateRestriction(pData, 'ban', dependencies);
}

export function isBanned(player, dependencies) {
    return getBanInfo(player, dependencies) !== null;
}

export async function saveDirtyPlayerData(player, dependencies) {
    const { debugLog } = dependencies.playerUtils;
    const playerName = player?.nameTag ?? player?.id ?? 'UnknownPlayer';

    if (!player?.isValid()) return false;

    const pData = playerData.get(player.id);
    if (pData?.isDirtyForSave) {
        debugLog(`[PlayerDataManager.saveDirtyPlayerData] Saving dirty data for ${playerName}.`, pData.isWatched ? playerName : null, dependencies);
        const success = await prepareAndSavePlayerData(player, dependencies);
        if (success && pData) {
            pData.isDirtyForSave = false;
        }
        return success;
    }
    return true;
}

export function clearFlagsForCheckType(player, checkType, dependencies) {
    const { debugLog } = dependencies.playerUtils;
    const playerName = player?.nameTag ?? player?.id ?? 'UnknownPlayer';

    if (!player?.isValid() || !checkType || typeof checkType !== 'string') {
        debugLog(`[PlayerDataManager.clearFlagsForCheckType] Invalid player or checkType for ${playerName}.`, playerName, dependencies);
        return;
    }

    const pData = getPlayerData(player.id);
    if (!pData) {
        debugLog(`[PlayerDataManager.clearFlagsForCheckType] No pData for ${playerName}.`, playerName, dependencies);
        return;
    }

    let clearedCount = 0;
    if (pData.flags?.[checkType]) {
        clearedCount = pData.flags[checkType].count || 0;
        if (pData.flags.totalFlags && typeof pData.flags.totalFlags === 'number') {
            pData.flags.totalFlags = Math.max(0, pData.flags.totalFlags - clearedCount);
        }
        pData.flags[checkType].count = 0;
    }

    if (pData.automodState?.[checkType]) {
        pData.automodState[checkType] = { lastActionThreshold: 0, lastActionTimestamp: 0 };
    }
    pData.isDirtyForSave = true;

    debugLog(`[PlayerDataManager.clearFlagsForCheckType] Cleared ${clearedCount} flags for '${checkType}' for ${playerName}.`, pData.isWatched ? playerName : null, dependencies);
}

export function clearExpiredItemUseStates(pData, dependencies) {
    const { currentTick, config, playerUtils } = dependencies;
    const { debugLog } = playerUtils;
    const playerName = pData?.playerNameTag ?? 'UnknownPlayer';

    if (!pData || !config) return;

    const itemUseTimeoutTicks = config.itemUseStateClearTicks || 100;

    if (pData.isUsingConsumable && (currentTick - (pData.lastItemUseTick || 0) > itemUseTimeoutTicks)) {
        if (pData.isWatched) debugLog(`[PlayerDataManager.clearExpiredItemUseStates] Auto-clearing isUsingConsumable for ${playerName}.`, playerName, dependencies);
        pData.isUsingConsumable = false;
    }

    if (pData.isChargingBow && (currentTick - (pData.lastItemUseTick || 0) > itemUseTimeoutTicks)) {
        if (pData.isWatched) debugLog(`[PlayerDataManager.clearExpiredItemUseStates] Auto-clearing isChargingBow for ${playerName}.`, playerName, dependencies);
        pData.isChargingBow = false;
    }

    if (pData.isUsingShield && (currentTick - (pData.lastItemUseTick || 0) > itemUseTimeoutTicks)) {
        if (pData.isWatched) debugLog(`[PlayerDataManager.clearExpiredItemUseStates] Auto-clearing isUsingShield for ${playerName}.`, playerName, dependencies);
        pData.isUsingShield = false;
    }
}
[end of AntiCheatsBP/scripts/core/playerDataManager.js]
