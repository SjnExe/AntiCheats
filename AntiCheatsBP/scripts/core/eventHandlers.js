/**
 * @file Centralized handlers for various Minecraft Server API events.
 * Ensures consistent error handling and dependency usage.
 */
import * as mc from '@minecraft/server';
import { getExpectedBreakTicks, isNetherLocked, isEndLocked, formatSessionDuration } from '../utils/index.js'; // Assuming index.js exports these

/**
 * Handles player leave events.
 * @param {import('@minecraft/server').PlayerLeaveBeforeEvent} eventData - The player leave event data.
 * @param {import('../types.js').CommandDependencies} dependencies - Standard dependencies object.
 */
export async function handlePlayerLeave(eventData, dependencies) {
    const { playerDataManager, playerUtils, config: currentConfig, logManager, getString, actionManager } = dependencies;
    const { player } = eventData; // Player object from eventData
    const playerName = player?.nameTag ?? 'UnknownPlayer';

    if (!player?.isValid()) { // Check validity early
        console.warn('[EventHandler.handlePlayerLeave] Player undefined or invalid in eventData.');
        return;
    }
    playerUtils?.debugLog(`[EventHandler.handlePlayerLeave] Player ${playerName} is leaving. Processing data...`, playerName, dependencies);

    if (playerDataManager?.saveDirtyPlayerData) {
        try {
            await playerDataManager.saveDirtyPlayerData(player, dependencies);
            playerUtils?.debugLog(`[EventHandler.handlePlayerLeave] Data saved for ${playerName} on leave via saveDirtyPlayerData.`, playerName, dependencies);
        } catch (error) {
            console.error(`[EventHandler.handlePlayerLeave] Error in saveDirtyPlayerData for ${playerName} on leave: ${error.stack || error}`);
            logManager?.addLog({
                actionType: 'errorEventHandlersPdataSaveOnLeave',
                context: 'eventHandlers.handlePlayerLeave.saveDirtyPlayerData',
                targetName: playerName,
                details: {
                    errorMessage: error.message,
                    stack: error.stack
                }
            }, dependencies);
        }
    }

    const pData = playerDataManager?.getPlayerData(player.id);

    if (pData && currentConfig?.enableCombatLogDetection && pData?.lastCombatInteractionTime > 0) {
        const currentTime = Date.now();
        const timeSinceLastCombatMs = currentTime - pData.lastCombatInteractionTime;
        const combatLogThresholdMs = (currentConfig?.combatLogThresholdSeconds || 15) * 1000;

        if (timeSinceLastCombatMs < combatLogThresholdMs) {
            const timeSinceLastCombatSeconds = (timeSinceLastCombatMs / 1000).toFixed(1);
            const incrementAmount = currentConfig?.combatLogFlagIncrement || 1;

            playerUtils?.debugLog(`[EventHandler.handlePlayerLeave] CombatLog: Player ${playerName} left ${timeSinceLastCombatSeconds}s after combat. Threshold: ${currentConfig?.combatLogThresholdSeconds}s. Flagging +${incrementAmount}.`, playerName, dependencies);

            const violationDetails = { timeSinceLastCombat: timeSinceLastCombatSeconds, incrementAmount };
            await actionManager?.executeCheckAction(player, 'combatLog', violationDetails, dependencies);
        }
    }

    if (pData) {
        const lastLocation = pData?.lastPosition ?? player?.location;
        const lastDimensionId = (pData?.lastDimensionId ?? player?.dimension?.id)?.replace('minecraft:', '');
        const lastGameModeString = mc.GameMode[pData?.lastGameMode] ?? getString?.('common.value.unknown');
        let sessionDurationString = getString?.('common.value.notApplicable');
        if (pData?.joinTime && pData.joinTime > 0) {
            sessionDurationString = formatSessionDuration(Date.now() - pData.joinTime);
        }
        logManager?.addLog({
            actionType: 'playerLeave',
            targetName: playerName,
            targetId: player.id,
            details: `Last Loc: ${Math.floor(lastLocation?.x ?? 0)},${Math.floor(lastLocation?.y ?? 0)},${Math.floor(lastLocation?.z ?? 0)} in ${lastDimensionId}. GameMode: ${lastGameModeString}. Session: ${sessionDurationString}.`,
            location: { x: Math.floor(lastLocation?.x ?? 0), y: Math.floor(lastLocation?.y ?? 0), z: Math.floor(lastLocation?.z ?? 0), dimensionId: lastDimensionId },
            gameMode: lastGameModeString,
            sessionDuration: sessionDurationString,
        }, dependencies);
    }

    try {
        // prepareAndSavePlayerData already checks player.isValid()
        await playerDataManager?.prepareAndSavePlayerData(player, dependencies);
    } catch (error) {
        console.error(`[EventHandler.handlePlayerLeave] Error in prepareAndSavePlayerData for ${playerName} on leave: ${error.stack || error}`);
        logManager?.addLog({
            actionType: 'errorEventHandlersPdataPrepareSaveOnLeave',
            context: 'eventHandlers.handlePlayerLeave.prepareAndSavePlayerData',
            targetName: playerName,
            details: {
                errorMessage: error.message,
                stack: error.stack
            }
        }, dependencies);
    }
    playerUtils?.debugLog(`[EventHandler.handlePlayerLeave] Finished processing for ${playerName}.`, playerName, dependencies);

    if (currentConfig?.enableDetailedJoinLeaveLogging) {
        console.warn(`[LeaveLog] Player: ${playerName} (ID: ${player?.id}) left the game.`);
    }
}

/**
 * Handles player spawn events (initial join and respawn).
 * @param {import('@minecraft/server').PlayerSpawnAfterEvent} eventData - The player spawn event data.
 * @param {import('../types.js').CommandDependencies} dependencies - Standard dependencies object.
 */
export async function handlePlayerSpawn(eventData, dependencies) {
    const { player, initialSpawn } = eventData;
    const { playerDataManager, playerUtils, config, logManager, checks, getString, rankManager, mc: minecraftSystem } = dependencies;
    const playerName = player?.nameTag ?? 'UnknownPlayer';

    // Robust dependency check
    if (!playerDataManager || !playerUtils || !config || !logManager || !checks || !getString || !rankManager || !minecraftSystem?.system) {
        console.error('[EventHandler.handlePlayerSpawn] Critical: Invalid or incomplete dependencies. Aborting.');
        if (player?.isValid()) {
            try { player.sendMessage('§cAntiCheat Error: Critical issue (HPS_DEPS). Contact admin.'); } catch (e) { /* ignore */ }
        }
        return;
    }

    if (!player) { // Should not happen if PlayerSpawnAfterEvent is valid
        console.warn('[EventHandler.handlePlayerSpawn] eventData.player is undefined.');
        return;
    }
    playerUtils.debugLog(`[EventHandler.handlePlayerSpawn] Processing for ${playerName} (Initial: ${initialSpawn}). Tick: ${minecraftSystem.system.currentTick}`, playerName, dependencies);

    try {
        const pData = await playerDataManager.ensurePlayerDataInitialized(player, minecraftSystem.system.currentTick, dependencies);
        if (!pData) {
            console.error(`[EventHandler.handlePlayerSpawn] CRITICAL: pData null for ${playerName}. Aborting spawn logic.`);
            return;
        }

        // Reset transient states
        pData.lastGameMode = player.gameMode;
        pData.lastDimensionId = player.dimension.id;
        pData.isUsingConsumable = false;
        pData.isChargingBow = false;
        pData.isUsingShield = false;
        pData.isDirtyForSave = true;

        const banInfo = playerDataManager.getBanInfo(player, dependencies);
        if (banInfo) {
            playerUtils.debugLog(`[EventHandler.handlePlayerSpawn] Player ${playerName} is banned. Kicking. Reason: ${banInfo.reason}, Expires: ${new Date(banInfo.unbanTime).toISOString()}`, playerName, dependencies);
            const durationStringKick = getString(banInfo.unbanTime === Infinity ? 'ban.duration.permanent' : 'ban.duration.expires', { expiryDate: new Date(banInfo.unbanTime).toLocaleString() });
            let kickReason = getString('ban.kickMessage', { reason: banInfo.reason ?? getString('common.value.noReasonProvided'), durationMessage: durationStringKick });
            if (config.discordLink && config.discordLink.trim() !== '' && config.discordLink !== 'https://discord.gg/example') {
                kickReason += `\n${getString('ban.kickMessage.discord', { discordLink: config.discordLink })}`;
            }
            await player.kick(kickReason); // Await kick
            return;
        }

        rankManager?.updatePlayerNametag(player, dependencies);
        playerUtils.debugLog(`[EventHandler.handlePlayerSpawn] Nametag updated for ${playerName}.`, playerName, dependencies);

        if (initialSpawn && config.enableWelcomerMessage) {
            const welcomeMsgKey = config.welcomeMessage || 'welcome.joinMessage';
            const message = getString(welcomeMsgKey, { playerName: player.nameTag }); // Use nameTag for welcome
            minecraftSystem.system.runTimeout(() => {
                try { if (player.isValid()) player.sendMessage(message); } catch (e) { console.warn(`[EventHandler.handlePlayerSpawn] Failed to send welcome to ${playerName}: ${e.message}`); }
            }, 20);

            pData.joinTime = Date.now();
            // isDirtyForSave already true

            const spawnLocation = player.location;
            const spawnDimensionId = player.dimension.id.replace('minecraft:', '');
            const spawnGameMode = mc.GameMode[player.gameMode] ?? getString('common.value.unknown');
            logManager?.addLog({
                actionType: 'playerInitialJoin',
                targetName: playerName,
                targetId: player.id,
                details: `Joined. Loc: ${Math.floor(spawnLocation.x)},${Math.floor(spawnLocation.y)},${Math.floor(spawnLocation.z)} in ${spawnDimensionId}. GM: ${spawnGameMode}.`,
                location: { x: Math.floor(spawnLocation.x), y: Math.floor(spawnLocation.y), z: Math.floor(spawnLocation.z), dimensionId: spawnDimensionId },
                gameMode: spawnGameMode,
            }, dependencies);

            if (config.notifyAdminOnNewPlayerJoin) {
                playerUtils.notifyAdmins(getString('admin.notify.newPlayerJoined', { playerName: player.nameTag }), dependencies, player, pData);
            }
        } else if (!initialSpawn) { // Respawn
            const spawnLocation = player.location;
            const spawnDimensionId = player.dimension.id.replace('minecraft:', '');
            const spawnGameMode = mc.GameMode[player.gameMode] ?? getString('common.value.unknown');
            logManager?.addLog({
                actionType: 'playerRespawn',
                targetName: playerName,
                targetId: player.id,
                details: `Respawned. Loc: ${Math.floor(spawnLocation.x)},${Math.floor(spawnLocation.y)},${Math.floor(spawnLocation.z)} in ${spawnDimensionId}. GM: ${spawnGameMode}.`,
                location: { x: Math.floor(spawnLocation.x), y: Math.floor(spawnLocation.y), z: Math.floor(spawnLocation.z), dimensionId: spawnDimensionId },
                gameMode: spawnGameMode,
            }, dependencies);
        }

        if (pData.deathMessageToShowOnSpawn && config.enableDeathCoordsMessage) {
            minecraftSystem.system.runTimeout(() => {
                try { if (player.isValid()) player.sendMessage(pData.deathMessageToShowOnSpawn); } catch (e) { console.warn(`[EventHandler.handlePlayerSpawn] Failed to send death coords to ${playerName}: ${e.message}`); }
            }, 5); // Short delay for message
            playerUtils.debugLog(`[EventHandler.handlePlayerSpawn] DeathCoords: Displayed to ${playerName}: '${pData.deathMessageToShowOnSpawn}'`, pData.isWatched ? playerName : null, dependencies);
            pData.deathMessageToShowOnSpawn = null; // Clear after showing
            // isDirtyForSave already true
        }

        if (checks?.checkInvalidRenderDistance && config.enableInvalidRenderDistanceCheck) {
            await checks.checkInvalidRenderDistance(player, pData, dependencies);
        }

        if (config.enableDetailedJoinLeaveLogging) {
            const deviceType = player.clientSystemInfo?.platformType?.toString() ?? getString('common.value.unknown');
            const gameModeName = mc.GameMode[player.gameMode] ?? getString('common.value.unknown');
            const loc = player.location;
            const dimId = player.dimension.id.replace('minecraft:', '') ?? getString('common.value.unknown');
            const locStr = `${Math.floor(loc.x)}, ${Math.floor(loc.y)}, ${Math.floor(loc.z)} in ${dimId}`;
            console.warn(`[JoinLog] Player: ${playerName} (ID: ${player.id}, Device: ${deviceType}, Mode: ${gameModeName}) ${initialSpawn ? 'joined' : 'spawned'} at ${locStr}.`);
        }

    } catch (error) {
        console.error(`[EventHandler.handlePlayerSpawn] Error for ${playerName}: ${error.stack || error}`);
        playerUtils?.debugLog(`[EventHandler.handlePlayerSpawn] Error for ${playerName}: ${error.message}`, playerName, dependencies);
        logManager?.addLog({
            actionType: 'errorEventHandlersPlayerSpawn',
            context: 'eventHandlers.handlePlayerSpawn',
            targetName: playerName,
            details: {
                initialSpawn: initialSpawn,
                errorMessage: error.message,
                stack: error.stack
            }
        }, dependencies);
    }
}

/**
 * Handles piston activation events for AntiGrief (e.g., lag machine detection).
 * @param {import('@minecraft/server').PistonActivateAfterEvent} eventData - The piston activation event data.
 * @param {import('../types.js').CommandDependencies} dependencies - Standard dependencies object.
 */
export async function handlePistonActivate_AntiGrief(eventData, dependencies) {
    const { config, playerUtils, checks } = dependencies;
    if (!config?.enablePistonLagCheck) {
        return;
    }

    const { pistonBlock, dimension } = eventData;
    if (!pistonBlock) {
        playerUtils?.debugLog('[EventHandler.handlePistonActivate_AntiGrief] PistonBlock undefined.', null, dependencies);
        return;
    }
    if (!dimension) {
        playerUtils?.debugLog(`[EventHandler.handlePistonActivate_AntiGrief] Dimension undefined for piston at ${JSON.stringify(pistonBlock.location)}.`, null, dependencies);
        return;
    }

    if (checks?.checkPistonLag) {
        await checks.checkPistonLag(pistonBlock, dimension.id, dependencies);
    } else {
        playerUtils?.debugLog('[EventHandler.handlePistonActivate_AntiGrief] checkPistonLag function unavailable.', null, dependencies);
    }
}

/**
 * Handles entity spawn events for AntiGrief (e.g., Wither, Golem spam).
 * @param {import('@minecraft/server').EntitySpawnAfterEvent} eventData - The entity spawn event data.
 * @param {import('../types.js').CommandDependencies} dependencies - Standard dependencies object.
 */
export async function handleEntitySpawnEvent_AntiGrief(eventData, dependencies) {
    const { config, playerUtils, actionManager, playerDataManager, checks, mc: minecraftSystem } = dependencies;
    const { entity } = eventData;
    const entityName = entity?.typeId ?? 'UnknownEntity';

    if (!entity) {
        playerUtils?.debugLog('[EventHandler.handleEntitySpawnEvent_AntiGrief] Entity undefined.', null, dependencies);
        return;
    }

    if (entity.typeId === 'minecraft:wither' && config?.enableWitherAntiGrief) {
        playerUtils?.debugLog(`[EventHandler.handleEntitySpawnEvent_AntiGrief] Wither spawned (ID: ${entity.id}). Action: ${config.witherSpawnAction}.`, null, dependencies);
        const violationDetails = { entityId: entity.id, entityType: entity.typeId, actionTaken: config.witherSpawnAction, playerNameOrContext: 'System/Environment' };
        await actionManager?.executeCheckAction(null, 'worldAntiGriefWitherSpawn', violationDetails, dependencies); // Pass null for player
        if (config.witherSpawnAction === 'kill') {
            try { entity.kill(); } catch (e) {
                console.warn(`[EventHandler.handleEntitySpawnEvent_AntiGrief] Failed to kill wither: ${e.message}`);
                dependencies.logManager?.addLog({
                    actionType: 'errorEventHandlersKillWither',
                    context: 'eventHandlers.handleEntitySpawnEvent_AntiGrief',
                    details: {
                        entityId: entity.id,
                        entityType: entity.typeId,
                        errorMessage: e.message,
                        stack: e.stack
                    }
                }, dependencies);
            }
            playerUtils?.debugLog(`[EventHandler.handleEntitySpawnEvent_AntiGrief] Wither (ID: ${entity.id}) killed.`, null, dependencies);
        }
    } else if (config?.enableEntitySpamAntiGrief && (entity.typeId === 'minecraft:snow_golem' || entity.typeId === 'minecraft:iron_golem')) {
        playerUtils?.debugLog(`[EventHandler.handleEntitySpawnEvent_AntiGrief] ${entityName} spawned. Checking attribution. Tick: ${minecraftSystem?.system?.currentTick}`, null, dependencies);
        for (const player of minecraftSystem.world.getAllPlayers()) { // Ensure mc.world is valid
            const pData = playerDataManager?.getPlayerData(player.id);
            if (pData?.expectingConstructedEntity?.type === entity.typeId &&
                Math.abs(pData.expectingConstructedEntity.tick - (minecraftSystem?.system?.currentTick ?? 0)) < 10) { // Default tick to 0 if undefined
                const playerName = player?.nameTag ?? 'UnknownPlayer';
                playerUtils?.debugLog(`[EventHandler.handleEntitySpawnEvent_AntiGrief] Attributed ${entityName} to ${playerName}. Expectation: ${JSON.stringify(pData.expectingConstructedEntity)}`, playerName, dependencies);
                if (checks?.checkEntitySpam) {
                    const isSpam = await checks.checkEntitySpam(player, entity.typeId, pData, dependencies);
                    if (isSpam && config.entitySpamAction === 'kill') {
                        try { entity.kill(); } catch (e) {
                            console.warn(`[EventHandler.handleEntitySpawnEvent_AntiGrief] Failed to kill ${entityName}: ${e.message}`);
                            dependencies.logManager?.addLog({
                                actionType: 'errorEventHandlersKillRestrictedEntity',
                                context: 'eventHandlers.handleEntitySpawnEvent_AntiGrief.spamKill',
                                details: {
                                    entityId: entity.id,
                                    entityType: entityName,
                                    attributedPlayer: playerName,
                                    errorMessage: e.message,
                                    stack: e.stack
                                }
                            }, dependencies);
                        }
                        playerUtils?.debugLog(`[EventHandler.handleEntitySpawnEvent_AntiGrief] ${entityName} (ID: ${entity.id}) killed (spam by ${playerName}).`, playerName, dependencies);
                    }
                }
                pData.expectingConstructedEntity = null; // Clear expectation
                pData.isDirtyForSave = true;
                break; // Attributed, stop checking other players
            }
        }
    }
}

/**
 * Handles player block placement before events for AntiGrief (e.g., TNT).
 * @param {import('@minecraft/server').PlayerPlaceBlockBeforeEvent} eventData - The player place block event data.
 * @param {import('../types.js').CommandDependencies} dependencies - Standard dependencies object.
 */
export async function handlePlayerPlaceBlockBeforeEvent_AntiGrief(eventData, dependencies) {
    const { config, playerUtils, actionManager, rankManager, getString, permissionLevels } = dependencies;
    const { player, itemStack, block } = eventData;
    const playerName = player?.nameTag ?? 'UnknownPlayer';

    if (!player || !itemStack || !block) return;

    if (itemStack.typeId === 'minecraft:tnt' && config?.enableTntAntiGrief) {
        const playerPermission = rankManager?.getPlayerPermissionLevel(player, dependencies);
        if (config.allowAdminTntPlacement && permissionLevels?.admin !== undefined && playerPermission <= permissionLevels.admin) {
            playerUtils?.debugLog(`[EventHandler.handlePlayerPlaceBlockBeforeEvent_AntiGrief] Admin ${playerName} placed TNT. Allowed.`, playerName, dependencies);
            return;
        }

        const violationDetails = {
            itemTypeId: itemStack.typeId,
            location: { x: block.location.x, y: block.location.y, z: block.location.z }, // Store as object
            actionTaken: 'prevented', // Default action if profile doesn't specify cancelEvent:false
            playerName: playerName,
            x: block.location.x, y: block.location.y, z: block.location.z, // For simple template replacement
        };
        await actionManager?.executeCheckAction(player, 'worldAntiGriefTntPlace', violationDetails, dependencies);

        const profile = dependencies.checkActionProfiles?.['worldAntiGriefTntPlace'];
        if (profile?.cancelEvent !== false) { // Cancel by default if profile exists and cancelEvent is not explicitly false
            eventData.cancel = true;
            playerUtils?.warnPlayer(player, getString(profile?.messageKey || 'antigrief.tntPlacementDenied'));
        }
    }
}

/**
 * Handles entity death events for cosmetic death effects.
 * @param {import('@minecraft/server').EntityDieAfterEvent} eventData - The entity death event data.
 * @param {import('../types.js').CommandDependencies} dependencies - Standard dependencies object.
 */
export async function handleEntityDieForDeathEffects(eventData, dependencies) {
    const { config: currentConfig, playerUtils, logManager } = dependencies;
    if (!currentConfig?.enableDeathEffects) {
        return;
    }

    const { deadEntity } = eventData;
    const entityName = deadEntity?.nameTag ?? deadEntity?.typeId ?? 'UnknownEntity';

    if (!(deadEntity instanceof mc.Player)) { // Only for players currently
        return;
    }

    playerUtils?.debugLog(`[EventHandler.handleEntityDieForDeathEffects] Player ${entityName} died. Processing effects.`, entityName, dependencies);
    try {
        if (currentConfig.deathEffectParticleName) {
            deadEntity.dimension.spawnParticle(currentConfig.deathEffectParticleName, deadEntity.location);
        }
        if (currentConfig.deathEffectSoundId) {
            deadEntity.dimension.playSound(currentConfig.deathEffectSoundId, deadEntity.location);
        }
    } catch (e) {
        console.warn(`[EventHandler.handleEntityDieForDeathEffects] Error applying death effect for ${entityName}: ${e.message}`);
        logManager?.addLog({
            actionType: 'errorEventHandlersDeathEffect',
            context: 'eventHandlers.handleEntityDieForDeathEffects',
            targetName: entityName,
            details: {
                particleName: currentConfig.deathEffectParticleName,
                soundId: currentConfig.deathEffectSoundId,
                errorMessage: e.message,
                stack: e.stack
            }
        }, dependencies);
    }
}

/**
 * Handles entity hurt events for combat checks and state updates.
 * @param {import('@minecraft/server').EntityHurtAfterEvent} eventData - The entity hurt event data.
 * @param {import('../types.js').CommandDependencies} dependencies - Standard dependencies object.
 */
export async function handleEntityHurt(eventData, dependencies) {
    const { playerDataManager, checks, config, currentTick } = dependencies;
    const { hurtEntity, damageSource, damagingEntity: directDamagingEntity } = eventData;

    if (hurtEntity?.typeId === mc.MinecraftEntityTypes.player.id) { // Use constant for player typeId
        const victimPlayer = /** @type {import('@minecraft/server').Player} */ (hurtEntity);
        const victimPData = playerDataManager?.getPlayerData(victimPlayer.id);

        if (victimPData) {
            victimPData.lastTookDamageTick = currentTick;
            victimPData.lastDamageCause = damageSource.cause;
            victimPData.lastDamagingEntityType = directDamagingEntity?.typeId;
            victimPData.isDirtyForSave = true;

            if (directDamagingEntity?.typeId === mc.MinecraftEntityTypes.player.id && directDamagingEntity.id !== victimPlayer.id) {
                const attackerPlayer = /** @type {import('@minecraft/server').Player} */ (directDamagingEntity);
                victimPData.lastCombatInteractionTime = Date.now(); // Update for victim

                const attackerPData = playerDataManager?.getPlayerData(attackerPlayer.id);
                if (attackerPData) {
                    attackerPData.lastCombatInteractionTime = Date.now(); // Update for attacker
                    attackerPData.isDirtyForSave = true;
                    attackerPData.attackEvents ??= [];
                    attackerPData.attackEvents.push(Date.now());
                    attackerPData.lastAttackTick = currentTick;

                    const eventSpecificData = { targetEntity: victimPlayer, damagingEntity: attackerPlayer, cause: damageSource, gameMode: attackerPlayer.gameMode };
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
                }
            }

            if (checks?.checkSelfHurt && config?.enableSelfHurtCheck) {
                await checks.checkSelfHurt(victimPlayer, victimPData, dependencies, { damagingEntity: directDamagingEntity, cause: damageSource });
            }
        }
    }
}

/**
 * Handles player death events (e.g., logging, death coordinates).
 * @param {import('@minecraft/server').PlayerDeathAfterEvent} eventData - The player death event data.
 * @param {import('../types.js').CommandDependencies} dependencies - Standard dependencies object.
 */
export async function handlePlayerDeath(eventData, dependencies) {
    const { player } = eventData;
    const { playerDataManager, config, logManager, getString } = dependencies;
    const playerName = player?.nameTag ?? 'UnknownPlayer';

    if (!player) {
        console.warn('[EventHandler.handlePlayerDeath] player is undefined.');
        return;
    }

    const pData = playerDataManager?.getPlayerData(player.id);
    if (!pData) {
        console.warn(`[EventHandler.handlePlayerDeath] pData not found for ${playerName}.`);
        return;
    }

    if (config?.enableDeathCoordsMessage) {
        const location = player.location;
        const dimensionId = player.dimension.id.replace('minecraft:', '');
        const x = Math.floor(location.x);
        const y = Math.floor(location.y);
        const z = Math.floor(location.z);
        const deathCoordsMsgKey = config.deathCoordsMessage || 'message.deathCoords';
        pData.deathMessageToShowOnSpawn = getString(deathCoordsMsgKey, { x: x.toString(), y: y.toString(), z: z.toString(), dimensionId: dimensionId });
        pData.isDirtyForSave = true;
    }

    logManager?.addLog({
        actionType: 'playerDeath',
        targetName: playerName,
        targetId: player.id,
        details: `Player died. Cause: ${eventData.damageSource?.cause ?? getString('common.value.unknown')}. Killer: ${eventData.killer?.nameTag ?? getString('common.value.notApplicable')}.`,
        location: {x: player.location.x, y: player.location.y, z: player.location.z }, // Ensure location is an object
        dimensionId: player.dimension.id,
    }, dependencies);
}

/**
 * Subscribes to entityHurt events for combat log detection.
 * This function sets up the event listener.
 * @param {import('../types.js').CommandDependencies} dependencies - Standard dependencies object.
 */
export function subscribeToCombatLogEvents(dependencies) {
    const { config, playerDataManager, mc: minecraftSystem } = dependencies;
    if (!config?.enableCombatLogDetection) {
        return;
    }

    minecraftSystem?.world?.afterEvents?.entityHurt?.subscribe((eventData) => {
        const { hurtEntity, damageSource } = eventData;
        const damagingEntity = damageSource?.damagingEntity;

        // Ensure both are players and not the same player
        if (hurtEntity?.typeId === mc.MinecraftEntityTypes.player.id && damagingEntity?.typeId === mc.MinecraftEntityTypes.player.id) {
            if (hurtEntity.id === damagingEntity.id) {
                return; // Ignore self-harm for combat log timing
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
}

/**
 * Handles player block break before events (e.g., InstaBreak timing).
 * @param {import('@minecraft/server').PlayerBreakBlockBeforeEvent} eventData - The player break block event data.
 * @param {import('../types.js').CommandDependencies} dependencies - Standard dependencies object.
 */
export async function handlePlayerBreakBlockBeforeEvent(eventData, dependencies) {
    const { checks, config, playerDataManager, currentTick } = dependencies;
    const { player, block, itemStack } = eventData;

    if (!player || !block) return;

    const pData = playerDataManager?.getPlayerData(player.id);
    if (!pData) return;

    if (checks?.checkBreakUnbreakable && config?.enableInstaBreakUnbreakableCheck) {
        await checks.checkBreakUnbreakable(player, pData, eventData, dependencies);
        if (eventData.cancel) return; // Stop if cancelled by unbreakable check
    }

    if (config?.enableInstaBreakSpeedCheck) {
        const expectedTicks = getExpectedBreakTicks(player, block.permutation, itemStack, dependencies);
        pData.breakStartTickGameTime = currentTick; // Ensure currentTick is from dependencies
        pData.expectedBreakDurationTicks = expectedTicks;
        pData.breakingBlockTypeId = block.typeId;
        pData.breakingBlockLocation = { x: block.location.x, y: block.location.y, z: block.location.z };
        pData.toolUsedForBreakAttempt = itemStack?.typeId; // Optional: itemStack can be undefined (hand)
        pData.isDirtyForSave = true;
    }
}

/**
 * Handles player block break after events (e.g., XRay, InstaBreak speed).
 * @param {import('@minecraft/server').PlayerBreakBlockAfterEvent} eventData - The player break block event data.
 * @param {import('../types.js').CommandDependencies} dependencies - Standard dependencies object.
 */
export async function handlePlayerBreakBlockAfterEvent(eventData, dependencies) {
    const { config, playerDataManager, checks } = dependencies;
    const { player, block, brokenBlockPermutation } = eventData; // block is the new air block, brokenBlockPermutation is what was there.

    if (!player || !brokenBlockPermutation) return;

    const pData = playerDataManager?.getPlayerData(player.id);
    if (!pData) return;

    if (checks?.checkXray && config?.xrayDetectionNotifyOnOreMineEnabled) {
        // Pass the original block's location, but the type from brokenBlockPermutation
        await checks.checkXray(player, block, brokenBlockPermutation.type, pData, dependencies);
    }

    if (checks?.checkBreakSpeed && config?.enableInstaBreakSpeedCheck) {
        await checks.checkBreakSpeed(player, pData, eventData, dependencies);
    }

    // Clear break attempt data
    pData.breakingBlockTypeId = null;
    pData.breakingBlockLocation = null;
    pData.toolUsedForBreakAttempt = null;
    pData.isDirtyForSave = true;

    if (checks?.checkAutoTool && config?.enableAutoToolCheck) {
        // Pass the original block that was broken (now air, but location is key)
        await checks.checkAutoTool(player, pData, dependencies, { brokenBlock: block });
    }
}

/**
 * Handles item use events.
 * @param {import('@minecraft/server').ItemUseBeforeEvent} eventData - The item use event data.
 * @param {import('../types.js').CommandDependencies} dependencies - Standard dependencies object.
 */
export async function handleItemUse(eventData, dependencies) {
    const { checks, config, getString, playerUtils, playerDataManager, mc: minecraftSystem } = dependencies;
    const { source: player, itemStack } = eventData;

    if (!player || !itemStack) return;

    const pData = playerDataManager?.getPlayerData(player.id);
    if (!pData) return;

    if (checks?.checkSwitchAndUseInSameTick && config?.enableInventoryModCheck) {
        await checks.checkSwitchAndUseInSameTick(player, pData, dependencies, { itemStack });
        if (eventData.cancel) return;
    }

    if (checks?.checkFastUse && config?.enableFastUseCheck) {
        await checks.checkFastUse(player, pData, dependencies, { itemStack });
        if (eventData.cancel) return;
    }

    const itemFoodComponent = itemStack.type?.getComponent(mc.ItemComponentTypes.Food);
    if (itemFoodComponent && config?.enableChatDuringItemUseCheck) {
        pData.isUsingConsumable = true;
        pData.isDirtyForSave = true;
        minecraftSystem?.system?.runTimeout(() => {
            // Re-fetch pData in timeout as it might have changed or player might have left
            const currentPData = player.isValid() ? playerDataManager?.getPlayerData(player.id) : null;
            if (currentPData?.isUsingConsumable) {
                currentPData.isUsingConsumable = false;
                currentPData.isDirtyForSave = true;
            }
        }, (itemFoodComponent.nutrition ?? 1.6) * 20); // Default nutrition if undefined for tick calculation
    }

    if (config?.bannedItemsUse?.includes(itemStack.typeId)) {
        playerUtils?.warnPlayer(player, getString('antigrief.itemUseDenied', { item: itemStack.typeId }));
        eventData.cancel = true;
        await dependencies.actionManager?.executeCheckAction(player, 'worldIllegalItemUse', { itemTypeId: itemStack.typeId, action: 'use' }, dependencies);
        return; // Important to return after cancelling
    }

    pData.lastItemUseTick = dependencies.currentTick; // Ensure currentTick is from dependencies
    pData.isDirtyForSave = true;
}

/**
 * Handles item use on block events.
 * @param {import('@minecraft/server').ItemUseOnBeforeEvent} eventData
 * @param {import('../types.js').CommandDependencies} dependencies
 */
// Orphaned: mc.world.beforeEvents.itemUseOn is unavailable.
// export async function handleItemUseOn(eventData, dependencies) { ... }

/**
 * Handles player inventory item change events.
 * @param {import('@minecraft/server').Player} player - The player whose inventory changed.
 * @param {import('@minecraft/server').ItemStack | undefined} newItem - The new item stack in the slot.
 * @param {import('@minecraft/server').ItemStack | undefined} oldItem - The old item stack that was in the slot.
 * @param {string} slotName - The name/ID of the slot that changed (e.g., 'Mainhand', 'Offhand', 'inventory.slot.0').
 * @param {import('../types.js').CommandDependencies} dependencies - Standard dependencies object.
 */
export async function handleInventoryItemChange(player, newItem, oldItem, slotName, dependencies) {
    const { checks, config, playerDataManager } = dependencies;
    if (!player) return;

    const pData = playerDataManager?.getPlayerData(player.id);
    if (!pData) return;

    if (checks?.checkInventoryMoveWhileActionLocked && config?.enableInventoryModCheck) {
        const inventoryChangeData = { newItemStack: newItem, oldItemStack: oldItem, inventorySlot: slotName };
        await checks.checkInventoryMoveWhileActionLocked(player, pData, dependencies, inventoryChangeData);
    }
}

/**
 * Handles player block placement before events (for checks and AntiGrief).
 * @param {import('@minecraft/server').PlayerPlaceBlockBeforeEvent} eventData - The player place block event data.
 * @param {import('../types.js').CommandDependencies} dependencies - Standard dependencies object.
 */
export async function handlePlayerPlaceBlockBefore(eventData, dependencies) {
    const { checks, config, playerDataManager } = dependencies;
    const { player, block, itemStack } = eventData;

    if (!player || !block || !itemStack) return;

    const pData = playerDataManager?.getPlayerData(player.id);
    if (!pData) return;

    if (checks?.checkAirPlace && config?.enableAirPlaceCheck) {
        await checks.checkAirPlace(player, pData, dependencies, eventData);
        if (eventData.cancel) return;
    }

    // AntiGrief specific logic for block placement (like TNT)
    await handlePlayerPlaceBlockBeforeEvent_AntiGrief(eventData, dependencies);
    // If eventData.cancel is true after AntiGrief, it will stop here.
}

/**
 * Internal helper to process effects and checks after a block is placed.
 * @param {import('@minecraft/server').Player} player - The player who placed the block.
 * @param {import('../types.js').PlayerAntiCheatData} pData - The player's AntiCheat data.
 * @param {import('@minecraft/server').Block} block - The block that was placed.
 * @param {import('../types.js').CommandDependencies} dependencies - Standard dependencies object.
 */
async function _processPlayerPlaceBlockAfterEffects(player, pData, block, dependencies) {
    const { config, playerUtils, checks, currentTick, mc: minecraftSystem } = dependencies;
    const eventSpecificBlockData = { block }; // For checks that need the placed block context

    if (checks?.checkTower && config?.enableTowerCheck) {
        await checks.checkTower(player, pData, dependencies, eventSpecificBlockData);
    }
    if (checks?.checkFastPlace && config?.enableFastPlaceCheck) {
        await checks.checkFastPlace(player, pData, dependencies, eventSpecificBlockData);
    }
    if (checks?.checkDownwardScaffold && config?.enableDownwardScaffoldCheck) {
        await checks.checkDownwardScaffold(player, pData, dependencies, eventSpecificBlockData);
    }
    if (checks?.checkBlockSpam && config?.enableBlockSpamAntiGrief) {
        await checks.checkBlockSpam(player, pData, dependencies, eventSpecificBlockData);
    }
    if (checks?.checkBlockSpamDensity && config?.enableBlockSpamDensityCheck) {
        await checks.checkBlockSpamDensity(player, pData, dependencies, eventSpecificBlockData);
    }

    // Golem construction check
    if (config?.enableEntitySpamAntiGrief && block.typeId === mc.MinecraftBlockTypes.carvedPumpkin.id) {
        const dimension = player.dimension;
        const blockBelow = dimension.getBlock(block.location.offset(0, -1, 0));
        const blockTwoBelow = dimension.getBlock(block.location.offset(0, -2, 0));
        let potentialGolemType = null;

        if (blockBelow?.typeId === mc.MinecraftBlockTypes.ironBlock.id && blockTwoBelow?.typeId === mc.MinecraftBlockTypes.ironBlock.id) {
            potentialGolemType = mc.MinecraftEntityTypes.ironGolem.id;
        } else if (blockBelow?.typeId === mc.MinecraftBlockTypes.snowBlock.id && blockTwoBelow?.typeId === mc.MinecraftBlockTypes.snowBlock.id) {
            potentialGolemType = mc.MinecraftEntityTypes.snowGolem.id;
        }

        if (potentialGolemType) {
            pData.expectingConstructedEntity = {
                type: potentialGolemType,
                location: { x: block.location.x, y: block.location.y, z: block.location.z },
                tick: currentTick, // currentTick from dependencies
            };
            pData.isDirtyForSave = true;
            playerUtils?.debugLog(`[EventHandler._processPlayerPlaceBlockAfterEffects] Player ${player?.nameTag} placed pumpkin for ${potentialGolemType}. Expecting entity.`, player?.nameTag, dependencies);
        }
    }
}

/**
 * Handles player block placement after events.
 * @param {import('@minecraft/server').PlayerPlaceBlockAfterEvent} eventData - The player place block event data.
 * @param {import('../types.js').CommandDependencies} dependencies - Standard dependencies object.
 */
export async function handlePlayerPlaceBlockAfterEvent(eventData, dependencies) {
    const { playerDataManager } = dependencies;
    const { player, block } = eventData;

    if (!player || !block) return;

    const pData = playerDataManager?.getPlayerData(player.id);
    if (!pData) return;

    await _processPlayerPlaceBlockAfterEffects(player, pData, block, dependencies);
}

/**
 * Handles chat messages before they are sent, dispatching to chatProcessor.
 * @param {import('@minecraft/server').ChatSendBeforeEvent} eventData - The chat send event data.
 * @param {import('../types.js').CommandDependencies} dependencies - Standard dependencies object.
 */
export async function handleBeforeChatSend(eventData, dependencies) {
    const { playerDataManager, playerUtils, getString } = dependencies;
    const { sender: player, message: originalMessage } = eventData;
    const playerName = player?.nameTag ?? 'UnknownPlayer';

    if (!player?.isValid()) return;

    const pData = playerDataManager?.getPlayerData(player.id);
    if (!pData) {
        playerUtils?.warnPlayer(player, getString('error.playerDataNotFound'));
        eventData.cancel = true;
        return;
    }

    if (typeof dependencies.chatProcessor?.processChatMessage !== 'function') {
        console.warn('[EventHandler.handleBeforeChatSend] chatProcessor.processChatMessage is not available. Chat will not be processed.');
        playerUtils?.warnPlayer(player, getString('error.chatProcessingUnavailable'));
        eventData.cancel = true;
        return;
    }

    await dependencies.chatProcessor.processChatMessage(player, pData, originalMessage, eventData, dependencies);
}

/**
 * Handles player dimension change after events (e.g., dimension lock enforcement).
 * @param {import('@minecraft/server').PlayerDimensionChangeAfterEvent} eventData - The player dimension change event data.
 * @param {import('../types.js').CommandDependencies} dependencies - Standard dependencies object.
 */
export async function handlePlayerDimensionChangeAfterEvent(eventData, dependencies) {
    const { player, fromDimension, toDimension, fromLocation } = eventData;
    const { playerUtils, getString, rankManager, permissionLevels, logManager } = dependencies;
    const playerName = player?.nameTag ?? 'UnknownPlayer';

    if (!player || !toDimension || !fromDimension || !fromLocation) {
        playerUtils?.debugLog(`[EventHandler.handlePlayerDimensionChangeAfterEvent] Incomplete event data for ${playerName}.`, playerName, dependencies);
        return;
    }

    const playerPermission = rankManager?.getPlayerPermissionLevel(player, dependencies);
    if (permissionLevels?.admin !== undefined && playerPermission <= permissionLevels.admin) {
        playerUtils?.debugLog(`[EventHandler.handlePlayerDimensionChangeAfterEvent] Player ${playerName} (Admin) bypassing dimension locks.`, playerName, dependencies);
        return;
    }

    let dimensionIsLocked = false;
    let lockedDimensionName = '';
    const toDimensionId = toDimension.id.replace('minecraft:', ''); // Consistent format

    if (toDimensionId === 'nether' && isNetherLocked()) {
        dimensionIsLocked = true;
        lockedDimensionName = getString('dimensionLock.name.nether');
    } else if (toDimensionId === 'the_end' && isEndLocked()) {
        dimensionIsLocked = true;
        lockedDimensionName = getString('dimensionLock.name.end');
    }

    if (dimensionIsLocked) {
        try {
            await player.teleport(fromLocation, { dimension: fromDimension });
            playerUtils?.warnPlayer(player, getString('dimensionLock.teleportMessage', { lockedDimensionName: lockedDimensionName }));
            playerUtils?.notifyAdmins(getString('admin.notify.dimensionLockAttempt', { playerName: playerName, dimensionName: lockedDimensionName }), dependencies, player, null);
        } catch (e) {
            console.error(`[EventHandler.handlePlayerDimensionChangeAfterEvent] Failed to teleport ${playerName} from locked ${toDimensionId}: ${e.stack || e}`);
            logManager?.addLog({
                    actionType: 'errorEventHandlersDimensionLockTeleport',
                    context: 'eventHandlers.handlePlayerDimensionChangeAfterEvent',
                targetName: playerName,
                    details: {
                        fromDimensionId: fromDimension.id,
                        toDimensionId: toDimension.id, // Use the raw toDimension.id for logging
                        lockedDimensionName: lockedDimensionName, // User-facing name
                        errorMessage: e.message,
                        stack: e.stack
                    }
            }, dependencies);
        }
    }
}