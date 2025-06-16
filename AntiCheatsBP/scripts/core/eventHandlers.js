/**
 * @file AntiCheatsBP/scripts/core/eventHandlers.js
 * @description Centralized handlers for various Minecraft Server API events.
 * These handlers process event data, interact with managers (PlayerData, Action, Log),
 * and delegate to specific check functions for cheat detection and system responses.
 * @version 1.1.0
 */
import * as mc from '@minecraft/server';
import { getPlayerRankFormattedChatElements, updatePlayerNametag, permissionLevels } from './rankManager.js';
import { getExpectedBreakTicks, isNetherLocked, isEndLocked } from '../utils/index.js'; // playerUtils is expected via dependencies
import { getString } from './i18n.js';
import { formatSessionDuration } from '../utils/playerUtils.js';

/**
 * Handles player leave events, saving data and checking for combat logging.
 * @param {mc.PlayerLeaveEvent} eventData - The data associated with the player leave event.
 * @param {import('../types.js').Dependencies} dependencies - Full dependencies object.
 * @returns {Promise<void>}
 */
export async function handlePlayerLeave(eventData, dependencies) {
    const { playerDataManager, playerUtils, config: currentConfig, logManager } = dependencies;
    const { player } = eventData;
    if (!player) {
        console.warn("[AntiCheat] handlePlayerLeave: Player undefined in eventData.");
        return;
    }
    playerUtils.debugLog(`Player ${player.nameTag} is leaving. Processing data...`, player.nameTag);

    if (playerDataManager.saveDirtyPlayerData) {
        try {
            await playerDataManager.saveDirtyPlayerData(player);
            playerUtils.debugLog(`Data saved for ${player.nameTag} on leave via saveDirtyPlayerData.`, player.nameTag);
        } catch (error) {
            console.error(`[AntiCheat] Error in saveDirtyPlayerData for ${player.nameTag} on leave: ${error}`);
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

            playerUtils.debugLog(`CombatLog: Player ${player.nameTag} left ${timeSinceLastCombatSeconds}s after combat. Threshold: ${currentConfig.combatLogThresholdSeconds}s. Flagging +${incrementAmount}.`, player.nameTag);

            // Assuming addFlag can handle player object directly for context
            for (let i = 0; i < incrementAmount; i++) {
                // addFlag itself will use actionManager for notifications if configured in its profile
                await playerDataManager.addFlag(player, flagType, baseFlagReason, `(#${i + 1}/${incrementAmount}) Details: ${timeSinceLastCombatSeconds}s delay.`, dependencies);
            }

            // Direct notification if configured, supplementing any notification from addFlag's profile
            if (currentConfig.combatLogMessage && currentConfig.combatLogMessageKey) { // Check if specific message key exists
                 const notifyMessage = getString(currentConfig.combatLogMessageKey, {
                    playerName: player.nameTag,
                    timeSinceCombat: timeSinceLastCombatSeconds,
                    incrementAmount: incrementAmount.toString()
                });
                playerUtils.notifyAdmins(notifyMessage, player, pData);
            }

            if (logManager?.addLog) {
                logManager.addLog({
                    adminName: 'System',
                    actionType: 'combatLogDetected',
                    targetName: player.nameTag,
                    details: `Disconnected ${timeSinceLastCombatSeconds}s after PvP. Last interaction at ${new Date(pData.lastCombatInteractionTime).toISOString()}. Flagged +${incrementAmount}.`,
                    reason: baseFlagReason
                });
            }
        }
    }

    if (pData && logManager?.addLog) {
        const lastLocation = pData.lastPosition || player.location;
        const lastDimensionId = (pData.lastDimensionId || player.dimension.id).split(':')[1];
        const lastGameModeString = mc.GameMode[pData.lastGameMode] || "unknown";
        let sessionDurationString = "N/A";
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
            sessionDuration: sessionDurationString
        });
    }

    await playerDataManager.prepareAndSavePlayerData(player); // Final save attempt
    playerUtils.debugLog(`Finished processing playerLeave event for ${player.nameTag}.`, player.nameTag);

    if (currentConfig.enableDetailedJoinLeaveLogging) {
        console.warn(`[LeaveLog] Player: ${player.nameTag || player.name} (ID: ${player.id}) left the game.`);
    }
}

/**
 * Handles player spawn events, checking for bans, updating nametags, and sending welcome messages.
 * @param {mc.PlayerSpawnEvent} eventData - The data associated with the player spawn event.
 * @param {import('../types.js').Dependencies} dependencies - An object containing necessary dependencies like playerDataManager, playerUtils, config, etc.
 * @returns {Promise<void>}
 */
export async function handlePlayerSpawn(eventData, dependencies) {
    const { player, initialSpawn } = eventData;
    const { playerDataManager, playerUtils, config, configModule, logManager, actionManager, checks } = dependencies;

    if (!player) {
        console.warn('[AntiCheat] handlePlayerSpawn: eventData.player is undefined.');
        return;
    }
    playerUtils.debugLog(`Processing playerSpawn event for ${player.nameTag} (Initial Spawn: ${initialSpawn}). Tick: ${mc.system.currentTick}`, player.nameTag);

    try {
        const pData = playerDataManager.getPlayerData(player.id);
        if (!pData) {
            console.warn(`[AntiCheat] handlePlayerSpawn: pData is unexpectedly null for ${player.nameTag}. Attempting to initialize.`);
            // Potentially initialize pData here if it makes sense for the flow, or handle error.
            // For now, many subsequent operations might fail or be skipped.
        } else {
            pData.lastGameMode = player.gameMode; // Update with current gamemode on any spawn
            pData.lastDimensionId = player.dimension.id; // Update with current dimension on any spawn
        }

        const banInfo = playerDataManager.getBanInfo(player);
        if (banInfo) {
            playerUtils.debugLog(`Player ${player.nameTag} is banned. Kicking. Ban reason: ${banInfo.reason}, Expires: ${new Date(banInfo.unbanTime).toISOString()}`, player.nameTag);
            const durationStringKick = getString(banInfo.unbanTime === Infinity ? "ban.duration.permanent" : "ban.duration.expires", { expiryDate: new Date(banInfo.unbanTime).toLocaleString() });
            let kickReason = getString("ban.kickMessage", { reason: banInfo.reason || getString("common.value.noReasonProvided"), durationMessage: durationStringKick });

            if (configModule.discordLink && configModule.discordLink.trim() !== "" && configModule.discordLink !== "https://discord.gg/example") {
                kickReason += "\n" + getString("ban.kickMessage.discord", { discordLink: configModule.discordLink });
            }
            player.kick(kickReason);
            return;
        }

        updatePlayerNametag(player, config); // Pass config for rank colors etc.
        playerUtils.debugLog(`Nametag updated for ${player.nameTag} on spawn.`, player.nameTag);

        if (initialSpawn && config.enableWelcomerMessage) {
            const welcomeMsgKey = config.welcomeMessageKey || "welcome.joinMessage"; // Use key from config or a default
            let message = getString(welcomeMsgKey, { playerName: player.nameTag });
            mc.system.runTimeout(() => { // Use mc.system.runTimeout for delays
                player.sendMessage(message);
            }, 20); // 1 second delay (20 ticks)

            if (pData) {
                pData.joinTime = Date.now();
                pData.isDirtyForSave = true;
            }

            if (logManager?.addLog) {
                const spawnLocation = player.location;
                const spawnDimensionId = player.dimension.id.split(':')[1];
                const spawnGameMode = mc.GameMode[player.gameMode];
                logManager.addLog({
                    actionType: 'playerInitialJoin',
                    targetName: player.nameTag,
                    targetId: player.id,
                    details: `Joined for the first time. Loc: ${Math.floor(spawnLocation.x)},${Math.floor(spawnLocation.y)},${Math.floor(spawnLocation.z)} in ${spawnDimensionId}. GameMode: ${spawnGameMode}. Welcome sent.`,
                    location: { x: Math.floor(spawnLocation.x), y: Math.floor(spawnLocation.y), z: Math.floor(spawnLocation.z), dimensionId: spawnDimensionId },
                    gameMode: spawnGameMode
                });
            }

            if (playerUtils?.notifyAdmins && config.notifyAdminOnNewPlayerJoin) {
                playerUtils.notifyAdmins(getString("admin.notify.newPlayerJoined", { playerName: player.nameTag }), player, pData);
            }
        } else if (!initialSpawn && logManager?.addLog && pData) {
            // Log respawn
            const spawnLocation = player.location;
            const spawnDimensionId = player.dimension.id.split(':')[1];
            const spawnGameMode = mc.GameMode[player.gameMode];
            logManager.addLog({
                actionType: 'playerRespawn',
                targetName: player.nameTag,
                targetId: player.id,
                details: `Respawned. Loc: ${Math.floor(spawnLocation.x)},${Math.floor(spawnLocation.y)},${Math.floor(spawnLocation.z)} in ${spawnDimensionId}. GameMode: ${spawnGameMode}.`,
                location: { x: Math.floor(spawnLocation.x), y: Math.floor(spawnLocation.y), z: Math.floor(spawnLocation.z), dimensionId: spawnDimensionId },
                gameMode: spawnGameMode
            });
        }

        if (pData && pData.deathMessageToShowOnSpawn && config.enableDeathCoordsMessage) {
            mc.system.runTimeout(() => {
                player.sendMessage(pData.deathMessageToShowOnSpawn); // Already localized
            }, 5); // Short delay
            playerUtils.debugLog(`DeathCoords: Displayed death message to ${player.nameTag}: "${pData.deathMessageToShowOnSpawn}"`, pData.isWatched ? player.nameTag : null);
            pData.deathMessageToShowOnSpawn = null; // Clear after showing
            pData.isDirtyForSave = true;
        }

        if (checks?.checkInvalidRenderDistance && config.enableInvalidRenderDistanceCheck) {
            await checks.checkInvalidRenderDistance(player, pData, config, playerUtils, logManager, actionManager, dependencies);
        }

        if (config.enableDetailedJoinLeaveLogging) {
            const deviceType = player.clientSystemInfo?.platformType?.toString() || getString("common.value.unknown");
            const gameModeName = mc.GameMode[player.gameMode] || getString("common.value.unknown");
            const loc = player.location;
            const dimId = player.dimension.id.split(':')[1] || getString("common.value.unknown");
            const locStr = `${Math.floor(loc.x)}, ${Math.floor(loc.y)}, ${Math.floor(loc.z)} in ${dimId}`;
            console.warn(`[JoinLog] Player: ${player.nameTag} (ID: ${player.id}, Device: ${deviceType}, Mode: ${gameModeName}) ${initialSpawn ? 'joined' : 'spawned'} at ${locStr}.`);
        }

    } catch (error) {
        console.error(`[AntiCheat] Error in handlePlayerSpawn for ${player?.nameTag || "unknown player"}: ${error.stack || error}`);
        playerUtils?.debugLog?.(`Error in handlePlayerSpawn for ${player?.nameTag || "unknown player"}: ${error}`, player?.nameTag);
    }
}

/**
 * Handles piston activation events for anti-griefing purposes, specifically checking for piston lag machines.
 * @param {mc.PistonActivateEvent} eventData - The data from the piston activation event.
 * @param {import('../types.js').Dependencies} dependencies - An object containing necessary dependencies.
 * @returns {Promise<void>}
 */
export async function handlePistonActivate_AntiGrief(eventData, dependencies) {
    const { config, playerUtils, logManager, actionManager, checks } = dependencies;
    if (!config.enablePistonLagCheck) return;

    const { pistonBlock, dimension } = eventData; // eventData.dimension directly, not eventData.dimension.id
    if (!pistonBlock) {
        playerUtils.debugLog("PistonLag: eventData.pistonBlock is undefined.", null);
        return;
    }
    if (!dimension) {
        playerUtils.debugLog(`PistonLag: dimension is undefined for piston at ${JSON.stringify(pistonBlock.location)}.`, null);
        return;
    }

    if (checks?.checkPistonLag) {
        // Pass dimension object directly as per typical checkPistonLag signature
        await checks.checkPistonLag(pistonBlock, dimension, dependencies);
    } else {
        playerUtils.debugLog("PistonLag: checkPistonLag function is not available.", null);
    }
}

/**
 * Handles entity spawn events for anti-griefing, such as Wither or Golem spam.
 * @param {mc.EntitySpawnEvent} eventData - The data from the entity spawn event.
 * @param {import('../types.js').Dependencies} dependencies - An object containing necessary dependencies.
 * @returns {Promise<void>}
 */
export async function handleEntitySpawnEvent_AntiGrief(eventData, dependencies) {
    const { config, playerUtils, actionManager, playerDataManager, checks, currentTick } = dependencies;
    const { entity } = eventData;

    if (!entity) {
        playerUtils.debugLog("AntiGrief: eventData.entity is undefined in handleEntitySpawnEvent_AntiGrief.", null);
        return;
    }

    if (entity.typeId === "minecraft:wither" && config.enableWitherAntiGrief) {
        playerUtils.debugLog(`AntiGrief: Wither spawned (ID: ${entity.id}). Config action: ${config.witherSpawnAction}.`, null);
        const violationDetails = { entityId: entity.id, entityType: entity.typeId };
        // For Wither spawns, player is null as it's a world event potentially not tied to a specific player.
        await actionManager.executeCheckAction("worldAntigriefWitherSpawn", null, violationDetails, dependencies);
        if (config.witherSpawnAction === "kill") {
            entity.kill();
            playerUtils.debugLog(`AntiGrief: Wither (ID: ${entity.id}) killed due to witherSpawnAction config.`, null);
        }
    } else if (config.enableEntitySpamAntiGrief && (entity.typeId === "minecraft:snow_golem" || entity.typeId === "minecraft:iron_golem")) {
        playerUtils.debugLog(`AntiGrief: ${entity.typeId} spawned. Checking attribution. Tick: ${currentTick}`, null);
        // Try to attribute the golem spawn to a player who might be constructing it.
        for (const player of mc.world.getAllPlayers()) {
            const pData = playerDataManager.getPlayerData(player.id);
            if (pData?.expectingConstructedEntity?.type === entity.typeId) {
                 playerUtils.debugLog(`AntiGrief: Attributed ${entity.typeId} to ${player.nameTag}. Expectation: ${JSON.stringify(pData.expectingConstructedEntity)}`, player.nameTag);
                if (checks?.checkEntitySpam) {
                    const isSpam = await checks.checkEntitySpam(player, entity.typeId, dependencies); // Pass full dependencies
                    if (isSpam && config.entitySpamAction === "kill") {
                        entity.kill();
                        playerUtils.debugLog(`AntiGrief: ${entity.typeId} (ID: ${entity.id}) killed due to spam detection by ${player.nameTag}.`, player.nameTag);
                    }
                }
                pData.expectingConstructedEntity = null; // Clear expectation
                pData.isDirtyForSave = true;
                break; // Found attributed player
            }
        }
    }
}

/**
 * Handles block placement before events for anti-griefing, e.g., TNT placement.
 * @param {mc.PlayerPlaceBlockBeforeEvent} eventData - The data from the block placement event.
 * @param {import('../types.js').Dependencies} dependencies - An object containing necessary dependencies.
 * @returns {Promise<void>}
 */
export async function handlePlayerPlaceBlockBeforeEvent_AntiGrief(eventData, dependencies) {
    const { config, playerUtils, actionManager } = dependencies;
    const { player, itemStack, block } = eventData;

    if (!player || !itemStack || !block) return; // Basic validation

    if (itemStack.typeId === "minecraft:tnt" && config.enableTntAntiGrief) {
        const playerPermission = playerUtils.getPlayerPermissionLevel(player);
        if (config.allowAdminTntPlacement && playerPermission <= permissionLevels.admin) {
            playerUtils.debugLog(`AntiGrief: Admin ${player.nameTag} placed TNT. Allowed by config.`, player.nameTag);
            return; // Allow admin placement
        }

        const violationDetails = { itemTypeId: itemStack.typeId, location: block.location };
        await actionManager.executeCheckAction("worldAntigriefTntPlace", player, violationDetails, dependencies);

        // The action profile for "world_antigrief_tnt_place" should define if eventData.cancel is set.
        // Example profile might have: "cancelEvent": true
        const profile = config.checkActionProfiles?.world_antigrief_tnt_place;
        if (profile?.cancelEvent) {
            eventData.cancel = true;
            playerUtils.warnPlayer(player, getString(profile.messageKey || "antigrief.tntPlacementDenied"));
        }
    }
}

/**
 * Handles entity death events, primarily for player death effects or logging.
 * @param {mc.EntityDieEvent} eventData - The data from the entity death event.
 * @param {import('../types.js').Dependencies} dependencies - Full dependencies object.
 * @returns {Promise<void>}
 */
export async function handleEntityDieForDeathEffects(eventData, dependencies) {
    const { config: currentConfig, playerUtils } = dependencies; // Get config from dependencies
    if (!currentConfig.enableDeathEffects) return;
    const { deadEntity } = eventData;

    if (!(deadEntity instanceof mc.Player)) return;

    playerUtils.debugLog(`Player ${deadEntity.nameTag} died. Processing death effects.`, deadEntity.nameTag);
    if (currentConfig.deathEffectParticleName) { // Use deathEffectParticleName as per userSettings migration
        try {
            deadEntity.dimension.spawnParticle(currentConfig.deathEffectParticleName, deadEntity.location);
        } catch (e) {
            console.warn(`[AntiCheat] Failed to spawn death particle ${currentConfig.deathEffectParticleName}: ${e}`);
        }
    }
    if (currentConfig.deathEffectSoundId) { // Also handle sound
         try {
            deadEntity.dimension.playSound(currentConfig.deathEffectSoundId, deadEntity.location);
        } catch (e) {
            console.warn(`[AntiCheat] Failed to play death sound ${currentConfig.deathEffectSoundId}: ${e}`);
        }
    }
}

/**
 * Handles entity hurt events to track combat states and detect self-harm.
 * @param {mc.EntityHurtEvent} eventData - The data from the entity hurt event.
 * @param {import('../types.js').Dependencies} dependencies - An object containing necessary dependencies.
 * @returns {Promise<void>}
 */
export async function handleEntityHurt(eventData, dependencies) {
    const { playerDataManager, checks, config, currentTick, actionManager } = dependencies;
    const { hurtEntity, cause, damagingEntity } = eventData;

    if (hurtEntity?.typeId === 'minecraft:player') {
        const victim = hurtEntity; // victim is a Player
        const pData = playerDataManager.getPlayerData(victim.id);
        if (pData) {
            pData.lastTookDamageTick = currentTick;
            pData.lastDamageCause = cause.cause; // Store the cause string
            pData.lastDamagingEntityType = damagingEntity?.typeId; // Store typeId if damagingEntity exists
            pData.isDirtyForSave = true;

            if (damagingEntity?.typeId === 'minecraft:player' && damagingEntity.id !== victim.id) {
                pData.lastCombatInteractionTime = Date.now(); // Update for PvP
                const attacker = damagingEntity; // attacker is a Player
                const attackerPData = playerDataManager.getPlayerData(attacker.id);
                if (attackerPData) {
                    attackerPData.lastCombatInteractionTime = Date.now(); // Also update for attacker
                    attackerPData.isDirtyForSave = true;
                }
            }

            if (checks?.checkSelfHurt && config.enableSelfHurtCheck) {
                await checks.checkSelfHurt(victim, cause, damagingEntity, pData, dependencies);
            }
        }
    }

    // Example: Pass to a generic combat check if needed
    if (checks?.processCombatEvent) {
        await checks.processCombatEvent(eventData, dependencies);
    }
}

/**
 * Handles player death events, primarily for logging and providing death coordinates.
 * @param {mc.PlayerDieEvent} eventData - The data from the player death event. (Note: mc.PlayerDieEvent is correct)
 * @param {import('../types.js').Dependencies} dependencies - An object containing necessary dependencies.
 * @returns {Promise<void>}
 */
export async function handlePlayerDeath(eventData, dependencies) {
    const { player } = eventData; // mc.PlayerDieEvent gives `player` directly
    const { playerDataManager, config, configModule, logManager } = dependencies;

    if (!player) return;

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

        const deathCoordsMsgKey = configModule.deathCoordsMessageKey || "message.deathCoords";
        let message = getString(deathCoordsMsgKey, {
            x: x.toString(), y: y.toString(), z: z.toString(), dimensionId: dimensionId
        });
        pData.deathMessageToShowOnSpawn = message; // Store for display on respawn
        pData.isDirtyForSave = true;
    }

    if (logManager?.addLog) {
        logManager.addLog({
            actionType: 'playerDeath',
            targetName: player.nameTag,
            targetId: player.id,
            details: `Player died. Cause: ${eventData.damageCause?.cause || 'unknown'}. Killer: ${eventData.killer?.nameTag || 'N/A'}.`,
            location: player.location,
            dimensionId: player.dimension.id,
        });
    }
}

/**
 * Subscribes to events relevant for combat logging, if enabled.
 * @param {import('../types.js').Dependencies} dependencies - An object containing necessary dependencies.
 */
export function subscribeToCombatLogEvents(dependencies) {
    const { config, playerDataManager } = dependencies;
    if (!config.enableCombatLogDetection) return;

    mc.world.afterEvents.entityHurt.subscribe(eventData => {
        const { hurtEntity, damagingEntity } = eventData;
        if (hurtEntity?.typeId === 'minecraft:player' && damagingEntity?.typeId === 'minecraft:player') {
            if (hurtEntity.id === damagingEntity.id) return; // Ignore self-harm for combat log timer

            const victimPData = playerDataManager.getPlayerData(hurtEntity.id);
            const attackerPData = playerDataManager.getPlayerData(damagingEntity.id);
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
 * Handles block break before events for checks like insta-break.
 * @param {mc.PlayerBreakBlockBeforeEvent} eventData - The data from the block break event.
 * @param {import('../types.js').Dependencies} dependencies - An object containing necessary dependencies.
 * @returns {Promise<void>}
 */
export async function handlePlayerBreakBlockBeforeEvent(eventData, dependencies) {
    const { checks, config } = dependencies;
    const { player, block, itemStack } = eventData; // itemStack is the tool used

    if (!player || !block) return;

    // Insta-break check
    if (checks?.checkInstaBreak && config.enableInstaBreakCheck) {
        const pData = dependencies.playerDataManager.getPlayerData(player.id);
        if (!pData) return;

        // Calculate expected break time (simplified, real check is more complex)
        const expectedTicks = getExpectedBreakTicks(block.typeId, itemStack, player);
        pData.blockBreakStartTime = dependencies.currentTick;
        pData.expectedBreakTicks = expectedTicks;
        pData.blockBeingBroken = block; // Store reference to the block being broken
        pData.isDirtyForSave = true;

        // The actual insta-break detection might happen in checkInstaBreak or in PlayerBreakBlockAfterEvent
        // This is primarily for recording start time.
        // await checks.checkInstaBreak(player, block, itemStack, pData, dependencies); // This might be too early
    }

    // Other checks that need to run *before* the block is broken
    if (checks?.checkNukerRaycast && config.enableNukerCheck) {
         await checks.checkNukerRaycast(player, block, dependencies);
    }
}

/**
 * Handles block break after events, primarily for X-Ray detection.
 * @param {mc.PlayerBreakBlockAfterEvent} eventData - The data from the block break event.
 * @param {import('../types.js').Dependencies} dependencies - An object containing necessary dependencies.
 * @returns {Promise<void>}
 */
export async function handlePlayerBreakBlockAfterEvent(eventData, dependencies) {
    const { checks, config } = dependencies;
    const { player, brokenBlockPermutation, brokenBlockType, itemStackAfterBreak } = eventData; // itemStackAfterBreak is the tool

    if (!player || !brokenBlockType) return;

    const pData = dependencies.playerDataManager.getPlayerData(player.id);
    if (!pData) return;

    // X-Ray detection
    if (checks?.checkXray && config.enableXRayCheck) {
        await checks.checkXray(player, brokenBlockType, pData, dependencies);
    }

    // Insta-break check (part 2 - verification)
    if (checks?.checkInstaBreak && config.enableInstaBreakCheck && pData.blockBeingBroken) {
         // Compare pData.blockBreakStartTime with dependencies.currentTick
         // and pData.expectedBreakTicks.
         // This is where the actual insta-break check logic would be more prominent.
         // For now, assuming checkInstaBreak in main.js handles this if called from a tick loop
         // or if it's designed to be called from *after* event as well.
         // The current setup suggests checkInstaBreak is more of a "start tracking" here.
         // Let's assume a more complete check would be in a dedicated checkInstaBreak function.
         // If `checkInstaBreak` is intended to be called here for the *after* part:
         // await checks.checkInstaBreak(player, pData.blockBeingBroken, itemStackAfterBreak, pData, dependencies, true /* isAfterEvent */);
    }
    pData.blockBeingBroken = null;
    pData.isDirtyForSave = true;

    // AutoTool check
    if (checks?.checkAutoTool && config.enableAutoToolCheck) {
        await checks.checkAutoTool(player, brokenBlockType, itemStackAfterBreak, pData, dependencies);
    }
}

/**
 * Handles item use events for various checks like fast-use or anti-grief.
 * @param {mc.ItemUseEvent} eventData - The data from the item use event.
 * @param {import('../types.js').Dependencies} dependencies - An object containing necessary dependencies.
 * @returns {Promise<void>}
 */
export async function handleItemUse(eventData, dependencies) {
    const { checks, config } = dependencies;
    const { source: player, itemStack } = eventData; // source is the player

    if (!player || !itemStack) return;

    const pData = dependencies.playerDataManager.getPlayerData(player.id);
    if (!pData) return;


    if (checks?.checkFastUse && config.enableFastUseCheck) {
        await checks.checkFastUse(player, itemStack, pData, dependencies);
    }

    // Record consumable use for chat interaction checks
    if (itemStack.type.isConsumable && config.enableChatDuringItemUseCheck) {
        pData.isUsingConsumable = true;
        pData.isDirtyForSave = true;
        mc.system.runTimeout(() => {
            if (pData.isUsingConsumable) {
                pData.isUsingConsumable = false;
                pData.isDirtyForSave = true;
            }
        }, itemStack.type.getComponent("food")?.eatDuration * 20 || 40);
    }

    // AntiGrief: Example for specific item use prevention
    if (config.preventedItemUses && config.preventedItemUses.includes(itemStack.typeId)) {
        // This is a simplistic example. A real check would use actionManager
        // and have a proper profile in checkActionProfiles.
        // For now, just demonstrating where such a check might hook in.
        dependencies.playerUtils.warnPlayer(player, getString("antigrief.itemUseDenied", {item: itemStack.typeId}));
        // To make this effective, you'd typically cancel the event if it's a BeforeEvent,
        // or take action if it's an AfterEvent. ItemUseEvent is an AfterEvent.
        // So, you might revert effects or take punitive action via actionManager.
        // await dependencies.actionManager.executeCheckAction("antigrief_item_use", player, { itemTypeId: itemStack.typeId }, dependencies);
    }
}

/**
 * Handles item use on block events for checks like anti-grief or specific interactions.
 * @param {mc.ItemUseOnEvent} eventData - The data from the item use on block event.
 * @param {import('../types.js').Dependencies} dependencies - An object containing necessary dependencies.
 * @returns {Promise<void>}
 */
export async function handleItemUseOn(eventData, dependencies) {
    const { checks, config } = dependencies;
    const { source: player, itemStack, block } = eventData; // source is player

    if (!player || !itemStack || !block) return;

    // Example: Check for illegal item use on specific blocks
    if (checks?.checkIllegalItemUseOnBlock && config.enableIllegalItemUseOnBlockCheck) {
        await checks.checkIllegalItemUseOnBlock(player, itemStack, block, dependencies);
    }

    // Record bow charging for chat interaction checks
    if (itemStack.typeId === "minecraft:bow" && config.enableChatDuringItemUseCheck) {
        const pData = dependencies.playerDataManager.getPlayerData(player.id);
        if (pData) {
            pData.isChargingBow = true;
            pData.isDirtyForSave = true;
            // Bow charge can be held, reset when item use stops or player changes item
            // This might need a more robust tracking mechanism, e.g., in player tick or item release event.
        }
    }
}

/**
 * Handles inventory item change events, typically for illegal item checks.
 * @param {mc.InventoryItemChangeEvent} eventData - The data from the inventory change event. (Note: This event doesn't exist directly. Simulating with PlayerEquipmentSlotChangeEvent or similar)
 * For the purpose of this example, let's assume this is called from a wrapper around PlayerEquipmentSlotChangeEvent or a custom inventory scan.
 * @param {import('@minecraft/server').Player} player - The player whose inventory changed.
 * @param {mc.ItemStack | undefined} newItem - The new item in the slot.
 * @param {mc.ItemStack | undefined} oldItem - The old item in the slot.
 * @param {string} slotName - The name of the slot that changed.
 * @param {import('../types.js').Dependencies} dependencies - An object containing necessary dependencies.
 * @returns {Promise<void>}
 */
export async function handleInventoryItemChange(player, newItem, _oldItem, slotName, dependencies) {
    const { checks, config } = dependencies;

    if (!player) return;

    if (checks?.checkIllegalItems && config.enableIllegalItemCheck) {
        // This check would typically iterate all inventory or the changed item
        await checks.checkIllegalItems(player, newItem, slotName, dependencies);
    }
}


/**
 * Handles block placement before events for various checks.
 * @param {mc.PlayerPlaceBlockBeforeEvent} eventData - The data from the block placement event.
 * @param {import('../types.js').Dependencies} dependencies - An object containing necessary dependencies.
 * @returns {Promise<void>}
 */
export async function handlePlayerPlaceBlockBefore(eventData, dependencies) {
    const { checks, config } = dependencies;
    const { player, block, itemStack } = eventData;

    if (!player || !block || !itemStack) return;

    // Example: Check for building violations (e.g., build height, restricted areas)
    if (checks?.checkBuildingRestrictions && config.enableBuildingRestrictionCheck) {
        await checks.checkBuildingRestrictions(player, block, itemStack, dependencies);
        if (eventData.cancel) return; // If checkBuildingRestrictions cancelled, stop further processing
    }

    // Call the AntiGrief specific handler as well, if it has distinct logic
    await handlePlayerPlaceBlockBeforeEvent_AntiGrief(eventData, dependencies);
}

/**
 * Handles block placement after events, e.g., for tracking constructed entities for anti-grief.
 * @param {mc.PlayerPlaceBlockAfterEvent} eventData - The data from the block placement event.
 * @param {import('../types.js').Dependencies} dependencies - An object containing necessary dependencies.
 * @returns {Promise<void>}
 */
export async function handlePlayerPlaceBlockAfterEvent(eventData, dependencies) {
    const { config, playerDataManager, playerUtils } = dependencies;
    const { player, block } = eventData;

    if (!player || !block) return;

    // AntiGrief: Track potential golem construction
    if (config.enableEntitySpamAntiGrief && block.typeId === "minecraft:carved_pumpkin") {
        const pData = playerDataManager.getPlayerData(player.id);
        if (pData) {
            // Check blocks below for golem structure (simplified)
            const blockBelow = player.dimension.getBlock(block.location.offset(0, -1, 0));
            const blockTwoBelow = player.dimension.getBlock(block.location.offset(0, -2, 0));

            let potentialGolemType = null;
            if (blockBelow?.typeId === "minecraft:iron_block" && blockTwoBelow?.typeId === "minecraft:iron_block") {
                potentialGolemType = "minecraft:iron_golem";
            } else if (blockBelow?.typeId === "minecraft:snow_block" && blockTwoBelow?.typeId === "minecraft:snow_block") {
                potentialGolemType = "minecraft:snow_golem";
            }

            if (potentialGolemType) {
                pData.expectingConstructedEntity = {
                    type: potentialGolemType,
                    location: block.location,
                    tick: dependencies.currentTick
                };
                pData.isDirtyForSave = true;
                playerUtils.debugLog(`AntiGrief: Player ${player.nameTag} placed pumpkin for potential ${potentialGolemType}. Expecting entity.`, player.nameTag);
            }
        }
    }
}

/**
 * Handles chat messages before they are sent, for muting, command processing, and anti-spam/swear checks.
 * @param {mc.BeforeChatSendEvent} eventData - The data from the chat send event.
 * @param {import('../types.js').Dependencies} dependencies - An object containing necessary dependencies.
 * @returns {Promise<void>}
 */
export async function handleBeforeChatSend(eventData, dependencies) {
    const { playerDataManager, config, playerUtils, checks, logManager, actionManager, commandManager } = dependencies;
    const { sender: player, message: originalMessage } = eventData;

    if (!player) return;

    const pData = playerDataManager.getPlayerData(player.id);
    if (!pData) {
        playerUtils.warnPlayer(player, getString("error.playerDataNotFound"));
        eventData.cancel = true;
        return;
    }

    // Mute Check
    if (playerDataManager.isMuted(player)) {
        const muteInfo = playerDataManager.getMuteInfo(player);
        const reason = muteInfo?.reason || getString("common.value.noReasonProvided");
        playerUtils.warnPlayer(player, getString("chat.error.muted"));
        eventData.cancel = true;
        logManager?.addLog?.({ actionType: 'chatAttemptMuted', targetName: player.nameTag, details: `Msg: "${originalMessage}". Reason: ${reason}` });
        return;
    }

    // Command Processing
    if (originalMessage.startsWith(config.commandPrefix)) {
        eventData.cancel = true;
        await commandManager.processCommand(player, originalMessage);
        return;
    }

    // Chat Interaction Checks (Combat, Item Use)
    if (config.enableChatDuringCombatCheck && pData.lastCombatInteractionTime) {
        const timeSinceCombat = (Date.now() - pData.lastCombatInteractionTime) / 1000;
        if (timeSinceCombat < config.chatDuringCombatCooldownSeconds) {
            const profile = config.checkActionProfiles?.player_chat_during_combat;
            if (profile?.enabled) {
                if (profile.cancelMessage) eventData.cancel = true;
                playerUtils.warnPlayer(player, getString(profile.messageKey || "chat.error.combatCooldown", { seconds: config.chatDuringCombatCooldownSeconds }));
                actionManager?.executeCheckAction?.("playerChatDuringCombat", player, { timeSinceCombat: timeSinceCombat.toFixed(1) }, dependencies);
                if (eventData.cancel) return;
            }
        }
    }

    if (!eventData.cancel && config.enableChatDuringItemUseCheck && (pData.isUsingConsumable || pData.isChargingBow)) {
        const itemUseState = pData.isUsingConsumable ? getString("check.inventoryMod.action.usingConsumable") : getString("check.inventoryMod.action.chargingBow");
        const profile = config.checkActionProfiles?.player_chat_during_item_use;
        if (profile?.enabled) {
            if (profile.cancelMessage) eventData.cancel = true;
            playerUtils.warnPlayer(player, getString(profile.messageKey || "chat.error.itemUse", { itemUseState: itemUseState }));
            actionManager?.executeCheckAction?.("playerChatDuringItemUse", player, { itemUseState }, dependencies);
            if (eventData.cancel) return;
        }
    }

    // Reset bow charging state after chat attempt if not cancelled
    if (pData.isChargingBow) {
        pData.isChargingBow = false;
        pData.isDirtyForSave = true;
    }

    // Swear Check (delegated to AutoMod via actionManager profile)
    if (!eventData.cancel && checks?.checkSwear && config.enableSwearCheck) {
        await checks.checkSwear(player, originalMessage, pData, dependencies);
        if (eventData.cancel) return; // Swear check might cancel based on its profile
    }

    // Spam Check (delegated to AutoMod via actionManager profile)
    // Note: This was 'enableSpamCheck', assuming it refers to the repeat spam check.
    // The checkType used in automodConfig was 'chat_repeat_spam'.
    // If 'checks.checkSpam' is the correct function for repeat spam:
    if (!eventData.cancel && checks?.checkMessageRate && config.spamRepeatCheckEnabled) { // Assuming config.spamRepeatCheckEnabled is the correct toggle
        await checks.checkMessageRate(player, pData, eventData, config, playerUtils, playerDataManager, logManager, actionManager.executeCheckAction, dependencies.currentTick); // This function would internally use "chat_repeat_spam" or similar checkType
        // If checkSpam itself doesn't handle cancellation via action profile, and a specific cancel config exists:
        // if (config.spamRepeatCancelMessage) eventData.cancel = true;
        if (eventData.cancel) return;
    }

    // Newline Check (Adding flag logic here)
    if (!eventData.cancel && config.enableNewlineCheck) {
        if (originalMessage.includes('\n') || originalMessage.includes('\r')) {
            playerUtils.warnPlayer(player, getString("chat.error.newline")); // Assuming a generic warning key
            if (config.flagOnNewline) {
                playerDataManager.addFlag(player, "chatNewline", "Newline character detected in chat message.", { message: originalMessage }, dependencies);
            }
            if (config.cancelMessageOnNewline) {
                eventData.cancel = true;
            }
            if (eventData.cancel) return;
        }
    }

    // Max Message Length Check (Adding flag logic here)
    if (!eventData.cancel && config.enableMaxMessageLengthCheck) {
        if (originalMessage.length > config.maxMessageLength) {
            playerUtils.warnPlayer(player, getString("chat.error.maxLength", { maxLength: config.maxMessageLength })); // Assuming a generic warning key
            if (config.flagOnMaxMessageLength) {
                playerDataManager.addFlag(player, "chatMaxlength", "Message exceeded maximum configured length.", { message: originalMessage, maxLength: config.maxMessageLength }, dependencies);
            }
            if (config.cancelOnMaxMessageLength) {
                eventData.cancel = true;
            }
            if (eventData.cancel) return;
        }
    }

    // Anti-Advertising Check
    if (!eventData.cancel && checks?.checkAntiAdvertising && config.enableAntiAdvertisingCheck) {
        await checks.checkAntiAdvertising(player, originalMessage, pData, dependencies);
        // The action profile for advertising does not cancel by default,
        // but if it were configured to, this check would be useful:
        // if (eventData.cancel) return;
    }

    // CAPS Abuse Check
    if (!eventData.cancel && checks?.checkCapsAbuse && config.enableCapsCheck) {
        await checks.checkCapsAbuse(player, originalMessage, pData, dependencies);
        // The default action profile for CAPS abuse does not cancel the message.
        // If it were configured to cancel, this would be important:
        // if (eventData.cancel) return;
    }

    // Character Repeat Check
    if (!eventData.cancel && checks?.checkCharRepeat && config.enableCharRepeatCheck) {
        await checks.checkCharRepeat(player, originalMessage, pData, dependencies);
        // The default action profile for char repeat does not cancel the message.
        // If it were configured to cancel, this would be important:
        // if (eventData.cancel) return;
    }

    // Symbol Spam Check
    if (!eventData.cancel && checks?.checkSymbolSpam && config.enableSymbolSpamCheck) {
        await checks.checkSymbolSpam(player, originalMessage, pData, dependencies);
        // The default action profile for symbol spam does not cancel the message.
        // If it were configured to cancel, this would be important:
        // if (eventData.cancel) return;
    }

    // Rank Formatting (if message not cancelled by now)
    if (!eventData.cancel) {
        const rankElements = getPlayerRankFormattedChatElements(player, config);
        const finalMessage = `${rankElements.fullPrefix}${rankElements.nameColor}${player.nameTag ?? player.name}§f: ${rankElements.messageColor}${originalMessage}`;
        mc.world.sendMessage(finalMessage);
        eventData.cancel = true;
        logManager?.addLog?.({ actionType: 'chatMessageSent', targetName: player.nameTag, details: originalMessage });
    }
}

/**
 * Handles player dimension change after events, primarily for dimension locking.
 * @param {mc.PlayerDimensionChangeAfterEvent} eventData - The data from the dimension change event.
 * @param {import('../types.js').Dependencies} dependencies - An object containing necessary dependencies.
 * @returns {Promise<void>}
 */
export async function handlePlayerDimensionChangeAfterEvent(eventData, dependencies) {
    const { player, fromDimension, toDimension, fromLocation } = eventData;
    const { playerUtils, config } = dependencies;

    if (!player || !toDimension || !fromDimension || !fromLocation) return;

    const playerPermission = playerUtils.getPlayerPermissionLevel(player);
    if (playerPermission <= permissionLevels.bypass) { // Assuming 'bypass' is a higher level like admin/moderator
        playerUtils.debugLog(`Player ${player.nameTag} has bypass permission for dimension locks.`, player.nameTag);
        return;
    }

    let dimensionIsLocked = false;
    let lockedDimensionName = "";
    const toDimensionId = toDimension.id.split(':')[1]; // Get short name like 'nether' or 'the_end'

    if (toDimensionId === 'nether' && isNetherLocked(config)) {
        dimensionIsLocked = true;
        lockedDimensionName = getString("dimensionLock.name.nether");
    } else if (toDimensionId === 'the_end' && isEndLocked(config)) {
        dimensionIsLocked = true;
        lockedDimensionName = getString("dimensionLock.name.end");
    }

    if (dimensionIsLocked) {
        try {
            player.teleport(fromLocation, { dimension: fromDimension });
            playerUtils.warnPlayer(player, getString("dimensionLock.teleportMessage", { lockedDimensionName: lockedDimensionName }));
            playerUtils.notifyAdmins(getString("admin.notify.dimensionLockAttempt", { playerName: player.nameTag, dimensionName: lockedDimensionName }), player);
        } catch (e) {
            console.error(`[AntiCheat] Failed to teleport ${player.nameTag} back from locked dimension ${toDimensionId}: ${e}`);
            playerUtils.debugLog(`Teleport fail for ${player.nameTag} from ${toDimensionId}: ${e}`, player.nameTag);
        }
    }
}

