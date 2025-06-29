/**
 * @file Centralized handlers for various Minecraft Server API events.
 */
import * as mc from '@minecraft/server';
import { getExpectedBreakTicks, isNetherLocked, isEndLocked } from '../utils/index.js';

/**
 * Handles player leave events.
 * @param {import('@minecraft/server').PlayerLeaveBeforeEvent} eventData
 * @param {import('../types.js').CommandDependencies} dependencies
 */
export async function handlePlayerLeave(eventData, dependencies) {
    const { playerDataManager, playerUtils, config: currentConfig, logManager, getString } = dependencies;
    const { player } = eventData;

    if (!player) {
        console.warn('[AntiCheat] handlePlayerLeave: Player undefined in eventData.');
        return;
    }
    playerUtils.debugLog(`Player ${player.nameTag} is leaving. Processing data...`, player.nameTag, dependencies);

    if (playerDataManager.saveDirtyPlayerData) {
        try {
            await playerDataManager.saveDirtyPlayerData(player, dependencies);
            playerUtils.debugLog(`Data saved for ${player.nameTag} on leave via saveDirtyPlayerData.`, player.nameTag, dependencies);
        } catch (error) {
            console.error(`[AntiCheat] Error in saveDirtyPlayerData for ${player.nameTag} on leave: ${error.stack || error}`);
            logManager.addLog({ actionType: 'errorPdataSaveOnLeave', context: 'handlePlayerLeave.saveDirtyPlayerData', targetName: player.nameTag, details: `Error: ${error.message}`, error: error.stack || error.message }, dependencies);
        }
    }

    const pData = playerDataManager.getPlayerData(player.id);

    if (pData && currentConfig.enableCombatLogDetection && pData.lastCombatInteractionTime > 0) {
        const currentTime = Date.now();
        const timeSinceLastCombatMs = currentTime - pData.lastCombatInteractionTime;
        const combatLogThresholdMs = (currentConfig.combatLogThresholdSeconds || 15) * 1000;

        if (timeSinceLastCombatMs < combatLogThresholdMs) {
            const timeSinceLastCombatSeconds = (timeSinceLastCombatMs / 1000).toFixed(1);
            const flagType = 'combatLog';
            const incrementAmount = currentConfig.combatLogFlagIncrement || 1;
            const baseFlagReason = `Disconnected ${timeSinceLastCombatSeconds}s after combat.`;

            playerUtils.debugLog(`CombatLog: Player ${player.nameTag} left ${timeSinceLastCombatSeconds}s after combat. Threshold: ${currentConfig.combatLogThresholdSeconds}s. Flagging +${incrementAmount}.`, player.nameTag, dependencies);

            // Flagging is still handled here due to specific increment logic from config.
            for (let i = 0; i < incrementAmount; i++) {
                await playerDataManager.addFlag(player, flagType, baseFlagReason, `(#${i + 1}/${incrementAmount}) Details: ${timeSinceLastCombatSeconds}s delay.`, dependencies);
            }

            const violationDetails = {
                timeSinceLastCombat: timeSinceLastCombatSeconds,
                incrementAmount: incrementAmount,
                // other details from config.combatLogMessage if needed by profile template
            };
            await dependencies.actionManager.executeCheckAction(player, 'combatLog', violationDetails, dependencies);
        }
    }

    if (pData) {
        const lastLocation = pData.lastPosition || player.location;
        const lastDimensionId = (pData.lastDimensionId || player.dimension.id).split(':')[1];
        const lastGameModeString = mc.GameMode[pData.lastGameMode] || 'unknown';
        let sessionDurationString = 'N/A';
        if (pData.joinTime && pData.joinTime > 0) {
            sessionDurationString = formatSessionDuration(Date.now() - pData.joinTime);
        }
        logManager.addLog({
            actionType: 'playerLeave',
            targetName: player.nameTag,
            targetId: player.id,
            details: `Last Loc: ${Math.floor(lastLocation.x)},${Math.floor(lastLocation.y)},${Math.floor(lastLocation.z)} in ${lastDimensionId}. GameMode: ${lastGameModeString}. Session: ${sessionDurationString}.`,
            location: { x: Math.floor(lastLocation.x), y: Math.floor(lastLocation.y), z: Math.floor(lastLocation.z), dimensionId: lastDimensionId },
            gameMode: lastGameModeString,
            sessionDuration: sessionDurationString,
        }, dependencies);
    }

    try {
        await playerDataManager.prepareAndSavePlayerData(player, dependencies);
    } catch (error) {
        console.error(`[AntiCheat] Error in prepareAndSavePlayerData for ${player.nameTag} on leave: ${error.stack || error}`);
        logManager.addLog({ actionType: 'errorPdataPrepareSaveOnLeave', context: 'handlePlayerLeave.prepareAndSavePlayerData', targetName: player.nameTag, details: `Error: ${error.message}`, error: error.stack || error.message }, dependencies);
    }
    playerUtils.debugLog(`Finished processing playerLeave event for ${player.nameTag}.`, player.nameTag, dependencies);

    if (currentConfig.enableDetailedJoinLeaveLogging) {
        console.warn(`[LeaveLog] Player: ${player.nameTag || player.name} (ID: ${player.id}) left the game.`);
    }
}

/**
 * Handles player spawn events (initial join and respawn).
 * @param {import('@minecraft/server').PlayerSpawnAfterEvent} eventData
 * @param {import('../types.js').CommandDependencies} dependencies
 */
export async function handlePlayerSpawn(eventData, dependencies) {
    const { player, initialSpawn } = eventData;
    const { playerDataManager, playerUtils, config, logManager, checks, getString, rankManager } = dependencies;

    if (!player) {
        console.warn('[AntiCheat] handlePlayerSpawn: eventData.player is undefined.');
        return;
    }
    playerUtils.debugLog(`Processing playerSpawn event for ${player.nameTag} (Initial Spawn: ${initialSpawn}). Tick: ${dependencies.mc.system.currentTick}`, player.nameTag, dependencies);

    try {
        const pData = await playerDataManager.ensurePlayerDataInitialized(player, dependencies.currentTick, dependencies);
        if (!pData) { // Should not happen if ensurePlayerDataInitialized is robust
            console.error(`[AntiCheat] CRITICAL: pData is null for ${player.nameTag} after ensurePlayerDataInitialized. Aborting spawn logic.`);
            return;
        }
        pData.lastGameMode = player.gameMode;
        pData.lastDimensionId = player.dimension.id;
        pData.isUsingConsumable = false;
        pData.isChargingBow = false;
        pData.isUsingShield = false;
        pData.isDirtyForSave = true;


        const banInfo = playerDataManager.getBanInfo(player, dependencies);
        if (banInfo) {
            playerUtils.debugLog(`Player ${player.nameTag} is banned. Kicking. Ban reason: ${banInfo.reason}, Expires: ${new Date(banInfo.unbanTime).toISOString()}`, player.nameTag, dependencies);
            const durationStringKick = getString(banInfo.unbanTime === Infinity ? 'ban.duration.permanent' : 'ban.duration.expires', { expiryDate: new Date(banInfo.unbanTime).toLocaleString() });
            let kickReason = getString('ban.kickMessage', { reason: banInfo.reason || getString('common.value.noReasonProvided'), durationMessage: durationStringKick });

            if (config.discordLink && config.discordLink.trim() !== '' && config.discordLink !== 'https://discord.gg/example') {
                kickReason += `\n${getString('ban.kickMessage.discord', { discordLink: config.discordLink })}`;
            }
            player.kick(kickReason);
            return;
        }

        rankManager.updatePlayerNametag(player, dependencies);
        playerUtils.debugLog(`Nametag updated for ${player.nameTag} on spawn.`, player.nameTag, dependencies);

        if (initialSpawn && config.enableWelcomerMessage) {
            const welcomeMsgKey = config.welcomeMessage || 'welcome.joinMessage';
            const message = getString(welcomeMsgKey, { playerName: player.nameTag });
            mc.system.runTimeout(() => {
                try { player.sendMessage(message); } catch (e) { console.warn(`Failed to send welcome message to ${player.nameTag}: ${e}`); }
            }, 20);

            pData.joinTime = Date.now();
            pData.isDirtyForSave = true;

            const spawnLocation = player.location;
            const spawnDimensionId = player.dimension.id.split(':')[1];
            const spawnGameMode = mc.GameMode[player.gameMode];
            logManager.addLog({
                actionType: 'playerInitialJoin',
                targetName: player.nameTag,
                targetId: player.id,
                details: `Joined for the first time. Loc: ${Math.floor(spawnLocation.x)},${Math.floor(spawnLocation.y)},${Math.floor(spawnLocation.z)} in ${spawnDimensionId}. GameMode: ${spawnGameMode}. Welcome sent.`,
                location: { x: Math.floor(spawnLocation.x), y: Math.floor(spawnLocation.y), z: Math.floor(spawnLocation.z), dimensionId: spawnDimensionId },
                gameMode: spawnGameMode,
            }, dependencies);

            if (config.notifyAdminOnNewPlayerJoin) {
                playerUtils.notifyAdmins(getString('admin.notify.newPlayerJoined', { playerName: player.nameTag }), dependencies, player, pData);
            }
        } else if (!initialSpawn) {
            const spawnLocation = player.location;
            const spawnDimensionId = player.dimension.id.split(':')[1];
            const spawnGameMode = mc.GameMode[player.gameMode];
            logManager.addLog({
                actionType: 'playerRespawn',
                targetName: player.nameTag,
                targetId: player.id,
                details: `Respawned. Loc: ${Math.floor(spawnLocation.x)},${Math.floor(spawnLocation.y)},${Math.floor(spawnLocation.z)} in ${spawnDimensionId}. GameMode: ${spawnGameMode}.`,
                location: { x: Math.floor(spawnLocation.x), y: Math.floor(spawnLocation.y), z: Math.floor(spawnLocation.z), dimensionId: spawnDimensionId },
                gameMode: spawnGameMode,
            }, dependencies);
        }

        if (pData.deathMessageToShowOnSpawn && config.enableDeathCoordsMessage) {
            mc.system.runTimeout(() => {
                try { player.sendMessage(pData.deathMessageToShowOnSpawn); } catch (e) { console.warn(`Failed to send death coords to ${player.nameTag}: ${e}`); }
            }, 5);
            playerUtils.debugLog(`DeathCoords: Displayed death message to ${player.nameTag}: '${pData.deathMessageToShowOnSpawn}'`, pData.isWatched ? player.nameTag : null, dependencies);
            pData.deathMessageToShowOnSpawn = null;
            pData.isDirtyForSave = true;
        }

        if (checks.checkInvalidRenderDistance && config.enableInvalidRenderDistanceCheck) {
            await checks.checkInvalidRenderDistance(player, pData, dependencies);
        }

        if (config.enableDetailedJoinLeaveLogging) {
            const deviceType = player.clientSystemInfo?.platformType?.toString() || getString('common.value.unknown');
            const gameModeName = mc.GameMode[player.gameMode] || getString('common.value.unknown');
            const loc = player.location;
            const dimId = player.dimension.id.split(':')[1] || getString('common.value.unknown');
            const locStr = `${Math.floor(loc.x)}, ${Math.floor(loc.y)}, ${Math.floor(loc.z)} in ${dimId}`;
            console.warn(`[JoinLog] Player: ${player.nameTag} (ID: ${player.id}, Device: ${deviceType}, Mode: ${gameModeName}) ${initialSpawn ? 'joined' : 'spawned'} at ${locStr}.`);
        }
    } catch (error) {
        console.error(`[AntiCheat] Error in handlePlayerSpawn for ${player?.nameTag || 'unknown player'}: ${error.stack || error}`);
        playerUtils.debugLog(`Error in handlePlayerSpawn for ${player?.nameTag || 'unknown player'}: ${error.message}`, player?.nameTag, dependencies);
        logManager.addLog({
            actionType: 'errorHandlePlayerSpawn',
            targetName: player?.nameTag || 'unknown player',
            details: `Error: ${error.message}`,
            error: error.stack || error.message, // Include stack for better debugging
            context: 'handlePlayerSpawn',
        }, dependencies);
    }
}

/**
 * Handles piston activation events for AntiGrief (e.g., lag machine detection).
 * @param {import('@minecraft/server').PistonActivateAfterEvent} eventData
 * @param {import('../types.js').CommandDependencies} dependencies
 */
export async function handlePistonActivate_AntiGrief(eventData, dependencies) {
    const { config, playerUtils, checks } = dependencies;
    if (!config.enablePistonLagCheck) return;

    const { pistonBlock, dimension } = eventData;
    if (!pistonBlock) {
        playerUtils.debugLog('PistonLag: eventData.pistonBlock is undefined.', null, dependencies);
        return;
    }
    if (!dimension) {
        playerUtils.debugLog(`PistonLag: dimension is undefined for piston at ${JSON.stringify(pistonBlock.location)}.`, null, dependencies);
        return;
    }

    if (checks.checkPistonLag) {
        await checks.checkPistonLag(pistonBlock, dimension.id, dependencies);
    } else {
        playerUtils.debugLog('PistonLag: checkPistonLag function is not available.', null, dependencies);
    }
}

/**
 * Handles entity spawn events for AntiGrief (e.g., Wither, Golem spam).
 * @param {import('@minecraft/server').EntitySpawnAfterEvent} eventData
 * @param {import('../types.js').CommandDependencies} dependencies
 */
export async function handleEntitySpawnEvent_AntiGrief(eventData, dependencies) {
    const { config, playerUtils, actionManager, playerDataManager, checks } = dependencies;
    const { entity } = eventData;

    if (!entity) {
        playerUtils.debugLog('AntiGrief: eventData.entity is undefined in handleEntitySpawnEvent_AntiGrief.', null, dependencies);
        return;
    }

    if (entity.typeId === 'minecraft:wither' && config.enableWitherAntiGrief) {
        playerUtils.debugLog(`AntiGrief: Wither spawned (ID: ${entity.id}). Config action: ${config.witherSpawnAction}.`, null, dependencies);
        const violationDetails = { entityId: entity.id, entityType: entity.typeId, actionTaken: config.witherSpawnAction, playerNameOrContext: 'System/Environment' };
        await actionManager.executeCheckAction('worldAntiGriefWitherSpawn', null, violationDetails, dependencies); // Standardized
        if (config.witherSpawnAction === 'kill') {
            try { entity.kill(); } catch (e) { console.warn(`Failed to kill wither: ${e}`); }
            playerUtils.debugLog(`AntiGrief: Wither (ID: ${entity.id}) killed due to witherSpawnAction config.`, null, dependencies);
        }
    } else if (config.enableEntitySpamAntiGrief && (entity.typeId === 'minecraft:snow_golem' || entity.typeId === 'minecraft:iron_golem')) {
        playerUtils.debugLog(`AntiGrief: ${entity.typeId} spawned. Checking attribution. Tick: ${dependencies.currentTick}`, null, dependencies);
        for (const player of mc.world.getAllPlayers()) { // Use mc.world directly
            const pData = playerDataManager.getPlayerData(player.id);
            if (pData?.expectingConstructedEntity?.type === entity.typeId &&
                Math.abs(pData.expectingConstructedEntity.tick - dependencies.currentTick) < 10) { // Check within a small tick window
                playerUtils.debugLog(`AntiGrief: Attributed ${entity.typeId} to ${player.nameTag}. Expectation: ${JSON.stringify(pData.expectingConstructedEntity)}`, player.nameTag, dependencies);
                if (checks.checkEntitySpam) {
                    const isSpam = await checks.checkEntitySpam(player, entity.typeId, pData, dependencies);
                    if (isSpam && config.entitySpamAction === 'kill') {
                        try { entity.kill(); } catch (e) { console.warn(`Failed to kill entity ${entity.typeId}: ${e}`); }
                        playerUtils.debugLog(`AntiGrief: ${entity.typeId} (ID: ${entity.id}) killed due to spam detection by ${player.nameTag}.`, player.nameTag, dependencies);
                    }
                }
                pData.expectingConstructedEntity = null;
                pData.isDirtyForSave = true;
                break;
            }
        }
    }
}

/**
 * Handles player block placement before events for AntiGrief (e.g., TNT).
 * @param {import('@minecraft/server').PlayerPlaceBlockBeforeEvent} eventData
 * @param {import('../types.js').CommandDependencies} dependencies
 */
export async function handlePlayerPlaceBlockBeforeEvent_AntiGrief(eventData, dependencies) {
    const { config, playerUtils, actionManager, rankManager, getString, permissionLevels } = dependencies;
    const { player, itemStack, block } = eventData;

    if (!player || !itemStack || !block) return;

    if (itemStack.typeId === 'minecraft:tnt' && config.enableTntAntiGrief) {
        const playerPermission = rankManager.getPlayerPermissionLevel(player, dependencies);
        if (config.allowAdminTntPlacement && playerPermission <= permissionLevels.admin) {
            playerUtils.debugLog(`AntiGrief: Admin ${player.nameTag} placed TNT. Allowed by config.`, player.nameTag, dependencies);
            return;
        }

        const violationDetails = { itemTypeId: itemStack.typeId, location: block.location, actionTaken: 'prevented', playerName: player.nameTag, x: block.location.x, y: block.location.y, z: block.location.z };
        // Standardized checkType for actionProfiles
        await actionManager.executeCheckAction('worldAntiGriefTntPlace', player, violationDetails, dependencies); // Standardized

        const profile = config.checkActionProfiles.worldAntiGriefTntPlace; // Standardized
        if (profile?.cancelEvent !== false) { // Default to cancel if not specified or true
            eventData.cancel = true;
            playerUtils.warnPlayer(player, getString(profile?.parameters?.messageKey || 'antigrief.tntPlacementDenied'));
        }
    }
}

/**
 * Handles entity death events for cosmetic death effects.
 * @param {import('@minecraft/server').EntityDieAfterEvent} eventData
 * @param {import('../types.js').CommandDependencies} dependencies
 */
export async function handleEntityDieForDeathEffects(eventData, dependencies) {
    const { config: currentConfig, playerUtils } = dependencies;
    if (!currentConfig.enableDeathEffects) return;
    const { deadEntity } = eventData;

    if (!(deadEntity instanceof mc.Player)) return;

    playerUtils.debugLog(`Player ${deadEntity.nameTag} died. Processing death effects.`, deadEntity.nameTag, dependencies);
    try {
        if (currentConfig.deathEffectParticleName) {
            deadEntity.dimension.spawnParticle(currentConfig.deathEffectParticleName, deadEntity.location);
        }
        if (currentConfig.deathEffectSoundId) {
            deadEntity.dimension.playSound(currentConfig.deathEffectSoundId, deadEntity.location);
        }
    } catch (e) {
        console.warn(`[EventHandler] Error applying death effect for ${deadEntity.nameTag}: ${e.message}`);
        playerUtils.debugLog(`Error applying death effect for ${deadEntity.nameTag}: ${e.message}`, deadEntity.nameTag, dependencies);
        dependencies.logManager.addLog({
            actionType: 'errorDeathEffect',
            targetName: deadEntity.nameTag,
            details: `Error: ${e.message}`,
            error: e.stack || e.message,
            context: 'handleEntityDieForDeathEffects'
        }, dependencies);
    }
}

/**
 * Handles entity hurt events for combat checks and state updates.
 * @param {import('@minecraft/server').EntityHurtAfterEvent} eventData
 * @param {import('../types.js').CommandDependencies} dependencies
 */
export async function handleEntityHurt(eventData, dependencies) {
    const { playerDataManager, checks, config, currentTick, playerUtils } = dependencies;
    const { hurtEntity, damageSource, damagingEntity: directDamagingEntity } = eventData;

    if (hurtEntity?.typeId === 'minecraft:player') {
        const victimPlayer = hurtEntity;
        const victimPData = playerDataManager.getPlayerData(victimPlayer.id);
        if (victimPData) {
            victimPData.lastTookDamageTick = currentTick;
            victimPData.lastDamageCause = damageSource.cause;
            victimPData.lastDamagingEntityType = directDamagingEntity?.typeId;
            victimPData.isDirtyForSave = true;

            if (directDamagingEntity?.typeId === 'minecraft:player' && directDamagingEntity.id !== victimPlayer.id) {
                const attackerPlayer = directDamagingEntity;
                victimPData.lastCombatInteractionTime = Date.now();

                const attackerPData = playerDataManager.getPlayerData(attackerPlayer.id);
                if (attackerPData) {
                    attackerPData.lastCombatInteractionTime = Date.now();
                    attackerPData.isDirtyForSave = true;
                    attackerPData.attackEvents = attackerPData.attackEvents || [];
                    attackerPData.attackEvents.push(Date.now());
                    attackerPData.lastAttackTick = currentTick;

                    const eventSpecificData = { targetEntity: victimPlayer, damagingEntity: attackerPlayer, cause: damageSource, gameMode: attackerPlayer.gameMode };

                    if (checks.checkReach && config.enableReachCheck) await checks.checkReach(attackerPlayer, attackerPData, dependencies, eventSpecificData);
                    if (checks.checkMultiTarget && config.enableMultiTargetCheck) await checks.checkMultiTarget(attackerPlayer, attackerPData, dependencies, eventSpecificData);
                    if (checks.checkAttackWhileSleeping && config.enableStateConflictCheck) await checks.checkAttackWhileSleeping(attackerPlayer, attackerPData, dependencies, eventSpecificData);
                    if (checks.checkAttackWhileUsingItem && config.enableStateConflictCheck) await checks.checkAttackWhileUsingItem(attackerPlayer, attackerPData, dependencies, eventSpecificData);
                }
            }
            if (checks.checkSelfHurt && config.enableSelfHurtCheck) {
                await checks.checkSelfHurt(victimPlayer, victimPData, dependencies, { damagingEntity: directDamagingEntity, cause: damageSource });
            }
        }
    }
}

/**
 * Handles player death events (e.g., logging, death coordinates).
 * @param {import('@minecraft/server').PlayerDeathAfterEvent} eventData
 * @param {import('../types.js').CommandDependencies} dependencies
 */
export async function handlePlayerDeath(eventData, dependencies) {
    const { player } = eventData;
    const { playerDataManager, config, logManager, getString } = dependencies;
    if (!player) {
        console.warn('[EventHandler] handlePlayerDeath: eventData.player is undefined.');
        return;
    }
    const pData = playerDataManager.getPlayerData(player.id);
    if (!pData) {
        console.warn(`[AntiCheat] handlePlayerDeath: pData not found for ${player.nameTag}.`);
        return;
    }

    if (config.enableDeathCoordsMessage) {
        const location = player.location;
        const dimensionId = player.dimension.id.split(':')[1];
        const x = Math.floor(location.x);
        const y = Math.floor(location.y);
        const z = Math.floor(location.z);
        const deathCoordsMsgKey = config.deathCoordsMessage || 'message.deathCoords';
        pData.deathMessageToShowOnSpawn = getString(deathCoordsMsgKey, { x: x.toString(), y: y.toString(), z: z.toString(), dimensionId: dimensionId });
        pData.isDirtyForSave = true;
    }

    logManager.addLog({
        actionType: 'playerDeath',
        targetName: player.nameTag,
        targetId: player.id,
        details: `Player died. Cause: ${eventData.damageSource?.cause || 'unknown'}. Killer: ${eventData.killer?.nameTag || 'N/A'}.`,
        location: player.location, // Location of death
        dimensionId: player.dimension.id,
    }, dependencies);
}

/**
 * Subscribes to entityHurt events for combat log detection.
 * @param {import('../types.js').CommandDependencies} dependencies
 */
export function subscribeToCombatLogEvents(dependencies) {
    const { config, playerDataManager } = dependencies;
    if (!config.enableCombatLogDetection) return;

    mc.world.afterEvents.entityHurt.subscribe((eventData) => {
        const { hurtEntity, damageSource } = eventData;
        const damagingEntity = damageSource?.damagingEntity;

        if (hurtEntity?.typeId === 'minecraft:player' && damagingEntity?.typeId === 'minecraft:player') {
            if (hurtEntity.id === damagingEntity.id) return; // Ignore self-harm for combat log timing

            const victimPData = playerDataManager.getPlayerData(hurtEntity.id);
            const attackerPData = playerDataManager.getPlayerData(damagingEntity.id);
            const currentTime = Date.now();

            if (victimPData) { victimPData.lastCombatInteractionTime = currentTime; victimPData.isDirtyForSave = true; }
            if (attackerPData) { attackerPData.lastCombatInteractionTime = currentTime; attackerPData.isDirtyForSave = true; }
        }
    });
}

/**
 * Handles player block break before events (e.g., InstaBreak timing).
 * @param {import('@minecraft/server').PlayerBreakBlockBeforeEvent} eventData
 * @param {import('../types.js').CommandDependencies} dependencies
 */
export async function handlePlayerBreakBlockBeforeEvent(eventData, dependencies) {
    const { checks, config, playerDataManager, currentTick } = dependencies;
    const { player, block, itemStack } = eventData;
    if (!player || !block) return; // itemStack can be undefined if breaking by hand

    const pData = playerDataManager.getPlayerData(player.id);
    if (!pData) return;

    if (checks.checkBreakUnbreakable && config.enableInstaBreakUnbreakableCheck) {
        await checks.checkBreakUnbreakable(player, pData, eventData, dependencies);
        if (eventData.cancel) return; // If cancelled by unbreakable check, stop further processing
    }

    if (config.enableInstaBreakSpeedCheck) {
        const expectedTicks = getExpectedBreakTicks(player, block.permutation, itemStack, config);
        pData.breakStartTickGameTime = currentTick;
        pData.expectedBreakDurationTicks = expectedTicks;
        pData.breakingBlockTypeId = block.typeId;
        pData.breakingBlockLocation = { x: block.location.x, y: block.location.y, z: block.location.z };
        pData.toolUsedForBreakAttempt = itemStack?.typeId;
        pData.isDirtyForSave = true;
    }

}

/**
 * Handles player block break after events (e.g., XRay, InstaBreak speed).
 * @param {import('@minecraft/server').PlayerBreakBlockAfterEvent} eventData
 * @param {import('../types.js').CommandDependencies} dependencies
 */
export async function handlePlayerBreakBlockAfterEvent(eventData, dependencies) {
    const { config, playerDataManager, checks } = dependencies;
    const { player, block, brokenBlockPermutation } = eventData;
    if (!player || !brokenBlockPermutation) return;

    const pData = playerDataManager.getPlayerData(player.id);
    if (!pData) return;

    if (checks.checkXray && config.enableXrayDetection) {
        await checks.checkXray(player, brokenBlockPermutation.type, pData, dependencies);
    }
    if (checks.checkBreakSpeed && config.enableInstaBreakSpeedCheck) {
        await checks.checkBreakSpeed(player, pData, eventData, dependencies);
    }

    // Reset break attempt state after processing all relevant BreakBlockAfter checks
    pData.breakingBlockTypeId = null;
    pData.breakingBlockLocation = null;
    pData.toolUsedForBreakAttempt = null;
    pData.isDirtyForSave = true;

    // AutoTool check might be more relevant after a break is completed
    if (checks.checkAutoTool && config.enableAutoToolCheck) {
        // This might need eventData.block if it refers to the original block state/location
        await checks.checkAutoTool(player, pData, dependencies);
    }
}

/**
 * Handles item use events.
 * @param {import('@minecraft/server').ItemUseBeforeEvent} eventData
 * @param {import('../types.js').CommandDependencies} dependencies
 */
export async function handleItemUse(eventData, dependencies) {
    const { checks, config, getString, playerUtils, playerDataManager } = dependencies;
    const { source: player, itemStack } = eventData;
    if (!player || !itemStack) return;

    const pData = playerDataManager.getPlayerData(player.id);
    if (!pData) return;

    if (checks.checkSwitchAndUseInSameTick && config.enableInventoryModCheck) {
        await checks.checkSwitchAndUseInSameTick(player, pData, dependencies, { itemStack });
        if (eventData.cancel) return;
    }
    if (checks.checkFastUse && config.enableFastUseCheck) {
        await checks.checkFastUse(player, pData, dependencies, { itemStack });
        if (eventData.cancel) return;
    }

    const itemFoodComponent = itemStack.type.getComponent('food');
    if (itemFoodComponent && config.enableChatDuringItemUseCheck) {
        pData.isUsingConsumable = true;
        pData.isDirtyForSave = true;
        mc.system.runTimeout(() => {
            if (pData.isUsingConsumable) { // Check if still using, might have been cancelled
                pData.isUsingConsumable = false;
                pData.isDirtyForSave = true;
            }
        }, (itemFoodComponent.eatSeconds || 1.6) * 20);
    }

    if (config.preventedItemUses && config.preventedItemUses.includes(itemStack.typeId)) {
        playerUtils.warnPlayer(player, getString('antigrief.itemUseDenied', { item: itemStack.typeId }));
        eventData.cancel = true;
        // TODO: Consider adding actionManager.executeCheckAction('worldIllegalItemUse', player, { itemTypeId: itemStack.typeId, action: 'use' }, dependencies);
        return;
    }

    pData.lastItemUseTick = dependencies.currentTick;
    pData.isDirtyForSave = true;
}

/**
 * Handles item use on block events.
 * @param {import('@minecraft/server').ItemUseOnBeforeEvent} eventData
 * @param {import('../types.js').CommandDependencies} dependencies
 */
export async function handleItemUseOn(eventData, dependencies) {
    const { checks, config, playerDataManager } = dependencies;
    const { source: player, itemStack, block } = eventData;
    if (!player || !itemStack || !block) return;

    const pData = playerDataManager.getPlayerData(player.id);
    if (!pData) return;

    // IllegalItemUseOnBlock check could be added here if specific rules are needed beyond general item bans.

    if (checks.checkAirPlace && config.enableAirPlaceCheck) {
        // AirPlace check might be relevant here if item use on air is considered.
        // Currently, it's more tied to block placement events.
    }

    if (itemStack.typeId === 'minecraft:bow' && config.enableChatDuringItemUseCheck) {
        if (pData) { pData.isChargingBow = true; pData.isDirtyForSave = true; }
    }
    if (config.preventedItemUsesOn && config.preventedItemUsesOn.includes(itemStack.typeId)) {
        dependencies.playerUtils.warnPlayer(player, dependencies.getString('antigrief.itemUseDenied', {item: itemStack.typeId}));
        eventData.cancel = true;
        // TODO: Consider adding actionManager.executeCheckAction('worldIllegalItemUse', player, { itemTypeId: itemStack.typeId, action: 'useon', targetBlock: block.typeId }, dependencies);
        return;
    }

    pData.lastItemUseTick = dependencies.currentTick;
    pData.isDirtyForSave = true;
}

/**
 * Handles player inventory item change events.
 * @param {import('@minecraft/server').Player} player
 * @param {import('@minecraft/server').ItemStack | undefined} newItem
 * @param {import('@minecraft/server').ItemStack | undefined} oldItem
 * @param {string} slotName
 * @param {import('../types.js').CommandDependencies} dependencies
 */
export async function handleInventoryItemChange(player, newItem, oldItem, slotName, dependencies) {
    const { checks, config, playerDataManager } = dependencies;
    if (!player) return;

    const pData = playerDataManager.getPlayerData(player.id);
    if (!pData) return;

    if (checks.checkInventoryMoveWhileActionLocked && config.enableInventoryModCheck) {
        const inventoryChangeData = { newItemStack: newItem, oldItemStack: oldItem, inventorySlot: slotName }; // slotName might need mapping to slot index if check requires
        await checks.checkInventoryMoveWhileActionLocked(player, pData, dependencies, inventoryChangeData);
    }

    // Illegal item checks on inventory change can be intensive; typically handled at use/place.
    // If specific items need to be checked upon entering inventory, that logic could be added here,
    // but it's generally less common than event-driven checks.
}

/**
 * Handles player block placement before events (for checks and AntiGrief).
 * @param {import('@minecraft/server').PlayerPlaceBlockBeforeEvent} eventData
 * @param {import('../types.js').CommandDependencies} dependencies
 */
export async function handlePlayerPlaceBlockBefore(eventData, dependencies) {
    const { checks, config, playerDataManager } = dependencies;
    const { player, block, itemStack } = eventData;
    if (!player || !block || !itemStack) return;

    const pData = playerDataManager.getPlayerData(player.id);
    if (!pData) return;

    // Building restriction checks could be added here if needed.
    if (checks.checkAirPlace && config.enableAirPlaceCheck) {
        await checks.checkAirPlace(player, pData, dependencies, eventData);
        if (eventData.cancel) return;
    }
    await handlePlayerPlaceBlockBeforeEvent_AntiGrief(eventData, dependencies);
}

/**
 * Internal helper to process effects and checks after a block is placed.
 * @param {import('@minecraft/server').Player} player
 * @param {import('../types.js').PlayerAntiCheatData} pData
 * @param {import('@minecraft/server').Block} block
 * @param {import('../types.js').CommandDependencies} dependencies
 */
async function _processPlayerPlaceBlockAfterEffects(player, pData, block, dependencies) {
    const { config, playerUtils, checks, currentTick } = dependencies;
    const eventSpecificBlockData = { block };

    if (checks.checkTower && config.enableTowerCheck) await checks.checkTower(player, pData, dependencies, eventSpecificBlockData);
    if (checks.checkFastPlace && config.enableFastPlaceCheck) await checks.checkFastPlace(player, pData, dependencies, eventSpecificBlockData);
    if (checks.checkDownwardScaffold && config.enableDownwardScaffoldCheck) await checks.checkDownwardScaffold(player, pData, dependencies, eventSpecificBlockData);
    if (checks.checkBlockSpam && config.enableBlockSpamAntiGrief) await checks.checkBlockSpam(player, pData, dependencies, eventSpecificBlockData);
    if (checks.checkBlockSpamDensity && config.enableBlockSpamDensityCheck) await checks.checkBlockSpamDensity(player, pData, dependencies, eventSpecificBlockData);

    // Golem construction check
    if (config.enableEntitySpamAntiGrief && block.typeId === 'minecraft:carved_pumpkin') {
        const blockBelow = player.dimension.getBlock(block.location.offset(0, -1, 0));
        const blockTwoBelow = player.dimension.getBlock(block.location.offset(0, -2, 0));
        let potentialGolemType = null;
        if (blockBelow?.typeId === 'minecraft:iron_block' && blockTwoBelow?.typeId === 'minecraft:iron_block') potentialGolemType = 'minecraft:iron_golem';
        else if (blockBelow?.typeId === 'minecraft:snow_block' && blockTwoBelow?.typeId === 'minecraft:snow_block') potentialGolemType = 'minecraft:snow_golem';

        if (potentialGolemType) {
            pData.expectingConstructedEntity = { type: potentialGolemType, location: {x: block.location.x, y: block.location.y, z: block.location.z}, tick: currentTick };
            pData.isDirtyForSave = true;
            playerUtils.debugLog(`[EventHandler][AntiGrief] Player ${player.nameTag} placed pumpkin for potential ${potentialGolemType}. Expecting entity.`, player.nameTag, dependencies);
        }
    }
}

/**
 * Handles player block placement after events.
 * @param {import('@minecraft/server').PlayerPlaceBlockAfterEvent} eventData
 * @param {import('../types.js').CommandDependencies} dependencies
 */
export async function handlePlayerPlaceBlockAfterEvent(eventData, dependencies) {
    const { playerDataManager } = dependencies;
    const { player, block } = eventData;
    if (!player || !block) return;

    const pData = playerDataManager.getPlayerData(player.id);
    if (!pData) return;

    await _processPlayerPlaceBlockAfterEffects(player, pData, block, dependencies);
}


/**
 * Handles chat messages before they are sent, dispatching to chatProcessor.
 * @param {import('@minecraft/server').ChatSendBeforeEvent} eventData
 * @param {import('../types.js').CommandDependencies} dependencies
 */
export async function handleBeforeChatSend(eventData, dependencies) {
    const { playerDataManager, config, playerUtils, getString } = dependencies;
    const { sender: player, message: originalMessage } = eventData;

    if (!player) return;

    const pData = playerDataManager.getPlayerData(player.id);
    if (!pData) {
        playerUtils.warnPlayer(player, getString('error.playerDataNotFound'));
        eventData.cancel = true;
        return;
    }

    // This function processes non-command chat messages.
    // Command handling is managed upstream in main.js.

    if (!dependencies.chatProcessor || typeof dependencies.chatProcessor.processChatMessage !== 'function') {
        console.warn('[AntiCheat] handleBeforeChatSend: chatProcessor.processChatMessage is not available. Chat will not be processed.');
        playerUtils.warnPlayer(player, getString('error.chatProcessingUnavailable'));
        eventData.cancel = true;
        return;
    }

    await dependencies.chatProcessor.processChatMessage(player, pData, originalMessage, eventData, dependencies);
}

/**
 * Handles player dimension change after events (e.g., dimension lock enforcement).
 * @param {import('@minecraft/server').PlayerDimensionChangeAfterEvent} eventData
 * @param {import('../types.js').CommandDependencies} dependencies
 */
export async function handlePlayerDimensionChangeAfterEvent(eventData, dependencies) {
    const { player, fromDimension, toDimension, fromLocation } = eventData;
    const { playerUtils, config, getString, rankManager, permissionLevels } = dependencies;

    if (!player || !toDimension || !fromDimension || !fromLocation) {
        playerUtils.debugLog('[EventHandler] handlePlayerDimensionChangeAfterEvent: Incomplete event data.', player?.nameTag, dependencies);
        return;
    }

    const playerPermission = rankManager.getPlayerPermissionLevel(player, dependencies);
    if (playerPermission <= permissionLevels.admin) { // Admins and above bypass dimension locks
        playerUtils.debugLog(`Player ${player.nameTag} has admin/owner permission, bypassing dimension locks.`, player.nameTag, dependencies);
        return;
    }

    let dimensionIsLocked = false;
    let lockedDimensionName = '';
    const toDimensionId = toDimension.id.split(':')[1];

    if (toDimensionId === 'nether' && isNetherLocked()) {
        dimensionIsLocked = true;
        lockedDimensionName = getString('dimensionLock.name.nether');
    } else if (toDimensionId === 'the_end' && isEndLocked()) {
        dimensionIsLocked = true;
        lockedDimensionName = getString('dimensionLock.name.end');
    }

    if (dimensionIsLocked) {
        try {
            player.teleport(fromLocation, { dimension: fromDimension });
            playerUtils.warnPlayer(player, getString('dimensionLock.teleportMessage', { lockedDimensionName: lockedDimensionName }));
            playerUtils.notifyAdmins(getString('admin.notify.dimensionLockAttempt', { playerName: player.nameTag, dimensionName: lockedDimensionName }), dependencies, player, null); // Pass null for pData as it's a general admin notify
        } catch (e) {
            console.error(`[AntiCheat] Failed to teleport ${player.nameTag} back from locked dimension ${toDimensionId}: ${e.stack || e}`);
            playerUtils.debugLog(`Teleport fail for ${player.nameTag} from ${toDimensionId}: ${e.message}`, player.nameTag, dependencies);
            dependencies.logManager.addLog({
                actionType: 'errorDimensionLockTeleport',
                targetName: player.nameTag,
                details: `Failed to teleport from locked dimension ${toDimensionId}. Error: ${e.message}`,
                error: e.stack || e.message,
                context: 'handlePlayerDimensionChangeAfterEvent'
            }, dependencies);
        }
    }
}
