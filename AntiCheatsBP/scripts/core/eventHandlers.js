// Profiling data structure from main.js - needs to be accessible or passed if used here directly.
// For now, assume it's globally accessible for simplicity in this example, or passed via dependencies.
// A better approach would be to pass `profilingData` through `dependencies`.
// Let's assume `dependencies.profilingData` and `dependencies.MAX_PROFILING_HISTORY` will be available.

/**
 * Wraps an event handler function with profiling logic.
 * @module AntiCheatsBP/scripts/core/eventHandlers
 * @param {string} handlerName - The name of the event handler for logging.
 * @param {Function} handlerFunction - The actual event handler function.
 * @returns {Function} - The wrapped event handler function.
 */
function profileEventHandler(handlerName, handlerFunction) {
    return async function(...args) {
        const dependencies = args[args.length - 1]; // Dependencies object is usually the last argument
        if (dependencies && dependencies.config && dependencies.config.enablePerformanceProfiling && dependencies.profilingData) {
            const startTime = Date.now();
            try {
                await handlerFunction.apply(null, args); // Explicitly set 'this' to null
            } finally {
                const endTime = Date.now();
                const duration = endTime - startTime;
                const stats = dependencies.profilingData.eventHandlers[handlerName] = dependencies.profilingData.eventHandlers[handlerName] || { totalTime: 0, count: 0, maxTime: 0, minTime: Infinity, history: [] };
                stats.totalTime += duration;
                stats.count++;
                stats.maxTime = Math.max(stats.maxTime, duration);
                stats.minTime = Math.min(stats.minTime, duration);
                stats.history.push(duration);
                if (stats.history.length > dependencies.MAX_PROFILING_HISTORY) {
                    stats.history.shift();
                }
            }
        } else {
            await handlerFunction.apply(null, args); // Explicitly set 'this' to null
        }
    };
}

/**
 * @file Centralized handlers for various Minecraft Server API events.
 * Ensures consistent error handling and dependency usage.
 */
import * as mc from '@minecraft/server';
import { getExpectedBreakTicks, isNetherLocked, isEndLocked, formatSessionDuration } from '../utils/index.js';

// Constants for magic numbers used in this file
const DEFAULT_COMBAT_LOG_THRESHOLD_SECONDS = 15;
const WELCOME_MESSAGE_DELAY_TICKS = 20;
const DEATH_COORDS_MESSAGE_DELAY_TICKS = 5;
const DEFAULT_FOOD_USE_DURATION_SECONDS = 1.6;
const TICKS_PER_SECOND = 20;
const DEFAULT_TOWER_HISTORY_LENGTH = 20;
const BLOCK_OFFSET_ONE_BELOW = -1;
const BLOCK_OFFSET_TWO_BELOW = -2;
const GOLEM_CONSTRUCTION_CHECK_TICK_WINDOW = 10; // For Math.abs(...) < 10
const RENDER_DISTANCE_CHECK_DELAY_TICKS = 100;
const MIN_TIMEOUT_DELAY_TICKS = 1;


/**
 * Handles player leave events.
 * @param {import('@minecraft/server').PlayerLeaveBeforeEvent} eventData - The player leave event data.
 * @param {import('../types.js').Dependencies} dependencies - Standard dependencies object.
 */
async function _handlePlayerLeave(eventData, dependencies) { // Renamed to indicate it's the original, unwrapped function
    const { playerDataManager, playerUtils, config, logManager, getString, actionManager } = dependencies;
    const { player } = eventData;
    const playerName = player?.nameTag ?? 'UnknownPlayer'; // Handle potentially undefined player or nameTag

    if (!player?.isValid()) {
        console.warn('[EventHandler.handlePlayerLeave] Player undefined or invalid in eventData.');
        return;
    }
    playerUtils?.debugLog(`[EventHandler.handlePlayerLeave] Player ${playerName} is leaving. Processing data...`, playerName, dependencies);

    const pData = playerDataManager?.getPlayerData(player.id); // Fetch pData once

    if (pData && config?.enableCombatLogDetection && pData.lastCombatInteractionTime > 0) {
        const currentTime = Date.now();
        const timeSinceLastCombatMs = currentTime - pData.lastCombatInteractionTime;
        const combatLogThresholdMs = (config.combatLogThresholdSeconds ?? DEFAULT_COMBAT_LOG_THRESHOLD_SECONDS) * 1000;

        if (timeSinceLastCombatMs < combatLogThresholdMs) {
            const timeSinceLastCombatSeconds = (timeSinceLastCombatMs / 1000).toFixed(1);
            const incrementAmount = config.combatLogFlagIncrement ?? 1;

            playerUtils?.debugLog(
                `[EvtHdlr.Leave] CombatLog: ${playerName} left ${timeSinceLastCombatSeconds}s after combat. ` +
                `Thresh: ${config.combatLogThresholdSeconds}s. Flag +${incrementAmount}.`,
                playerName, dependencies,
            );

            const violationDetails = { timeSinceLastCombat: timeSinceLastCombatSeconds, incrementAmount };
            // Assuming 'combatLog' is a defined checkType in actionProfiles
            await actionManager?.executeCheckAction(player, 'combatLog', violationDetails, dependencies);
        }
    }

    // Re-fetch pData as actionManager.executeCheckAction involves awaits and player might have left
    // or pData cache could have been affected.
    const pDataAfterAction = playerDataManager?.getPlayerData(player.id);

    if (pDataAfterAction) { // Use the potentially updated pData
        pDataAfterAction.lastLogoutTime = Date.now();
        pDataAfterAction.isOnline = false; // Mark as offline
        pDataAfterAction.isDirtyForSave = true; // Ensure data is marked for saving

        const lastLocation = pDataAfterAction.lastPosition ?? player?.location;
        const lastDimensionId = (pDataAfterAction.lastDimensionId ?? player?.dimension?.id)?.replace('minecraft:', '');
        const lastGameModeString = mc.GameMode[pDataAfterAction.lastGameMode ?? player?.gameMode] ?? getString?.('common.value.unknown') ?? 'Unknown';
        let sessionDurationString = getString?.('common.value.notApplicable') ?? 'N/A';
        if (pDataAfterAction.joinTime && pDataAfterAction.joinTime > 0) {
            sessionDurationString = formatSessionDuration(Date.now() - pDataAfterAction.joinTime);
        }
        logManager?.addLog({
            actionType: 'playerLeave',
            targetName: playerName,
            targetId: player.id,
            details: `Last Loc: ${Math.floor(lastLocation?.x ?? 0)},${Math.floor(lastLocation?.y ?? 0)},` +
                `${Math.floor(lastLocation?.z ?? 0)} in ${lastDimensionId}. GM: ${lastGameModeString}. Session: ${sessionDurationString}.`,
            location: lastLocation ? { x: Math.floor(lastLocation.x), y: Math.floor(lastLocation.y), z: Math.floor(lastLocation.z), dimensionId: lastDimensionId } : undefined,
            gameMode: lastGameModeString,
            sessionDuration: sessionDurationString,
        }, dependencies);
    }

    // Attempt to save player data regardless of pData presence if playerDataManager is available
    if (playerDataManager?.prepareAndSavePlayerData) {
        try {
            await playerDataManager.prepareAndSavePlayerData(player, dependencies); // This should handle pData internally
            playerUtils?.debugLog(`[EventHandler.handlePlayerLeave] Data save processed for ${playerName} on leave.`, playerName, dependencies);
        } catch (error) {
            console.error(`[EventHandler.handlePlayerLeave CRITICAL] Error in prepareAndSavePlayerData for ${playerName} on leave: ${error.stack || error}`);
            logManager?.addLog({
                actionType: 'errorEventHandlersPdataSaveOnLeave', // More specific error type
                context: 'eventHandlers.handlePlayerLeave.prepareAndSavePlayerData',
                targetName: playerName,
                targetId: player.id,
                details: { errorMessage: error.message },
                errorStack: error.stack, // Store stack for debugging
            }, dependencies);
        }
    }

    if (config?.enableDetailedJoinLeaveLogging) {
        console.warn(`[LeaveLog] Player: ${playerName} (ID: ${player?.id}) left the game.`);
    }
    playerUtils?.debugLog(`[EventHandler.handlePlayerLeave] Finished processing for ${playerName}.`, playerName, dependencies);
}
/**
 *
 */
export const handlePlayerLeave = profileEventHandler('handlePlayerLeave', _handlePlayerLeave);

/**
 * Handles player spawn events (initial join and respawn).
 * @param {import('@minecraft/server').PlayerSpawnAfterEvent} eventData - The player spawn event data.
 * @param {import('../types.js').Dependencies} dependencies - Standard dependencies object.
 */
async function _handlePlayerSpawn(eventData, dependencies) {
    const { player, initialSpawn } = eventData;
    const { playerDataManager, playerUtils, config, logManager, checks, getString, rankManager, mc: minecraftSystem } = dependencies;
    const playerName = player?.nameTag ?? 'UnknownPlayer';

    if (!player?.isValid()) {
        console.warn('[EvtHdlr.Spawn] Invalid player object in eventData.');
        return;
    }

    playerUtils?.debugLog(
        `[EvtHdlr.Spawn] Processing for ${playerName} (Initial: ${initialSpawn}). Tick: ${minecraftSystem.system.currentTick}`,
        playerName, dependencies,
    );

    try {
        // currentTick is now sourced from dependencies within ensurePlayerDataInitialized
        const pData = await playerDataManager.ensurePlayerDataInitialized(player, dependencies);
        if (!pData) {
            console.error(`[EvtHdlr.Spawn CRITICAL] pData null for ${playerName}. Aborting spawn logic.`);
            player.sendMessage(getString('error.playerDataLoadFailedKick')); // Kick if data can't be loaded/created
            player.kick(getString('error.playerDataLoadFailedKickReason'));
            return;
        }

        pData.isOnline = true;
        pData.lastGameMode = player.gameMode;
        pData.lastDimensionId = player.dimension.id;
        pData.isUsingConsumable = false;
        pData.isChargingBow = false;
        pData.isUsingShield = false;
        pData.isDirtyForSave = true; // Mark for save after updates

        const banInfo = playerDataManager.getBanInfo(player, dependencies);
        if (banInfo) {
            playerUtils.debugLog(
                `[EvtHdlr.Spawn] Player ${playerName} is banned. Kicking. Reason: ${banInfo.reason}, ` +
                `Expires: ${new Date(banInfo.unbanTime).toISOString()}`,
                playerName, dependencies,
            );
            const durationStringKick = getString(
                banInfo.unbanTime === Infinity ? 'ban.duration.permanent' : 'ban.duration.expires',
                { expiryDate: new Date(banInfo.unbanTime).toLocaleString() },
            );
            let kickReason = getString('ban.kickMessage', {
                reason: banInfo.reason ?? getString('common.value.noReasonProvided'),
                durationMessage: durationStringKick,
            });
            if (config.discordLink && config.discordLink.trim() !== '' && config.discordLink !== 'https://discord.gg/example') {
                kickReason += `\n${getString('ban.kickMessage.discord', { discordLink: config.discordLink })}`;
            }
            await player.kick(kickReason);
            return;
        }

        rankManager?.updatePlayerNametag(player, dependencies);
        playerUtils.debugLog(`[EventHandler.handlePlayerSpawn] Nametag updated for ${playerName}.`, playerName, dependencies);

        const spawnLocation = player.location; // Get location after potential teleport/spawn logic
        const spawnDimensionId = player.dimension.id.replace('minecraft:', '');
        const spawnGameMode = mc.GameMode[player.gameMode] ?? getString?.('common.value.unknown') ?? 'Unknown';

        if (initialSpawn) {
            pData.joinTime = Date.now(); // This correctly sets the start of the current session
            // pData.firstEverLoginTime is set once during initializeDefaultPlayerData or when loaded data lacks it.
            // No need to set firstEverLoginTime here.
            pData.joinCount = (pData.joinCount || 0) + 1; // This remains session-specific as it's not persisted
            // lastLoginTime is removed
            pData.isDirtyForSave = true;

            if (config.enableWelcomerMessage) {
                const welcomeMsgKey = config.welcomeMessageKey || 'welcome.joinMessage'; // Use a key for welcomer
                const message = getString(welcomeMsgKey, { playerName: player.nameTag });
                minecraftSystem.system.runTimeout(() => {
                    try {
                        if (player.isValid()) {
                            player.sendMessage(message);
                        }
                    } catch (e) {
                        console.warn(`[EventHandler.handlePlayerSpawn] Failed to send welcome to ${playerName}: ${e.message}`);
                    }
                }, WELCOME_MESSAGE_DELAY_TICKS);
            }

            logManager?.addLog({
                actionType: 'playerInitialJoin',
                targetName: playerName, targetId: player.id,
                details: `Joined. Loc: ${Math.floor(spawnLocation.x)},${Math.floor(spawnLocation.y)},` +
                    `${Math.floor(spawnLocation.z)} in ${spawnDimensionId}. GM: ${spawnGameMode}. Join Count: ${pData.joinCount}.`,
                location: { x: Math.floor(spawnLocation.x), y: Math.floor(spawnLocation.y), z: Math.floor(spawnLocation.z), dimensionId: spawnDimensionId },
                gameMode: spawnGameMode,
            }, dependencies);

            if (config.notifyAdminOnNewPlayerJoin) { // Simpler config access
                playerUtils.notifyAdmins(
                    getString('admin.notify.newPlayerJoined', { playerName: player.nameTag }),
                    dependencies, player, pData,
                );
            }
        } else { // Respawn
            logManager?.addLog({
                actionType: 'playerRespawn',
                targetName: playerName, targetId: player.id,
                details: `Respawned. Loc: ${Math.floor(spawnLocation.x)},${Math.floor(spawnLocation.y)},` +
                    `${Math.floor(spawnLocation.z)} in ${spawnDimensionId}. GM: ${spawnGameMode}.`,
                location: { x: Math.floor(spawnLocation.x), y: Math.floor(spawnLocation.y), z: Math.floor(spawnLocation.z), dimensionId: spawnDimensionId },
                gameMode: spawnGameMode,
            }, dependencies);
        }

        if (pData.deathMessageToShowOnSpawn && config.enableDeathCoordsMessage) {
            minecraftSystem.system.runTimeout(() => {
                try {
                    if (player.isValid()) {
                        player.sendMessage(pData.deathMessageToShowOnSpawn);
                    }
                } catch (e) {
                    console.warn(`[EventHandler.handlePlayerSpawn] Failed to send death coords to ${playerName}: ${e.message}`);
                }
            }, DEATH_COORDS_MESSAGE_DELAY_TICKS);
            playerUtils.debugLog(`[EventHandler.handlePlayerSpawn] DeathCoords: Displayed to ${playerName}: '${pData.deathMessageToShowOnSpawn}'`, pData.isWatched ? playerName : null, dependencies);
            pData.deathMessageToShowOnSpawn = null;
            pData.isDirtyForSave = true;
        }

        if (checks?.checkInvalidRenderDistance && config.enableInvalidRenderDistanceCheck) {
            // Initial render distance check might be useful on spawn
            minecraftSystem.system.runTimeout(async () => {
                if (!player.isValid()) {
                    return;
                }
                const currentPData = playerDataManager.getPlayerData(player.id); // Re-fetch pData inside timeout
                if (!currentPData) {
                    playerUtils?.debugLog(`[EvtHdlr.Spawn.Timeout.checkInvalidRenderDistance] pData not found for ${playerName}.`, playerName, dependencies);
                    return;
                }
                await checks.checkInvalidRenderDistance(player, currentPData, dependencies);
            }, RENDER_DISTANCE_CHECK_DELAY_TICKS);
        }

        if (config.enableDetailedJoinLeaveLogging) {
            const deviceType = playerUtils.getDeviceType(player) ?? getString?.('common.value.unknown') ?? 'Unknown';
            const locStr = `${Math.floor(spawnLocation.x)}, ${Math.floor(spawnLocation.y)}, ${Math.floor(spawnLocation.z)} in ${spawnDimensionId}`;
            console.warn(
                `[JoinLog] Player: ${playerName} (ID: ${player.id}, Device: ${deviceType}, Mode: ${spawnGameMode}) ` +
                `${initialSpawn ? 'joined' : 'spawned'} at ${locStr}.`,
            );
        }

    } catch (error) {
        console.error(`[EvtHdlr.Spawn CRITICAL] Error for ${playerName}: ${error.stack || error}`);
        playerUtils?.debugLog(`[EvtHdlr.Spawn CRITICAL] Error for ${playerName}: ${error.message}`, playerName, dependencies);
        logManager?.addLog({
            actionType: 'error.evt.playerSpawn', // Standardized actionType
            context: 'eventHandlers.handlePlayerSpawn', // Context remains useful
            targetName: playerName,
            targetId: player?.id,
            details: {
                errorCode: 'EVT_PLAYER_SPAWN_GENERAL_ERROR',
                message: error.message,
                rawErrorStack: error.stack,
                meta: {
                    initialSpawn,
                },
            },
        }, dependencies);
    }
}
/**
 *
 */
export const handlePlayerSpawn = profileEventHandler('handlePlayerSpawn', _handlePlayerSpawn);

/**
 * Handles piston activation events for AntiGrief (e.g., lag machine detection).
 * @param {import('@minecraft/server').PistonActivateAfterEvent} eventData - The piston activation event data.
 * @param {import('../types.js').Dependencies} dependencies - Standard dependencies object.
 */
async function _handlePistonActivateAntiGrief(eventData, dependencies) {
    const { config, playerUtils, checks } = dependencies;
    if (!config?.enablePistonLagCheck) {
        return;
    }

    const { pistonBlock, dimension, isExpanding } = eventData; // isExpanding might be useful
    if (!pistonBlock?.isValid() || !dimension) { // Check piston validity
        playerUtils?.debugLog('[EvtHdlr.Piston] PistonBlock undefined/invalid or dimension undefined.', null, dependencies);
        return;
    }

    if (checks?.checkPistonLag) {
        await checks.checkPistonLag(pistonBlock, dimension.id, dependencies, isExpanding);
    } else {
        playerUtils?.debugLog('[EvtHdlr.Piston CRITICAL] checkPistonLag function unavailable.', null, dependencies);
    }
}
/**
 *
 */
export const handlePistonActivateAntiGrief = profileEventHandler('handlePistonActivateAntiGrief', _handlePistonActivateAntiGrief);

/**
 * Handles entity spawn events for AntiGrief (e.g., Wither, Golem spam).
 * @param {import('@minecraft/server').EntitySpawnAfterEvent} eventData - The entity spawn event data.
 * @param {import('../types.js').Dependencies} dependencies - Standard dependencies object.
 */
async function _handleEntitySpawnEventAntiGrief(eventData, dependencies) {
    const { config, playerUtils, actionManager, playerDataManager, checks, mc: minecraftSystem, logManager } = dependencies;
    const { entity, cause } = eventData; // cause can be 'Spawned' or 'Born' etc.

    if (!entity?.isValid()) { // Check entity validity
        playerUtils?.debugLog('[EvtHdlr.EntSpawn] Entity undefined or invalid.', null, dependencies);
        return;
    }
    const entityName = entity.typeId; // Use typeId for consistency

    if (entity.typeId === mc.MinecraftEntityTypes.wither.id && config?.enableWitherAntiGrief) {
        playerUtils?.debugLog(
            `[EvtHdlr.EntSpawn] Wither spawned (ID: ${entity.id}). Action: ${config.witherSpawnAction}. Cause: ${cause}`,
            null, dependencies,
        );
        const violationDetails = {
            entityId: entity.id, entityType: entity.typeId, actionTaken: config.witherSpawnAction,
            playerNameOrContext: 'System/Environment', cause,
        };
        await actionManager?.executeCheckAction(null, 'worldAntiGriefWitherSpawn', violationDetails, dependencies);
        if (config.witherSpawnAction === 'kill') {
            try {
                entity.kill();
                playerUtils?.debugLog(`[EvtHdlr.EntSpawn] Wither (ID: ${entity.id}) killed.`, null, dependencies);
            } catch (e) {
                console.warn(`[EvtHdlr.EntSpawn CRITICAL] Failed to kill wither: ${e.message}`);
                logManager?.addLog({
                    actionType: 'errorEventHandlersKillWither', context: 'eventHandlers.handleEntitySpawnEvent_AntiGrief',
                    details: { entityId: entity.id, entityType: entity.typeId, errorMessage: e.message },
                    errorStack: e.stack,
                }, dependencies);
            }
        }
    } else if (config?.enableEntitySpamAntiGrief && (entity.typeId === mc.MinecraftEntityTypes.snowGolem.id || entity.typeId === mc.MinecraftEntityTypes.ironGolem.id)) {
        playerUtils?.debugLog(
            `[EvtHdlr.EntSpawn] ${entityName} spawned. Checking attribution. Tick: ${minecraftSystem?.system?.currentTick}`,
            null, dependencies,
        );
        // Iterate over players to find who might have constructed it
        const players = minecraftSystem.world.getAllPlayers();
        for (const player of players) {
            if (!player.isValid()) {
                continue;
            }
            const pData = playerDataManager?.getPlayerData(player.id);
            const expectedTick = pData?.expectingConstructedEntity?.tick ?? 0;
            const currentSystemTick = minecraftSystem?.system?.currentTick ?? 0;
            if (pData?.expectingConstructedEntity?.type === entity.typeId &&
                Math.abs(expectedTick - currentSystemTick) < GOLEM_CONSTRUCTION_CHECK_TICK_WINDOW) {
                const playerName = player.nameTag;
                playerUtils?.debugLog(
                    `[EvtHdlr.EntSpawn] Attributed ${entityName} to ${playerName}. ` +
                    `Expectation: ${JSON.stringify(pData.expectingConstructedEntity)}`,
                    playerName, dependencies,
                );
                if (checks?.checkEntitySpam) {
                    // pData here is from the loop's start, checkEntitySpam is async.
                    const isSpam = await checks.checkEntitySpam(player, entity.typeId, pData, dependencies);

                    // Re-fetch pData for this player after the await before modifying it
                    if (!player.isValid()) {
                        break;
                    } // Player might have disconnected during await
                    const currentPDataForLoop = playerDataManager?.getPlayerData(player.id);
                    if (!currentPDataForLoop) {
                        break;
                    } // pData might be gone

                    if (isSpam && config.entitySpamAction === 'kill') {
                        try {
                            entity.kill();
                            playerUtils?.debugLog(
                                `[EvtHdlr.EntSpawn] ${entityName} (ID: ${entity.id}) killed (spam by ${playerName}).`,
                                playerName, dependencies,
                            );
                        } catch (e) {
                            console.warn(`[EvtHdlr.EntSpawn CRITICAL] Failed to kill ${entityName}: ${e.message}`);
                            logManager?.addLog({
                                actionType: 'errorEventHandlersKillRestrictedEntity',
                                context: 'eventHandlers.handleEntitySpawnEvent_AntiGrief.spamKill',
                                details: { entityId: entity.id, entityType: entityName, attributedPlayer: playerName, errorMessage: e.message },
                                errorStack: e.stack,
                            }, dependencies);
                        }
                    }
                    currentPDataForLoop.expectingConstructedEntity = null; // Clear expectation on the potentially re-fetched pData
                    currentPDataForLoop.isDirtyForSave = true;
                } else {
                    // If checkEntitySpam doesn't exist, still clear expectation on original pData
                    pData.expectingConstructedEntity = null;
                    pData.isDirtyForSave = true;
                }
                break;
            }
        }
    }
}
/**
 *
 */
export const handleEntitySpawnEventAntiGrief = profileEventHandler('handleEntitySpawnEventAntiGrief', _handleEntitySpawnEventAntiGrief);


/**
 * Handles player block placement before events for AntiGrief (e.g., TNT).
 * This specific handler focuses on AntiGrief related cancellations. General placement checks are in handlePlayerPlaceBlockBefore.
 * @param {import('@minecraft/server').PlayerPlaceBlockBeforeEvent} eventData - The data associated with the player place block before event.
 * @param {import('../types.js').Dependencies} dependencies - The standard dependencies object containing shared modules and utilities.
 */
async function _handlePlayerPlaceBlockBeforeEventAntiGrief(eventData, dependencies) {
    const { config, playerUtils, actionManager, rankManager, getString, permissionLevels } = dependencies;
    const { player, itemStack, block } = eventData; // block is the location where itemStack would be placed
    const playerName = player?.nameTag ?? 'UnknownPlayer';

    if (!player?.isValid() || !itemStack?.typeId || !block) {
        return;
    }

    let checkType = null;
    let actionConfigKey = null;
    let defaultMessageKey = '';
    const cancelByDefault = true; // Most AntiGrief place checks should cancel by default

    if (itemStack.typeId === 'minecraft:tnt' && config?.enableTntAntiGrief) {
        checkType = 'worldAntiGriefTntPlace';
        actionConfigKey = 'tntPlacementAction';
        defaultMessageKey = 'antigrief.tntPlacementDenied';
    } else if (itemStack.typeId === 'minecraft:lava_bucket' && config?.enableLavaAntiGrief) {
        checkType = 'worldAntiGriefLava';
        actionConfigKey = 'lavaPlacementAction';
        defaultMessageKey = 'antigrief.lavaPlacementDenied';
    } else if (itemStack.typeId === 'minecraft:water_bucket' && config?.enableWaterAntiGrief) {
        checkType = 'worldAntiGriefWater';
        actionConfigKey = 'waterPlacementAction';
        defaultMessageKey = 'antigrief.waterPlacementDenied';
    }
    // Note: Fire is usually from flint_and_steel (itemUse) or fire_charge, or spread (blockEvent), not direct block placement of 'fire'.

    if (checkType) {
        const playerPermission = rankManager?.getPlayerPermissionLevel(player, dependencies);
        // Generic admin bypass for these types of grief items
        const isAdminAllowed = (checkType === 'worldAntiGriefTntPlace' && config.allowAdminTntPlacement) ||
                               (checkType === 'worldAntiGriefLava' && config.allowAdminLava) ||
                               (checkType === 'worldAntiGriefWater' && config.allowAdminWater);

        if (isAdminAllowed && permissionLevels?.admin !== undefined && playerPermission <= permissionLevels.admin) {
            playerUtils?.debugLog(
                `[EvtHdlr.AntiGriefPlace] Admin ${playerName} placed ${itemStack.typeId}. Allowed.`,
                playerName, dependencies,
            );
            return;
        }

        const actionTaken = config[actionConfigKey] || 'prevent'; // Default to prevent/remove if not specified
        const violationDetails = {
            itemTypeId: itemStack.typeId,
            location: { x: block.location.x, y: block.location.y, z: block.location.z },
            actionTaken,
            playerName,
            // For simple template replacement if actionProfile doesn't use structured location
            x: block.location.x, y: block.location.y, z: block.location.z,
        };

        // Determine cancellation logic BEFORE the await
        const profile = dependencies.checkActionProfiles?.[checkType];
        let shouldCancelEvent = cancelByDefault; // Start with default
        if (profile && typeof profile.cancelEvent === 'boolean') {
            shouldCancelEvent = profile.cancelEvent;
        } else if (actionTaken === 'remove' || actionTaken === 'prevent') {
            shouldCancelEvent = true;
        } else { // e.g. 'warn', 'flagOnly'
            shouldCancelEvent = false;
        }
        const messageToWarn = getString(profile?.messageKey || defaultMessageKey);

        if (shouldCancelEvent) {
            eventData.cancel = true;
            // Warning can also be moved before await if it's tied to cancellation
            // but typically warnings are fine after an action if the event is cancelled.
            // For this rule, the primary concern is eventData.cancel.
        }

        await actionManager?.executeCheckAction(player, checkType, violationDetails, dependencies);

        // If cancellation was determined and set, and the action didn't un-cancel it,
        // the warning will be sent. If actionManager could un-cancel, this warning might be misplaced.
        // However, the eventData.cancel = true assignment is now before the await.
        if (eventData.cancel) { // Re-check eventData.cancel if it could have been modified by await
            playerUtils?.warnPlayer(player, messageToWarn);
        }
    }
}
/**
 *
 */
export const handlePlayerPlaceBlockBeforeEventAntiGrief = profileEventHandler('handlePlayerPlaceBlockBeforeEventAntiGrief', _handlePlayerPlaceBlockBeforeEventAntiGrief);


/**
 * Handles entity death events for cosmetic death effects.
 * @param {import('@minecraft/server').EntityDieAfterEvent} eventData - The entity death event data.
 * @param {import('../types.js').Dependencies} dependencies - Standard dependencies object.
 */
function _handleEntityDieForDeathEffects(eventData, dependencies) {
    const { config, playerUtils, logManager } = dependencies;
    if (!config?.enableDeathEffects) {
        return;
    }

    const { deadEntity } = eventData;
    if (!deadEntity?.isValid()) {
        return;
    } // Ensure entity is valid

    const entityName = deadEntity.nameTag ?? deadEntity.typeId ?? 'UnknownEntity';

    // Currently, only applying to players, but could be expanded.
    if (!(deadEntity instanceof mc.Player)) {
        return;
    }

    playerUtils?.debugLog(`[EvtHdlr.DeathFx] Player ${entityName} died. Processing effects.`, entityName, dependencies);
    try {
        const location = deadEntity.location; // Get location before potential errors
        const dimension = deadEntity.dimension;

        if (config.deathEffectParticleName) {
            dimension.spawnParticle(config.deathEffectParticleName, location);
        }
        if (config.deathEffectSoundId) {
            dimension.playSound(config.deathEffectSoundId, location);
        }
    } catch (e) {
        console.warn(`[EvtHdlr.DeathFx CRITICAL] Error applying death effect for ${entityName}: ${e.message}`);
        logManager?.addLog({
            actionType: 'errorEventHandlersDeathEffect', context: 'eventHandlers.handleEntityDieForDeathEffects',
            targetName: entityName, targetId: deadEntity.id,
            details: { particleName: config.deathEffectParticleName, soundId: config.deathEffectSoundId, errorMessage: e.message },
            errorStack: e.stack,
        }, dependencies);
    }
}
/**
 *
 */
export const handleEntityDieForDeathEffects = profileEventHandler('handleEntityDieForDeathEffects', _handleEntityDieForDeathEffects);

/**
 * Handles entity hurt events for combat checks and state updates.
 * @param {import('@minecraft/server').EntityHurtAfterEvent} eventData - The entity hurt event data.
 * @param {import('../types.js').Dependencies} dependencies - Standard dependencies object.
 */
async function _handleEntityHurt(eventData, dependencies) {
    const { playerDataManager, checks, config, currentTick } = dependencies;
    const { hurtEntity, damageSource, damagingEntity: directDamagingEntity } = eventData;

    if (!hurtEntity?.isValid()) {
        return;
    }

    if (hurtEntity.typeId === mc.MinecraftEntityTypes.player.id) {
        const victimPlayer = /** @type {import('@minecraft/server').Player} */ (hurtEntity);
        const victimPData = playerDataManager?.getPlayerData(victimPlayer.id);

        if (victimPData) {
            victimPData.lastTookDamageTick = currentTick;
            victimPData.lastDamageCause = damageSource.cause;
            victimPData.lastDamagingEntityType = directDamagingEntity?.typeId; // Can be undefined if not entity
            victimPData.isTakingFallDamage = damageSource.cause === mc.EntityDamageCause.fall; // Specifically for fall damage
            victimPData.isDirtyForSave = true;

            // If attacker is also a player
            if (directDamagingEntity?.typeId === mc.MinecraftEntityTypes.player.id &&
                directDamagingEntity.id !== victimPlayer.id
            ) {
                const attackerPlayer = /** @type {import('@minecraft/server').Player} */ (directDamagingEntity);
                if (!attackerPlayer.isValid()) {
                    return;
                }

                victimPData.lastCombatInteractionTime = Date.now();

                const attackerPData = playerDataManager?.getPlayerData(attackerPlayer.id);
                if (attackerPData) {
                    attackerPData.lastCombatInteractionTime = Date.now();
                    attackerPData.isDirtyForSave = true;

                    attackerPData.attackEventsTimestamps ??= []; // Ensure array exists
                    attackerPData.attackEventsTimestamps.push(Date.now());
                    attackerPData.lastAttackTick = currentTick;
                    attackerPData.lastPitch = attackerPlayer.getRotation().pitch; // Store current pitch/yaw
                    attackerPData.lastYaw = attackerPlayer.getRotation().yaw;


                    const eventSpecificData = {
                        targetEntity: victimPlayer, damagingEntity: attackerPlayer,
                        damageCause: damageSource.cause, gameMode: attackerPlayer.gameMode,
                    };
                    if (checks?.checkReach && config?.enableReachCheck) {
                        await checks.checkReach(attackerPlayer, attackerPData, dependencies, eventSpecificData);
                    }
                    if (checks?.checkMultiTarget && config?.enableMultiTargetCheck) {
                        await checks.checkMultiTarget(attackerPlayer, attackerPData, dependencies, eventSpecificData);
                    }
                    if (checks?.checkAttackWhileSleeping && config?.enableStateConflictCheck) {
                        await checks.checkAttackWhileSleeping(attackerPlayer, attackerPData, dependencies, eventSpecificData);
                    }
                    if (checks?.checkAttackWhileUsingItem && config?.enableStateConflictCheck) {
                        await checks.checkAttackWhileUsingItem(attackerPlayer, attackerPData, dependencies, eventSpecificData);
                    }
                    if (checks?.checkViewSnap && config?.enableViewSnapCheck) { // General ViewSnap check
                        await checks.checkViewSnap(attackerPlayer, attackerPData, dependencies, eventSpecificData);
                    }
                    if (checks?.checkCps && config?.enableCpsCheck) {
                        await checks.checkCps(attackerPlayer, attackerPData, dependencies);
                    }
                }
            }
            // Self-hurt check, regardless of attacker type
            if (checks?.checkSelfHurt && config?.enableSelfHurtCheck) {
                await checks.checkSelfHurt(
                    victimPlayer, victimPData, dependencies,
                    { damagingEntity: directDamagingEntity, damageCause: damageSource.cause },
                );
            }
        }
    }
}
/**
 *
 */
export const handleEntityHurt = profileEventHandler('handleEntityHurt', _handleEntityHurt);


/**
 * Handles player death events (e.g., logging, death coordinates).
 * @param {import('@minecraft/server').PlayerDeathAfterEvent} eventData - The player death event data.
 * @param {import('../types.js').Dependencies} dependencies - Standard dependencies object.
 */
function _handlePlayerDeath(eventData, dependencies) {
    const { player } = eventData; // Player object is directly on PlayerDeathAfterEvent
    const { playerDataManager, config, logManager, getString } = dependencies;
    const playerName = player?.nameTag ?? 'UnknownPlayer';

    if (!player?.isValid()) { // player here is the one who died
        console.warn('[EvtHdlr.Death] player is undefined or invalid.');
        return;
    }

    const pData = playerDataManager?.getPlayerData(player.id);
    if (!pData) {
        console.warn(`[EvtHdlr.Death] pData not found for ${playerName}.`);
        return;
    }

    if (config?.enableDeathCoordsMessage) {
        const location = player.location; // Location at time of death
        const dimensionId = player.dimension.id.replace('minecraft:', '');
        const x = Math.floor(location.x);
        const y = Math.floor(location.y);
        const z = Math.floor(location.z);
        const deathCoordsMsgKey = config.deathCoordsMessageKey || 'message.deathCoords'; // Use a key
        pData.deathMessageToShowOnSpawn = getString(
            deathCoordsMsgKey,
            { x: x.toString(), y: y.toString(), z: z.toString(), dimensionId },
        );
        pData.isDirtyForSave = true;
    }

    const killerEntity = eventData.damageSource?.damagingEntity;
    const killerName = killerEntity?.nameTag ?? killerEntity?.typeId?.replace('minecraft:', '') ??
                       getString?.('common.value.notApplicable') ?? 'N/A';

    logManager?.addLog({
        actionType: 'playerDeath',
        targetName: playerName, targetId: player.id,
        details: `Player died. Cause: ${eventData.damageSource?.cause ?? getString?.('common.value.unknown') ?? 'Unknown'}. ` +
                 `Killer: ${killerName}.`,
        location: { x: Math.floor(player.location.x), y: Math.floor(player.location.y), z: Math.floor(player.location.z) },
        dimensionId: player.dimension.id,
    }, dependencies);
}
/**
 *
 */
export const handlePlayerDeath = profileEventHandler('handlePlayerDeath', _handlePlayerDeath);

/**
 * Subscribes to entityHurt events for combat log detection.
 * This function sets up the event listener if combat log is enabled.
 * @param {import('../types.js').Dependencies} dependencies - Standard dependencies object.
 */
function _subscribeToCombatLogEvents(dependencies) {
    const { config, playerDataManager, mc: minecraftSystem } = dependencies;
    if (!config?.enableCombatLogDetection) {
        return;
    }

    if (!minecraftSystem?.world?.afterEvents?.entityHurt) {
        console.warn('[EvtHdlr.CombatLogSub] mc.world.afterEvents.entityHurt is not available. CombatLog detection disabled.');
        return;
    }

    minecraftSystem.world.afterEvents.entityHurt.subscribe((eventData) => {
        const { hurtEntity, damageSource } = eventData;
        const damagingEntity = damageSource?.damagingEntity;

        if (hurtEntity?.typeId === mc.MinecraftEntityTypes.player.id && damagingEntity?.typeId === mc.MinecraftEntityTypes.player.id) {
            if (hurtEntity.id === damagingEntity.id) {
                return;
            } // Ignore self-harm

            const victimPData = playerDataManager?.getPlayerData(hurtEntity.id);
            const attackerPData = playerDataManager?.getPlayerData(damagingEntity.id);
            const currentTime = Date.now();

            if (victimPData) {
                victimPData.lastCombatInteractionTime = currentTime;
                victimPData.isDirtyForSave = true;
            }
            if (attackerPData) {
                attackerPData.lastCombatInteractionTime = currentTime;
                attackerPData.isDirtyForSave = true;
            }
        }
    });
    dependencies.playerUtils?.debugLog('[EvtHdlr.CombatLogSub] Subscribed to entityHurt for CombatLog detection.', null, dependencies);
}
// Note: subscribeToCombatLogEvents is not an async event handler in the same way,
// and it's called once at setup. Profiling its internal subscribe callback might be too granular
// or require a different approach if the callback itself becomes a bottleneck.
// For now, the main event handlers are prioritized.
/**
 *
 */
export const subscribeToCombatLogEvents = _subscribeToCombatLogEvents; // Not wrapping with profiler for now


/**
 * Handles player block break before events (e.g., InstaBreak timing, unbreakable checks).
 * @param {import('@minecraft/server').PlayerBreakBlockBeforeEvent} eventData - The player break block event data.
 * @param {import('../types.js').Dependencies} dependencies - Standard dependencies object.
 */
async function _handlePlayerBreakBlockBeforeEvent(eventData, dependencies) {
    const { checks, config, playerDataManager, currentTick } = dependencies;
    const { player, block, itemStack } = eventData; // itemStack is the tool being used

    if (!player?.isValid() || !block?.isValid()) {
        return;
    }

    const pData = playerDataManager?.getPlayerData(player.id);
    if (!pData) {
        return;
    }

    // Check for breaking unbreakable blocks first
    if (checks?.checkBreakUnbreakable && config?.enableInstaBreakUnbreakableCheck) {
        // Pass eventData directly as it might be cancelled by the check
        await checks.checkBreakUnbreakable(player, pData, eventData, dependencies);
        if (eventData.cancel) {
            return;
        } // Stop if cancelled
    }

    // If not cancelled by checkBreakUnbreakable
    if (!eventData.cancel) {
        // Re-fetch pData after await checkBreakUnbreakable
        if (!player.isValid()) {
            return;
        }
        const currentPData = playerDataManager?.getPlayerData(player.id);
        if (!currentPData) {
            dependencies.playerUtils?.debugLog(`[EvtHdlr.BreakBlockBefore] pData not found for ${player.nameTag} after unbreakable check.`, player.nameTag, dependencies);
            return;
        }

        if (config?.enableInstaBreakSpeedCheck) {
            const expectedTicks = getExpectedBreakTicks(player, block.permutation, itemStack, dependencies);
            currentPData.breakStartTickGameTime = currentTick;
            currentPData.expectedBreakDurationTicks = expectedTicks;
            currentPData.breakingBlockTypeId = block.typeId;
            currentPData.breakingBlockLocation = { x: block.location.x, y: block.location.y, z: block.location.z };
            currentPData.toolUsedForBreakAttempt = itemStack?.typeId;
            currentPData.isDirtyForSave = true;
        }
    }
}
/**
 *
 */
export const handlePlayerBreakBlockBeforeEvent = profileEventHandler('handlePlayerBreakBlockBeforeEvent', _handlePlayerBreakBlockBeforeEvent);

/**
 * Handles player block break after events (e.g., XRay, InstaBreak speed completion, AutoTool).
 * @param {import('@minecraft/server').PlayerBreakBlockAfterEvent} eventData - The player break block event data.
 * @param {import('../types.js').Dependencies} dependencies - Standard dependencies object.
 */
async function _handlePlayerBreakBlockAfterEvent(eventData, dependencies) {
    const { config, playerDataManager, checks } = dependencies;
    const { player, block, brokenBlockPermutation } = eventData; // 'block' is now air, 'brokenBlockPermutation' is what was destroyed.

    if (!player?.isValid() || !brokenBlockPermutation?.type) {
        return;
    } // Check type on permutation

    const pData = playerDataManager?.getPlayerData(player.id);
    if (!pData) {
        return;
    }

    // XRay Check: Use the type of the block that was actually broken
    if (checks?.checkXray && config?.xrayDetectionNotifyOnOreMineEnabled) {
        await checks.checkXray(player, block, brokenBlockPermutation.type, pData, dependencies);
    }

    // InstaBreak Speed Check completion
    if (checks?.checkBreakSpeed && config?.enableInstaBreakSpeedCheck) {
        // Pass eventData which contains brokenBlockPermutation and the player
        await checks.checkBreakSpeed(player, pData, eventData, dependencies);
    }

    // AutoTool Check: Needs context of the block that was just broken
    if (checks?.checkAutoTool && config?.enableAutoToolCheck) {
        // Pass the location of the broken block and its original type
        const autoToolEventData = {
            brokenBlockOriginalType: brokenBlockPermutation.type,
            brokenBlockLocation: block.location, // Location of the (now air) block
            player, // Pass player for context
        };
        await checks.checkAutoTool(player, pData, dependencies, autoToolEventData);
    }

    // Re-fetch pData after all await calls before modifying it.
    if (!player.isValid()) {
        return;
    }
    const finalPData = playerDataManager?.getPlayerData(player.id);
    if (!finalPData) {
        dependencies.playerUtils?.debugLog(`[EvtHdlr.BreakBlockAfter] pData not found for ${player.nameTag} at end of handler.`, player.nameTag, dependencies);
        return;
    }

    // Clear break attempt data after all checks related to this break are done
    finalPData.breakingBlockTypeId = null;
    finalPData.breakingBlockLocation = null;
    finalPData.toolUsedForBreakAttempt = null;
    finalPData.expectedBreakDurationTicks = 0; // Reset expected duration
    finalPData.isDirtyForSave = true;
}
/**
 *
 */
export const handlePlayerBreakBlockAfterEvent = profileEventHandler('handlePlayerBreakBlockAfterEvent', _handlePlayerBreakBlockAfterEvent);


/**
 * Handles item use events.
 * @param {import('@minecraft/server').ItemUseBeforeEvent} eventData - The item use event data.
 * @param {import('../types.js').Dependencies} dependencies - Standard dependencies object.
 */
async function _handleItemUse(eventData, dependencies) {
    const { checks, config, getString, playerUtils, playerDataManager, mc: minecraftSystem, actionManager } = dependencies;
    const { source: player, itemStack } = eventData;

    if (!player?.isValid() || !itemStack?.typeId) {
        return;
    } // Ensure itemStack and its typeId are valid

    const pData = playerDataManager?.getPlayerData(player.id);
    if (!pData) {
        return;
    }


    const _currentTick = dependencies.currentTick;
    pData.lastItemUseTick = _currentTick;
    pData.isDirtyForSave = true;

    if (checks?.checkSwitchAndUseInSameTick && config?.enableInventoryModCheck) {
        await checks.checkSwitchAndUseInSameTick(player, pData, dependencies, { itemStack }); // Pass itemStack in eventSpecificData
        if (eventData.cancel) {
            return;
        }
    }

    if (checks?.checkFastUse && config?.enableFastUseCheck) {
        await checks.checkFastUse(player, pData, dependencies, { itemStack }); // Pass itemStack
        if (eventData.cancel) {
            return;
        }
    }

    const itemFoodComponent = itemStack.type?.getComponent(mc.ItemComponentTypes.Food);
    if (itemFoodComponent && config?.enableChatDuringItemUseCheck) { // Check if chat check is enabled
        pData.isUsingConsumable = true;
        pData.isDirtyForSave = true;
        const foodUseDurationTicks = (itemFoodComponent.usingConvertsTo === undefined)
            ? (itemFoodComponent.useDuration ?? DEFAULT_FOOD_USE_DURATION_SECONDS) * TICKS_PER_SECOND
            : MIN_TIMEOUT_DELAY_TICKS;
        minecraftSystem?.system?.runTimeout(() => {
            if (player.isValid()) { // Check player validity in timeout
                const currentPData = playerDataManager?.getPlayerData(player.id); // Re-fetch
                if (currentPData?.isUsingConsumable) {
                    currentPData.isUsingConsumable = false;
                    currentPData.isDirtyForSave = true;
                }
            }
        }, Math.max(MIN_TIMEOUT_DELAY_TICKS, Math.round(foodUseDurationTicks))); // Ensure at least 1 tick delay
    }

    if (itemStack.typeId === mc.MinecraftItemTypes.bow.id || itemStack.typeId === mc.MinecraftItemTypes.crossbow.id) {
        if (config?.enableChatDuringItemUseCheck) { // Check if chat check is enabled
            pData.isChargingBow = true;
            pData.isDirtyForSave = true;
            // Bow charge state is cleared by chatProcessor or if player stops using item (harder to detect without afterEvent)
        }
    }


    if (config?.bannedItemsUse?.includes(itemStack.typeId)) {
        playerUtils?.warnPlayer(player, getString('antigrief.itemUseDenied', { item: itemStack.typeId }));
        eventData.cancel = true;
        // Ensure 'worldIllegalItemUse' is a defined checkType in actionProfiles
        await actionManager?.executeCheckAction(
            player, 'worldIllegalItemUse',
            { itemTypeId: itemStack.typeId, action: 'use' }, dependencies,
        );

    }
}
/**
 *
 */
export const handleItemUse = profileEventHandler('handleItemUse', _handleItemUse);

/**
 * Handles item use on block events.
 * Note: mc.world.beforeEvents.itemUseOn is often reported as unavailable or unstable.
 * This handler is provided for completeness but might not be reliably triggered.
 * @param {import('@minecraft/server').ItemUseOnBeforeEvent} eventData
 * @param {import('../types.js').Dependencies} dependencies
 */
function _handleItemUseOn(eventData, dependencies) {
    const { playerUtils } = dependencies;
    playerUtils?.debugLog('[EvtHdlr.ItemUseOn] ItemUseOn event triggered. This event might be unstable.', eventData.source?.nameTag, dependencies);
    // Similar logic to handleItemUse could be placed here if specific item-on-block actions need checking.
    // For example, flint_and_steel for fire anti-grief.
    // if (eventData.itemStack.typeId === 'minecraft:flint_and_steel' && config.enableFireAntiGrief) { ... }
}
/**
 *
 */
export const handleItemUseOn = profileEventHandler('handleItemUseOn', _handleItemUseOn);

/**
 * Handles player inventory item change events.
 * @param {import('@minecraft/server').Player} player - The player whose inventory changed.
 * @param {import('@minecraft/server').ItemStack | undefined} newItemStack - The new item stack in the slot.
 * @param {import('@minecraft/server').ItemStack | undefined} oldItemStack - The old item stack that was in the slot.
 * @param {string | number} slot - The slot that changed (typically a number for container slots, string like 'Mainhand' for equipment).
 * @param {import('../types.js').Dependencies} dependencies - Standard dependencies object.
 */
async function _handleInventoryItemChange(player, newItemStack, oldItemStack, slot, dependencies) {
    const { checks, config, playerDataManager } = dependencies; // Removed unused currentTick
    if (!player?.isValid()) {
        return;
    }

    const pData = playerDataManager?.getPlayerData(player.id);
    if (!pData) {
        return;
    }

    // Store previous slot for switch-use checks
    if (typeof slot === 'string' && slot.toLowerCase() === 'mainhand') {
        // This event might not be the most reliable for selected slot if it's just an item change in mainhand.
        // Player.selectedSlotIndex is more direct for hotbar selection changes.
        // However, if an item appears in mainhand, it implies selection.
    }
    // For hotbar selection changes, Player.selectedSlotChanged event is preferred if available.
    // If not, this event can give clues but is less direct.

    if (checks?.checkInventoryMoveWhileActionLocked && config?.enableInventoryModCheck) {
        const inventoryChangeData = { newItemStack, oldItemStack, inventorySlot: slot.toString() }; // Ensure slot is string
        await checks.checkInventoryMoveWhileActionLocked(player, pData, dependencies, inventoryChangeData);
    }
}
/**
 *
 */
export const handleInventoryItemChange = profileEventHandler('handleInventoryItemChange', _handleInventoryItemChange);

/**
 * Handles player block placement before events (for checks and AntiGrief).
 * This is the primary handler for `playerPlaceBlock.before`.
 * @param {import('@minecraft/server').PlayerPlaceBlockBeforeEvent} eventData - The player place block event data.
 * @param {import('../types.js').Dependencies} dependencies - Standard dependencies object.
 */
async function _handlePlayerPlaceBlockBefore(eventData, dependencies) {
    const { checks, config, playerDataManager } = dependencies;
    const { player, block, itemStack } = eventData; // block is location, itemStack is item being placed

    if (!player?.isValid() || !block || !itemStack?.typeId) {
        return;
    }

    const pData = playerDataManager?.getPlayerData(player.id);
    if (!pData) {
        eventData.cancel = true; // Cancel if no player data
        dependencies.playerUtils?.warnPlayer(player, dependencies.getString('error.playerDataNotFound'));
        return;
    }

    // Run general placement checks first
    if (checks?.checkAirPlace && config?.enableAirPlaceCheck) {
        await checks.checkAirPlace(player, pData, dependencies, eventData); // Pass eventData for cancellation
        if (eventData.cancel) {
            return;
        }
    }

    // Then run AntiGrief specific placement checks
    await handlePlayerPlaceBlockBeforeEventAntiGrief(eventData, dependencies); // This is already wrapped
    // If eventData.cancel is true after AntiGrief, it will stop here.
}
/**
 *
 */
export const handlePlayerPlaceBlockBefore = profileEventHandler('handlePlayerPlaceBlockBefore', _handlePlayerPlaceBlockBefore);

/**
 * Internal helper to process effects and checks after a block is placed.
 * @param {import('@minecraft/server').Player} player - The player who placed the block.
 * @param {import('../types.js').PlayerAntiCheatData} pData - The player's AntiCheat data.
 * @param {import('@minecraft/server').Block} block - The block that was placed.
 * @param {import('../types.js').Dependencies} dependencies - Standard dependencies object.
 */
async function _processPlayerPlaceBlockAfterEffects(player, pData, block, dependencies) {
    const { config, playerUtils, checks, currentTick, playerDataManager } = dependencies;
    const eventSpecificBlockData = { block };
    let pDataInternal = pData;
    let anAwaitOccurred = false;

    if (!player?.isValid() || !pDataInternal || !block?.isValid()) {
        return;
    }

    // Record placement for checks that analyze patterns over time
    pDataInternal.recentBlockPlacements ??= [];
    pDataInternal.recentBlockPlacements.push({
        x: block.location.x, y: block.location.y, z: block.location.z,
        blockTypeId: block.typeId,
        pitch: player.getRotation().pitch, yaw: player.getRotation().yaw,
        tick: currentTick,
        dimensionId: player.dimension.id,
    });
    if (pDataInternal.recentBlockPlacements.length > (config?.towerPlacementHistoryLength ?? DEFAULT_TOWER_HISTORY_LENGTH)) {
        pDataInternal.recentBlockPlacements.shift();
    }
    pDataInternal.isDirtyForSave = true;

    const checksToRun = [
        { check: checks?.checkTower, enabled: config?.enableTowerCheck },
        { check: checks?.checkFastPlace, enabled: config?.enableFastPlaceCheck },
        { check: checks?.checkDownwardScaffold, enabled: config?.enableDownwardScaffoldCheck },
        { check: checks?.checkBlockSpam, enabled: config?.enableBlockSpamAntiGrief }, // Rate-based
        { check: checks?.checkBlockSpamDensity, enabled: config?.enableBlockSpamDensityCheck }, // Density-based
        { check: checks?.checkFlatRotationBuilding, enabled: config?.enableFlatRotationCheck },
    ];

    for (const { check, enabled } of checksToRun) {
        if (check && enabled) {
            await check(player, pDataInternal, dependencies, eventSpecificBlockData);
            anAwaitOccurred = true;
        }
    }

    // If any await occurred, pDataInternal might be stale. Re-fetch it.
    if (anAwaitOccurred) {
        pDataInternal = playerDataManager.getPlayerData(player.id);
        if (!pDataInternal) {
            playerUtils.debugLog(
                `[EvtHdlr._ppbaEffects] pData became null for ${player.nameTag} after awaits. Skipping Golem check.`,
                player.nameTag, dependencies,
            );
            return;
        }
    }

    // Golem construction check
    if (config?.enableEntitySpamAntiGrief && block.typeId === mc.MinecraftBlockTypes.carvedPumpkin.id) {
        const dimension = player.dimension;
        const blockBelow = dimension.getBlock(block.location.offset(0, BLOCK_OFFSET_ONE_BELOW, 0));
        const blockTwoBelow = dimension.getBlock(block.location.offset(0, BLOCK_OFFSET_TWO_BELOW, 0));
        let potentialGolemType = null;

        if (blockBelow?.typeId === mc.MinecraftBlockTypes.ironBlock.id &&
            blockTwoBelow?.typeId === mc.MinecraftBlockTypes.ironBlock.id
        ) {
            potentialGolemType = mc.MinecraftEntityTypes.ironGolem.id;
        } else if (blockBelow?.typeId === mc.MinecraftBlockTypes.snowBlock.id &&
                 blockTwoBelow?.typeId === mc.MinecraftBlockTypes.snowBlock.id
        ) {
            potentialGolemType = mc.MinecraftEntityTypes.snowGolem.id;
        }

        if (potentialGolemType) {
            pDataInternal.expectingConstructedEntity = {
                type: potentialGolemType,
                location: { x: block.location.x, y: block.location.y, z: block.location.z },
                tick: currentTick,
            };
            pDataInternal.isDirtyForSave = true;
            playerUtils?.debugLog(
                `[EvtHdlr._ppbaEffects] Player ${player?.nameTag} placed pumpkin for ${potentialGolemType}. Expecting entity.`,
                player?.nameTag, dependencies,
            );
        }
    }
}
// _processPlayerPlaceBlockAfterEffects is an internal helper, not directly exported or subscribed.
// It's called by handlePlayerPlaceBlockAfterEvent, which will be wrapped.

/**
 * Handles player block placement after events.
 * @param {import('@minecraft/server').PlayerPlaceBlockAfterEvent} eventData - The player place block event data.
 * @param {import('../types.js').Dependencies} dependencies - Standard dependencies object.
 */
async function _handlePlayerPlaceBlockAfterEvent(eventData, dependencies) {
    const { playerDataManager } = dependencies;
    const { player, block } = eventData; // block is the one that was placed

    if (!player?.isValid() || !block?.isValid()) {
        return;
    }

    const pData = playerDataManager?.getPlayerData(player.id);
    if (!pData) {
        return;
    }

    await _processPlayerPlaceBlockAfterEffects(player, pData, block, dependencies);
}
/**
 *
 */
export const handlePlayerPlaceBlockAfterEvent = profileEventHandler('handlePlayerPlaceBlockAfterEvent', _handlePlayerPlaceBlockAfterEvent);

/**
 * Handles chat messages before they are sent, dispatching to chatProcessor.
 * @param {import('@minecraft/server').ChatSendBeforeEvent} eventData - Data for the 'beforeChatSend' event, including the player sending the message and the message itself. This object can be modified to cancel the event or change the message.
 * @param {import('../types.js').Dependencies} dependencies - Standard dependencies object providing access to shared modules (e.g., config, logManager, playerUtils, chatProcessor).
 */
async function _handleBeforeChatSend(eventData, dependencies) {
    const { playerDataManager, playerUtils, getString, chatProcessor } = dependencies;
    const { sender: player, message: originalMessage } = eventData;

    if (!player?.isValid()) {
        console.warn('[EvtHdlr.ChatSend] Invalid player object.');
        eventData.cancel = true;
        return;
    }
    // const playerName = player.nameTag; // playerName was unused

    const pData = playerDataManager?.getPlayerData(player.id);
    if (!pData) {
        playerUtils?.warnPlayer(player, getString('error.playerDataNotFound'));
        eventData.cancel = true;
        return;
    }

    if (typeof chatProcessor?.processChatMessage !== 'function') {
        console.warn('[EvtHdlr.ChatSend CRITICAL] chatProcessor.processChatMessage is not available. Chat will not be processed for safety.');
        playerUtils?.warnPlayer(player, getString('error.chatProcessingUnavailable'));
        eventData.cancel = true; // Cancel if core chat processing is missing
        return;
    }

    await chatProcessor.processChatMessage(player, pData, originalMessage, eventData, dependencies);
}
/**
 *
 */
/**
 * Handles chat messages before they are sent, dispatching to chatProcessor.
 * @param {import('@minecraft/server').ChatSendBeforeEvent} eventData - Data for the 'beforeChatSend' event, including the player sending the message and the message itself. This object can be modified to cancel the event or change the message.
 * @param {import('../types.js').Dependencies} dependencies - Standard dependencies object providing access to shared modules (e.g., config, logManager, playerUtils, chatProcessor).
 */
export const handleBeforeChatSend = profileEventHandler('handleBeforeChatSend', _handleBeforeChatSend);

/**
 * Handles player dimension change after events (e.g., dimension lock enforcement).
 * @param {import('@minecraft/server').PlayerDimensionChangeAfterEvent} eventData The event data object from the `playerDimensionChange.afterEvents` signal, containing information about the player, their previous and new dimension, and original location.
 * @param {import('../types.js').Dependencies} dependencies The standard dependencies object, providing access to shared modules like configuration, logging, player utilities, etc.
 */
async function _handlePlayerDimensionChangeAfterEvent(eventData, dependencies) {
    const { player, fromDimension, toDimension, fromLocation } = eventData;
    const { playerUtils, getString, rankManager, permissionLevels, logManager, config, playerDataManager: pdm } = dependencies; // Renamed for brevity
    const playerName = player?.nameTag ?? 'UnknownPlayer';

    if (!player?.isValid() || !toDimension || !fromDimension || !fromLocation) {
        playerUtils?.debugLog('[EvtHdlr.DimChange] Incomplete event data for player.', playerName, dependencies);
        return;
    }

    // Update pData with new dimension
    const pData = pdm?.getPlayerData(player.id);
    if (pData) {
        pData.lastDimensionId = toDimension.id;
        pData.isDirtyForSave = true;
    } else {
        // If pData is somehow null here, we might not be able to proceed with permission checks or notifications.
        // However, ensurePlayerDataInitialized should run on spawn/join.
        playerUtils?.debugLog(`[EvtHdlr.DimChange] pData not found for ${playerName} at start of dimension change.`, playerName, dependencies);
        // Depending on strictness, might return here or allow logic that doesn't need pData.
    }

    const playerPermission = rankManager?.getPlayerPermissionLevel(player, dependencies);
    if (typeof playerPermission === 'number' && permissionLevels?.admin !== undefined && playerPermission <= permissionLevels.admin) {
        playerUtils?.debugLog(
            `[EvtHdlr.DimChange] Player ${player.nameTag} (Admin) bypassing dimension locks.`,
            player.nameTag, dependencies,
        );
        return;
    }

    let dimensionIsLocked = false;
    let lockedDimensionName = '';
    const toDimensionIdClean = toDimension.id.replace('minecraft:', '');

    if (toDimensionIdClean === 'nether' && isNetherLocked()) {
        dimensionIsLocked = true;
        lockedDimensionName = getString('dimensionLock.name.nether');
    } else if (toDimensionIdClean === 'the_end' && isEndLocked()) {
        dimensionIsLocked = true;
        lockedDimensionName = getString('dimensionLock.name.end');
    }

    if (dimensionIsLocked) {
        try {
            // Teleport player back to their original location in the fromDimension
            await player.teleport(fromLocation, { dimension: fromDimension });
            playerUtils?.warnPlayer(player, getString('dimensionLock.teleportMessage', { lockedDimensionName }));

            // Re-fetch pData before using it for notifyAdmins, as player.teleport was awaited
            if (!player.isValid()) {
                return;
            } // Player might have disconnected during teleport attempt
            const currentPData = pdm?.getPlayerData(player.id);
            // pData for notifyAdmins context can be the currentPData or null if not found

            if (config.notifyOnDimensionLockAttempt !== false) {
                playerUtils?.notifyAdmins(
                    getString('admin.notify.dimensionLockAttempt', { playerName: player.nameTag, dimensionName: lockedDimensionName }),
                    dependencies, player, currentPData, // Use re-fetched pData
                );
            }
            logManager?.addLog({
                actionType: 'dimensionLockEnforced',
                targetName: player.nameTag, targetId: player.id,
                details: `Attempted to enter locked dim: ${toDimension.id}. Teleported back to ${fromDimension.id}.`,
                fromDimensionId: fromDimension.id, toDimensionId: toDimension.id,
            }, dependencies);

        } catch (e) {
            console.error(`[EvtHdlr.DimChange CRITICAL] Failed to teleport ${player.nameTag} from locked ${toDimensionIdClean}: ${e.stack || e}`);
            logManager?.addLog({
                actionType: 'errorEventHandlersDimensionLockTeleport', context: 'eventHandlers.handlePlayerDimensionChangeAfterEvent',
                targetName: player.nameTag, targetId: player.id,
                details: {
                    fromDimensionId: fromDimension.id, toDimensionId: toDimension.id,
                    lockedDimensionName, errorMessage: e.message,
                },
                errorStack: e.stack,
            }, dependencies);
        }
    }
}
/**
 *
 */
export const handlePlayerDimensionChangeAfterEvent = profileEventHandler('handlePlayerDimensionChangeAfterEvent', _handlePlayerDimensionChangeAfterEvent);