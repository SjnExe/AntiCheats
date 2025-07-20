/**
 * @file Manages all aspects of player data.
 * @module AntiCheatsBP/scripts/core/playerDataManager
 */

const maxSerializedDataLength = 30000;
const itemUseStateExpiryMs = 5000;
const minecraftFallingVelocity = -0.0784;

/**
 * A map to hold all active player data, keyed by player ID.
 * This serves as the in-memory cache.
 * @type {Map<string, import('../types.js').PlayerAntiCheatData>}
 */
const activePlayerData = new Map();

const scheduledFlagPurgesKey = 'anticheat:scheduled_flag_purges';

/**
 * @typedef {Object} ScheduledPurge
 * @property {string} playerName
 * @property {number} timestamp
 */

/**
 * Loads the map of scheduled flag purges from a world dynamic property.
 * @param {import('../types.js').Dependencies} dependencies
 * @returns {Promise<Map<string, ScheduledPurge>>}
 */
async function _loadScheduledFlagPurges(dependencies) {
    const { world } = dependencies;
    try {
        const data = world.getDynamicProperty(scheduledFlagPurgesKey);
        if (typeof data === 'string') {
            const parsed = JSON.parse(data);
            // Convert array of objects to Map for easier lookup
            if (Array.isArray(parsed)) {
                return new Map(parsed.map(item => [item.playerName, item]));
            }
            // For backward compatibility with old Set<string> format
            if (parsed.values) {
                const newMap = new Map();
                for (const playerName of parsed.values()) {
                    newMap.set(playerName, { playerName, timestamp: Date.now() });
                }
                return newMap;
            }
        }
    } catch (e) {
        console.error(`[PlayerDataManager] Failed to load scheduled flag purges: ${e}`);
    }
    return new Map();
}


/**
 * Saves the map of scheduled flag purges to a world dynamic property.
 * @param {Map<string, ScheduledPurge>} purges
 * @param {import('../types.js').Dependencies} dependencies
 */
async function _saveScheduledFlagPurges(purges, dependencies) {
    const { world } = dependencies;
    try {
        // Convert Map values to an array for JSON serialization
        const arrayToSave = Array.from(purges.values());
        world.setDynamicProperty(scheduledFlagPurgesKey, JSON.stringify(arrayToSave));
    } catch (e) {
        console.error(`[PlayerDataManager] Failed to save scheduled flag purges: ${e}`);
    }
}


/**
 * Periodically cleans up stale entries from the scheduled flag purges.
 * @param {import('../types.js').Dependencies} dependencies
 */
export async function cleanupStaleScheduledFlagPurges(dependencies) {
    const { config, playerUtils, logManager } = dependencies;
    const maxAgeDays = config.scheduledFlagPurgeMaxAgeDays ?? 30;
    if (maxAgeDays <= 0) return; // Feature disabled

    const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
    const now = Date.now();
    let purgesModified = false;

    const scheduledFlagPurges = await _loadScheduledFlagPurges(dependencies);
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
        await _saveScheduledFlagPurges(scheduledFlagPurges, dependencies);

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


// --- Data Initialization and Default Structure ---

/**
 * Initializes the default data structure for a new player.
 * @param {object} playerLike An object with player-like properties (id, name, location, dimension, etc.).
 * @param {number} currentTick The current server tick.
 * @returns {import('../types.js').PlayerAntiCheatData} The default player data object.
 */
export function initializeDefaultPlayerData(playerLike, currentTick) {
    const now = Date.now();

    return {
        // Core Identifiers
        playerId: playerLike.id,
        playerNameTag: playerLike.name,

        // Session and State
        isOnline: true,
        isDirtyForSave: false,
        joinTick: currentTick,
        lastTickUpdated: currentTick,
        sessionStartTime: now,
        lastSavedTimestamp: 0,
        isWatched: false,

        // Flags and Violations
        flags: { totalFlags: 0 },
        lastFlagType: '',
        lastViolationDetailsMap: {},
        automodState: {},

        // Restrictions and Status
        permissionLevel: null, // Will be set by rankManager
        banInfo: null,
        muteInfo: null,
        isFrozen: false,
        isVanished: false,
        godModeActive: false,

        // Movement and Teleportation
        lastKnownLocation: playerLike.location ? { ...playerLike.location } : { x: 0, y: 0, z: 0 },
        lastKnownDimensionId: playerLike.dimension ? playerLike.dimension.id : 'minecraft:overworld',
        lastSignificantMovement: now,
        lastTeleportTimestamp: 0,
        isTeleporting: false,

        // Combat and Interaction
        lastAttackTimestamp: 0,
        lastDamageTimestamp: 0,
        lastHealTimestamp: 0,
        lastEnderPearlTimestamp: 0,
        lastFoodConsumptionTimestamp: 0,
        itemUseStates: {},
        consecutiveHits: 0,
        lastAttackedEntityId: null,

        // Block Interactions
        blockBreakTimestamps: [], // Capped at a reasonable limit
        lastBlockPlacedTimestamp: 0,

        // Chat and Communication
        lastChatMessageTimestamp: 0,
        chatMessageTimestamps: [], // Capped at a reasonable limit

        // Miscellaneous and Transient Data (Not Saved)
        transient: {
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
        },
    };
}


// --- Core Data Access and Management ---

/**
 * Retrieves a player's data from the cache.
 * @param {string} playerId The player's ID.
 * @returns {import('../types.js').PlayerAntiCheatData|undefined} The player's data object, or undefined if not found.
 */
export function getPlayerData(playerId) {
    return activePlayerData.get(playerId);
}

/**
 * Retrieves all active player data from the cache.
 * @returns {Array<import('../types.js').PlayerAntiCheatData>} An array of all active player data.
 */
export function getActivePlayers() {
    return Array.from(activePlayerData.values());
}

/**
 * Ensures a player's data is loaded into the cache.
 * @param {import('@minecraft/server').Player} player The player object.
 * @param {number} currentTick The current server tick.
 * @param {import('../types.js').Dependencies} dependencies The dependencies object.
 * @returns {Promise<import('../types.js').PlayerAntiCheatData>} A promise resolving with the player's data.
 */
export async function ensurePlayerDataInitialized(player, currentTick, dependencies) {
    const { playerUtils, logManager } = dependencies;

    if (activePlayerData.has(player.id)) {
        return activePlayerData.get(player.id);
    }

    try {
        let pData = await _loadPlayerDataFromDynamicProperties(player, dependencies);

        if (!pData) {
            pData = initializeDefaultPlayerData(player, currentTick);
            playerUtils.debugLog(`[PlayerDataManager] No existing data found for ${player.nameTag}. Initialized new default data.`, player.nameTag, dependencies);
            logManager.addLog({ actionType: 'playerInitialJoin', targetName: player.nameTag, targetId: player.id }, dependencies);
        } else {
            playerUtils.debugLog(`[PlayerDataManager] Successfully loaded data for ${player.nameTag} from dynamic properties.`, player.nameTag, dependencies);
        }

        // Handle scheduled flag purges
        const scheduledFlagPurges = await _loadScheduledFlagPurges(dependencies);
        if (scheduledFlagPurges.has(player.nameTag)) {
            const defaultFlags = initializeDefaultPlayerData(player, currentTick).flags;
            pData.flags = defaultFlags;
            pData.lastFlagType = '';
            pData.lastViolationDetailsMap = {};
            pData.automodState = {};
            pData.isDirtyForSave = true;
            scheduledFlagPurges.delete(player.nameTag);
            await _saveScheduledFlagPurges(scheduledFlagPurges, dependencies);
            playerUtils.debugLog(`[PlayerDataManager] Executed scheduled flag purge for ${player.nameTag} upon join.`, player.nameTag, dependencies);
            logManager.addLog({ actionType: 'flagsPurgedOnJoin', targetName: player.nameTag, targetId: player.id, context: 'PlayerDataManager.ensurePlayerDataInitialized' }, dependencies);
        }

        pData.isOnline = true;
        pData.joinTick = currentTick;
        pData.sessionStartTime = Date.now();

        // Immediately populate transient data so it's available for the first tick
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
        console.error(`[PlayerDataManager CRITICAL] Failed to initialize player data for ${player.nameTag}: ${error.stack}`);
        // Fallback to default data to prevent system failure for this player
        if (!player.isValid()) {
            playerUtils.debugLog(`[PlayerDataManager] Player ${player.nameTag} became invalid during data initialization after an error. Aborting.`, player.nameTag, dependencies);
            return null;
        }
        const fallbackData = initializeDefaultPlayerData(player, currentTick, dependencies);
        activePlayerData.set(player.id, fallbackData);
        return fallbackData;
    }
}


// --- Data Persistence (Save/Load) ---

/**
 * Saves a player's data to a dynamic property if dirty.
 * @param {import('@minecraft/server').Player} player The player object.
 * @param {import('../types.js').Dependencies} dependencies The dependencies object.
 * @returns {Promise<boolean>} True if data was saved, false otherwise.
 */
export async function saveDirtyPlayerData(playerLike, dependencies) {
    const { playerUtils, logManager, config } = dependencies;
    const pData = getPlayerData(playerLike.id);

    if (!pData || !pData.isDirtyForSave) {
        return false;
    }

    // Ensure we have a valid player object with the setDynamicProperty method.
    // This is crucial for saving data correctly, especially on player leave.
    if (typeof playerLike.setDynamicProperty !== 'function') {
        const errorMessage = `[PlayerDataManager CRITICAL] Attempted to save data for ${playerLike.name ?? playerLike.id} without a valid player object. Data save aborted.`;
        console.error(errorMessage);
        logManager.addLog({
            actionType: 'error.pdm.dpWrite.invalidPlayerObject',
            context: 'playerDataManager.saveDirtyPlayerData',
            targetName: playerLike.name ?? playerLike.id,
            details: {
                errorCode: 'PDM_INVALID_PLAYERLIKE_OBJECT',
                message: 'The provided player-like object does not have a setDynamicProperty method.',
            },
        }, dependencies);
        return false;
    }

    try {
        // Create a savable copy, excluding transient data
        const dataToSave = { ...pData };
        delete dataToSave.transient;

        // Cap arrays to prevent unbounded growth
        if (dataToSave.blockBreakTimestamps.length > 50) {
            dataToSave.blockBreakTimestamps = dataToSave.blockBreakTimestamps.slice(-50);
        }
        if (dataToSave.chatMessageTimestamps.length > 50) {
            dataToSave.chatMessageTimestamps = dataToSave.chatMessageTimestamps.slice(-50);
        }

        const serializedData = JSON.stringify(dataToSave);

        // Size check and recovery
        if (serializedData.length > maxSerializedDataLength) {
            logManager.addLog({
                actionType: 'warning.pdm.dpWrite.sizeLimit',
                context: 'playerDataManager.saveDirtyPlayerData.recovery',
                targetName: playerLike.name,
                details: {
                    errorCode: 'PDM_DP_SIZE_EXCEEDED_RECOVERY_ATTEMPT',
                    message: `Serialized player data for ${playerLike.name} exceeds size limit (${serializedData.length} > ${maxSerializedDataLength}). Attempting recovery.`,
                    meta: { originalSize: serializedData.length },
                },
            }, dependencies);

            // Recovery Step 1: Aggressively trim non-critical arrays
            dataToSave.blockBreakTimestamps = [];
            dataToSave.chatMessageTimestamps = [];
            if (dataToSave.recentBlockPlacements) {
                dataToSave.recentBlockPlacements = [];
            }
            if (dataToSave.flags) {
                // Keep totalFlags but clear detailed history if it's large
                const preservedFlags = { totalFlags: dataToSave.flags.totalFlags || 0 };
                dataToSave.flags = preservedFlags;
            }


            serializedData = JSON.stringify(dataToSave);

            // Recovery Step 2: Check size again
            if (serializedData.length > maxSerializedDataLength) {
                logManager.addLog({
                    actionType: 'error.pdm.dpWrite.recoveryFail',
                    context: 'playerDataManager.saveDirtyPlayerData.recovery',
                    targetName: playerLike.name,
                    details: {
                        errorCode: 'PDM_DP_RECOVERY_FAILED_DATA_RESET',
                        message: `Data recovery failed for ${playerLike.name}. Size after trimming is still too large (${serializedData.length}). Resetting player data to prevent corruption.`,
                        meta: { trimmedSize: serializedData.length },
                    },
                }, dependencies);

                // Recovery Step 3: Critical failure, reset data
                const freshData = initializeDefaultPlayerData(playerLike, dependencies.currentTick);
                const freshSerializedData = JSON.stringify(freshData);
                await playerLike.setDynamicProperty(config.playerDataDynamicPropertyKey, freshSerializedData);
                activePlayerData.set(playerLike.id, freshData); // Update cache with fresh data
                return true; // Saved fresh data
            }
        }

        await playerLike.setDynamicProperty(config.playerDataDynamicPropertyKey, serializedData);

        pData.isDirtyForSave = false;
        pData.lastSavedTimestamp = Date.now();
        playerUtils.debugLog(`[PlayerDataManager] Saved data for ${playerLike.name}.`, pData.isWatched ? playerLike.name : null, dependencies);
        return true;

    } catch (error) {
        logManager.addLog({
            actionType: 'error.pdm.dpWrite.generic',
            context: 'playerDataManager.saveDirtyPlayerData',
            targetName: playerLike.name,
            details: {
                errorCode: 'PDM_DP_WRITE_FAILURE',
                message: error.message,
                rawErrorStack: error.stack,
            },
        }, dependencies);
        console.error(`[PlayerDataManager CRITICAL] Failed to save player data for ${playerLike.name}: ${error.stack}`);
        return false;
    }
}

/**
 * (Internal) Loads player data from a dynamic property.
 * @param {import('@minecraft/server').Player} player The player object.
 * @param {import('../types.js').Dependencies} dependencies The dependencies object.
 * @returns {Promise<import('../types.js').PlayerAntiCheatData|null>} The loaded data, or null if invalid.
 * @private
 */
function _loadPlayerDataFromDynamicProperties(player, dependencies) {
    const { logManager, config } = dependencies;
    try {
        const serializedData = player.getDynamicProperty(config.playerDataDynamicPropertyKey);

        if (typeof serializedData !== 'string') {
            return Promise.resolve(null);
        }

        const pData = JSON.parse(serializedData);

        // Basic validation
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
            return Promise.resolve(null);
        }

        // Transient data is not saved; it will be populated by updateTransientPlayerData.
        // We just need to ensure the object structure is present.
        pData.transient = {};
        return Promise.resolve(pData);

    } catch (error) {
        if (error instanceof SyntaxError) { // JSON.parse failed
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
        console.error(`[PlayerDataManager] Error loading data for ${player.nameTag}: ${error.stack}`);
        return Promise.resolve(null);
    }
}


// --- Tick-Based Updates and Cleanup ---

/**
 * Updates transient player data that changes every tick.
 * @param {import('@minecraft/server').Player} player The player object.
 * @param {import('../types.js').PlayerAntiCheatData} pData The player's data.
 * @param {import('../types.js').Dependencies} dependencies The dependencies object.
 */
export function updateTransientPlayerData(player, pData, dependencies) {
    const { currentTick } = dependencies;
    const transient = pData.transient;

    // Update location and rotation
    pData.lastKnownLocation = { ...player.location };
    transient.headRotation = { ...player.getHeadRotation() };
    transient.bodyRotation = player.bodyRotation;

    // Update velocity
    const velocity = player.getVelocity();
    transient.lastVelocity = { ...velocity };

    // Update states from components
    const onGround = player.isOnGround;
    transient.isClimbing = player.isClimbing;
    transient.isFalling = !onGround && velocity.y < minecraftFallingVelocity; // Minecraft constant for falling
    transient.isGliding = player.isGliding;
    transient.isJumping = player.isJumping;
    transient.isRiding = player.isRiding;
    transient.isSprinting = player.isSprinting;
    transient.isSwimming = player.isSwimming;
    transient.isSleeping = player.isSleeping;
    transient.isInsideWater = player.isInWater;

    // Update fall distance and air ticks
    if (!onGround) {
        transient.ticksInAir++;
        transient.ticksSinceLastOnGround++;
        if (transient.isFalling) {
            transient.fallDistance -= velocity.y;
        }
    } else {
        transient.ticksInAir = 0;
        transient.ticksSinceLastOnGround = 0;
        transient.fallDistance = 0;

        const blockBelow = player.dimension.getBlock(player.location.offset(0, -1, 0));
        if (blockBelow && blockBelow.typeId === 'minecraft:slime') {
            pData.lastOnSlimeBlockTick = currentTick;
        }
    }

    // Update effects
    pData.speedAmplifier = -1;
    pData.jumpBoostAmplifier = -1;
    pData.hasSlowFalling = false;
    pData.hasLevitation = false;
    pData.blindnessTicks = 0;

    const effects = player.getEffects();
    for (const effect of effects) {
        switch (effect.typeId) {
        case 'speed':
            pData.speedAmplifier = effect.amplifier;
            break;
        case 'jump_boost':
            pData.jumpBoostAmplifier = effect.amplifier;
            break;
        case 'slow_falling':
            pData.hasSlowFalling = true;
            break;
        case 'levitation':
            pData.hasLevitation = true;
            break;
        case 'blindness':
            pData.blindnessTicks = effect.duration;
            break;
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
 * Clears expired item use states from a player's data.
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
 * Handles player leave events to ensure data is saved before the player object becomes invalid.
 * This should be triggered by a 'before' event.
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


// --- State Management and Restrictions ---

/**
 * Schedules a flag purge for an offline player.
 * @param {string} playerName The name of the player.
 * @param {import('../types.js').Dependencies} dependencies The dependencies object.
 * @returns {Promise<boolean>} True if scheduled successfully.
 */
export async function scheduleFlagPurge(playerName, dependencies) {
    const scheduledFlagPurges = await _loadScheduledFlagPurges(dependencies);
    scheduledFlagPurges.set(playerName, { playerName, timestamp: Date.now() });
    await _saveScheduledFlagPurges(scheduledFlagPurges, dependencies);
    dependencies.playerUtils.debugLog(`[PlayerDataManager] Scheduled flag purge for offline player: ${playerName}`, null, dependencies);
    return true;
}

/**
 * Adds a state restriction (ban or mute) to a player's data.
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
 * Removes a state restriction (ban or mute) from a player's data.
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
