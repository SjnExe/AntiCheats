import { world } from '@minecraft/server';
import * as mc from '@minecraft/server';
import { getExpectedBreakTicks, isNetherLocked, isEndLocked, formatSessionDuration } from '../utils/index.js';
const defaultCombatLogThresholdSeconds = 15;
const welcomeMessageDelayTicks = 20;
const deathCoordsMessageDelayTicks = 5;
const defaultFoodUseDurationSeconds = 1.6;
const ticksPerSecond = 20;
const defaultTowerPlacementHistoryLength = 20;
const blockOffsetOneBelow = -1;
const blockOffsetTwoBelow = -2;
const golemConstructionCheckTickWindow = 10;
const renderDistanceCheckDelayTicks = 100;
const minTimeoutDelayTicks = 1;
/**
 * @param {string} handlerName
 * @param {Function} handlerFunction
 */
function profileEventHandler(handlerName, handlerFunction) {
    return async function (...args) {
        const dependencies = args[args.length - 1];
        if (dependencies && dependencies.config && dependencies.config.enablePerformanceProfiling && dependencies.profilingData) {
            const startTime = Date.now();
            try {
                await handlerFunction.apply(null, args);
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
            await handlerFunction.apply(null, args);
        }
    };
}
/**
 * @param {import('@minecraft/server').PlayerLeaveAfterEvent} eventData
 * @param {import('../types.js').Dependencies} dependencies
 */
async function _handlePlayerLeave(eventData, dependencies) {
    const { playerDataManager, playerUtils, config, logManager, actionManager } = dependencies;
    const { getPlayerData } = playerDataManager;
    const { debugLog } = playerUtils;
    const { player } = eventData;
    const playerName = player?.name ?? 'UnknownPlayer';

    if (!player?.isValid()) {
        return;
    }

    debugLog(`[EventHandler.handlePlayerLeave] Player ${playerName} is leaving. Processing data...`, playerName, dependencies);

    const pData = getPlayerData(player.id);

    if (pData && config?.combatLog?.enabled && pData.lastCombatInteractionTime > 0) {
        const currentTime = Date.now();
        const timeSinceLastCombatMs = currentTime - pData.lastCombatInteractionTime;
        const combatLogThresholdMs = (config.combatLog.thresholdSeconds ?? defaultCombatLogThresholdSeconds) * 1000;

        if (timeSinceLastCombatMs < combatLogThresholdMs) {
            const timeSinceLastCombatSeconds = (timeSinceLastCombatMs / 1000).toFixed(1);
            const incrementAmount = 1;

            playerUtils?.debugLog(
                `[EvtHdlr.Leave] CombatLog: ${playerName} left ${timeSinceLastCombatSeconds}s after combat. ` +
        `Thresh: ${config.combatLog.thresholdSeconds}s. Flag +${incrementAmount}.`,
                playerName, dependencies,
            );

            const violationDetails = { timeSinceLastCombat: timeSinceLastCombatSeconds, incrementAmount };
            await actionManager?.executeCheckAction(player, 'combatLog', violationDetails, dependencies);
        }
    }

    const pDataAfterAction = playerDataManager?.getPlayerData(player.id);

    if (pDataAfterAction) {
        pDataAfterAction.lastLogoutTime = Date.now();
        pDataAfterAction.isOnline = false;
        pDataAfterAction.isDirtyForSave = true;

        const lastLocation = pDataAfterAction.lastPosition ?? player?.location;
        const lastDimensionId = (pDataAfterAction.lastDimensionId ?? player?.dimension?.id)?.replace('minecraft:', '');
        const lastGameModeString = pDataAfterAction.lastGameMode ?? player?.gameMode ?? playerUtils.getString('common.value.unknown', dependencies) ?? 'Unknown';
        let sessionDurationString = playerUtils.getString('common.value.notApplicable', dependencies) ?? 'N/A';
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

    if (playerDataManager?.prepareAndSavePlayerData) {
        try {
            await playerDataManager.prepareAndSavePlayerData(player, dependencies);
            playerUtils?.debugLog(`[EventHandler.handlePlayerLeave] Data save processed for ${playerName} on leave.`, playerName, dependencies);
        } catch (error) {
            console.error(`[EventHandler.handlePlayerLeave CRITICAL] Error in prepareAndSavePlayerData for ${playerName} on leave: ${error.stack || error}`);
            logManager?.addLog({
                actionType: 'errorEventHandlersPdataSaveOnLeave',
                context: 'eventHandlers.handlePlayerLeave.prepareAndSavePlayerData',
                targetName: playerName,
                targetId: player.id,
                details: { errorMessage: error.message },
                errorStack: error.stack,
            }, dependencies);
        }
    }

    if (config?.playerInfo?.enableDetailedJoinLeaveLogging) {
        console.warn(`[LeaveLog] Player: ${playerName} (ID: ${player?.id}) left the game.`);
    }
    playerUtils?.debugLog(`[EventHandler.handlePlayerLeave] Finished processing for ${playerName}.`, playerName, dependencies);
}
export const handlePlayerLeave = profileEventHandler('handlePlayerLeave', _handlePlayerLeave);

/**
 * Handles player spawn events.
 * @param {import('@minecraft/server').PlayerSpawnAfterEvent} eventData The player spawn event data.
 * @param {import('../types.js').Dependencies} dependencies Standard dependencies object.
 */
async function _handlePlayerSpawn(eventData, dependencies) {
    const { player, initialSpawn } = eventData;
    const { playerDataManager, playerUtils, config, logManager, checks, rankManager, system } = dependencies;
    const playerName = player?.name ?? 'UnknownPlayer';

    if (!player?.isValid()) {
        console.warn('[EvtHdlr.Spawn] Invalid player object in eventData.');
        return;
    }

    playerUtils?.debugLog(
        `[EvtHdlr.Spawn] Processing for ${playerName} (Initial: ${initialSpawn}). Tick: ${system.currentTick}`,
        playerName, dependencies,
    );

    try {
        const pData = await playerDataManager.ensurePlayerDataInitialized(player, dependencies);
        if (!pData) {
            console.error(`[EvtHdlr.Spawn CRITICAL] pData null for ${playerName}. Aborting spawn logic.`);
            player.sendMessage({ translate: 'error.playerDataLoadFailedKick' });
            player.kick(playerUtils.getString('error.playerDataLoadFailedKickReason', dependencies));
            return;
        }

        pData.isOnline = true;
        pData.lastGameMode = player.gameMode;
        pData.lastDimensionId = player.dimension.id;
        pData.isUsingConsumable = false;
        pData.isChargingBow = false;
        pData.isUsingShield = false;
        pData.isDirtyForSave = true;

        const banInfo = playerDataManager.getBanInfo(player, dependencies);
        if (banInfo) {
            playerUtils.debugLog(
                `[EvtHdlr.Spawn] Player ${playerName} is banned. Kicking. Reason: ${banInfo.reason}, ` +
        `Expires: ${new Date(banInfo.unbanTime).toISOString()}`,
                playerName, dependencies,
            );
            const durationStringKick = playerUtils.getString(
                banInfo.unbanTime === Infinity ? 'ban.duration.permanent' : 'ban.duration.expires', dependencies,
                { expiryDate: new Date(banInfo.unbanTime).toLocaleString() },
            );
            let kickReason = playerUtils.getString('ban.kickMessage', dependencies, {
                reason: banInfo.reason ?? playerUtils.getString('common.value.noReasonProvided', dependencies),
                durationMessage: durationStringKick,
            });
            if (config.serverInfo.discordLink && config.serverInfo.discordLink.trim() !== '' && !config.serverInfo.discordLink.includes('example.com')) {
                kickReason += `\n${playerUtils.getString('ban.kickMessage.discord', dependencies, { discordLink: config.serverInfo.discordLink })}`;
            }
            player.kick(kickReason, { reason: kickReason });
            return;
        }

        rankManager?.updatePlayerNametag(player, dependencies);
        playerUtils.debugLog(`[EventHandler.handlePlayerSpawn] Nametag updated for ${playerName}.`, playerName, dependencies);

        const spawnLocation = player.location;
        const spawnDimensionId = player.dimension.id.replace('minecraft:', '');
        const spawnGameMode = player.gameMode ?? playerUtils.getString('common.value.unknown', dependencies) ?? 'Unknown';

        if (initialSpawn) {
            pData.joinTime = Date.now();
            pData.joinCount = (pData.joinCount || 0) + 1;
            pData.isDirtyForSave = true;

            if (config.playerInfo.enableWelcomer) {
                const message = { translate: 'welcome.joinMessage', with: { playerName: player.name } };
                system.runTimeout(() => {
                    try {
                        if (player.isValid()) {
                            player.sendMessage(message);
                        }
                    } catch (e) {
                        console.warn(`[EventHandler.handlePlayerSpawn] Failed to send welcome to ${playerName}: ${e.message}`);
                    }
                }, welcomeMessageDelayTicks);
            }

            logManager?.addLog({
                actionType: 'playerInitialJoin',
                targetName: playerName, targetId: player.id,
                details: `Joined. Loc: ${Math.floor(spawnLocation.x)},${Math.floor(spawnLocation.y)},` +
          `${Math.floor(spawnLocation.z)} in ${spawnDimensionId}. GM: ${spawnGameMode}. Join Count: ${pData.joinCount}.`,
                location: { x: Math.floor(spawnLocation.x), y: Math.floor(spawnLocation.y), z: Math.floor(spawnLocation.z), dimensionId: spawnDimensionId },
                gameMode: spawnGameMode,
            }, dependencies);

            if (config.playerInfo.notifyAdminOnNewPlayer) {
                playerUtils.notifyAdmins(
                    playerUtils.getString('admin.notify.newPlayerJoined', dependencies, { playerName: player.name }),
                    dependencies, player, pData,
                );
            }
        } else {
            logManager?.addLog({
                actionType: 'playerRespawn',
                targetName: playerName, targetId: player.id,
                details: `Respawned. Loc: ${Math.floor(spawnLocation.x)},${Math.floor(spawnLocation.y)},` +
          `${Math.floor(spawnLocation.z)} in ${spawnDimensionId}. GM: ${spawnGameMode}.`,
                location: { x: Math.floor(spawnLocation.x), y: Math.floor(spawnLocation.y), z: Math.floor(spawnLocation.z), dimensionId: spawnDimensionId },
                gameMode: spawnGameMode,
            }, dependencies);
        }

        if (pData.deathMessageToShowOnSpawn && config.playerInfo.enableDeathCoords) {
            system.runTimeout(() => {
                try {
                    if (player.isValid()) {
                        player.sendMessage(pData.deathMessageToShowOnSpawn);
                    }
                } catch (e) {
                    console.warn(`[EventHandler.handlePlayerSpawn] Failed to send death coords to ${playerName}: ${e.message}`);
                }
            }, deathCoordsMessageDelayTicks);
            playerUtils.debugLog(`[EventHandler.handlePlayerSpawn] DeathCoords: Displayed to ${playerName}: '${pData.deathMessageToShowOnSpawn}'`, pData.isWatched ? playerName : null, dependencies);
            pData.deathMessageToShowOnSpawn = null;
            pData.isDirtyForSave = true;
        }

        if (checks?.checkInvalidRenderDistance && config.checks.invalidRenderDistance.enabled) {
            system.runTimeout(async () => {
                if (!player.isValid()) {
                    return;
                }
                const currentPData = playerDataManager.getPlayerData(player.id);
                if (!currentPData) {
                    playerUtils?.debugLog(`[EvtHdlr.Spawn.Timeout.checkInvalidRenderDistance] pData not found for ${playerName}.`, playerName, dependencies);
                    return;
                }
                await checks.checkInvalidRenderDistance(player, currentPData, dependencies);
            }, renderDistanceCheckDelayTicks);
        }

        if (config.playerInfo.enableDetailedJoinLeaveLogging) {
            const deviceType = playerUtils.getDeviceType(player) ?? playerUtils.getString('common.value.unknown', dependencies) ?? 'Unknown';
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
            actionType: 'error.evt.playerSpawn',
            context: 'eventHandlers.handlePlayerSpawn',
            targetName: playerName,
            targetId: player?.id,
            details: {
                errorCode: 'EVT_PLAYER_SPAWN_GENERAL_ERROR',
                message: error.message,
                rawErrorStack: error.stack,
                meta: {
                    initialSpawn
                }
            }
        }, dependencies);
    }
}
export const handlePlayerSpawn = profileEventHandler('handlePlayerSpawn', _handlePlayerSpawn);

/**
 * Handles piston activation events for AntiGrief.
 * @param {import('@minecraft/server').PistonActivateAfterEvent} eventData The piston activation event data.
 * @param {import('../types.js').Dependencies} dependencies Standard dependencies object.
 */
async function _handlePistonActivateAntiGrief(eventData, dependencies) {
    const { config, playerUtils, checks } = dependencies;
    if (!config?.checks?.pistonLag?.enabled) {
        return;
    }

    const { block, dimension, isExpanding } = eventData;
    if (!block?.isValid() || !dimension) {
        playerUtils?.debugLog('[EvtHdlr.Piston] PistonBlock undefined/invalid or dimension undefined.', null, dependencies);
        return;
    }

    if (checks?.checkPistonLag) {
        await checks.checkPistonLag(block, dimension.id, dependencies, isExpanding);
    } else {
        playerUtils?.debugLog('[EvtHdlr.Piston CRITICAL] checkPistonLag function unavailable.', null, dependencies);
    }
}
export const handlePistonActivateAntiGrief = profileEventHandler('handlePistonActivateAntiGrief', _handlePistonActivateAntiGrief);

/**
 * Handles entity spawn events for AntiGrief.
 * @param {import('@minecraft/server').EntitySpawnAfterEvent} eventData The entity spawn event data.
 * @param {import('../types.js').Dependencies} dependencies Standard dependencies object.
 */
async function _handleEntitySpawnEventAntiGrief(eventData, dependencies) {
    const { config, playerUtils, actionManager, playerDataManager, checks, logManager, system } = dependencies;
    const { entity, cause } = eventData;

    if (!entity?.isValid()) {
        playerUtils?.debugLog('[EvtHdlr.EntSpawn] Entity undefined or invalid.', null, dependencies);
        return;
    }
    const entityName = entity.typeId;

    if (entity.typeId === 'minecraft:wither' && config?.antiGrief?.wither?.enabled) {
        playerUtils?.debugLog(
            `[EvtHdlr.EntSpawn] Wither spawned (ID: ${entity.id}). Action: ${config.antiGrief.wither.action}. Cause: ${cause}`,
            null, dependencies,
        );
        const violationDetails = {
            entityId: entity.id, entityType: entity.typeId, actionTaken: config.antiGrief.wither.action,
            playerNameOrContext: 'System/Environment', cause,
        };
        await actionManager?.executeCheckAction(null, 'worldAntiGriefWitherSpawn', violationDetails, dependencies);
        if (config.antiGrief.wither.action === 'kill') {
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
    } else if (config?.checks?.entitySpam?.enabled && (entity.typeId === 'minecraft:snow_golem' || entity.typeId === 'minecraft:iron_golem')) {
        playerUtils?.debugLog(
            `[EvtHdlr.EntSpawn] ${entityName} spawned. Checking attribution. Tick: ${system?.currentTick}`,
            null, dependencies,
        );
        const players = world.getAllPlayers();
        for (const player of players) {
            if (!player.isValid()) {
                continue;
            }
            const pData = playerDataManager?.getPlayerData(player.id);
            const expectedTick = pData?.expectingConstructedEntity?.tick ?? 0;
            const currentSystemTick = system?.currentTick ?? 0;
            if (pData?.expectingConstructedEntity?.type === entity.typeId &&
        Math.abs(expectedTick - currentSystemTick) < golemConstructionCheckTickWindow) {
                const playerName = player.name;
                playerUtils?.debugLog(
                    `[EvtHdlr.EntSpawn] Attributed ${entityName} to ${playerName}. ` +
          `Expectation: ${JSON.stringify(pData.expectingConstructedEntity)}`,
                    playerName, dependencies,
                );
                if (checks?.checkEntitySpam) {
                    const isSpam = await checks.checkEntitySpam(player, entity.typeId, pData, dependencies);
                    if (!player.isValid()) {
                        break;
                    }
                    const currentPDataForLoop = playerDataManager?.getPlayerData(player.id);
                    if (!currentPDataForLoop) {
                        break;
                    }

                    if (isSpam && config.checks.entitySpam.action === 'kill') {
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
                    currentPDataForLoop.expectingConstructedEntity = null;
                    currentPDataForLoop.isDirtyForSave = true;
                } else {
                    pData.expectingConstructedEntity = null;
                    pData.isDirtyForSave = true;
                }
                break;
            }
        }
    }
}
export const handleEntitySpawnEventAntiGrief = profileEventHandler('handleEntitySpawnEventAntiGrief', _handleEntitySpawnEventAntiGrief);


/**
 * Handles player block placement before events for AntiGrief.
 * @param {import('@minecraft/server').PlayerPlaceBlockBeforeEvent} eventData The player place block event data.
 * @param {import('../types.js').Dependencies} dependencies The standard dependencies object.
 */
async function _handlePlayerPlaceBlockBeforeEventAntiGrief(eventData, dependencies) {
    const { config, playerUtils, actionManager, rankManager, permissionLevels } = dependencies;
    const { player, itemStack, block } = eventData;
    const playerName = player?.name ?? 'UnknownPlayer';

    if (!player?.isValid() || !itemStack?.typeId || !block) {
        return;
    }

    let checkType = null;
    let actionConfigKey = null;
    let defaultMessageKey = '';
    const cancelByDefault = true;

    if (itemStack.typeId === 'minecraft:tnt' && config?.antiGrief?.tnt?.enabled) {
        checkType = 'worldAntiGriefTntPlace';
        actionConfigKey = 'tnt';
        defaultMessageKey = 'antigrief.tntPlacementDenied';
    } else if (itemStack.typeId === 'minecraft:lava_bucket' && config?.antiGrief?.lava?.enabled) {
        checkType = 'worldAntiGriefLava';
        actionConfigKey = 'lava';
        defaultMessageKey = 'antigrief.lavaPlacementDenied';
    } else if (itemStack.typeId === 'minecraft:water_bucket' && config?.antiGrief?.water?.enabled) {
        checkType = 'worldAntiGriefWater';
        actionConfigKey = 'water';
        defaultMessageKey = 'antigrief.waterPlacementDenied';
    }

    if (checkType) {
        const playerPermission = rankManager?.getPlayerPermissionLevel(player, dependencies);
        const griefConfig = config.antiGrief[actionConfigKey];
        const isAdminAllowed = griefConfig.allowAdmins;

        if (isAdminAllowed && permissionLevels?.admin !== undefined && playerPermission <= permissionLevels.admin) {
            playerUtils?.debugLog(
                `[EvtHdlr.AntiGriefPlace] Admin ${playerName} placed ${itemStack.typeId}. Allowed.`,
                playerName, dependencies,
            );
            return;
        }

        const actionTaken = griefConfig.action || 'prevent';
        const violationDetails = {
            itemTypeId: itemStack.typeId,
            location: { x: block.location.x, y: block.location.y, z: block.location.z },
            actionTaken,
            playerName,
            x: block.location.x, y: block.location.y, z: block.location.z,
        };

        const profile = dependencies.checkActionProfiles?.[checkType];
        let shouldCancelEvent = cancelByDefault;
        if (profile && typeof profile.cancelEvent === 'boolean') {
            shouldCancelEvent = profile.cancelEvent;
        } else if (actionTaken === 'remove' || actionTaken === 'prevent') {
            shouldCancelEvent = true;
        } else {
            shouldCancelEvent = false;
        }
        const messageToWarn = playerUtils.getString(profile?.messageKey || defaultMessageKey, dependencies);

        if (shouldCancelEvent) {
            eventData.cancel = true;
        }

        await actionManager?.executeCheckAction(player, checkType, violationDetails, dependencies);

        if (eventData.cancel) {
            playerUtils?.warnPlayer(player, messageToWarn);
        }
    }
}
export const handlePlayerPlaceBlockBeforeEventAntiGrief = profileEventHandler('handlePlayerPlaceBlockBeforeEventAntiGrief', _handlePlayerPlaceBlockBeforeEventAntiGrief);


/**
 * Handles entity death events for cosmetic death effects.
 * @param {import('@minecraft/server').EntityDieAfterEvent} eventData The entity death event data.
 * @param {import('../types.js').Dependencies} dependencies Standard dependencies object.
 */
function _handleEntityDieForDeathEffects(eventData, dependencies) {
    const { config, playerUtils, logManager } = dependencies;
    if (!config?.enableDeathEffects) {
        return;
    }
    const { deadEntity } = eventData;
    if (!deadEntity?.isValid()) {
        return;
    }

    const entityName = deadEntity.name ?? deadEntity.typeId ?? 'UnknownEntity';

    if (!(deadEntity instanceof mc.Player)) {
        return;
    }

    playerUtils?.debugLog(`[EvtHdlr.DeathFx] Player ${entityName} died. Processing effects.`, entityName, dependencies);
    try {
        const location = deadEntity.location;
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
export const handleEntityDieForDeathEffects = profileEventHandler('handleEntityDieForDeathEffects', _handleEntityDieForDeathEffects);

/**
 * Handles entity hurt events for combat checks.
 * @param {import('@minecraft/server').EntityHurtAfterEvent} eventData The entity hurt event data.
 * @param {import('../types.js').Dependencies} dependencies Standard dependencies object.
 */
async function _handleEntityHurt(eventData, dependencies) {
    const { playerDataManager, checks, config, currentTick } = dependencies;
    const { hurtEntity, damageSource, damagingEntity: directDamagingEntity } = eventData;

    if (!hurtEntity?.isValid()) {
        return;
    }

    if (hurtEntity.typeId === 'minecraft:player') {
        const victimPlayer = /** @type {import('@minecraft/server').Player} */ (hurtEntity);
        const victimPData = playerDataManager?.getPlayerData(victimPlayer.id);

        if (victimPData) {
            victimPData.lastTookDamageTick = currentTick;
            victimPData.lastDamageCause = damageSource.cause;
            victimPData.lastDamagingEntityType = directDamagingEntity?.typeId;
            victimPData.isTakingFallDamage = damageSource.cause === mc.EntityDamageCause.fall;
            victimPData.isDirtyForSave = true;

            if (directDamagingEntity?.typeId === 'minecraft:player' &&
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

                    attackerPData.attackEvents ??= [];
                    attackerPData.attackEvents.push(Date.now());
                    attackerPData.lastAttackTick = currentTick;
                    attackerPData.lastPitch = attackerPlayer.getRotation().pitch;
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
                    if (checks?.checkViewSnap && config?.enableViewSnapCheck) {
                        await checks.checkViewSnap(attackerPlayer, attackerPData, dependencies, eventSpecificData);
                    }
                    if (checks?.checkCps && config?.enableCpsCheck) {
                        await checks.checkCps(attackerPlayer, attackerPData, dependencies);
                    }
                }
            }
            if (checks?.checkSelfHurt && config?.enableSelfHurtCheck) {
                await checks.checkSelfHurt(
                    victimPlayer, victimPData, dependencies,
                    { damagingEntity: directDamagingEntity, damageCause: damageSource.cause },
                );
            }
        }
    }
}
export const handleEntityHurt = profileEventHandler('handleEntityHurt', _handleEntityHurt);


/**
 * Handles player death events.
 * @param {import('@minecraft/server').PlayerDeathAfterEvent} eventData The player death event data.
 * @param {import('../types.js').Dependencies} dependencies Standard dependencies object.
 */
function _handlePlayerDeath(eventData, dependencies) {
    const { player } = eventData;
    const { playerDataManager, config, logManager, playerUtils } = dependencies; // Added playerUtils
    const playerName = player?.name ?? 'UnknownPlayer';

    if (!player?.isValid()) {
        console.warn('[EvtHdlr.Death] player is undefined or invalid.');
        return;
    }

    const pData = playerDataManager?.getPlayerData(player.id);
    if (!pData) {
        console.warn(`[EvtHdlr.Death] pData not found for ${playerName}.`);
        return;
    }

    if (config?.enableDeathCoordsMessage) {
        const location = player.location;
        const dimensionId = player.dimension.id.replace('minecraft:', '');
        const x = Math.floor(location.x);
        const y = Math.floor(location.y);
        const z = Math.floor(location.z);
        const deathCoordsMsgKey = config.deathCoordsMessageKey || 'message.deathCoords';
        pData.deathMessageToShowOnSpawn = {
            translate: deathCoordsMsgKey,
            with: { x: x.toString(), y: y.toString(), z: z.toString(), dimensionId },
        };
        pData.isDirtyForSave = true;
    }

    const killerEntity = eventData.damageSource?.damagingEntity;
    const killerName = killerEntity?.name ?? killerEntity?.typeId?.replace('minecraft:', '') ??
                       playerUtils.getString('common.value.notApplicable', dependencies) ?? 'N/A';

    logManager?.addLog({
        actionType: 'playerDeath',
        targetName: playerName, targetId: player.id,
        details: `Player died. Cause: ${eventData.damageSource?.cause ?? playerUtils.getString('common.value.unknown', dependencies) ?? 'Unknown'}. ` +
                 `Killer: ${killerName}.`,
        location: { x: Math.floor(player.location.x), y: Math.floor(player.location.y), z: Math.floor(player.location.z) },
        dimensionId: player.dimension.id,
    }, dependencies);
}
export const handlePlayerDeath = profileEventHandler('handlePlayerDeath', _handlePlayerDeath);

/**
 * Subscribes to entityHurt events for combat log detection.
 * @param {import('../types.js').Dependencies} dependencies Standard dependencies object.
 */
function _subscribeToCombatLogEvents(dependencies) {
    const { config, playerDataManager } = dependencies;
    if (!config?.enableCombatLogDetection) {
        return;
    }

    if (!world?.afterEvents?.entityHurt) {
        console.warn('[EvtHdlr.CombatLogSub] mc.world.afterEvents.entityHurt is not available. CombatLog detection disabled.');
        return;
    }

    world.afterEvents.entityHurt.subscribe((eventData) => {
        const { hurtEntity, damageSource } = eventData;
        const damagingEntity = damageSource?.damagingEntity;

        if (hurtEntity?.typeId === 'minecraft:player' && damagingEntity?.typeId === 'minecraft:player') {
            if (hurtEntity.id === damagingEntity.id) {
                return;
            }

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

export const subscribeToCombatLogEvents = _subscribeToCombatLogEvents;


/**
 * Handles player block break before events.
 * @param {import('@minecraft/server').PlayerBreakBlockBeforeEvent} eventData The player break block event data.
 * @param {import('../types.js').Dependencies} dependencies Standard dependencies object.
 */
async function _handlePlayerBreakBlockBeforeEvent(eventData, dependencies) {
    const { checks, config, playerDataManager, currentTick } = dependencies;
    const { player, block, itemStack } = eventData;

    if (!player?.isValid() || !block?.isValid()) {
        return;
    }

    const pData = playerDataManager?.getPlayerData(player.id);
    if (!pData) {
        return;
    }

    if (checks?.checkBreakUnbreakable && config?.enableInstaBreakUnbreakableCheck) {
        await checks.checkBreakUnbreakable(player, pData, eventData, dependencies);
        if (eventData.cancel) {
            return;
        }
    }

    if (!eventData.cancel) {
        if (!player.isValid()) {
            return;
        }
        const currentPData = playerDataManager?.getPlayerData(player.id);
        if (!currentPData) {
            dependencies.playerUtils?.debugLog(`[EvtHdlr.BreakBlockBefore] pData not found for ${player.name} after unbreakable check.`, player.name, dependencies);
            return;
        }

        if (config?.enableInstaBreakSpeedCheck || config?.enableAutoToolCheck) {
            const expectedTicks = getExpectedBreakTicks(player, block.permutation, itemStack, dependencies);
            currentPData.breakStartTickGameTime = currentTick;
            currentPData.expectedBreakDurationTicks = expectedTicks;
            currentPData.breakingBlockTypeId = block.typeId;
            currentPData.breakingBlockLocation = { x: block.location.x, y: block.location.y, z: block.location.z };
            currentPData.toolUsedForBreakAttempt = itemStack?.typeId;
            currentPData.slotAtBreakAttemptStart = player.selectedSlotIndex;
            currentPData.isAttemptingBlockBreak = true;
            currentPData.isDirtyForSave = true;
        }
    }
}
export const handlePlayerBreakBlockBeforeEvent = profileEventHandler('handlePlayerBreakBlockBeforeEvent', _handlePlayerBreakBlockBeforeEvent);

/**
 * Handles player block break after events.
 * @param {import('@minecraft/server').PlayerBreakBlockAfterEvent} eventData The player break block event data.
 * @param {import('../types.js').Dependencies} dependencies Standard dependencies object.
 */
async function _handlePlayerBreakBlockAfterEvent(eventData, dependencies) {
    const { config, playerDataManager, checks } = dependencies;
    const { player, block, brokenBlockPermutation } = eventData;

    if (!player?.isValid() || !brokenBlockPermutation?.type) {
        return;
    }

    const pData = playerDataManager?.getPlayerData(player.id);
    if (!pData) {
        return;
    }

    if (config?.enableNukerCheck) {
        pData.blockBreakEvents = pData.blockBreakEvents || [];
        pData.blockBreakEvents.push(Date.now());
        pData.isDirtyForSave = true;
    }

    if (checks?.checkXray && config?.xrayDetectionNotifyOnOreMineEnabled) {
        await checks.checkXray(player, block, brokenBlockPermutation.type, pData, dependencies);
    }

    if (checks?.checkBreakSpeed && config?.enableInstaBreakSpeedCheck) {
        await checks.checkBreakSpeed(player, pData, eventData, dependencies);
    }

    if (checks?.checkAutoTool && config?.enableAutoToolCheck) {
        const autoToolEventData = {
            brokenBlockOriginalType: brokenBlockPermutation.type,
            brokenBlockLocation: block.location,
            player,
        };
        pData.lastBreakCompleteTick = dependencies.currentTick;
        pData.blockBrokenWithOptimalTypeId = brokenBlockPermutation.type.id;
        pData.isAttemptingBlockBreak = false;
        await checks.checkAutoTool(player, pData, dependencies, autoToolEventData);
    }

    if (!player.isValid()) {
        return;
    }
    const finalPData = playerDataManager?.getPlayerData(player.id);
    if (!finalPData) {
        dependencies.playerUtils?.debugLog(`[EvtHdlr.BreakBlockAfter] pData not found for ${player.name} at end of handler.`, player.name, dependencies);
        return;
    }

    finalPData.breakingBlockTypeId = null;
    finalPData.breakingBlockLocation = null;
    finalPData.toolUsedForBreakAttempt = null;
    finalPData.expectedBreakDurationTicks = 0;
    finalPData.isDirtyForSave = true;
}
export const handlePlayerBreakBlockAfterEvent = profileEventHandler('handlePlayerBreakBlockAfterEvent', _handlePlayerBreakBlockAfterEvent);


/**
 * Handles item use events.
 * @param {import('@minecraft/server').ItemUseBeforeEvent} eventData The item use event data.
 * @param {import('../types.js').Dependencies} dependencies Standard dependencies object.
 */
async function _handleItemUse(eventData, dependencies) {
    const { checks, config, playerUtils, playerDataManager, actionManager } = dependencies;
    const { source: player, itemStack } = eventData;

    if (!player?.isValid() || !itemStack?.typeId) {
        return;
    }

    const pData = playerDataManager?.getPlayerData(player.id);
    if (!pData) {
        return;
    }


    const _currentTick = dependencies.currentTick;
    pData.lastItemUseTick = _currentTick;
    pData.isDirtyForSave = true;

    if (checks?.checkSwitchAndUseInSameTick && config?.enableInventoryModCheck) {
        await checks.checkSwitchAndUseInSameTick(player, pData, dependencies, { itemStack });
        if (eventData.cancel) {
            return;
        }
    }

    if (checks?.checkFastUse && config?.enableFastUseCheck) {
        await checks.checkFastUse(player, pData, dependencies, { itemStack });
        if (eventData.cancel) {
            return;
        }
    }

    const itemFoodComponent = itemStack.type?.getComponent('minecraft:food');
    if (itemFoodComponent && config?.enableStateConflictCheck) {
        pData.isUsingConsumable = true;
        pData.isDirtyForSave = true;
        const foodUseDurationTicks = (itemFoodComponent.usingConvertsTo === undefined)
            ? (itemFoodComponent.useDuration ?? defaultFoodUseDurationSeconds) * ticksPerSecond
            : minTimeoutDelayTicks;
        system?.runTimeout(() => {
            if (player.isValid()) {
                const currentPData = playerDataManager?.getPlayerData(player.id);
                if (currentPData?.isUsingConsumable) {
                    currentPData.isUsingConsumable = false;
                    currentPData.isDirtyForSave = true;
                }
            }
        }, Math.max(minTimeoutDelayTicks, Math.round(foodUseDurationTicks)));
    }

    if ((itemStack.typeId === 'minecraft:bow' || itemStack.typeId === 'minecraft:crossbow') && config?.enableStateConflictCheck) {
        pData.isChargingBow = true;
        pData.isDirtyForSave = true;
        // Reset after a reasonable time if the player stops using the item without firing
        system?.runTimeout(() => {
            if (player.isValid()) {
                const currentPData = playerDataManager?.getPlayerData(player.id);
                if (currentPData?.isChargingBow) {
                    currentPData.isChargingBow = false;
                    currentPData.isDirtyForSave = true;
                }
            }
        }, 3 * ticksPerSecond); // 3 seconds
    }

    if (itemStack.typeId === 'minecraft:shield' && config?.enableStateConflictCheck) {
        pData.isUsingShield = true;
        pData.isDirtyForSave = true;
        // Reset after a reasonable time if the player stops using the item
        system?.runTimeout(() => {
            if (player.isValid()) {
                const currentPData = playerDataManager?.getPlayerData(player.id);
                if (currentPData?.isUsingShield) {
                    currentPData.isUsingShield = false;
                    currentPData.isDirtyForSave = true;
                }
            }
        }, 3 * ticksPerSecond); // 3 seconds
    }


    if (config?.bannedItemsUse?.includes(itemStack.typeId)) {
        playerUtils?.warnPlayer(player, playerUtils.getString('antigrief.itemUseDenied', dependencies, { item: itemStack.typeId }));
        eventData.cancel = true;
        await actionManager?.executeCheckAction(
            player, 'worldIllegalItemUse',
            { itemTypeId: itemStack.typeId, action: 'use' }, dependencies,
        );

    }
}
export const handleItemUse = profileEventHandler('handleItemUse', _handleItemUse);

/**
 * Handles item use on block events.
 * @param {import('@minecraft/server').ItemUseOnBeforeEvent} eventData
 * @param {import('../types.js').Dependencies} dependencies
 */
function _handleItemUseOn(eventData, dependencies) {
    const { playerUtils } = dependencies;
    playerUtils?.debugLog('[EvtHdlr.ItemUseOn] ItemUseOn event triggered. This event might be unstable.', eventData.source?.name, dependencies);
}
export const handleItemUseOn = profileEventHandler('handleItemUseOn', _handleItemUseOn);

/**
 * Handles player inventory item change events.
 * @param {import('@minecraft/server').Player} player The player whose inventory changed.
 * @param {import('@minecraft/server').ItemStack|undefined} newItemStack The new item stack.
 * @param {import('@minecraft/server').ItemStack|undefined} oldItemStack The old item stack.
 * @param {string|number} slot The slot that changed.
 * @param {import('../types.js').Dependencies} dependencies Standard dependencies object.
 */
async function _handleInventoryItemChange(eventData, dependencies) {
    const { checks, config, playerDataManager } = dependencies;
    const { player, itemStack: newItemStack, previousItemStack: oldItemStack, slot } = eventData;
    if (!player?.isValid()) {
        return;
    }

    const pData = playerDataManager?.getPlayerData(player.id);
    if (!pData) {
        return;
    }

    if (checks?.checkInventoryMoveWhileActionLocked && config?.enableInventoryModCheck) {
        const inventoryChangeData = { newItemStack, oldItemStack, inventorySlot: slot.toString() };
        await checks.checkInventoryMoveWhileActionLocked(player, pData, dependencies, inventoryChangeData);
    }
}
export const handleInventoryItemChange = profileEventHandler('handleInventoryItemChange', _handleInventoryItemChange);

/**
 * Handles player block placement before events.
 * @param {import('@minecraft/server').PlayerPlaceBlockBeforeEvent} eventData The player place block event data.
 * @param {import('../types.js').Dependencies} dependencies Standard dependencies object.
 */
async function _handlePlayerPlaceBlockBefore(eventData, dependencies) {
    const { checks, config, playerDataManager, playerUtils } = dependencies; // Added playerUtils
    const { player, block, itemStack } = eventData;

    if (!player?.isValid() || !block || !itemStack?.typeId) {
        return;
    }

    const pData = playerDataManager?.getPlayerData(player.id);
    if (!pData) {
        eventData.cancel = true;
        playerUtils?.warnPlayer(player, playerUtils.getString('error.playerDataNotFound', dependencies));
        return;
    }

    if (checks?.checkAirPlace && config?.enableAirPlaceCheck) {
        await checks.checkAirPlace(player, pData, dependencies, eventData);
        if (eventData.cancel) {
            return;
        }
    }

    await handlePlayerPlaceBlockBeforeEventAntiGrief(eventData, dependencies);
}
export const handlePlayerPlaceBlockBefore = profileEventHandler('handlePlayerPlaceBlockBefore', _handlePlayerPlaceBlockBefore);

/**
 * Internal helper to process effects and checks after a block is placed.
 * @param {import('@minecraft/server').Player} player The player who placed the block.
 * @param {import('../types.js').PlayerAntiCheatData} pData The player's data.
 * @param {import('@minecraft/server').Block} block The block that was placed.
 * @param {import('../types.js').Dependencies} dependencies Standard dependencies object.
 */
async function _processPlayerPlaceBlockAfterEffects(player, pData, block, dependencies) {
    const { config, playerUtils, checks, currentTick, playerDataManager } = dependencies;
    const eventSpecificBlockData = { block };
    let pDataInternal = pData;
    let anAwaitOccurred = false;

    if (!player?.isValid() || !pDataInternal || !block?.isValid()) {
        return;
    }

    pDataInternal.recentBlockPlacements ??= [];
    pDataInternal.recentBlockPlacements.push({
        x: block.location.x, y: block.location.y, z: block.location.z,
        blockTypeId: block.typeId,
        pitch: player.getRotation().pitch, yaw: player.getRotation().yaw,
        tick: currentTick,
        dimensionId: player.dimension.id,
    });
    if (pDataInternal.recentBlockPlacements.length > (config?.towerPlacementHistoryLength ?? defaultTowerPlacementHistoryLength)) {
        pDataInternal.recentBlockPlacements.shift();
    }
    pDataInternal.isDirtyForSave = true;

    const checksToRun = [
        { check: checks?.checkTower, enabled: config?.enableTowerCheck },
        { check: checks?.checkFastPlace, enabled: config?.enableFastPlaceCheck },
        { check: checks?.checkDownwardScaffold, enabled: config?.enableDownwardScaffoldCheck },
        { check: checks?.checkBlockSpam, enabled: config?.enableBlockSpamAntiGrief },
        { check: checks?.checkBlockSpamDensity, enabled: config?.enableBlockSpamDensityCheck },
        { check: checks?.checkFlatRotationBuilding, enabled: config?.enableFlatRotationCheck },
    ];

    for (const { check, enabled } of checksToRun) {
        if (check && enabled) {
            await check(player, pDataInternal, dependencies, eventSpecificBlockData);
            anAwaitOccurred = true;
        }
    }

    if (anAwaitOccurred) {
        pDataInternal = playerDataManager.getPlayerData(player.id);
        if (!pDataInternal) {
            playerUtils.debugLog(
                `[EvtHdlr._ppbaEffects] pData became null for ${player.name} after awaits. Skipping Golem check.`,
                player.name, dependencies,
            );
            return;
        }
    }

    if (config?.enableEntitySpamAntiGrief && block.typeId === 'minecraft:carved_pumpkin') {
        const dimension = player.dimension;
        const blockBelow = dimension.getBlock(block.location.offset(0, blockOffsetOneBelow, 0));
        const blockTwoBelow = dimension.getBlock(block.location.offset(0, blockOffsetTwoBelow, 0));
        let potentialGolemType = null;

        if (blockBelow?.typeId === 'minecraft:iron_block' &&
            blockTwoBelow?.typeId === 'minecraft:iron_block'
        ) {
            potentialGolemType = 'minecraft:iron_golem';
        } else if (blockBelow?.typeId === 'minecraft:snow_block' &&
                 blockTwoBelow?.typeId === 'minecraft:snow_block'
        ) {
            potentialGolemType = 'minecraft:snow_golem';
        }

        if (potentialGolemType) {
            pDataInternal.expectingConstructedEntity = {
                type: potentialGolemType,
                location: { x: block.location.x, y: block.location.y, z: block.location.z },
                tick: currentTick,
            };
            pDataInternal.isDirtyForSave = true;
            playerUtils?.debugLog(
                `[EvtHdlr._ppbaEffects] Player ${player?.name} placed pumpkin for ${potentialGolemType}. Expecting entity.`,
                player?.name, dependencies,
            );
        }
    }
}

/**
 * Handles player block placement after events.
 * @param {import('@minecraft/server').PlayerPlaceBlockAfterEvent} eventData The player place block event data.
 * @param {import('../types.js').Dependencies} dependencies Standard dependencies object.
 */
async function _handlePlayerPlaceBlockAfterEvent(eventData, dependencies) {
    const { playerDataManager } = dependencies;
    const { player, block } = eventData;

    if (!player?.isValid() || !block?.isValid()) {
        return;
    }

    const pData = playerDataManager?.getPlayerData(player.id);
    if (!pData) {
        return;
    }

    await _processPlayerPlaceBlockAfterEffects(player, pData, block, dependencies);
}
export const handlePlayerPlaceBlockAfterEvent = profileEventHandler('handlePlayerPlaceBlockAfterEvent', _handlePlayerPlaceBlockAfterEvent);

/**
 * Processes chat messages before they are sent.
 * @param {import('@minecraft/server').ChatSendBeforeEvent} eventData The chat event data.
 * @param {import('../types.js').Dependencies} dependencies The dependencies object.
 */
async function _handleBeforeChatSend(eventData, dependencies) {
    const { playerDataManager, playerUtils, chatProcessor } = dependencies;
    const { sender: player, message: originalMessage } = eventData;

    if (!player?.isValid()) {
        console.warn('[EvtHdlr.ChatSend] Invalid player object.');
        eventData.cancel = true;
        return;
    }

    const pData = playerDataManager?.getPlayerData(player.id);
    if (!pData) {
        playerUtils?.warnPlayer(player, playerUtils.getString('error.playerDataNotFound', dependencies));
        eventData.cancel = true;
        return;
    }

    if (typeof chatProcessor?.processChatMessage !== 'function') {
        console.warn('[EvtHdlr.ChatSend CRITICAL] chatProcessor.processChatMessage is not available. Chat will not be processed for safety.');
        playerUtils?.warnPlayer(player, playerUtils.getString('error.chatProcessingUnavailable', dependencies));
        eventData.cancel = true;
        return;
    }

    await chatProcessor.processChatMessage(player, pData, originalMessage, eventData, dependencies);
}
/**
 * Handles chat messages before they are sent.
 * @param {import('@minecraft/server').ChatSendBeforeEvent} eventData The chat event data.
 * @param {import('../types.js').Dependencies} dependencies The dependencies object.
 */
export const handleBeforeChatSend = profileEventHandler('handleBeforeChatSend', _handleBeforeChatSend);

/**
 * Handles player dimension change after events.
 * @param {import('@minecraft/server').PlayerDimensionChangeAfterEvent} eventData The event data.
 * @param {import('../types.js').Dependencies} dependencies The dependencies object.
 */
async function _handlePlayerDimensionChangeAfterEvent(eventData, dependencies) {
    const { player, fromDimension, toDimension, fromLocation } = eventData;
    const { playerUtils, rankManager, permissionLevels, logManager, config, playerDataManager: pdm } = dependencies;
    const playerName = player?.name ?? 'UnknownPlayer';

    if (!player?.isValid() || !toDimension || !fromDimension || !fromLocation) {
        playerUtils?.debugLog('[EvtHdlr.DimChange] Incomplete event data for player.', playerName, dependencies);
        return;
    }

    const pData = pdm?.getPlayerData(player.id);
    if (pData) {
        pData.lastDimensionId = toDimension.id;
        pData.isDirtyForSave = true;
    } else {
        playerUtils?.debugLog(`[EvtHdlr.DimChange] pData not found for ${playerName} at start of dimension change.`, playerName, dependencies);
    }

    const playerPermission = rankManager?.getPlayerPermissionLevel(player, dependencies);
    if (typeof playerPermission === 'number' && permissionLevels?.admin !== undefined && playerPermission <= permissionLevels.admin) {
        playerUtils?.debugLog(
            `[EvtHdlr.DimChange] Player ${player.name} (Admin) bypassing dimension locks.`,
            player.name, dependencies,
        );
        return;
    }

    let dimensionIsLocked = false;
    let lockedDimensionName = '';
    const toDimensionIdClean = toDimension.id.replace('minecraft:', '');

    if (toDimensionIdClean === 'nether' && isNetherLocked()) {
        dimensionIsLocked = true;
        lockedDimensionName = playerUtils.getString('dimensionLock.name.nether', dependencies);
    } else if (toDimensionIdClean === 'the_end' && isEndLocked()) {
        dimensionIsLocked = true;
        lockedDimensionName = playerUtils.getString('dimensionLock.name.end', dependencies);
    }

    if (dimensionIsLocked) {
        try {
            await player.teleport(fromLocation, { dimension: fromDimension });
            playerUtils?.warnPlayer(player, playerUtils.getString('dimensionLock.teleportMessage', dependencies, { lockedDimensionName }));

            if (!player.isValid()) {
                return;
            }
            const currentPData = pdm?.getPlayerData(player.id);

            if (config.notifyOnDimensionLockAttempt !== false) {
                playerUtils?.notifyAdmins(
                    playerUtils.getString('admin.notify.dimensionLockAttempt', dependencies, { playerName: player.name, dimensionName: lockedDimensionName }),
                    dependencies, player, currentPData,
                );
            }
            logManager?.addLog({
                actionType: 'dimensionLockEnforced',
                targetName: player.name, targetId: player.id,
                details: `Attempted to enter locked dim: ${toDimension.id}. Teleported back to ${fromDimension.id}.`,
                fromDimensionId: fromDimension.id, toDimensionId: toDimension.id,
            }, dependencies);

        } catch (e) {
            console.error(`[EvtHdlr.DimChange CRITICAL] Failed to teleport ${player.name} from locked ${toDimensionIdClean}: ${e.stack || e}`);
            logManager?.addLog({
                actionType: 'errorEventHandlersDimensionLockTeleport', context: 'eventHandlers.handlePlayerDimensionChangeAfterEvent',
                targetName: player.name, targetId: player.id,
                details: {
                    fromDimensionId: fromDimension.id, toDimensionId: toDimension.id,
                    lockedDimensionName, errorMessage: e.message,
                },
                errorStack: e.stack,
            }, dependencies);
        }
    }
}
export const handlePlayerDimensionChangeAfterEvent = profileEventHandler('handlePlayerDimensionChangeAfterEvent', _handlePlayerDimensionChangeAfterEvent);

/**
 * Handles player hit entity events.
 * @param {import('@minecraft/server').EntityHitEntityAfterEvent} eventData The event data.
 * @param {import('../types.js').Dependencies} dependencies The dependencies object.
 */
async function _handlePlayerHitEntityEvent(eventData, dependencies) {
    const { checks, config, playerDataManager, mc } = dependencies;
    const { damagingEntity, hitEntity } = eventData;

    if (!damagingEntity?.isValid() || !hitEntity?.isValid()) {
        return;
    }

    if (damagingEntity instanceof mc.Player && config.enableNoSwingCheck && checks?.checkNoSwing) {
        const pData = playerDataManager.getPlayerData(damagingEntity.id);
        if (pData) {
            await checks.checkNoSwing(damagingEntity, pData, dependencies, eventData);
        }
    }
    dependencies.playerUtils.debugLog(`[EvtHdlr.HitEnt] _handlePlayerHitEntityEvent called for ${damagingEntity?.name} hitting ${hitEntity?.name}. Add actual implementation if missing.`, damagingEntity?.name, dependencies);
}

export const handlePlayerHitEntityEvent = profileEventHandler('handlePlayerHitEntityEvent', _handlePlayerHitEntityEvent);