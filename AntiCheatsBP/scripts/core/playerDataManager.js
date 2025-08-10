import { logError } from '../modules/utils/playerUtils.js';
import { offlineBanList } from './offlineBanList.js';

const maxSerializedDataLength = 30000;
const itemUseStateExpiryMs = 5000;

/**
 * @type {Map<string, import('../types.js').PlayerAntiCheatData>}
 */
const activePlayerData = new Map();

/**
 * @type {Map<string, Promise<import('../types.js').PlayerAntiCheatData>>}
 */
const initializingPlayerData = new Map();

const scheduledFlagPurgesKey = 'anticheat:scheduled_flag_purges';

/**
 * @typedef {Object} ScheduledPurge
 * @property {string} playerName
 * @property {number} timestamp
 */

/**
 * @type {Map<string, ScheduledPurge>}
 */
let scheduledFlagPurgesCache = new Map();

/**
 * @param {import('../types.js').Dependencies} dependencies
 */
export async function initializeScheduledFlagPurges(dependencies) {
    const { world, playerUtils, logManager } = dependencies;
    try {
        const data = world.getDynamicProperty(scheduledFlagPurgesKey);
        if (typeof data === 'string') {
            const parsed = JSON.parse(data);
            if (Array.isArray(parsed)) {
                const validPurges = parsed.filter(item =>
                    item && typeof item.playerName === 'string' && typeof item.timestamp === 'number',
                );
                if (validPurges.length !== parsed.length) {
                    playerUtils.debugLog('[PlayerDataManager] Filtered invalid entries from scheduled flag purges during load.', 'SystemWarn', dependencies);
                    logManager.addLog({
                        actionType: 'warning.pdm.loadPurges.invalidEntries',
                        context: 'PlayerDataManager.initializeScheduledFlagPurges',
                        details: {
                            message: 'Invalid entries were filtered during loading of scheduled purges.',
                            totalCount: parsed.length,
                            validCount: validPurges.length,
                        },
                    }, dependencies);
                }
                scheduledFlagPurgesCache = new Map(validPurges.map(item => [item.playerName, item]));
            } else if (parsed !== null) {
                playerUtils.debugLog(`[PlayerDataManager] Unexpected data format for scheduled flag purges. Data will be reset. Found type: ${typeof parsed}`, 'SystemError', dependencies);
            }
        }
    } catch (e) {
        logError(`[PlayerDataManager] Failed to load scheduled flag purges: ${e.message}`, e);
    }
}

function _getScheduledFlagPurgesFromCache() {
    return scheduledFlagPurgesCache;
}

/**
 * @param {import('../types.js').Dependencies} dependencies
 */
async function _saveScheduledFlagPurges(dependencies) {
    const { world } = dependencies;
    try {
        const arrayToSave = Array.from(scheduledFlagPurgesCache.values());
        world.setDynamicProperty(scheduledFlagPurgesKey, JSON.stringify(arrayToSave));
    } catch (e) {
        logError(`[PlayerDataManager] Failed to save scheduled flag purges: ${e}`, e);
    }
}

/**
 * @param {import('../types.js').Dependencies} dependencies
 */
export async function cleanupStaleScheduledFlagPurges(dependencies) {
    const { config, playerUtils, logManager } = dependencies;
    const maxAgeDays = config.scheduledFlagPurgeMaxAgeDays ?? 30;
    if (maxAgeDays <= 0) return;

    const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
    const now = Date.now();
    let purgesModified = false;

    const scheduledFlagPurges = _getScheduledFlagPurgesFromCache();
    if (scheduledFlagPurges.size === 0) return;

    const purgesToDelete = [];
    for (const [playerName, purgeInfo] of scheduledFlagPurges.entries()) {
        if (now - purgeInfo.timestamp > maxAgeMs) {
            purgesToDelete.push(playerName);
            purgesModified = true;
        }
    }

    if (purgesModified) {
        for (const playerName of purgesToDelete) {
            scheduledFlagPurges.delete(playerName);
        }
        await _saveScheduledFlagPurges(dependencies);

        playerUtils.debugLog(`[PlayerDataManager] Cleaned up ${purgesToDelete.length} stale scheduled flag purges.`, 'System', dependencies);
        logManager.addLog({
            actionType: 'system.pdm.cleanup.stalePurges',
            context: 'PlayerDataManager.cleanup',
            details: {
                count: purgesToDelete.length,
                stalePlayerNames: purgesToDelete,
                maxAgeDays,
            },
        }, dependencies);
    }
}

function getDefaultSessionState(currentTick, now) {
    return {
        isOnline: true,
        isDirtyForSave: false,
        joinTick: currentTick,
        lastTickUpdated: currentTick,
        sessionStartTime: now,
        lastSavedTimestamp: 0,
        isWatched: false,
    };
}

function getDefaultFlagsAndViolations() {
    return {
        flags: { totalFlags: 0 },
        lastFlagType: '',
        lastViolationDetailsMap: {},
        automodState: {},
        lastCheckTick: {},
    };
}

function getDefaultRestrictions() {
    return {
        permissionLevel: null, // Will be set by rankManager
        banInfo: null,
        muteInfo: null,
        isFrozen: false,
        isVanished: false,
        godModeActive: false,
    };
}

function getDefaultMovementState(playerLike, now) {
    return {
        lastKnownLocation: playerLike.location ? { ...playerLike.location } : { x: 0, y: 0, z: 0 },
        lastKnownDimensionId: playerLike.dimension ? playerLike.dimension.id : 'minecraft:overworld',
        lastSignificantMovement: now,
        lastTeleportTimestamp: 0,
        isTeleporting: false,
    };
}

function getDefaultCombatState() {
    return {
        lastAttackTimestamp: 0,
        lastDamageTimestamp: 0,
        lastHealTimestamp: 0,
        lastEnderPearlTimestamp: 0,
        lastFoodConsumptionTimestamp: 0,
        itemUseStates: {},
        consecutiveHits: 0,
        lastAttackedEntityId: null,
    };
}

function getDefaultInteractionState() {
    return {
        blockBreakTimestamps: [],
        lastBlockPlacedTimestamp: 0,
        lastChatMessageTimestamp: 0,
        chatMessageTimestamps: [],
    };
}

function getDefaultTpaState() {
    return {
        tpaAcceptsRequests: true,
        tpaCooldownTimestamp: 0,
    };
}

function getDefaultTransientState(playerLike) {
    return {
        lastVelocity: { x: 0, y: 0, z: 0 },
        isFalling: false,
        fallDistance: 0,
        ticksSinceLastOnGround: 0,
        ticksInAir: 0,
        isNearLiquid: false,
        isClimbing: false,
        isSleeping: false,
        isRiding: false,
        isSprinting: false,
        isSwimming: false,
        isGliding: false,
        headRotation: playerLike.getHeadRotation ? { ...playerLike.getHeadRotation() } : { x: 0, y: 0 },
        bodyRotation: playerLike.bodyRotation || 0,
    };
}

export function initializeDefaultPlayerData(playerLike, currentTick) {
    const now = Date.now();
    const playerNameHash = Array.from(playerLike.name).reduce((hash, char) => (hash << 5) - hash + char.charCodeAt(0), 0);

    return {
        playerId: playerLike.id,
        playerNameTag: playerLike.name,
        playerNameHash,
        ...getDefaultSessionState(currentTick, now),
        ...getDefaultFlagsAndViolations(),
        ...getDefaultRestrictions(),
        ...getDefaultMovementState(playerLike, now),
        ...getDefaultCombatState(),
        ...getDefaultInteractionState(),
        ...getDefaultTpaState(),
        transient: getDefaultTransientState(playerLike),
    };
}


/**
 * @param {string} playerId The player's ID.
 * @returns {import('../types.js').PlayerAntiCheatData|undefined} The player's data object, or undefined if not found.
 */
export function getPlayerData(playerId) {
    return activePlayerData.get(playerId);
}

/**
 * @returns {Array<import('../types.js').PlayerAntiCheatData>} An array of all active player data.
 */
/**
 * @param {import('@minecraft/server').Player} player The player object.
 * @param {number} currentTick The current server tick.
 * @param {import('../types.js').Dependencies} dependencies The dependencies object.
 * @returns {Promise<import('../types.js').PlayerAntiCheatData>} A promise resolving with the player's data.
 */
export function ensurePlayerDataInitialized(player, currentTick, dependencies) {
    if (activePlayerData.has(player.id)) {
        return Promise.resolve(activePlayerData.get(player.id));
    }

    if (initializingPlayerData.has(player.id)) {
        return initializingPlayerData.get(player.id);
    }

    const initializationWork = async () => {
        const { playerUtils, logManager } = dependencies;
        try {
            // Check offline ban list first
            const offlineBanEntry = offlineBanList.find(entry =>
                (entry.playerName && entry.playerName.toLowerCase() === player.name.toLowerCase()) ||
                (entry.xuid && entry.xuid === player.id),
            );

            if (offlineBanEntry) {
                let pData = initializeDefaultPlayerData(player, currentTick);
                pData.banInfo = {
                    reason: offlineBanEntry.reason || 'Banned by offline list.',
                    bannedBy: offlineBanEntry.bannedBy || 'System',
                    isAutoMod: false,
                    triggeringCheckType: 'offlineBan',
                    expiryTimestamp: Infinity,
                    startTimestamp: Date.now(),
                };
                pData.isDirtyForSave = true;
                activePlayerData.set(player.id, pData);
                return pData;
            }

            let pData = await _loadPlayerDataFromDynamicProperties(player, dependencies);

            if (!pData) {
                pData = initializeDefaultPlayerData(player, currentTick);
                playerUtils.debugLog(`[PlayerDataManager] No existing data found for ${player.nameTag}. Initialized new default data.`, player.nameTag, dependencies);
                logManager.addLog({ actionType: 'playerInitialJoin', targetName: player.nameTag, targetId: player.id }, dependencies);
            } else {
                playerUtils.debugLog(`[PlayerDataManager] Successfully loaded data for ${player.nameTag} from dynamic properties.`, player.nameTag, dependencies);
            }

            const scheduledFlagPurges = _getScheduledFlagPurgesFromCache();
            if (scheduledFlagPurges.has(player.nameTag)) {
                const { flags, lastFlagType, lastViolationDetailsMap, automodState } = getDefaultFlagsAndViolations();
                pData.flags = flags;
                pData.lastFlagType = lastFlagType;
                pData.lastViolationDetailsMap = lastViolationDetailsMap;
                pData.automodState = automodState;
                pData.isDirtyForSave = true;
                scheduledFlagPurges.delete(player.nameTag);
                await _saveScheduledFlagPurges(dependencies);
                await saveDirtyPlayerData(player, dependencies);
                playerUtils.debugLog(`[PlayerDataManager] Executed scheduled flag purge for ${player.nameTag} upon join.`, player.nameTag, dependencies);
                logManager.addLog({ actionType: 'flagsPurgedOnJoin', targetName: player.nameTag, targetId: player.id, context: 'PlayerDataManager.ensurePlayerDataInitialized' }, dependencies);
            }

            pData.isOnline = true;
            pData.joinTick = currentTick;
            pData.sessionStartTime = Date.now();
            updateTransientPlayerData(player, pData, dependencies);
            activePlayerData.set(player.id, pData);
            return pData;

        } catch (error) {
            logManager.addLog({
                actionType: 'error.pdm.init.generic',
                context: 'playerDataManager.ensurePlayerDataInitialized',
                targetName: player.nameTag,
                details: {
                    errorCode: 'PDM_INIT_FAILURE',
                    message: error.message,
                    rawErrorStack: error.stack,
                },
            }, dependencies);
            logError(`[PlayerDataManager CRITICAL] Failed to initialize player data for ${player.nameTag}: ${error.stack}`, error);
            if (!player.isValid()) {
                playerUtils.debugLog(`[PlayerDataManager] Player ${player.nameTag} became invalid during data initialization after an error. Aborting.`, player.nameTag, dependencies);
                return null;
            }
            const fallbackData = initializeDefaultPlayerData(player, currentTick);
            activePlayerData.set(player.id, fallbackData);
            return fallbackData;
        } finally {
            initializingPlayerData.delete(player.id);
        }
    };

    const promise = initializationWork();
    initializingPlayerData.set(player.id, promise);
    return promise;
}

/**
 * @param {import('@minecraft/server').Player} player The player object.
 * @param {import('../types.js').Dependencies} dependencies The dependencies object.
 * @returns {Promise<boolean>} True if data was saved, false otherwise.
 */
function trimPlayerData(dataToSave) {
    if (dataToSave.blockBreakTimestamps.length > 50) {
        dataToSave.blockBreakTimestamps = dataToSave.blockBreakTimestamps.slice(-50);
    }
    if (dataToSave.chatMessageTimestamps.length > 50) {
        dataToSave.chatMessageTimestamps = dataToSave.chatMessageTimestamps.slice(-50);
    }
    return dataToSave;
}

/**
 * Creates a serializable version of the player data, excluding transient properties.
 * @param {import('../types.js').PlayerAntiCheatData} pData The full player data.
 * @returns {object} A serializable copy of the player data.
 */
function _getSerializableData(pData) {
    const dataToSave = { ...pData };
    delete dataToSave.transient;
    return dataToSave;
}


function recoverAndSerializePlayerData(dataToSave, playerLike, dependencies) {
    const { logManager } = dependencies;
    const originalSize = JSON.stringify(dataToSave).length;

    logManager.addLog({
        actionType: 'warning.pdm.dpWrite.sizeLimit',
        context: 'playerDataManager.saveDirtyPlayerData.recovery',
        targetName: playerLike.name,
        details: {
            errorCode: 'PDM_DP_SIZE_EXCEEDED_RECOVERY_ATTEMPT',
            message: `Serialized player data for ${playerLike.name} exceeds size limit. Attempting recovery.`,
            meta: { originalSize: originalSize },
        },
    }, dependencies);

    // Stage 1: Trim historical arrays by 50%
    if (dataToSave.blockBreakTimestamps.length > 25) {
        dataToSave.blockBreakTimestamps = dataToSave.blockBreakTimestamps.slice(-25);
    }
    if (dataToSave.chatMessageTimestamps.length > 25) {
        dataToSave.chatMessageTimestamps = dataToSave.chatMessageTimestamps.slice(-25);
    }
    if (dataToSave.lastViolationDetailsMap) {
        // Keep only the most recent 10 violation details
        const recentKeys = Object.keys(dataToSave.lastViolationDetailsMap).slice(-10);
        const trimmedDetails = {};
        for (const key of recentKeys) {
            trimmedDetails[key] = dataToSave.lastViolationDetailsMap[key];
        }
        dataToSave.lastViolationDetailsMap = trimmedDetails;
    }

    let serializedData = JSON.stringify(dataToSave);
    if (serializedData.length <= maxSerializedDataLength) {
        logManager.addLog({
            actionType: 'info.pdm.dpWrite.recoverySuccess',
            context: 'playerDataManager.saveDirtyPlayerData.recovery',
            targetName: playerLike.name,
            details: { message: 'Data trimming stage 1 was successful.', originalSize, finalSize: serializedData.length },
        }, dependencies);
        return serializedData;
    }

    // Stage 2: Clear historical arrays completely
    dataToSave.blockBreakTimestamps = [];
    dataToSave.chatMessageTimestamps = [];
    if (dataToSave.recentBlockPlacements) {
        dataToSave.recentBlockPlacements = [];
    }
    dataToSave.lastViolationDetailsMap = {}; // Clear all violation details as a last resort before reset

    serializedData = JSON.stringify(dataToSave);
    if (serializedData.length <= maxSerializedDataLength) {
        logManager.addLog({
            actionType: 'warning.pdm.dpWrite.recoverySuccessStage2',
            context: 'playerDataManager.saveDirtyPlayerData.recovery',
            targetName: playerLike.name,
            details: { message: 'Data trimming stage 2 (clearing arrays) was successful.', originalSize, finalSize: serializedData.length },
        }, dependencies);
        return serializedData;
    }

    // If it's still too large, return null to indicate failure
    return null;
}

export async function saveDirtyPlayerData(playerLike, dependencies) {
    const { playerUtils, logManager, config } = dependencies;
    const pData = getPlayerData(playerLike.id);

    if (!pData || !pData.isDirtyForSave) return false;

    if (typeof playerLike?.setDynamicProperty !== 'function') {
        logError(`[PlayerDataManager CRITICAL] Attempted to save data for an invalid player-like object (ID: ${playerLike?.id}). Data save aborted.`);
        return false;
    }

    try {
        let dataToSave = _getSerializableData(pData);
        dataToSave = trimPlayerData(dataToSave); // Initial standard trim
        let serializedData = JSON.stringify(dataToSave);

        if (serializedData.length > maxSerializedDataLength) {
            serializedData = recoverAndSerializePlayerData(dataToSave, playerLike, dependencies);

            if (serializedData === null) {
                // Recovery failed, data is still too large.
                // Log a critical error but DO NOT reset the data. We prevent the save instead.
                logManager.addLog({
                    actionType: 'error.pdm.dpWrite.recoveryFail.saveAborted',
                    context: 'playerDataManager.saveDirtyPlayerData.recovery',
                    targetName: playerLike.name,
                    details: {
                        errorCode: 'PDM_DP_RECOVERY_FAILED_SAVE_ABORTED',
                        message: `Data recovery failed for ${playerLike.name}. Size after all trimming is still too large. The current data state will NOT be saved to prevent corruption, but remains active in memory.`,
                        meta: { finalSize: JSON.stringify(dataToSave).length },
                    },
                }, dependencies);
                // We intentionally don't save, so the oversized data remains in memory for this session
                // but doesn't corrupt the stored dynamic property.
                return false;
            }
        }

        await playerLike.setDynamicProperty(config.playerDataDynamicPropertyKey, serializedData);

        pData.isDirtyForSave = false;
        pData.lastSavedTimestamp = Date.now();
        playerUtils.debugLog(`[PlayerDataManager] Saved data for ${playerLike.name}.`, pData.isWatched ? playerLike.name : null, dependencies);
        return true;

    } catch (error) {
        logError(`[PlayerDataManager CRITICAL] Failed to save player data for ${playerLike.name}: ${error.stack}`, error);
        return false;
    }
}

/**
 * @param {import('@minecraft/server').Player} player The player object.
 * @param {import('../types.js').Dependencies} dependencies The dependencies object.
 * @returns {Promise<import('../types.js').PlayerAntiCheatData|null>} The loaded data, or null if invalid.
 * @private
 */
async function _loadPlayerDataFromDynamicProperties(player, dependencies) {
    const { logManager, config } = dependencies;
    try {
        const serializedData = player.getDynamicProperty(config.playerDataDynamicPropertyKey);

        if (typeof serializedData !== 'string') {
            return null;
        }

        const pData = JSON.parse(serializedData);

        if (typeof pData !== 'object' || pData === null || pData.playerId !== player.id) {
            logManager.addLog({
                actionType: 'error.pdm.dpRead.invalidData',
                context: 'playerDataManager._loadPlayerDataFromDynamicProperties',
                targetName: player.nameTag,
                details: {
                    errorCode: 'PDM_DP_READ_INVALID_DATA',
                    message: `Loaded data for ${player.nameTag} is invalid or mismatched.`,
                    meta: { loadedId: pData?.playerId, expectedId: player.id },
                },
            }, dependencies);
            return null;
        }

        pData.transient = getDefaultTransientState(player);
        return pData;

    } catch (error) {
        if (error instanceof SyntaxError) {
            logManager.addLog({
                actionType: 'error.pdm.dpRead.parseFail',
                context: 'playerDataManager._loadPlayerDataFromDynamicProperties',
                targetName: player.nameTag,
                details: {
                    errorCode: 'PDM_DP_READ_PARSE_FAIL',
                    message: error.message,
                    rawErrorStack: error.stack,
                },
            }, dependencies);
        } else {
            logManager.addLog({
                actionType: 'error.pdm.dpRead.generic',
                context: 'playerDataManager._loadPlayerDataFromDynamicProperties',
                targetName: player.nameTag,
                details: {
                    errorCode: 'PDM_DP_READ_GENERIC_FAIL',
                    message: error.message,
                    rawErrorStack: error.stack,
                },
            }, dependencies);
        }
        logError(`[PlayerDataManager] Error loading data for ${player.nameTag}: ${error.stack}`, error);
        return null;
    }
}

/**
 * @param {import('@minecraft/server').Player} player The player object.
 * @param {import('../types.js').PlayerAntiCheatData} pData The player's data.
 * @param {import('../types.js').Dependencies} dependencies The dependencies object.
 */
export function updateTransientPlayerData(player, pData, dependencies) {
    const { currentTick, config, playerUtils } = dependencies;
    const transient = pData.transient;

    const currentLocation = player.location;
    const previousLocation = pData.lastKnownLocation;

    // --- Teleport Detection ---
    // Calculate distance moved since the last tick to detect teleports.
    const distanceMoved = Math.sqrt(
        ((currentLocation.x - previousLocation.x) ** 2) +
        ((currentLocation.y - previousLocation.y) ** 2) +
        ((currentLocation.z - previousLocation.z) ** 2)
    );

    const teleportThreshold = config?.development?.teleportDistanceThreshold ?? 10;
    if (distanceMoved > teleportThreshold) {
        // Player moved a large distance in a single tick, likely a teleport.
        // Reset fall-related data to prevent false NoFall flags.
        if (pData.isWatched) {
            playerUtils?.debugLog(`[PlayerDataManager] Teleport detected for ${player.name}. Dist: ${distanceMoved.toFixed(2)}. Resetting fall distance.`, player.name, dependencies);
        }
        transient.fallDistance = 0;
        transient.ticksSinceLastOnGround = 0;
        pData.lastTeleportTimestamp = Date.now();
    }


    // Reset fall distance at the start of the tick if the player is on the ground.
    // This preserves the value for the duration of the landing tick for other checks,
    // then resets it on the next tick, making the logic self-contained.
    if (transient.ticksSinceLastOnGround === 0 && transient.fallDistance > 0) {
        transient.fallDistance = 0;
    }

    const currentLocation = player.location;
    pData.lastKnownLocation.x = currentLocation.x;
    pData.lastKnownLocation.y = currentLocation.y;
    pData.lastKnownLocation.z = currentLocation.z;

    const currentHeadRotation = player.getHeadRotation();
    transient.headRotation.x = currentHeadRotation.x;
    transient.headRotation.y = currentHeadRotation.y;

    transient.bodyRotation = player.bodyRotation;

    const velocity = player.getVelocity();
    transient.lastVelocity = { ...velocity };

    const onGround = player.isOnGround;
    transient.isClimbing = player.isClimbing;
    transient.isFalling = !onGround && velocity.y < 0;
    transient.isGliding = player.isGliding;
    transient.isJumping = player.isJumping;
    transient.isRiding = player.isRiding;
    transient.isSprinting = player.isSprinting;
    transient.isSwimming = player.isSwimming;
    transient.isSleeping = player.isSleeping;
    transient.isInsideWater = player.isInWater;

    if (!onGround) {
        // Player is in the air
        transient.ticksSinceLastOnGround++;
        if (transient.isFalling) {
            transient.fallDistance = (transient.fallDistance || 0) - velocity.y;
        }
    } else {
        // Player is on the ground now.
        transient.ticksSinceLastOnGround = 0;
        pData.lastOnGroundPosition = { ...player.location };
        pData.lastDimensionId = player.dimension.id; // Store dimension with ground position

        const blockBelow = player.dimension.getBlock(player.location.offset(0, -1, 0));
        if (blockBelow?.typeId === 'minecraft:slime') {
            pData.lastOnSlimeBlockTick = currentTick;
        }
    }


    if (pData.lastSelectedSlot !== player.selectedSlot) {
        pData.lastSelectedSlotChangeTick = currentTick;
        pData.previousSelectedSlot = pData.lastSelectedSlot;
        pData.lastSelectedSlot = player.selectedSlot;
        pData.isDirtyForSave = true;
    }

    pData.lastTickUpdated = currentTick;
}

/**
 * @param {import('../types.js').PlayerAntiCheatData} pData The player's data.
 * @param {import('../types.js').Dependencies} dependencies The dependencies object.
 */
export function clearExpiredItemUseStates(pData, dependencies) {
    const { config } = dependencies;
    const now = Date.now();
    const expiryTime = config.itemUseStateExpiryMs || itemUseStateExpiryMs;

    for (const key in pData.itemUseStates) {
        if (now - pData.itemUseStates[key].timestamp > expiryTime) {
            delete pData.itemUseStates[key];
        }
    }
}

/**
 * @param {import('@minecraft/server').Player} player The player who is leaving.
 * @param {import('../types.js').Dependencies} dependencies The dependencies object.
 */
export async function handlePlayerLeaveBeforeEvent(player, dependencies) {
    const pData = getPlayerData(player.id);
    if (pData) {
        pData.isOnline = false;
        pData.isDirtyForSave = true; // Ensure data is saved on leave
        await saveDirtyPlayerData(player, dependencies); // Pass the full, valid player object
        activePlayerData.delete(player.id);
    }
}

/**
 * @param {string} playerName The name of the player.
 * @param {import('../types.js').Dependencies} dependencies The dependencies object.
 * @returns {Promise<boolean>} True if scheduled successfully.
 */
export async function scheduleFlagPurge(playerName, dependencies) {
    const scheduledFlagPurges = _getScheduledFlagPurgesFromCache();
    scheduledFlagPurges.set(playerName, { playerName, timestamp: Date.now() });
    await _saveScheduledFlagPurges(dependencies);
    dependencies.playerUtils.debugLog(`[PlayerDataManager] Scheduled flag purge for offline player: ${playerName}`, null, dependencies);
    return true;
}

/**
 * @param {import('@minecraft/server').Player} player The player object.
 * @param {import('../types.js').PlayerAntiCheatData} pData The player's data.
 * @param {'ban'|'mute'} stateType The type of restriction.
 * @param {number} durationMs The duration in milliseconds.
 * @param {string} reason The reason for the restriction.
 * @param {string} restrictedBy The name of the admin or "AutoMod".
 * @param {boolean} isAutoMod Whether it was an automod action.
 * @param {string} triggeringCheckType The check that triggered the restriction.
 * @param {import('../types.js').Dependencies} dependencies The dependencies object.
 * @returns {boolean} True if the restriction was added.
 */
export function addPlayerStateRestriction(player, pData, stateType, durationMs, reason, restrictedBy, isAutoMod, triggeringCheckType, dependencies) {
    const { playerUtils, getString } = dependencies;
    const playerName = pData.playerNameTag;

    const expiryTime = (durationMs === Infinity) ? Infinity : Date.now() + durationMs;
    const actualReason = reason || getString(`playerData.${stateType}.defaultReason`);

    const restrictionInfo = {
        reason: actualReason,
        restrictedBy,
        isAutoMod,
        triggeringCheckType,
        expiryTimestamp: expiryTime,
        startTimestamp: Date.now(),
    };

    if (stateType === 'ban') {
        pData.banInfo = restrictionInfo;
    } else {
        pData.muteInfo = restrictionInfo;
    }

    pData.isDirtyForSave = true;

    const logMsg = `[PlayerDataManager] Player ${playerName} ${stateType}d by ${restrictedBy}. Reason: '${actualReason}'. Duration: ${durationMs === Infinity ? 'Permanent' : new Date(expiryTime).toISOString()}`;
    playerUtils.debugLog(logMsg, pData.isWatched ? playerName : null, dependencies);
    return true;
}

/**
 * @param {import('../types.js').PlayerAntiCheatData} pData The player's data.
 * @param {'ban'|'mute'} stateType The type of restriction to remove.
 * @param {import('../types.js').Dependencies} dependencies The dependencies object.
 * @returns {boolean} True if a restriction was removed.
 */
export function removePlayerStateRestriction(pData, stateType, dependencies) {
    const { playerUtils } = dependencies;
    let wasRestricted = false;

    if (stateType === 'ban' && pData.banInfo) {
        pData.banInfo = null;
        wasRestricted = true;
    } else if (stateType === 'mute' && pData.muteInfo) {
        pData.muteInfo = null;
        wasRestricted = true;
    }

    if (wasRestricted) {
        pData.isDirtyForSave = true;
        playerUtils.debugLog(`[PlayerDataManager] Removed ${stateType} for player ${pData.playerNameTag}.`, pData.isWatched ? pData.playerNameTag : null, dependencies);
    }
    return wasRestricted;
}

/**
 * Adds a flag or multiple flags to a player's data and triggers the automod check.
 * @param {import('@minecraft/server').Player} player The player object.
 * @param {string} flagType The type of flag to add (e.g., 'movementFlyHover').
 * @param {import('../types.js').Dependencies} dependencies The dependencies object.
 * @param {import('../types.js').ViolationDetails} [violationDetails] Specific details about the violation.
 * @param {number} [amount=1] The number of flags of this type to add.
 * @returns {Promise<void>}
 */
export async function addFlag(player, flagType, dependencies, violationDetails, amount = 1) {
    if (amount <= 0) return;

    const { playerDataManager, automodManager, playerUtils } = dependencies;
    const pData = playerDataManager.getPlayerData(player.id);
    if (!pData) {
        playerUtils.debugLog(`[PlayerDataManager.addFlag] Could not find pData for ${player.nameTag}. Aborting flag add.`, player.nameTag, dependencies);
        return;
    }

    if (!pData.flags[flagType]) {
        pData.flags[flagType] = { count: 0, lastDetectionTime: 0 };
    }

    pData.flags[flagType].count += amount;
    pData.flags[flagType].lastDetectionTime = Date.now();
    pData.flags.totalFlags = (pData.flags.totalFlags || 0) + amount;
    pData.lastFlagType = flagType;
    if (violationDetails) {
        pData.lastViolationDetailsMap[flagType] = violationDetails;
    }
    pData.isDirtyForSave = true;

    const logMessage = amount > 1
        ? `[PlayerDataManager] Added ${amount} flags of type '${flagType}' to ${player.nameTag}. New total for type: ${pData.flags[flagType].count}. Grand total: ${pData.flags.totalFlags}.`
        : `[PlayerDataManager] Added flag '${flagType}' to ${player.nameTag}. New total for type: ${pData.flags[flagType].count}. Grand total: ${pData.flags.totalFlags}.`;

    playerUtils.debugLog(logMessage, pData.isWatched ? player.nameTag : null, dependencies);

    // Trigger AutoMod check once after adding all flags.
    await automodManager.processAutoModActions(player, pData, flagType, dependencies, violationDetails);
}
