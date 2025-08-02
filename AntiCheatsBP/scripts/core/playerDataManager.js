import { logError } from '../utils/playerUtils.js';
import { offlineBanList } from './offlineBanList.js';

const maxSerializedDataLength = 30000;
const itemUseStateExpiryMs = 5000;
const minecraftFallingVelocity = -0.0784;

/**
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
 * @param {import('../types.js').Dependencies} dependencies
 * @returns {Promise<Map<string, import('../types.js').ScheduledPurge>>}
 */
async function _loadScheduledFlagPurges(dependencies) {
    const { world, playerUtils } = dependencies;
    try {
        const data = world.getDynamicProperty(scheduledFlagPurgesKey);
        if (typeof data === 'string') {
            const parsed = JSON.parse(data);
            // Standard format: An array of {playerName, timestamp} objects
            if (Array.isArray(parsed)) {
                return new Map(parsed.map(item => [item.playerName, item]));
            }
            // Legacy format check: An object like { values: ["Player1", "Player2"] }
            if (typeof parsed === 'object' && parsed !== null && Array.isArray(parsed.values)) {
                playerUtils.debugLog('[PlayerDataManager] Migrating legacy scheduled flag purges format.', 'System', dependencies);
                const newMap = new Map();
                for (const playerName of parsed.values) {
                    if (typeof playerName === 'string') {
                        newMap.set(playerName, { playerName, timestamp: Date.now() });
                    }
                }
                // Immediately save in the new format to complete migration
                try {
                    await _saveScheduledFlagPurges(newMap, dependencies);
                } catch (saveError) {
                    logError(`[PlayerDataManager] Failed to save migrated scheduled flag purges, but proceeding with in-memory data. Error: ${saveError.message}`, saveError);
                    playerUtils.debugLog(`[PlayerDataManager] Error saving migrated purges: ${saveError.message}`, 'SystemError', dependencies);
                }
                return newMap;
            }
        }
    } catch (e) {
        logError(`[PlayerDataManager] Failed to load scheduled flag purges: ${e.message}`, e);
        playerUtils.debugLog(`[PlayerDataManager] Error loading scheduled flag purges: ${e.message}`, 'SystemError', dependencies);
    }
    return new Map();
}


/**
 * @param {Map<string, import('../types.js').ScheduledPurge>} purges
 * @param {import('../types.js').Dependencies} dependencies
 */
async function _saveScheduledFlagPurges(purges, dependencies) {
    const { world } = dependencies;
    try {
        const arrayToSave = Array.from(purges.values());
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

    return {
        playerId: playerLike.id,
        playerNameTag: playerLike.name,
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
export function getActivePlayers() {
    return Array.from(activePlayerData.values());
}

/**
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

            // Immediately save the player's data to ensure the flag purge is persisted atomically.
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

function recoverAndSerializePlayerData(dataToSave, playerLike, dependencies) {
    const { logManager } = dependencies;

    logManager.addLog({
        actionType: 'warning.pdm.dpWrite.sizeLimit',
        context: 'playerDataManager.saveDirtyPlayerData.recovery',
        targetName: playerLike.name,
        details: {
            errorCode: 'PDM_DP_SIZE_EXCEEDED_RECOVERY_ATTEMPT',
            message: `Serialized player data for ${playerLike.name} exceeds size limit. Attempting recovery.`,
            meta: { originalSize: JSON.stringify(dataToSave).length },
        },
    }, dependencies);

    dataToSave.blockBreakTimestamps = [];
    dataToSave.chatMessageTimestamps = [];
    if (dataToSave.recentBlockPlacements) {
        dataToSave.recentBlockPlacements = [];
    }
    if (dataToSave.flags) {
        for (const key in dataToSave.flags) {
            if (Array.isArray(dataToSave.flags[key])) {
                dataToSave.flags[key] = dataToSave.flags[key].slice(-10);
            }
        }
    }

    return JSON.stringify(dataToSave);
}

export async function saveDirtyPlayerData(playerLike, dependencies) {
    const { playerUtils, logManager, config } = dependencies;
    const pData = getPlayerData(playerLike.id);

    if (!pData || !pData.isDirtyForSave) return false;

    if (typeof playerLike.setDynamicProperty !== 'function') {
        logError(`[PlayerDataManager CRITICAL] Attempted to save data for ${playerLike.name ?? playerLike.id} without a valid player object. Data save aborted.`);
        return false;
    }

    try {
        let dataToSave = { ...pData };
        delete dataToSave.transient;

        dataToSave = trimPlayerData(dataToSave);
        let serializedData = JSON.stringify(dataToSave);

        if (serializedData.length > maxSerializedDataLength) {
            serializedData = recoverAndSerializePlayerData(dataToSave, playerLike, dependencies);

            if (serializedData.length > maxSerializedDataLength) {
                logManager.addLog({
                    actionType: 'error.pdm.dpWrite.recoveryFail',
                    context: 'playerDataManager.saveDirtyPlayerData.recovery',
                    targetName: playerLike.name,
                    details: {
                        errorCode: 'PDM_DP_RECOVERY_FAILED_DATA_RESET',
                        message: `Data recovery failed for ${playerLike.name}. Size after trimming is still too large. Resetting player data to prevent corruption.`,
                        meta: { trimmedSize: serializedData.length },
                    },
                }, dependencies);

                const freshData = initializeDefaultPlayerData(playerLike, dependencies.currentTick);
                await playerLike.setDynamicProperty(config.playerDataDynamicPropertyKey, JSON.stringify(freshData));
                activePlayerData.set(playerLike.id, freshData);
                return true;
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

        pData.transient = {};
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
    const { currentTick } = dependencies;
    const transient = pData.transient;

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
    transient.isFalling = !onGround && velocity.y < minecraftFallingVelocity;
    transient.isGliding = player.isGliding;
    transient.isJumping = player.isJumping;
    transient.isRiding = player.isRiding;
    transient.isSprinting = player.isSprinting;
    transient.isSwimming = player.isSwimming;
    transient.isSleeping = player.isSleeping;
    transient.isInsideWater = player.isInWater;

    if (!onGround) {
        // If this is the first tick in the air, reset fallDistance for the new fall.
        if (transient.ticksSinceLastOnGround === 0) {
            pData.fallDistance = 0;
        }
        pData.consecutiveOffGroundTicks = (pData.consecutiveOffGroundTicks || 0) + 1;
        transient.ticksSinceLastOnGround++;
        if (transient.isFalling) {
            pData.fallDistance = (pData.fallDistance || 0) - velocity.y;
        }
    } else {
        pData.consecutiveOffGroundTicks = 0;
        transient.ticksSinceLastOnGround = 0;
        pData.fallDistance = 0; // RE-ADD: Reset fall distance on landing.
        pData.lastOnGroundPosition = { ...player.location };
        pData.lastDimensionId = player.dimension.id; // Store dimension with ground position

        const blockBelow = player.dimension.getBlock(player.location.offset(0, -1, 0));
        if (blockBelow?.typeId === 'minecraft:slime') {
            pData.lastOnSlimeBlockTick = currentTick;
        }
    }

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
    const scheduledFlagPurges = await _loadScheduledFlagPurges(dependencies);
    scheduledFlagPurges.set(playerName, { playerName, timestamp: Date.now() });
    await _saveScheduledFlagPurges(scheduledFlagPurges, dependencies);
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
 * @param {string} reason A descriptive reason for the flag.
 * @param {import('../types.js').Dependencies} dependencies The dependencies object.
 * @param {import('../types.js').ViolationDetails} [violationDetails] Specific details about the violation.
 * @param {number} [amount=1] The number of flags of this type to add.
 * @returns {Promise<void>}
 */
export async function addFlag(player, flagType, reason, dependencies, violationDetails, amount = 1) {
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
    pData.isDirtyForSave = true;

    const logMessage = amount > 1
        ? `[PlayerDataManager] Added ${amount} flags of type '${flagType}' to ${player.nameTag}. New total for type: ${pData.flags[flagType].count}. Grand total: ${pData.flags.totalFlags}.`
        : `[PlayerDataManager] Added flag '${flagType}' to ${player.nameTag}. New total for type: ${pData.flags[flagType].count}. Grand total: ${pData.flags.totalFlags}.`;

    playerUtils.debugLog(logMessage, pData.isWatched ? player.nameTag : null, dependencies);

    // Trigger AutoMod check once after adding all flags.
    await automodManager.processAutoModActions(player, pData, flagType, dependencies, violationDetails);
}
