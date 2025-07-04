/**
 * @file Manages all player-specific data used by the AntiCheat system.
 * This includes runtime data (pData), persistence via dynamic properties,
 * and helper functions for data manipulation like adding flags, mutes, and bans.
 * All flagType strings should be camelCase.
 */
import * as mc from '@minecraft/server';
import { processAutoModActions } from './automodManager.js';
import { checkActionProfiles } from './actionProfiles.js'; // Added for dynamic flag types

/**
 * In-memory cache for player data.
 * @type {Map<string, import('../types.js').PlayerAntiCheatData>}
 */
const playerData = new Map();

const dynamicPropertyKeyV1 = 'anticheat:pdata_v1';
const dynamicPropertySizeLimit = 32760; // Approximate limit for dynamic properties

/**
 * Keys from PlayerAntiCheatData that are persisted to dynamic properties.
 * Other keys are considered transient session data.
 * Ensure all keys are valid properties of PlayerAntiCheatData.
 */
const persistedPlayerDataKeys = [
    'flags', 'isWatched', 'lastFlagType', 'playerNameTag',
    'attackEvents', 'lastAttackTime', 'blockBreakEvents', // lastAttackTime might be redundant if attackEvents stores timestamps
    'consecutiveOffGroundTicks', 'fallDistance',
    'consecutiveOnGroundSpeedingTicks', 'muteInfo', 'banInfo',
    'lastCombatInteractionTime', 'lastViolationDetailsMap', 'automodState',
    'joinTime',
    'lastKnownNameTag', 'lastNameTagChangeTick', 'deathMessageToShowOnSpawn',
    'lastCheckNameSpoofTick', 'lastCheckAntiGmcTick', 'lastCheckNetherRoofTick',
    'lastCheckAutoToolTick', 'lastCheckFlatRotationBuildingTick', 'lastRenderDistanceCheckTick',
    // Note: lastPosition, previousPosition, velocity, previousVelocity are typically transient.
    // lastOnGroundTick, lastOnGroundPosition are also often transient.
    // Review if any other fields like recentMessages, isTakingFallDamage, etc., need persistence.
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
 * Saves a subset of player data (persisted keys) to the player's dynamic properties.
 * @param {import('@minecraft/server').Player} player - The player object.
 * @param {object} pDataToSave - Data containing only keys to be persisted.
 * @param {import('../types.js').CommandDependencies} dependencies - Standard dependencies object.
 * @returns {Promise<boolean>} True if saving was successful, false otherwise.
 */
export async function savePlayerDataToDynamicProperties(player, pDataToSave, dependencies) {
    const { playerUtils, logManager } = dependencies;
    const playerName = player?.nameTag ?? player?.id ?? 'UnknownPlayer';

    if (!player?.isValid() || !pDataToSave) {
        playerUtils?.debugLog(`[PlayerDataManager.savePlayerDataToDynamicProperties] Invalid player or pDataToSave for ${playerName}.`, playerName, dependencies);
        return false;
    }

    let jsonString;
    try {
        jsonString = JSON.stringify(pDataToSave);
    } catch (error) {
        console.error(`[PlayerDataManager.savePlayerDataToDynamicProperties] Error stringifying pData for ${playerName}: ${error.stack || error}`);
        playerUtils?.debugLog(`[PlayerDataManager.savePlayerDataToDynamicProperties] Failed to stringify pData for ${playerName}. Error: ${error.message}`, playerName, dependencies);
        logManager?.addLog({
            actionType: 'errorPlayerDataManagerStringify', // Standardized
            context: 'playerDataManager.savePlayerDataToDynamicProperties', // Standardized
            targetName: playerName,
            details: {
                operation: 'JSON.stringify',
                errorMessage: error.message,
                stack: error.stack
            }
        }, dependencies);
        return false;
    }

    if (jsonString.length > dynamicPropertySizeLimit) {
        console.warn(`[PlayerDataManager.savePlayerDataToDynamicProperties] pData for ${playerName} too large (${jsonString.length}b). Cannot save.`);
        playerUtils?.debugLog(`[PlayerDataManager.savePlayerDataToDynamicProperties] pData for ${playerName} exceeds size limit. Size: ${jsonString.length}b.`, playerName, dependencies);
        // Consider alternative storage or data trimming if this becomes common.
        return false;
    }

    try {
        player.setDynamicProperty(dynamicPropertyKeyV1, jsonString);
        return true;
    } catch (error) {
        console.error(`[PlayerDataManager.savePlayerDataToDynamicProperties] Error setting dynamic property for ${playerName}: ${error.stack || error}`);
        playerUtils?.debugLog(`[PlayerDataManager.savePlayerDataToDynamicProperties] Failed to set dynamic property for ${playerName}. Error: ${error.message}`, playerName, dependencies);
        logManager?.addLog({
            actionType: 'errorPlayerDataManagerSetProperty', // Standardized
            context: 'playerDataManager.savePlayerDataToDynamicProperties', // Standardized
            targetName: playerName,
            details: {
                operation: 'player.setDynamicProperty',
                propertyKey: dynamicPropertyKeyV1,
                errorMessage: error.message,
                stack: error.stack
            }
        }, dependencies);
        return false;
    }
}

/**
 * Loads player data from dynamic properties.
 * @param {import('@minecraft/server').Player} player - The player object.
 * @param {import('../types.js').CommandDependencies} dependencies - Standard dependencies object.
 * @returns {Promise<object | null>} The loaded player data object, or null if not found or error.
 */
export async function loadPlayerDataFromDynamicProperties(player, dependencies) {
    const { playerUtils, logManager } = dependencies;
    const playerName = player?.nameTag ?? player?.id ?? 'UnknownPlayer';

    if (!player?.isValid()) {
        playerUtils?.debugLog('[PlayerDataManager.loadPlayerDataFromDynamicProperties] Invalid player object.', null, dependencies);
        return null;
    }

    let jsonString;
    try {
        jsonString = player.getDynamicProperty(dynamicPropertyKeyV1);
    } catch (error) {
        console.error(`[PlayerDataManager.loadPlayerDataFromDynamicProperties] Error getting dynamic property for ${playerName}: ${error.stack || error}`);
        playerUtils?.debugLog(`[PlayerDataManager.loadPlayerDataFromDynamicProperties] Failed to get dynamic property for ${playerName}. Error: ${error.message}`, playerName, dependencies);
        logManager?.addLog({
            actionType: 'errorPlayerDataManagerGetProperty', // Standardized
            context: 'playerDataManager.loadPlayerDataFromDynamicProperties', // Standardized
            targetName: playerName,
            details: {
                operation: 'player.getDynamicProperty',
                propertyKey: dynamicPropertyKeyV1,
                errorMessage: error.message,
                stack: error.stack
            }
        }, dependencies);
        return null;
    }

    if (typeof jsonString === 'string') {
        try {
            const parsedData = JSON.parse(jsonString);
            playerUtils?.debugLog(`[PlayerDataManager.loadPlayerDataFromDynamicProperties] Loaded and parsed data for ${playerName}.`, playerName, dependencies);
            return parsedData;
        } catch (error) {
            console.error(`[PlayerDataManager.loadPlayerDataFromDynamicProperties] Error parsing pData JSON for ${playerName}: ${error.stack || error}`);
            playerUtils?.debugLog(`[PlayerDataManager.loadPlayerDataFromDynamicProperties] Failed to parse JSON for ${playerName}. JSON (start): '${jsonString.substring(0, 200)}'. Error: ${error.message}`, playerName, dependencies);
            logManager?.addLog({
                actionType: 'errorPlayerDataManagerParse', // Standardized
                context: 'playerDataManager.loadPlayerDataFromDynamicProperties', // Standardized
                targetName: playerName,
                details: {
                    operation: 'JSON.parse',
                    jsonSample: jsonString.substring(0, 200) + (jsonString.length > 200 ? '...' : ''),
                    errorMessage: error.message,
                    stack: error.stack
                }
            }, dependencies);
            return null;
        }
    } else if (jsonString === undefined) { // Check for undefined explicitly
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
            if (Object.prototype.hasOwnProperty.call(pData, key)) {
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
    const profile = checkActionProfiles[checkKey];
    // Ensure profile and profile.flag are valid objects
    if (profile && typeof profile.flag === 'object' && profile.flag !== null) {
        if (typeof profile.flag.type === 'string' && profile.flag.type.length > 0) {
            // Use specific flag.type if defined and non-empty
            dynamicallyGeneratedFlagTypes.add(profile.flag.type);
        } else {
            // Otherwise, if a flag object exists but flag.type is not specified or empty,
            // use the main checkKey as the flag type, as this is the implicit flag name.
            dynamicallyGeneratedFlagTypes.add(checkKey);
        }
    }
}
const allKnownFlagTypes = Array.from(dynamicallyGeneratedFlagTypes);
if (allKnownFlagTypes.length === 0) {
    // This is a fallback/warning. If actionProfiles is empty or misconfigured,
    // this log helps identify that no flag types were found.
    // In a production environment with valid actionProfiles, this shouldn't trigger.
    console.warn('[PlayerDataManager] Warning: allKnownFlagTypes is empty after dynamic generation. Check actionProfiles.js configuration.');
}


/**
 * Initializes a new default PlayerAntiCheatData object for a player.
 * @param {import('@minecraft/server').Player} player - The player object.
 * @param {number} currentTick - The current game tick.
 * @param {import('../types.js').CommandDependencies} dependencies - Standard dependencies object.
 * @returns {import('../types.js').PlayerAntiCheatData} The initialized player data.
 */
export function initializeDefaultPlayerData(player, currentTick, dependencies) {
    const { playerUtils } = dependencies;
    const playerName = player?.nameTag ?? player?.id ?? 'UnknownPlayer';
    playerUtils?.debugLog(`[PlayerDataManager.initializeDefaultPlayerData] Initializing for ${playerName} (ID: ${player.id})`, playerName, dependencies);

    // Initialize all flag types to ensure they exist in pData.flags
    const defaultFlags = { totalFlags: 0 };
    // Uses the dynamically generated allKnownFlagTypes array from module scope
    for (const flagKey of allKnownFlagTypes) {
        defaultFlags[flagKey] = { count: 0, lastDetectionTime: 0 };
    }

    return {
        id: player.id,
        playerNameTag: player.nameTag, // Store current nameTag
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
        recentMessages: [], // Consider size limit if this grows large and is persisted
        flags: defaultFlags,
        lastFlagType: '',
        isWatched: false,
        lastChatMessageTimestamp: 0,
        lastPitch: player.getRotation().x,
        lastYaw: player.getRotation().y,
        lastAttackTick: 0,
        recentHits: [], // Consider size limit if persisted
        isUsingConsumable: false,
        isChargingBow: false,
        isUsingShield: false,
        lastItemUseTick: 0,
        recentBlockPlacements: [], // Consider size limit if persisted
        lastPillarBaseY: 0,
        consecutivePillarBlocks: 0,
        lastPillarTick: 0,
        currentPillarX: null,
        currentPillarZ: null,
        consecutiveDownwardBlocks: 0,
        lastDownwardScaffoldTick: 0,
        lastDownwardScaffoldBlockLocation: null,
        itemUseTimestamps: {}, // Consider size limit if persisted
        recentPlaceTimestamps: [], // Consider size limit if persisted
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
        lastKnownNameTag: player.nameTag, // Persisted
        lastNameTagChangeTick: currentTick, // Persisted
        muteInfo: null, // Persisted
        banInfo: null, // Persisted
        joinTime: Date.now(), // Persisted
        lastGameMode: player.gameMode, // Transient, updated on tick
        lastDimensionId: player.dimension.id, // Transient, updated on tick
        isDirtyForSave: true, // New data, needs initial save
        lastViolationDetailsMap: {}, // Persisted
        automodState: {}, // Persisted
        deathMessageToShowOnSpawn: null, // Persisted
        // Persisted tick counters for interval checks
        lastCheckNameSpoofTick: 0,
        lastCheckAntiGmcTick: 0,
        lastCheckNetherRoofTick: 0,
        lastCheckAutoToolTick: 0,
        lastCheckFlatRotationBuildingTick: 0,
        lastRenderDistanceCheckTick: 0,
        slimeCheckErrorLogged: false, // Transient, not persisted
    };
}

/**
 * Ensures that a player's data is initialized, loading from persistence if available,
 * or creating default data otherwise. Merges loaded data with defaults for transient fields.
 * @param {import('@minecraft/server').Player} player - The player object.
 * @param {number} currentTick - Current game tick, used if initializing default data.
 * @param {import('../types.js').CommandDependencies} dependencies - Standard dependencies object.
 * @returns {Promise<import('../types.js').PlayerAntiCheatData>} The initialized or loaded player data.
 */
export async function ensurePlayerDataInitialized(player, currentTick, dependencies) {
    const { playerUtils } = dependencies;
    const playerName = player?.nameTag ?? player?.id ?? 'UnknownPlayer';

    if (playerData.has(player.id)) {
        const existingPData = playerData.get(player.id);
        // Update critical transient fields even for existing data
        existingPData.lastPosition = { ...player.location };
        existingPData.previousPosition = { ...player.location }; // Or keep old previousPosition based on design
        existingPData.velocity = { ...player.getVelocity() };
        existingPData.lastGameMode = player.gameMode;
        existingPData.lastDimensionId = player.dimension.id;
        existingPData.playerNameTag = player.nameTag; // Ensure current nameTag is reflected
        return existingPData;
    }

    let newPData = initializeDefaultPlayerData(player, currentTick, dependencies);
    const loadedData = await loadPlayerDataFromDynamicProperties(player, dependencies);

    if (loadedData && typeof loadedData === 'object') {
        playerUtils?.debugLog(`[PlayerDataManager.ensurePlayerDataInitialized] Merging persisted pData for ${playerName}.`, playerName, dependencies);
        // Create a fresh default structure to ensure all fields are present
        const defaultPDataForMerge = initializeDefaultPlayerData(player, currentTick, dependencies);
        // Merge loadedData onto the default structure. Persisted fields in loadedData will overwrite.
        newPData = { ...defaultPDataForMerge, ...loadedData };

        // Deep merge for nested objects like 'flags', 'lastViolationDetailsMap', 'automodState'
        newPData.flags = { ...defaultPDataForMerge.flags, ...(loadedData.flags || {}) };
        // Ensure totalFlags is correct after merge
        if (typeof newPData.flags.totalFlags !== 'number' || isNaN(newPData.flags.totalFlags)) {
            newPData.flags.totalFlags = 0;
            for (const flagKey in newPData.flags) {
                if (flagKey !== 'totalFlags' && newPData.flags[flagKey] && typeof newPData.flags[flagKey].count === 'number') {
                    newPData.flags.totalFlags += newPData.flags[flagKey].count;
                }
            }
        }
        newPData.lastViolationDetailsMap = { ...(defaultPDataForMerge.lastViolationDetailsMap || {}), ...(loadedData.lastViolationDetailsMap || {}) };
        newPData.automodState = { ...(defaultPDataForMerge.automodState || {}), ...(loadedData.automodState || {}) };

        // Always update to current nameTag from player object, but keep loaded lastKnownNameTag if it exists
        newPData.playerNameTag = player.nameTag;
        newPData.lastKnownNameTag = loadedData.lastKnownNameTag ?? player.nameTag;
        newPData.lastNameTagChangeTick = loadedData.lastNameTagChangeTick ?? currentTick;
        newPData.joinTime = loadedData.joinTime ?? Date.now(); // Fallback to now if joinTime wasn't persisted
        newPData.isDirtyForSave = false; // Loaded data is not initially dirty
    } else {
        playerUtils?.debugLog(`[PlayerDataManager.ensurePlayerDataInitialized] No persisted data for ${playerName}. Using fresh default data.`, playerName, dependencies);
        // newPData is already the fresh default, and isDirtyForSave is true from initializeDefaultPlayerData
    }

    // Check for expired mutes/bans
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
        if (player?.isValid()) { // Ensure player object is valid
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
    const { currentTick, playerUtils, config, logManager } = dependencies;
    const playerName = player?.nameTag ?? pData?.playerNameTag ?? 'UnknownPlayer';

    const rotation = player.getRotation();
    pData.lastPitch = rotation.x;
    pData.lastYaw = rotation.y;

    pData.previousVelocity = { ...(pData.velocity || { x: 0, y: 0, z: 0 }) }; // Ensure pData.velocity exists
    pData.velocity = { ...player.getVelocity() };

    pData.previousPosition = { ...(pData.lastPosition || player.location) }; // Ensure pData.lastPosition exists
    pData.lastPosition = { ...player.location };

    if (pData.playerNameTag !== player.nameTag) { // nameTag might have changed
        pData.playerNameTag = player.nameTag;
        pData.isDirtyForSave = true;
    }

    if (player.isOnGround) {
        pData.consecutiveOffGroundTicks = 0;
        pData.lastOnGroundTick = currentTick;
        pData.lastOnGroundPosition = { ...player.location };
        try {
            const feetPos = { x: Math.floor(pData.lastPosition.x), y: Math.floor(pData.lastPosition.y), z: Math.floor(pData.lastPosition.z) };
            const blockBelowFeet = player.dimension?.getBlock(feetPos.offset(0, -1, 0)); // Use offset for clarity
            const blockAtFeet = player.dimension?.getBlock(feetPos);

            if (blockBelowFeet?.typeId === mc.MinecraftBlockTypes.slime.id || blockAtFeet?.typeId === mc.MinecraftBlockTypes.slime.id) {
                pData.lastOnSlimeBlockTick = currentTick;
                if (pData.isWatched && config?.enableDebugLogging) {
                    playerUtils?.debugLog(`[PlayerDataManager.updateTransientPlayerData] Player ${playerName} on slime block at tick ${currentTick}.`, playerName, dependencies);
                }
            }
        } catch (e) {
            if (!pData.slimeCheckErrorLogged) { // Prevent log spam
                console.warn(`[PlayerDataManager.updateTransientPlayerData] Error checking slime block for ${playerName}: ${e.stack || e}`);
                logManager?.addLog({
                    actionType: 'errorPlayerDataManagerSlimeCheck', // Standardized
                    context: 'playerDataManager.updateTransientPlayerData.slimeBlockCheck', // Standardized
                    targetName: playerName,
                    details: {
                        errorMessage: e.message,
                        stack: e.stack,
                        feetPos: feetPos // Added for more context
                    }
                }, dependencies);
                pData.slimeCheckErrorLogged = true; // Set flag to prevent repeated logging of this error per session
            }
        }
    } else {
        pData.consecutiveOffGroundTicks++;
        pData.slimeCheckErrorLogged = false; // Reset if off ground
    }

    if (player.selectedSlotIndex !== pData.previousSelectedSlotIndex) {
        pData.lastSelectedSlotChangeTick = currentTick;
        pData.previousSelectedSlotIndex = player.selectedSlotIndex;
        // pData.isDirtyForSave = true; // Persisting this is optional, depends on if it's needed across sessions
    }

    if (pData.lastGameMode !== player.gameMode) {
        pData.lastGameMode = player.gameMode;
        pData.isDirtyForSave = true; // Game mode changes should be persisted
    }
    if (pData.lastDimensionId !== player.dimension.id) {
        pData.lastDimensionId = player.dimension.id;
        pData.isDirtyForSave = true; // Dimension changes should be persisted
    }

    const effects = player.getEffects();
    pData.jumpBoostAmplifier = effects?.find(eff => eff.typeId === mc.MinecraftEffectTypes.jumpBoost.id)?.amplifier ?? 0;
    pData.hasSlowFalling = !!effects?.find(eff => eff.typeId === mc.MinecraftEffectTypes.slowFalling.id);
    pData.hasLevitation = !!effects?.find(eff => eff.typeId === mc.MinecraftEffectTypes.levitation.id);
    pData.speedAmplifier = effects?.find(eff => eff.typeId === mc.MinecraftEffectTypes.speed.id)?.amplifier ?? -1;
    pData.blindnessTicks = effects?.find(eff => eff.typeId === mc.MinecraftEffectTypes.blindness.id)?.duration ?? 0;

    if (pData.isWatched && config?.enableDebugLogging && (currentTick % 20 === 0)) {
        const transientSnapshot = {
            vx: pData.velocity.x.toFixed(3), vy: pData.velocity.y.toFixed(3), vz: pData.velocity.z.toFixed(3),
            pitch: pData.lastPitch.toFixed(3), yaw: pData.lastYaw.toFixed(3),
            sprinting: player.isSprinting, sneaking: player.isSneaking, onGround: player.isOnGround,
            fallDist: player.fallDistance.toFixed(3), // Corrected property name from spec
            jumpBoost: pData.jumpBoostAmplifier, slowFall: pData.hasSlowFalling, lev: pData.hasLevitation, speedAmp: pData.speedAmplifier,
        };
        playerUtils?.debugLog(`[PlayerDataManager.updateTransientPlayerData] Watched ${playerName} (Tick: ${currentTick}): ${JSON.stringify(transientSnapshot)}`, playerName, dependencies);
    }
}

/**
 * Adds a flag to a player's data and triggers AutoMod processing.
 * @param {import('@minecraft/server').Player} player - The player to flag.
 * @param {string} flagType - Standardized camelCase flag type (e.g., 'movementFlyHover').
 * @param {string} reasonMessage - Base reason message for the flag.
 * @param {string | object} [detailsForNotify=''] - Additional details for notification or structured data.
 * @param {import('../types.js').CommandDependencies} dependencies - Standard dependencies object.
 */
export async function addFlag(player, flagType, reasonMessage, detailsForNotify = '', dependencies) {
    const { playerUtils, config, logManager } = dependencies;
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

    // Standardize flagType to camelCase just in case (should already be, but defensive)
    const originalFlagType = flagType;
    const standardizedFlagType = originalFlagType
        .replace(/([-_][a-z0-9])/ig, ($1) => $1.toUpperCase().replace('-', '').replace('_', ''))
        .replace(/^[A-Z]/, (match) => match.toLowerCase());

    if (standardizedFlagType !== originalFlagType) {
        console.warn(`[PlayerDataManager.addFlag] Non-camelCase flagType '${originalFlagType}' received. Standardized to '${standardizedFlagType}'. Review call site.`);
    }
    const finalFlagType = standardizedFlagType;


    pData.flags[finalFlagType] ??= { count: 0, lastDetectionTime: 0 };
    // This check is redundant if ??= works as expected, but good for robustness.
    if (!pData.flags[finalFlagType]) {
        playerUtils?.debugLog(`[PlayerDataManager.addFlag] New flagType '${finalFlagType}' for ${playerName}. Initializing structure.`, playerName, dependencies);
        pData.flags[finalFlagType] = { count: 0, lastDetectionTime: 0 };
    }

    pData.flags[finalFlagType].count++;
    pData.flags[finalFlagType].lastDetectionTime = Date.now();
    pData.flags.totalFlags = (pData.flags.totalFlags || 0) + 1;
    pData.lastFlagType = finalFlagType; // Store the standardized version

    if (typeof detailsForNotify === 'object' && detailsForNotify !== null && detailsForNotify.itemTypeId) {
        pData.lastViolationDetailsMap ??= {};
        pData.lastViolationDetailsMap[finalFlagType] = {
            itemTypeId: detailsForNotify.itemTypeId,
            quantityFound: detailsForNotify.quantityFound || 0, // Ensure quantityFound is a number
            timestamp: Date.now(),
        };
        playerUtils?.debugLog(`[PlayerDataManager.addFlag] Stored violation details for ${finalFlagType} on ${playerName}: ${JSON.stringify(pData.lastViolationDetailsMap[finalFlagType])}`, playerName, dependencies);
    }
    pData.isDirtyForSave = true;

    const notifyString = (typeof detailsForNotify === 'object' && detailsForNotify !== null) ?
        (detailsForNotify.originalDetailsForNotify || `Item: ${String(detailsForNotify.itemTypeId || 'N/A')}`) : // Handle undefined itemTypeId
        String(detailsForNotify);
    const fullReasonForLog = `${reasonMessage} ${notifyString}`.trim();

    playerUtils?.warnPlayer(player, reasonMessage, dependencies); // Pass dependencies
    // Configurable notification for flagging
    if (dependencies.config.notifications?.notifyOnPlayerFlagged !== false) { // Default true if undefined
        // Construct a base message without player name, as notifyAdmins will add it with flag context
        const baseNotifyMsg = getString('playerData.notify.flagged', { flagType: finalFlagType, details: notifyString });
        playerUtils?.notifyAdmins(baseNotifyMsg, dependencies, player, pData);
    }
    playerUtils?.debugLog(`[PlayerDataManager.addFlag] FLAG: ${playerName} for ${finalFlagType}. Reason: '${fullReasonForLog}'. Total: ${pData.flags.totalFlags}. Count[${finalFlagType}]: ${pData.flags[finalFlagType].count}`, playerName, dependencies);

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
                actionType: 'errorPlayerDataManagerAutomodProcess', // Standardized
                context: 'playerDataManager.addFlag', // Standardized
                targetName: playerName,
                details: {
                    checkType: finalFlagType,
                    errorMessage: e.message,
                    stack: e.stack
                }
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
export function addMute(player, durationMs, reason, mutedBy = 'Unknown', isAutoMod = false, triggeringCheckType = null, dependencies) {
    const { playerUtils, getString } = dependencies;
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

    const unmuteTime = (durationMs === Infinity) ? Infinity : Date.now() + durationMs;
    const muteReason = reason || getString('playerData.mute.defaultReason');

    pData.muteInfo = {
        unmuteTime,
        reason: muteReason,
        mutedBy,
        isAutoMod,
        triggeringCheckType, // Already expected to be camelCase or null
    };
    pData.isDirtyForSave = true;

    let logMsg = `[PlayerDataManager.addMute] Player ${playerName} muted by ${mutedBy}. Reason: '${muteReason}'. AutoMod: ${isAutoMod}. CheckType: ${triggeringCheckType ?? 'N/A'}.`;
    logMsg += (durationMs === Infinity) ? ' Duration: Permanent.' : ` Unmute time: ${new Date(unmuteTime).toISOString()}.`;
    playerUtils?.debugLog(logMsg, pData.isWatched ? playerName : null, dependencies);
    return true;
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

    if (pData.muteInfo) {
        pData.muteInfo = null;
        pData.isDirtyForSave = true;
        playerUtils?.debugLog(`[PlayerDataManager.removeMute] Player ${playerName} unmuted.`, pData.isWatched ? playerName : null, dependencies);
        return true;
    } else {
        playerUtils?.debugLog(`[PlayerDataManager.removeMute] Player ${playerName} was not muted. No action.`, pData.isWatched ? playerName : null, dependencies);
        return false;
    }
}

/**
 * Retrieves a player's current mute information, clearing it if expired.
 * @param {import('@minecraft/server').Player} player - The player whose mute info to get.
 * @param {import('../types.js').CommandDependencies} dependencies - Standard dependencies object.
 * @returns {import('../types.js').PlayerMuteInfo | null} The mute info, or null if not muted or expired.
 */
export function getMuteInfo(player, dependencies) {
    const { playerUtils } = dependencies;
    const playerName = player?.nameTag ?? player?.id ?? 'UnknownPlayer';

    if (!player?.isValid()) return null;

    const pData = getPlayerData(player.id);
    if (!pData?.muteInfo) return null;

    const mute = pData.muteInfo;
    if (mute.unmuteTime !== Infinity && Date.now() >= mute.unmuteTime) {
        pData.muteInfo = null;
        pData.isDirtyForSave = true;
        playerUtils?.debugLog(`[PlayerDataManager.getMuteInfo] Mute for ${playerName} expired and removed.`, pData.isWatched ? playerName : null, dependencies);
        return null;
    }
    return mute;
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
 * @param {string} [bannedBy='Unknown'] - Name of the admin or system component that issued the ban.
 * @param {boolean} [isAutoMod=false] - Whether this ban was applied by AutoMod.
 * @param {string|null} [triggeringCheckType=null] - If by AutoMod, the check type (camelCase) that triggered it.
 * @param {import('../types.js').CommandDependencies} dependencies - Standard dependencies object.
 * @returns {boolean} True if ban was successfully added, false otherwise.
 */
export function addBan(player, durationMs, reason, bannedBy = 'Unknown', isAutoMod = false, triggeringCheckType = null, dependencies) {
    const { playerUtils, getString } = dependencies;
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

    const currentTime = Date.now();
    const unbanTime = (durationMs === Infinity) ? Infinity : currentTime + durationMs;
    const banReason = reason || getString('playerData.ban.defaultReason');

    pData.banInfo = {
        xuid: player.id, // Persist XUID if available
        playerName: player.nameTag, // Persist current nameTag at time of ban
        banTime: currentTime,
        unbanTime,
        reason: banReason,
        bannedBy,
        isAutoMod,
        triggeringCheckType, // Already expected to be camelCase or null
    };
    pData.isDirtyForSave = true;

    let logMsg = `[PlayerDataManager.addBan] Player ${playerName} (XUID: ${player.id}) banned by ${bannedBy}. Reason: '${banReason}'. AutoMod: ${isAutoMod}. CheckType: ${triggeringCheckType ?? 'N/A'}.`;
    logMsg += (durationMs === Infinity) ? ' Duration: Permanent.' : ` Unban time: ${new Date(unbanTime).toISOString()}.`;
    playerUtils?.debugLog(logMsg, pData.isWatched ? playerName : null, dependencies);
    return true;
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

    if (pData.banInfo) {
        pData.banInfo = null;
        pData.isDirtyForSave = true;
        playerUtils?.debugLog(`[PlayerDataManager.removeBan] Player ${playerName} unbanned.`, pData.isWatched ? playerName : null, dependencies);
        return true;
    } else {
        playerUtils?.debugLog(`[PlayerDataManager.removeBan] Player ${playerName} was not banned. No action.`, pData.isWatched ? playerName : null, dependencies);
        return false;
    }
}

/**
 * Retrieves a player's current ban information, clearing it if expired.
 * @param {import('@minecraft/server').Player} player - The player whose ban info to get.
 * @param {import('../types.js').CommandDependencies} dependencies - Standard dependencies object.
 * @returns {import('../types.js').PlayerBanInfo | null} The ban info, or null if not banned or expired.
 */
export function getBanInfo(player, dependencies) {
    const { playerUtils } = dependencies;
    const playerName = player?.nameTag ?? player?.id ?? 'UnknownPlayer';

    if (!player?.isValid()) return null;

    const pData = getPlayerData(player.id);
    if (!pData?.banInfo) return null;

    const currentBanInfo = pData.banInfo;
    if (currentBanInfo.unbanTime !== Infinity && Date.now() >= currentBanInfo.unbanTime) {
        pData.banInfo = null;
        pData.isDirtyForSave = true;
        playerUtils?.debugLog(`[PlayerDataManager.getBanInfo] Ban for ${playerName} expired and removed.`, pData.isWatched ? playerName : null, dependencies);
        return null;
    }
    return currentBanInfo;
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

    if (!player?.isValid()) return false;

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
 * @returns {Promise<void>}
 */
export async function clearFlagsForCheckType(player, checkType, dependencies) {
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
        // pData.flags[checkType].lastDetectionTime = 0; // Optionally reset last detection time
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

    if (!pData || !config) return; // Guard against missing pData or config

    const itemUseTimeoutTicks = config.itemUseStateClearTicks || 100; // Default to 100 ticks (5s) if not configured

    if (pData.isUsingConsumable && (currentTick - (pData.lastItemUseTick || 0) > itemUseTimeoutTicks)) {
        if (pData.isWatched) {
            playerUtils?.debugLog(`[PlayerDataManager.clearExpiredItemUseStates] Auto-clearing isUsingConsumable for ${playerName}. Tick: ${currentTick}`, playerName, dependencies);
        }
        pData.isUsingConsumable = false;
        pData.isDirtyForSave = true;
    }

    if (pData.isChargingBow && (currentTick - (pData.lastItemUseTick || 0) > itemUseTimeoutTicks)) {
        if (pData.isWatched) {
            playerUtils?.debugLog(`[PlayerDataManager.clearExpiredItemUseStates] Auto-clearing isChargingBow for ${playerName}. Tick: ${currentTick}`, playerName, dependencies);
        }
        pData.isChargingBow = false;
        pData.isDirtyForSave = true;
    }

    if (pData.isUsingShield && (currentTick - (pData.lastItemUseTick || 0) > itemUseTimeoutTicks)) {
        if (pData.isWatched) {
            playerUtils?.debugLog(`[PlayerDataManager.clearExpiredItemUseStates] Auto-clearing isUsingShield for ${playerName}. Tick: ${currentTick}`, playerName, dependencies);
        }
        pData.isUsingShield = false;
        pData.isDirtyForSave = true;
    }
}
