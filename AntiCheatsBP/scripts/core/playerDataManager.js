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
 * Loads the list of scheduled flag purges from a world dynamic property.
 * @param {import('../types.js').Dependencies} dependencies
 * @returns {Promise<Set<string>>}
 */
async function _loadScheduledFlagPurges(dependencies) {
    const { world } = dependencies;
    try {
        const data = world.getDynamicProperty(scheduledFlagPurgesKey);
        if (typeof data === 'string') {
            return new Set(JSON.parse(data));
        }
    } catch (e) {
        console.error(`[PlayerDataManager] Failed to load scheduled flag purges: ${e}`);
    }
    return new Set();
}

/**
 * Saves the list of scheduled flag purges to a world dynamic property.
 * @param {Set<string>} purges
 * @param {import('../types.js').Dependencies} dependencies
 */
async function _saveScheduledFlagPurges(purges, dependencies) {
    const { world } = dependencies;
    try {
        world.setDynamicProperty(scheduledFlagPurgesKey, JSON.stringify(Array.from(purges)));
    } catch (e) {
        console.error(`[PlayerDataManager] Failed to save scheduled flag purges: ${e}`);
    }
}


// --- Data Initialization and Default Structure ---

/**
 * Initializes the default data structure for a new player.
 * @param {import('@minecraft/server').Player} player The player object.
 * @param {number} currentTick The current server tick.
 * @returns {import('../types.js').PlayerAntiCheatData} The default player data object.
 */
export function initializeDefaultPlayerData(player, currentTick) {
    const now = Date.now();

    return {
        // Core Identifiers
        playerId: player.id,
        playerNameTag: player.nameTag,

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
        lastKnownLocation: { ...player.location },
        lastKnownDimensionId: player.dimension.id,
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
            headRotation: { ...player.getHeadRotation() },
            bodyRotation: player.bodyRotation,
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
            pData = initializeDefaultPlayerData(player, currentTick, dependencies);
            playerUtils.debugLog(`[PlayerDataManager] No existing data found for ${player.nameTag}. Initialized new default data.`, player.nameTag, dependencies);
            logManager.addLog({ actionType: 'playerInitialJoin', targetName: player.nameTag, targetId: player.id }, dependencies);
        } else {
            playerUtils.debugLog(`[PlayerDataManager] Successfully loaded data for ${player.nameTag} from dynamic properties.`, player.nameTag, dependencies);
        }

        // Handle scheduled flag purges
        const scheduledFlagPurges = await _loadScheduledFlagPurges(dependencies);
        if (scheduledFlagPurges.has(player.nameTag)) {
            const defaultFlags = initializeDefaultPlayerData(player, currentTick, dependencies).flags;
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
export function saveDirtyPlayerData(player, dependencies) {
    const { playerUtils, logManager, config } = dependencies;
    const pData = getPlayerData(player.id);

    if (!pData || !pData.isDirtyForSave) {
        return Promise.resolve(false);
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

        // Basic size check
        if (serializedData.length > maxSerializedDataLength) { // Leave buffer for Minecraft's limits
            logManager.addLog({
                actionType: 'error.pdm.dpWrite.sizeLimit',
                context: 'playerDataManager.saveDirtyPlayerData',
                targetName: player.nameTag,
                details: {
                    errorCode: 'PDM_DP_WRITE_SIZE_EXCEEDED',
                    message: `Serialized player data for ${player.nameTag} exceeds size limits.`,
                    meta: { size: serializedData.length },
                },
            }, dependencies);
            return Promise.resolve(false);
        }

        player.setDynamicProperty(config.playerDataDynamicPropertyKey, serializedData);

        pData.isDirtyForSave = false;
        pData.lastSavedTimestamp = Date.now();
        playerUtils.debugLog(`[PlayerDataManager] Saved data for ${player.nameTag}.`, pData.isWatched ? player.nameTag : null, dependencies);
        return Promise.resolve(true);

    } catch (error) {
        logManager.addLog({
            actionType: 'error.pdm.dpWrite.generic',
            context: 'playerDataManager.saveDirtyPlayerData',
            targetName: player.nameTag,
            details: {
                errorCode: 'PDM_DP_WRITE_FAILURE',
                message: error.message,
                rawErrorStack: error.stack,
            },
        }, dependencies);
        console.error(`[PlayerDataManager CRITICAL] Failed to save player data for ${player.nameTag}: ${error.stack}`);
        return Promise.resolve(false);
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

        // Re-initialize transient data as it's not saved
        pData.transient = initializeDefaultPlayerData(player, 0, dependencies).transient;
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
 * Removes player data from the cache for players who have left the server.
 * @param {Array<import('@minecraft/server').Player>} allPlayers A list of all current players.
 * @param {import('../types.js').Dependencies} dependencies The dependencies object.
 */
export function cleanupActivePlayerData(allPlayers, dependencies) {
    const onlinePlayerIds = new Set(allPlayers.map(p => p.id));
    for (const [playerId, pData] of activePlayerData.entries()) {
        if (!onlinePlayerIds.has(playerId)) {
            pData.isOnline = false;
            // This is a placeholder for the player object, as it's not available here.
            // The save function needs a player object to set the dynamic property.
            // This will be handled by a new function `handlePlayerLeave`.
            activePlayerData.delete(playerId);
            dependencies.playerUtils.debugLog(`[PlayerDataManager] Cleaned up and removed cached data for logged-out player ${pData.playerNameTag}.`, null, dependencies);
        }
    }
}

/**
 * Handles player leave events to ensure data is saved.
 * @param {import('@minecraft/server').Player} player The player who left.
 * @param {import('../types.js').Dependencies} dependencies The dependencies object.
 */
export async function handlePlayerLeave(player, dependencies) {
    const pData = getPlayerData(player.id);
    if (pData) {
        pData.isOnline = false;
        pData.isDirtyForSave = true; // Ensure data is saved on leave
        await saveDirtyPlayerData(player, dependencies);
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
    scheduledFlagPurges.add(playerName);
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
