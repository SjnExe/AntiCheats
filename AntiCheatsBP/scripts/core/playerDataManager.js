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
const JSON_SAMPLE_LOG_LENGTH = 200;
const TICKS_PER_SECOND = 20;
const DECIMAL_PLACES_FOR_DEBUG_SNAPSHOT = 3;
const PENDING_FLAG_PURGES_DP_KEY = 'anticheat:pending_flag_purges_v1';


/** @type {Map<string, import('../types.js').PlayerAntiCheatData>} In-memory cache for player data. */
const playerData = new Map();

const dynamicPropertyKeyV1 = 'anticheat:pdata_v1';
const dynamicPropertySizeLimit = 32760;

/**
 * Keys from PlayerAntiCheatData that are persisted to dynamic properties.
 * Other keys are considered transient session data.
 * Ensure all keys are valid properties of PlayerAntiCheatData.
 */
const persistedPlayerDataKeys = [
    'flags', 'isWatched', 'lastFlagType', 'playerNameTag',
    'blockBreakEvents', // lastAttackTime might be redundant if attackEvents stores timestamps
    'consecutiveOffGroundTicks', 'fallDistance',
    'consecutiveOnGroundSpeedingTicks', 'muteInfo', 'banInfo',
    'lastCombatInteractionTime', 'lastViolationDetailsMap', 'automodState',
    'joinTime',
    'lastKnownNameTag', 'lastNameTagChangeTick', 'deathMessageToShowOnSpawn',
    'lastCheckNameSpoofTick', 'lastCheckAntiGmcTick', 'lastCheckNetherRoofTick',
    'lastCheckAutoToolTick', 'lastCheckFlatRotationBuildingTick', 'lastRenderDistanceCheckTick',
    'lastChatMessageTimestamp', // For messageRateCheck
    'recentHits', // For multiTargetCheck
    'lastUsedElytraTick',
    'lastOnSlimeBlockTick',
    'recentEntitySpamTimestamps',
];

/**
 * Retrieves the runtime AntiCheat data for a given player ID.
 * @param {string} playerId The ID of the player.
 * @returns {import('../types.js').PlayerAntiCheatData | undefined} The player's data, or undefined if not found.
 */
export function getPlayerData(playerId) {
    return playerData.get(playerId);
}

/**
 * Schedules a flag purge for an offline player.
 * Stores the player's identifier (name) in a world dynamic property list.
 * @param {string} playerIdentifier - The name of the player to schedule for flag purge.
 * @param {import('../types.js').CommandDependencies} dependencies - Standard dependencies object.
 * @returns {boolean} True if scheduling was successful, false otherwise.
 */
export function scheduleFlagPurge(playerIdentifier, dependencies) {
    const { playerUtils, logManager } = dependencies;
    if (!playerIdentifier || typeof playerIdentifier !== 'string' || playerIdentifier.trim() === '') {
        console.warn('[PlayerDataManager.scheduleFlagPurge] Invalid playerIdentifier provided.');
        playerUtils?.debugLog(`[PlayerDataManager.scheduleFlagPurge] Attempted to schedule purge with invalid identifier: '${playerIdentifier}'`, null, dependencies);
        return false;
    }

    try {
        const rawPendingPurges = mc.world.getDynamicProperty(PENDING_FLAG_PURGES_DP_KEY);
        let pendingPurges = [];

        if (typeof rawPendingPurges === 'string' && rawPendingPurges.length > 0) {
            try {
                pendingPurges = JSON.parse(rawPendingPurges);
                if (!Array.isArray(pendingPurges)) {
                    console.warn(`[PlayerDataManager.scheduleFlagPurge] Corrupted pending purges list: not an array. Resetting. JSON: ${rawPendingPurges}`);
                    pendingPurges = [];
                }
            } catch (parseError) {
                console.error(`[PlayerDataManager.scheduleFlagPurge] Failed to parse pending purges list. Error: ${parseError.stack || parseError}. JSON: "${rawPendingPurges}". Resetting list.`);
                logManager?.addLog({ actionType: 'system_error', context: 'scheduleFlagPurge_json_parse_fail', details: `Failed to parse PENDING_FLAG_PURGES_DP_KEY. Error: ${parseError.message}. Key: ${PENDING_FLAG_PURGES_DP_KEY}`, errorStack: parseError.stack || parseError.toString() }, dependencies);
                pendingPurges = []; // Reset if parsing fails to prevent further issues
            }
        } else if (rawPendingPurges !== undefined) {
            // Data exists but is not a string or is an empty string - indicates corruption or unexpected type
            console.warn(`[PlayerDataManager.scheduleFlagPurge] Corrupted pending purges list: expected string, got ${typeof rawPendingPurges}. Resetting. Key: ${PENDING_FLAG_PURGES_DP_KEY}`);
            pendingPurges = [];
        }
        // If rawPendingPurges is undefined, pendingPurges remains an empty array, which is correct.


        if (!pendingPurges.includes(playerIdentifier)) {
            pendingPurges.push(playerIdentifier);
            mc.world.setDynamicProperty(PENDING_FLAG_PURGES_DP_KEY, JSON.stringify(pendingPurges));
            playerUtils?.debugLog(`[PlayerDataManager.scheduleFlagPurge] Scheduled flag purge for '${playerIdentifier}'. Pending list size: ${pendingPurges.length}`, null, dependencies);
            return true;
        }
        playerUtils?.debugLog(`[PlayerDataManager.scheduleFlagPurge] Flag purge for '${playerIdentifier}' was already scheduled.`, null, dependencies);
        return true; // Still considered success as the desired state is achieved

    } catch (error) {
        console.error(`[PlayerDataManager.scheduleFlagPurge] Error accessing or saving pending purges list: ${error.stack || error}`);
        logManager?.addLog({
            actionType: 'system_error',
            context: 'scheduleFlagPurge_dp_access_fail',
            details: `Error with PENDING_FLAG_PURGES_DP_KEY. Error: ${error.message}. Key: ${PENDING_FLAG_PURGES_DP_KEY}`,
            errorStack: error.stack || error.toString(),
        }, dependencies);
        return false;
    }
}

/**
 * Centralized error handler for dynamic property operations.
 * @param {string} callingFunction - The name of the function where the error occurred.
 * @param {string} operation - The specific operation that failed (e.g., 'JSON.stringify', 'player.setDynamicProperty').
 * @param {string} playerName - The name of the player involved.
 * @param {Error} error - The error object.
 * @param {import('../types.js').CommandDependencies} dependencies - Standard dependencies object.
 * @param {object} [additionalDetails] - Any additional details to include in the log.
 */
function _handleDynamicPropertyError(callingFunction, operation, playerName, error, dependencies, additionalDetails = {}) {
    const { playerUtils, logManager } = dependencies;
    const baseMessage = `[PlayerDataManager.${callingFunction}] Error during ${operation} for ${playerName}`;

    console.error(`${baseMessage}: ${error.stack || error}`);
    playerUtils?.debugLog(`${baseMessage}. Error: ${error.message}`, playerName, dependencies);

    const logContext = `playerDataManager.${callingFunction}`;

    let opType = 'unknown';
    if (operation.toLowerCase().includes('json.parse')) opType = 'parse';
    else if (operation.toLowerCase().includes('json.stringify')) opType = 'stringify';
    else if (operation.toLowerCase().includes('getdynamicproperty')) opType = 'get'; // Made lowercase for robust matching
    else if (operation.toLowerCase().includes('setdynamicproperty')) opType = 'set'; // Made lowercase

    let contextStr = 'unknown';
    if (callingFunction === 'savePlayerDataToDynamicProperties' || callingFunction === 'loadPlayerDataFromDynamicProperties') {
        contextStr = 'data';
    }
    // Add more contexts here if _handleDynamicPropertyError is used by other functions for different DP keys.

    // Refined actionType and errorCode to match new standardization
    const actionTypePrefix = 'error.pdm.dp';
    let specificErrorType = opType; // 'parse', 'stringify', 'get', 'set'
    if (opType === 'get') specificErrorType = 'Get';
    else if (opType === 'set') specificErrorType = 'Set';
    else if (opType === 'parse') specificErrorType = 'Parse';
    else if (opType === 'stringify') specificErrorType = 'Stringify';


    const newActionType = `${actionTypePrefix}${specificErrorType}`; // e.g., error.pdm.dpGet, error.pdm.dpParse
    const errorCode = `PDM_DP_${specificErrorType.toUpperCase()}_FAIL`; // e.g., PDM_DP_GET_FAIL, PDM_DP_PARSE_FAIL

    logManager?.addLog({
        actionType: newActionType,
        context: logContext,    // e.g., playerDataManager.loadPlayerDataFromDynamicProperties
        targetName: playerName,
        details: {
            errorCode: errorCode,
            message: error.message,
            rawErrorStack: error.stack,
            meta: {
                originalOperation: operation, // Keep original 'operation' for specific detail
                callingFunctionContext: callingFunction, // Keep original 'callingFunction' for specific detail
                ...additionalDetails,
            }
        },
    }, dependencies);
}

/**
 * Saves a subset of player data (persisted keys) to the player's dynamic properties.
 * @param {import('@minecraft/server').Player} player - The player object.
 * @param {object} pDataToSave - Data containing only keys to be persisted.
 * @param {import('../types.js').CommandDependencies} dependencies - Standard dependencies object.
 * @returns {boolean} True if saving was successful, false otherwise.
 */
export function savePlayerDataToDynamicProperties(player, pDataToSave, dependencies) {
    const { playerUtils } = dependencies; // Removed logManager
    const playerName = player?.nameTag ?? player?.id ?? 'UnknownPlayer';

    if (!player?.isValid() || !pDataToSave) {
        playerUtils?.debugLog(`[PlayerDataManager.savePlayerDataToDynamicProperties] Invalid player or pDataToSave for ${playerName}.`, playerName, dependencies);
        return false;
    }

    let jsonString;
    try {
        jsonString = JSON.stringify(pDataToSave);
    } catch (error) {
        _handleDynamicPropertyError(
            'savePlayerDataToDynamicProperties',
            'JSON.stringify',
            playerName,
            error,
            dependencies,
            { dataToSave: typeof pDataToSave },
        );
        return false;
    }

    if (jsonString.length > dynamicPropertySizeLimit) {
        console.warn(`[PlayerDataManager.savePlayerDataToDynamicProperties] pData for ${playerName} too large (${jsonString.length}b). Cannot save.`);
        playerUtils?.debugLog(`[PlayerDataManager.savePlayerDataToDynamicProperties] pData for ${playerName} exceeds size limit. Size: ${jsonString.length}b.`, playerName, dependencies);
        return false;
    }

    try {
        player.setDynamicProperty(dynamicPropertyKeyV1, jsonString);
        return true;
    } catch (error) {
        _handleDynamicPropertyError(
            'savePlayerDataToDynamicProperties',
            'player.setDynamicProperty',
            playerName,
            error,
            dependencies,
            { propertyKey: dynamicPropertyKeyV1, jsonLength: jsonString.length },
        );
        return false;
    }
}

/**
 * Loads player data from dynamic properties.
 * @param {import('@minecraft/server').Player} player - The player object.
 * @param {import('../types.js').CommandDependencies} dependencies - Standard dependencies object.
 * @returns {object | null} The loaded player data object, or null if not found or error.
 */
export function loadPlayerDataFromDynamicProperties(player, dependencies) {
    const { playerUtils } = dependencies;
    const playerName = player?.nameTag ?? player?.id ?? 'UnknownPlayer';

    if (!player?.isValid()) {
        playerUtils?.debugLog('[PlayerDataManager.loadPlayerDataFromDynamicProperties] Invalid player object.', null, dependencies);
        return null;
    }

    let jsonString;
    try {
        jsonString = player.getDynamicProperty(dynamicPropertyKeyV1);
    } catch (error) {
        _handleDynamicPropertyError(
            'loadPlayerDataFromDynamicProperties',
            'player.getDynamicProperty',
            playerName,
            error,
            dependencies,
            { propertyKey: dynamicPropertyKeyV1 },
        );
        return null;
    }

    if (typeof jsonString === 'string') {
        try {
            const parsedData = JSON.parse(jsonString);
            playerUtils?.debugLog(`[PlayerDataManager.loadPlayerDataFromDynamicProperties] Loaded and parsed data for ${playerName}.`, playerName, dependencies);
            return parsedData;
        } catch (error) {
            _handleDynamicPropertyError(
                'loadPlayerDataFromDynamicProperties',
                'JSON.parse',
                playerName,
                error,
                dependencies,
                { jsonSample: jsonString.substring(0, JSON_SAMPLE_LOG_LENGTH) + (jsonString.length > JSON_SAMPLE_LOG_LENGTH ? '...' : '') },
            );
            return null;
        }
    } else if (jsonString === undefined) {
        playerUtils?.debugLog(`[PlayerDataManager.loadPlayerDataFromDynamicProperties] No dynamic property '${dynamicPropertyKeyV1}' for ${playerName}.`, playerName, dependencies);
        return null;
    } else {
        playerUtils?.debugLog(`[PlayerDataManager.loadPlayerDataFromDynamicProperties] Unexpected data type for '${dynamicPropertyKeyV1}' for ${playerName}: ${typeof jsonString}`, playerName, dependencies);
        return null;
    }
}

/**
 * Prepares and saves the persistable parts of a player's AntiCheat data.
 * @param {import('@minecraft/server').Player} player - The player whose data to save.
 * @param {import('../types.js').CommandDependencies} dependencies - Standard dependencies object.
 * @returns {Promise<void>}
 */
export async function prepareAndSavePlayerData(player, dependencies) {
    const { playerUtils } = dependencies;
    const playerName = player?.nameTag ?? player?.id ?? 'UnknownPlayer';

    if (!player?.isValid()) {
        playerUtils?.debugLog(`[PlayerDataManager.prepareAndSavePlayerData] Invalid player object for ${playerName}. Cannot save.`, playerName, dependencies);
        return;
    }

    const pData = playerData.get(player.id);
    if (pData) {
        const persistedPData = {};
        for (const key of persistedPlayerDataKeys) {
            if (Object.prototype.hasOwnProperty.call(pData, key) && pData[key] !== undefined) { // Added hasOwnProperty check
                persistedPData[key] = pData[key];
            }
        }
        await savePlayerDataToDynamicProperties(player, persistedPData, dependencies);
    } else {
        playerUtils?.debugLog(`[PlayerDataManager.prepareAndSavePlayerData] No runtime pData for ${playerName}. Cannot save.`, playerName, dependencies);
    }
}

/**
 * Dynamically generates the list of all known flag types from actionProfiles.
 * This ensures that any flag type defined in actionProfiles (either as a primary checkType
 * or a specific profile.flag.type) is initialized in player data.
 */
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
        } // Closing brace for: if (profile && typeof profile.flag === 'object' && profile.flag !== null)
    }
}
const allKnownFlagTypes = Array.from(dynamicallyGeneratedFlagTypes);
if (allKnownFlagTypes.length === 0) {
    console.warn('[PlayerDataManager] Warning: allKnownFlagTypes is empty after dynamic generation. Check actionProfiles.js configuration.');
}

/**
 * Initializes a new default PlayerAntiCheatData object for a player.
 * @param {import('@minecraft/server').Player} player - The player object.
 * @param {import('../types.js').CommandDependencies} dependencies - Standard dependencies object, expected to contain `currentTick`.
 * @returns {import('../types.js').PlayerAntiCheatData} The initialized player data.
 */
export function initializeDefaultPlayerData(player, dependencies) {
    const { playerUtils, currentTick } = dependencies; // Use currentTick from dependencies
    const playerName = player?.nameTag ?? player?.id ?? 'UnknownPlayer';
    playerUtils?.debugLog(`[PlayerDataManager.initializeDefaultPlayerData] Initializing for ${playerName} (ID: ${player.id}) at tick ${currentTick}`, playerName, dependencies);

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
        recentMessages: [],
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
        joinTime: Date.now(),
        lastGameMode: player.gameMode,
        lastDimensionId: player.dimension.id,
        isDirtyForSave: true,
        lastViolationDetailsMap: {},
        automodState: {},
        deathMessageToShowOnSpawn: null,
        // lastChatMessageTimestamp: 0, // Duplicate removed
        // recentHits: [], // Duplicate removed
        // lastUsedElytraTick: 0, // Duplicate removed
        // lastOnSlimeBlockTick: 0, // Duplicate removed
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

/**
 * Ensures that a player's data is initialized, loading from persistence if available,
 * or creating default data otherwise. Merges loaded data with defaults for transient fields.
 * @param {import('@minecraft/server').Player} player - The player object.
 * @param {import('../types.js').CommandDependencies} dependencies - Standard dependencies object, expected to contain `currentTick`.
 * @returns {Promise<import('../types.js').PlayerAntiCheatData>} The initialized or loaded player data.
 */
export async function ensurePlayerDataInitialized(player, dependencies) {
    const { playerUtils, logManager, currentTick } = dependencies; // Use currentTick from dependencies
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

    let newPData = initializeDefaultPlayerData(player, dependencies); // Pass only dependencies
    const loadedData = await loadPlayerDataFromDynamicProperties(player, dependencies);

    if (loadedData && typeof loadedData === 'object') {
        playerUtils?.debugLog(`[PlayerDataManager.ensurePlayerDataInitialized] Merging persisted pData for ${playerName}.`, playerName, dependencies);
        const defaultPDataForMerge = initializeDefaultPlayerData(player, dependencies); // Pass only dependencies
        newPData = { ...defaultPDataForMerge, ...loadedData };

        newPData.flags = { ...defaultPDataForMerge.flags, ...(loadedData.flags || {}) };
        if (typeof newPData.flags.totalFlags !== 'number' || isNaN(newPData.flags.totalFlags)) {
            newPData.flags.totalFlags = 0;
            for (const flagKey in newPData.flags) {
                if (Object.prototype.hasOwnProperty.call(newPData.flags, flagKey)) { // Added guard
                    if (flagKey !== 'totalFlags' && newPData.flags[flagKey] && typeof newPData.flags[flagKey].count === 'number') {
                        newPData.flags.totalFlags += newPData.flags[flagKey].count;
                    }
                }
            }
        }
        newPData.lastViolationDetailsMap = { ...(defaultPDataForMerge.lastViolationDetailsMap || {}), ...(loadedData.lastViolationDetailsMap || {}) };
        newPData.automodState = { ...(defaultPDataForMerge.automodState || {}), ...(loadedData.automodState || {}) };

        newPData.playerNameTag = player.nameTag;
        newPData.lastKnownNameTag = loadedData.lastKnownNameTag ?? player.nameTag;
        newPData.lastNameTagChangeTick = loadedData.lastNameTagChangeTick ?? currentTick;
        newPData.joinTime = loadedData.joinTime ?? Date.now();
        newPData.isDirtyForSave = false;
    } else {
        playerUtils?.debugLog(`[PlayerDataManager.ensurePlayerDataInitialized] No persisted data for ${playerName}. Using fresh default data.`, playerName, dependencies);
    }

    if (newPData.muteInfo && newPData.muteInfo.unmuteTime !== Infinity && Date.now() >= newPData.muteInfo.unmuteTime) {
        playerUtils?.debugLog(`[PlayerDataManager.ensurePlayerDataInitialized] Mute for ${newPData.playerNameTag} expired on load. Clearing.`, newPData.isWatched ? newPData.playerNameTag : null, dependencies);
        newPData.muteInfo = null;
        newPData.isDirtyForSave = true;
    }
    if (newPData.banInfo && newPData.banInfo.unbanTime !== Infinity && Date.now() >= newPData.banInfo.unbanTime) {
        playerUtils?.debugLog(`[PlayerDataManager.ensurePlayerDataInitialized] Ban for ${newPData.playerNameTag} expired on load. Clearing.`, newPData.isWatched ? newPData.playerNameTag : null, dependencies);
        newPData.banInfo = null;
        newPData.isDirtyForSave = true;
    }

    // Check for and process pending flag purges
    try {
        const rawPendingPurges = mc.world.getDynamicProperty(PENDING_FLAG_PURGES_DP_KEY);
        let pendingPurges = [];
        let purgesListModified = false;

        if (typeof rawPendingPurges === 'string' && rawPendingPurges.length > 0) {
            try {
                pendingPurges = JSON.parse(rawPendingPurges);
                if (!Array.isArray(pendingPurges)) {
                    pendingPurges = []; // Reset if corrupted
                }
            } catch (e) {
                console.error(`[PlayerDataManager.ensurePlayerDataInitialized] Error parsing pending purges list for ${playerName}: ${e.message}. Resetting list.`);
                pendingPurges = [];
            }
        }

        const playerIdentifierForPurge = newPData.lastKnownNameTag || newPData.playerNameTag; // Use last known name or current
        const purgeIndex = pendingPurges.indexOf(playerIdentifierForPurge);

        if (purgeIndex > -1) {
            playerUtils?.debugLog(`[PlayerDataManager.ensurePlayerDataInitialized] Found pending flag purge for ${playerIdentifierForPurge}. Processing...`, newPData.isWatched ? playerIdentifierForPurge : null, dependencies);

            const oldTotalFlags = newPData.flags?.totalFlags ?? 0;
            const defaultPlayerDataForFlags = initializeDefaultPlayerData(player, dependencies); // Pass only dependencies

            newPData.flags = JSON.parse(JSON.stringify(defaultPlayerDataForFlags.flags));
            newPData.lastFlagType = '';
            newPData.lastViolationDetailsMap = {};
            newPData.automodState = {};
            newPData.isDirtyForSave = true;

            pendingPurges.splice(purgeIndex, 1);
            purgesListModified = true;

            mc.world.setDynamicProperty(PENDING_FLAG_PURGES_DP_KEY, JSON.stringify(pendingPurges));

            playerUtils?.sendMessage(player, dependencies.getString('playerDataManager.offlinePurgeCompleteNotification'));
            logManager?.addLog({
                actionType: 'flagsPurgedOfflineOnJoin',
                adminName: 'System (Scheduled Purge)',
                targetName: playerIdentifierForPurge,
                targetId: player.id,
                details: `Flags, violation history, and automod state purged on join due to scheduled request. Old total flags: ${oldTotalFlags}.`,
                context: 'PlayerDataManager.ensurePlayerDataInitialized',
            }, dependencies);
            playerUtils?.debugLog(`[PlayerDataManager.ensurePlayerDataInitialized] Successfully processed scheduled flag purge for ${playerIdentifierForPurge}. Old total flags: ${oldTotalFlags}. Pending list size: ${pendingPurges.length}`, newPData.isWatched ? playerIdentifierForPurge : null, dependencies);
        } else if (purgesListModified) {
            // This case should not be hit if logic is correct, but as a fallback if list was modified for other reasons (e.g. corruption reset)
            mc.world.setDynamicProperty(PENDING_FLAG_PURGES_DP_KEY, JSON.stringify(pendingPurges));
        }

    } catch (e) {
        console.error(`[PlayerDataManager.ensurePlayerDataInitialized] Error processing pending flag purges for ${playerName}: ${e.stack || e}`);
        logManager?.addLog({ actionType: 'system_error', context: 'ensurePlayerDataInitialized_pending_purge_fail', details: `Player ${playerName}: Error processing PENDING_FLAG_PURGES_DP_KEY. Error: ${e.message}`, errorStack: e.stack || e.toString() }, dependencies);
    }
    // End of pending purge processing

    playerData.set(player.id, newPData);
    return newPData;
}

/**
 * Removes runtime data for players who are no longer online.
 * @param {Array<import('@minecraft/server').Player>} activePlayers - An array of currently online players.
 * @param {import('../types.js').CommandDependencies} dependencies - Standard dependencies object.
 */
export function cleanupActivePlayerData(activePlayers, dependencies) {
    const { playerUtils } = dependencies;
    const activePlayerIds = new Set();
    for (const player of activePlayers) {
        if (player?.isValid()) {
            activePlayerIds.add(player.id);
        }
    }

    for (const playerId of playerData.keys()) {
        if (!activePlayerIds.has(playerId)) {
            const removedPData = playerData.get(playerId);
            const playerNameForLog = removedPData?.playerNameTag ?? playerId;
            playerUtils?.debugLog(`[PlayerDataManager.cleanupActivePlayerData] Removed runtime data for ${playerNameForLog}.`, removedPData?.isWatched ? playerNameForLog : null, dependencies);
            playerData.delete(playerId);
        }
    }
}

/**
 * Updates transient (per-tick) player data fields.
 * @param {import('@minecraft/server').Player} player - The player object.
 * @param {import('../types.js').PlayerAntiCheatData} pData - The player's AntiCheat data object.
 * @param {import('../types.js').CommandDependencies} dependencies - Standard dependencies object.
 */
export function updateTransientPlayerData(player, pData, dependencies) {
    const { currentTick, playerUtils, config } = dependencies; // Removed logManager from destructuring
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
        let feetPos = { x: 0, y: 0, z: 0 }; // Define feetPos in a higher scope
        try {
            feetPos = { x: Math.floor(pData.lastPosition.x), y: Math.floor(pData.lastPosition.y), z: Math.floor(pData.lastPosition.z) };
            const blockBelowFeet = player.dimension?.getBlock(feetPos.offset(0, -1, 0));
            const blockAtFeet = player.dimension?.getBlock(feetPos);

            if (blockBelowFeet?.typeId === mc.MinecraftBlockTypes.slime.id || blockAtFeet?.typeId === mc.MinecraftBlockTypes.slime.id) {
                pData.lastOnSlimeBlockTick = currentTick;
                if (pData.isWatched && config?.enableDebugLogging) {
                    playerUtils?.debugLog(`[PlayerDataManager.updateTransientPlayerData] Player ${playerName} on slime block at tick ${currentTick}.`, playerName, dependencies);
                }
            }
        } catch (e) {
            if (!pData.slimeCheckErrorLogged) {
                console.warn(`[PlayerDataManager.updateTransientPlayerData] Error checking slime block for ${playerName}: ${e.stack || e}`);
                dependencies.logManager?.addLog({
                    actionType: 'errorPlayerDataManagerSlimeCheck',
                    context: 'playerDataManager.updateTransientPlayerData.slimeBlockCheck',
                    targetName: playerName,
                    details: {
                        errorMessage: e.message,
                        stack: e.stack,
                        feetPos,
                    },
                }, dependencies);
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

    if (pData.lastGameMode !== player.gameMode) {
        pData.lastGameMode = player.gameMode;
    }
    if (pData.lastDimensionId !== player.dimension.id) {
        pData.lastDimensionId = player.dimension.id;
    }

    const effects = player.getEffects();
    pData.jumpBoostAmplifier = effects?.find(eff => eff.typeId === mc.MinecraftEffectTypes.jumpBoost.id)?.amplifier ?? 0;
    pData.hasSlowFalling = !!effects?.find(eff => eff.typeId === mc.MinecraftEffectTypes.slowFalling.id);
    pData.hasLevitation = !!effects?.find(eff => eff.typeId === mc.MinecraftEffectTypes.levitation.id);
    pData.speedAmplifier = effects?.find(eff => eff.typeId === mc.MinecraftEffectTypes.speed.id)?.amplifier ?? -1;
    pData.blindnessTicks = effects?.find(eff => eff.typeId === mc.MinecraftEffectTypes.blindness.id)?.duration ?? 0;

    if (pData.isWatched && config?.enableDebugLogging && (currentTick % TICKS_PER_SECOND === 0)) {
        const transientSnapshot = {
            vx: pData.velocity.x.toFixed(DECIMAL_PLACES_FOR_DEBUG_SNAPSHOT), vy: pData.velocity.y.toFixed(DECIMAL_PLACES_FOR_DEBUG_SNAPSHOT), vz: pData.velocity.z.toFixed(DECIMAL_PLACES_FOR_DEBUG_SNAPSHOT),
            pitch: pData.lastPitch.toFixed(DECIMAL_PLACES_FOR_DEBUG_SNAPSHOT), yaw: pData.lastYaw.toFixed(DECIMAL_PLACES_FOR_DEBUG_SNAPSHOT),
            sprinting: player.isSprinting, sneaking: player.isSneaking, onGround: player.isOnGround,
            fallDist: player.fallDistance.toFixed(DECIMAL_PLACES_FOR_DEBUG_SNAPSHOT),
            jumpBoost: pData.jumpBoostAmplifier, slowFall: pData.hasSlowFalling, lev: pData.hasLevitation, speedAmp: pData.speedAmplifier,
        };
        const logMsg = `${playerName} (Tick: ${currentTick}) Snapshot: `; // Shortened prefix
        const snapshotString = JSON.stringify(transientSnapshot);
        const fullDebugMessage = logMsg + snapshotString;
        playerUtils?.debugLog(fullDebugMessage, playerName, dependencies);
    }
}

/**
 * Adds a flag to a player's data and triggers AutoMod processing.
 * @param {import('@minecraft/server').Player} player - The player to flag.
 * @param {string} flagType - Standardized camelCase flag type (e.g., 'movementFlyHover').
 * @param {string} reasonMessage - Base reason message for the flag.
 * @param {import('../types.js').CommandDependencies} dependencies - Standard dependencies object.
 * @param {string | object} [detailsForNotify] - Additional details for notification or structured data.
 */
export async function addFlag(player, flagType, reasonMessage, dependencies, detailsForNotify = '') {
    const { playerUtils, config, logManager, getString } = dependencies;
    const playerName = player?.nameTag ?? player?.id ?? 'UnknownPlayer';

    if (!player?.isValid()) {
        playerUtils?.debugLog(`[PlayerDataManager.addFlag] Invalid player for flag: ${flagType}.`, playerName, dependencies);
        return;
    }
    const pData = getPlayerData(player.id);
    if (!pData) {
        playerUtils?.debugLog(`[PlayerDataManager.addFlag] No pData for ${playerName}. Cannot add flag: ${flagType}.`, playerName, dependencies);
        return;
    }

    const originalFlagType = flagType;
    const standardizedFlagType = originalFlagType
        .replace(/([-_][a-z0-9])/ig, ($1) => $1.toUpperCase().replace('-', '').replace('_', ''))
        .replace(/^[A-Z]/, (match) => match.toLowerCase());

    if (standardizedFlagType !== originalFlagType) {
        console.warn(`[PlayerDataManager.addFlag] Non-camelCase flagType '${originalFlagType}' received. Standardized to '${standardizedFlagType}'. Review call site.`);
    }
    const finalFlagType = standardizedFlagType;


    pData.flags[finalFlagType] ??= { count: 0, lastDetectionTime: 0 };

    pData.flags[finalFlagType].count++;
    pData.flags[finalFlagType].lastDetectionTime = Date.now();
    pData.flags.totalFlags = (pData.flags.totalFlags || 0) + 1;
    pData.lastFlagType = finalFlagType;
    pData.isDirtyForSave = true;

    // The responsibility for populating pData.lastViolationDetailsMap is now fully in actionManager.executeCheckAction.
    // This function (addFlag) will still receive detailsForNotify, which might be used by notifyAdmins if specific formatting is needed here.

    const notifyString = (typeof detailsForNotify === 'object' && detailsForNotify !== null) ?
        (detailsForNotify.originalDetailsForNotify || `Item: ${String(detailsForNotify.itemTypeId || 'N/A')}`) :
        String(detailsForNotify);
    // const fullReasonForLog = `${reasonMessage} ${notifyString}`.trim(); // Removed as it's unused below

    playerUtils?.warnPlayer(player, reasonMessage, dependencies);
    if (dependencies.config.notifications?.notifyOnPlayerFlagged !== false) {
        const baseNotifyMsg = getString('playerData.notify.flagged', { flagType: finalFlagType, details: notifyString });
        playerUtils?.notifyAdmins(baseNotifyMsg, dependencies, player, pData);
    }
    playerUtils?.debugLog(`[PlayerDataManager.addFlag] ${playerName} flagged for ${finalFlagType}. Total: ${pData.flags.totalFlags}`, playerName, dependencies);

    if (config?.enableAutoMod && config?.automodConfig) {
        try {
            if (pData.isWatched) {
                playerUtils?.debugLog(`[PlayerDataManager.addFlag] Calling processAutoModActions for ${playerName}, checkType: ${finalFlagType}`, playerName, dependencies);
            }
            await processAutoModActions(player, pData, finalFlagType, dependencies);
        } catch (e) {
            console.error(`[PlayerDataManager.addFlag] Error calling processAutoModActions for ${playerName} / ${finalFlagType}: ${e.stack || e}`);
            playerUtils?.debugLog(`[PlayerDataManager.addFlag] Error in processAutoModActions: ${e.stack || e}`, playerName, dependencies);
            logManager?.addLog({
                actionType: 'errorPlayerDataManagerAutomodProcess',
                context: 'playerDataManager.addFlag',
                targetName: playerName,
                details: {
                    checkType: finalFlagType,
                    errorMessage: e.message,
                    stack: e.stack,
                },
            }, dependencies);
        }
    } else if (pData.isWatched) {
        const autoModEnabled = config ? config.enableAutoMod : 'N/A (config missing)';
        const autoModConfigPresent = !!config?.automodConfig;
        playerUtils?.debugLog(`[PlayerDataManager.addFlag] Skipping processAutoModActions for ${playerName} (checkType: ${finalFlagType}). enableAutoMod: ${autoModEnabled}, automodConfig: ${autoModConfigPresent}.`, playerName, dependencies);
    }
}

/**
 * Adds a mute record to a player's data.
 * @param {import('@minecraft/server').Player} player - The player to mute.
 * @param {number | Infinity} durationMs - Duration in milliseconds, or Infinity for permanent.
 * @param {string} reason - The reason for the mute.
 * @param {string} [mutedBy='Unknown'] - Name of the admin or system component that issued the mute.
 * @param {boolean} [isAutoMod=false] - Whether this mute was applied by AutoMod.
 * @param {string|null} [triggeringCheckType=null] - If by AutoMod, the check type (camelCase) that triggered it.
 * @param {import('../types.js').CommandDependencies} dependencies - Standard dependencies object.
 * @returns {boolean} True if mute was successfully added, false otherwise.
 */
/**
 * @typedef {'mute' | 'ban'} PlayerStateRestrictionType
 */

/**
 * Internal helper to add a state restriction (mute or ban) to a player's data.
 * @param {import('@minecraft/server').Player} player - The player to restrict.
 * @param {import('../types.js').PlayerAntiCheatData} pData - The player's AntiCheat data.
 * @param {PlayerStateRestrictionType} stateType - The type of restriction ('mute' or 'ban').
 * @param {number | Infinity} durationMs - Duration in milliseconds, or Infinity for permanent.
 * @param {string} reason - The reason for the restriction.
 * @param {string} restrictedBy - Name of the admin or system component.
 * @param {boolean} isAutoMod - Whether this was applied by AutoMod.
 * @param {string|null} triggeringCheckType - If by AutoMod, the check type that triggered it.
 * @param {import('../types.js').CommandDependencies} dependencies - Standard dependencies object.
 * @returns {boolean} True if restriction was successfully added, false otherwise.
 */
function _addPlayerStateRestriction(player, pData, stateType, durationMs, reason, restrictedBy, isAutoMod, triggeringCheckType, dependencies) {
    const { playerUtils, getString } = dependencies;
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
    // No specific 'else' logic needed for mute here as common fields are already set

    pData[stateType === 'ban' ? 'banInfo' : 'muteInfo'] = restrictionInfo;
    pData.isDirtyForSave = true;

    let logMsg = `[PlayerDataManager._addPlayerStateRestriction] Player ${playerName}`;
    if (stateType === 'ban') {
        logMsg += ` (XUID: ${player.id})`;
    }
    logMsg += ` ${stateType}d by ${restrictedBy}. Reason: '${actualReason}'.`;
    logMsg += ` AutoMod: ${isAutoMod}. CheckType: ${triggeringCheckType ?? 'N/A'}.`;

    if (durationMs === Infinity) {
        logMsg += ' Duration: Permanent.';
    } else {
        logMsg += ` Expiry time: ${new Date(expiryTime).toISOString()}.`;
    }
    playerUtils?.debugLog(logMsg, pData.isWatched ? playerName : null, dependencies);
    return true;
}

/**
 * Internal helper to remove a state restriction (mute or ban) from a player's data.
 * @param {import('../types.js').PlayerAntiCheatData} pData - The player's AntiCheat data.
 * @param {PlayerStateRestrictionType} stateType - The type of restriction ('mute' or 'ban').
 * @param {import('../types.js').CommandDependencies} dependencies - Standard dependencies object.
 * @returns {boolean} True if restriction was removed, false if not found.
 */
function _removePlayerStateRestriction(pData, stateType, dependencies) {
    const { playerUtils } = dependencies;
    const playerName = pData.playerNameTag;
    const infoKey = stateType === 'ban' ? 'banInfo' : 'muteInfo';

    if (pData[infoKey]) {
        pData[infoKey] = null;
        pData.isDirtyForSave = true;
        playerUtils?.debugLog(`[PlayerDataManager._removePlayerStateRestriction] Player ${playerName} un${stateType}d.`, pData.isWatched ? playerName : null, dependencies);
        return true;
    }
    playerUtils?.debugLog(`[PlayerDataManager._removePlayerStateRestriction] Player ${playerName} was not ${stateType}d. No action.`, pData.isWatched ? playerName : null, dependencies);
    return false;

}

/**
 * Internal helper to retrieve a player's current state restriction information, clearing it if expired.
 * @param {import('../types.js').PlayerAntiCheatData} pData - The player's AntiCheat data.
 * @param {PlayerStateRestrictionType} stateType - The type of restriction ('mute' or 'ban').
 * @param {import('../types.js').CommandDependencies} dependencies - Standard dependencies object.
 * @returns {import('../types.js').PlayerMuteInfo | import('../types.js').PlayerBanInfo | null} The restriction info, or null.
 */
function _getPlayerStateRestriction(pData, stateType, dependencies) {
    const { playerUtils } = dependencies;
    const playerName = pData.playerNameTag;
    const infoKey = stateType === 'ban' ? 'banInfo' : 'muteInfo';
    const expiryKey = stateType === 'ban' ? 'unbanTime' : 'unmuteTime';

    const restriction = pData[infoKey];
    if (!restriction) {
        return null;
    }

    if (restriction[expiryKey] !== Infinity && Date.now() >= restriction[expiryKey]) {
        pData[infoKey] = null;
        pData.isDirtyForSave = true;
        playerUtils?.debugLog(`[PlayerDataManager._getPlayerStateRestriction] ${stateType.charAt(0).toUpperCase() + stateType.slice(1)} for ${playerName} expired and removed.`, pData.isWatched ? playerName : null, dependencies);
        return null;
    }
    return restriction;
}


/**
 * Adds a mute record to a player's data.
 * @param {import('@minecraft/server').Player} player - The player to mute.
 * @param {number | Infinity} durationMs - Duration in milliseconds, or Infinity for permanent.
 * @param {string} reason - The reason for the mute.
 * @param {import('../types.js').CommandDependencies} dependencies - Standard dependencies object.
 * @param {string} [mutedBy] - Name of the admin or system component that issued the mute.
 * @param {boolean} [isAutoMod] - Whether this mute was applied by AutoMod.
 * @param {string|null} [triggeringCheckType] - If by AutoMod, the check type (camelCase) that triggered it.
 * @returns {boolean} True if mute was successfully added, false otherwise.
 */
export function addMute(player, durationMs, reason, dependencies, mutedBy = 'Unknown', isAutoMod = false, triggeringCheckType = null) {
    const { playerUtils } = dependencies;
    const playerName = player?.nameTag ?? player?.id ?? 'UnknownPlayer';

    if (!player?.isValid() || typeof durationMs !== 'number' || (durationMs <= 0 && durationMs !== Infinity) || typeof mutedBy !== 'string') {
        playerUtils?.debugLog(`[PlayerDataManager.addMute] Invalid args for ${playerName}. Duration: ${durationMs}, MutedBy: ${mutedBy}`, playerName, dependencies);
        return false;
    }
    const pData = getPlayerData(player.id);
    if (!pData) {
        playerUtils?.debugLog(`[PlayerDataManager.addMute] No pData for ${playerName}. Cannot apply mute.`, playerName, dependencies);
        return false;
    }
    return _addPlayerStateRestriction(player, pData, 'mute', durationMs, reason, mutedBy, isAutoMod, triggeringCheckType, dependencies);
}

/**
 * Removes a mute record from a player's data.
 * @param {import('@minecraft/server').Player} player - The player to unmute.
 * @param {import('../types.js').CommandDependencies} dependencies - Standard dependencies object.
 * @returns {boolean} True if player was unmuted, false otherwise.
 */
export function removeMute(player, dependencies) {
    const { playerUtils } = dependencies;
    const playerName = player?.nameTag ?? player?.id ?? 'UnknownPlayer';

    if (!player?.isValid()) {
        playerUtils?.debugLog(`[PlayerDataManager.removeMute] Invalid player object for ${playerName}.`, playerName, dependencies);
        return false;
    }
    const pData = getPlayerData(player.id);
    if (!pData) {
        playerUtils?.debugLog(`[PlayerDataManager.removeMute] No pData for ${playerName}. Cannot unmute.`, playerName, dependencies);
        return false;
    }
    return _removePlayerStateRestriction(pData, 'mute', dependencies);
}

/**
 * Retrieves a player's current mute information, clearing it if expired.
 * @param {import('@minecraft/server').Player} player - The player whose mute info to get.
 * @param {import('../types.js').CommandDependencies} dependencies - Standard dependencies object.
 * @returns {import('../types.js').PlayerMuteInfo | null} The mute info, or null if not muted or expired.
 */
export function getMuteInfo(player, dependencies) {
    if (!player?.isValid()) {
        return null;
    }
    const pData = getPlayerData(player.id);
    if (!pData) {
        return null;
    }
    return _getPlayerStateRestriction(pData, 'mute', dependencies);
}

/**
 * Checks if a player is currently muted.
 * @param {import('@minecraft/server').Player} player - The player to check.
 * @param {import('../types.js').CommandDependencies} dependencies - Standard dependencies object.
 * @returns {boolean} True if the player is muted, false otherwise.
 */
export function isMuted(player, dependencies) {
    return getMuteInfo(player, dependencies) !== null;
}

/**
 * Adds a ban record to a player's data.
 * @param {import('@minecraft/server').Player} player - The player to ban.
 * @param {number | Infinity} durationMs - Duration in milliseconds, or Infinity for permanent.
 * @param {string} reason - The reason for the ban.
 * @param {import('../types.js').CommandDependencies} dependencies - Standard dependencies object.
 * @param {string} [bannedBy] - Name of the admin or system component that issued the ban.
 * @param {boolean} [isAutoMod] - Whether this ban was applied by AutoMod.
 * @param {string|null} [triggeringCheckType] - If by AutoMod, the check type (camelCase) that triggered it.
 * @returns {boolean} True if ban was successfully added, false otherwise.
 */
export function addBan(player, durationMs, reason, dependencies, bannedBy = 'Unknown', isAutoMod = false, triggeringCheckType = null) {
    const { playerUtils } = dependencies;
    const playerName = player?.nameTag ?? player?.id ?? 'UnknownPlayer';

    if (!player?.isValid() || typeof durationMs !== 'number' || (durationMs <= 0 && durationMs !== Infinity) || typeof bannedBy !== 'string') {
        playerUtils?.debugLog(`[PlayerDataManager.addBan] Invalid args for ${playerName}. Duration: ${durationMs}, BannedBy: ${bannedBy}`, playerName, dependencies);
        return false;
    }
    const pData = getPlayerData(player.id);
    if (!pData) {
        playerUtils?.debugLog(`[PlayerDataManager.addBan] No pData for ${playerName}. Cannot apply ban.`, playerName, dependencies);
        return false;
    }
    return _addPlayerStateRestriction(player, pData, 'ban', durationMs, reason, bannedBy, isAutoMod, triggeringCheckType, dependencies);
}

/**
 * Removes a ban record from a player's data.
 * @param {import('@minecraft/server').Player} player - The player to unban.
 * @param {import('../types.js').CommandDependencies} dependencies - Standard dependencies object.
 * @returns {boolean} True if player was unbanned, false otherwise.
 */
export function removeBan(player, dependencies) {
    const { playerUtils } = dependencies;
    const playerName = player?.nameTag ?? player?.id ?? 'UnknownPlayer';

    if (!player?.isValid()) {
        playerUtils?.debugLog(`[PlayerDataManager.removeBan] Invalid player object for ${playerName}.`, playerName, dependencies);
        return false;
    }
    const pData = getPlayerData(player.id);
    if (!pData) {
        playerUtils?.debugLog(`[PlayerDataManager.removeBan] No pData for ${playerName}. Cannot unban.`, playerName, dependencies);
        return false;
    }
    return _removePlayerStateRestriction(pData, 'ban', dependencies);
}

/**
 * Retrieves a player's current ban information, clearing it if expired.
 * @param {import('@minecraft/server').Player} player - The player whose ban info to get.
 * @param {import('../types.js').CommandDependencies} dependencies - Standard dependencies object.
 * @returns {import('../types.js').PlayerBanInfo | null} The ban info, or null if not banned or expired.
 */
export function getBanInfo(player, dependencies) {
    if (!player?.isValid()) {
        return null;
    }
    const pData = getPlayerData(player.id);
    if (!pData) {
        return null;
    }
    return _getPlayerStateRestriction(pData, 'ban', dependencies);
}

/**
 * Checks if a player is currently banned.
 * @param {import('@minecraft/server').Player} player - The player to check.
 * @param {import('../types.js').CommandDependencies} dependencies - Standard dependencies object.
 * @returns {boolean} True if the player is banned, false otherwise.
 */
export function isBanned(player, dependencies) {
    return getBanInfo(player, dependencies) !== null;
}

/**
 * Saves player data if it has been marked as dirty.
 * @param {import('@minecraft/server').Player} player - The player whose data to potentially save.
 * @param {import('../types.js').CommandDependencies} dependencies - Standard dependencies object.
 * @returns {Promise<boolean>} True if data was saved or not dirty, false on save error.
 */
export async function saveDirtyPlayerData(player, dependencies) {
    const { playerUtils } = dependencies;
    const playerName = player?.nameTag ?? player?.id ?? 'UnknownPlayer';

    if (!player?.isValid()) {
        return false;
    }

    const pData = playerData.get(player.id);
    if (pData?.isDirtyForSave) {
        playerUtils?.debugLog(`[PlayerDataManager.saveDirtyPlayerData] Saving dirty data for ${playerName}.`, pData.isWatched ? playerName : null, dependencies);
        const success = await prepareAndSavePlayerData(player, dependencies);
        if (success && pData) { // Check pData again as it might be cleared by another async op
            pData.isDirtyForSave = false;
        }
        return success;
    }
    return true; // Not dirty, so "successful" in the sense that no save was needed or failed.
}

/**
 * Clears all flags and resets AutoMod state for a specific check type for a player.
 * @param {import('@minecraft/server').Player} player - The player whose flags to clear.
 * @param {string} checkType - The check type (camelCase) whose flags to clear.
 * @param {import('../types.js').CommandDependencies} dependencies - Standard dependencies object.
 * @returns {void}
 */
export function clearFlagsForCheckType(player, checkType, dependencies) {
    const { playerUtils } = dependencies;
    const playerName = player?.nameTag ?? player?.id ?? 'UnknownPlayer';

    if (!player?.isValid() || !checkType || typeof checkType !== 'string') {
        playerUtils?.debugLog(`[PlayerDataManager.clearFlagsForCheckType] Invalid player or checkType for ${playerName}.`, playerName, dependencies);
        return;
    }

    const pData = getPlayerData(player.id);
    if (!pData) {
        playerUtils?.debugLog(`[PlayerDataManager.clearFlagsForCheckType] No pData for ${playerName}.`, playerName, dependencies);
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

    playerUtils?.debugLog(`[PlayerDataManager.clearFlagsForCheckType] Cleared ${clearedCount} flags for '${checkType}' for ${playerName}.`, pData.isWatched ? playerName : null, dependencies);
}

/**
 * Clears transient item use state flags if they persist beyond a configured timeout.
 * @param {import('../types.js').PlayerAntiCheatData} pData - The player's AntiCheat data.
 * @param {import('../types.js').CommandDependencies} dependencies - Standard dependencies object.
 */
export function clearExpiredItemUseStates(pData, dependencies) {
    const { currentTick, config, playerUtils } = dependencies;
    const playerName = pData?.playerNameTag ?? 'UnknownPlayer'; // Use pData's nameTag if available

    if (!pData || !config) {
        return;
    } // Guard against missing pData or config

    const itemUseTimeoutTicks = config.itemUseStateClearTicks || 100; // Default to 100 ticks (5s) if not configured

    if (pData.isUsingConsumable && (currentTick - (pData.lastItemUseTick || 0) > itemUseTimeoutTicks)) {
        if (pData.isWatched) {
            playerUtils?.debugLog(`[PlayerDataManager.clearExpiredItemUseStates] Auto-clearing isUsingConsumable for ${playerName}. Tick: ${currentTick}`, playerName, dependencies);
        }
        pData.isUsingConsumable = false;
        // pData.isDirtyForSave = true; // Removed: isUsingConsumable is not persisted
    }

    if (pData.isChargingBow && (currentTick - (pData.lastItemUseTick || 0) > itemUseTimeoutTicks)) {
        if (pData.isWatched) {
            playerUtils?.debugLog(`[PlayerDataManager.clearExpiredItemUseStates] Auto-clearing isChargingBow for ${playerName}. Tick: ${currentTick}`, playerName, dependencies);
        }
        pData.isChargingBow = false;
        // pData.isDirtyForSave = true; // Removed: isChargingBow is not persisted
    }

    if (pData.isUsingShield && (currentTick - (pData.lastItemUseTick || 0) > itemUseTimeoutTicks)) {
        if (pData.isWatched) {
            playerUtils?.debugLog(`[PlayerDataManager.clearExpiredItemUseStates] Auto-clearing isUsingShield for ${playerName}. Tick: ${currentTick}`, playerName, dependencies);
        }
        pData.isUsingShield = false;
        // pData.isDirtyForSave = true; // Removed: isUsingShield is not persisted
    }
}
