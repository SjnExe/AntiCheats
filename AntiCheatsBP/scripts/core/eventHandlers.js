/**
 * @file AntiCheatsBP/scripts/core/eventHandlers.js
 * @description Centralized handlers for various Minecraft Server API events.
 * These handlers process event data, interact with managers (PlayerData, Action, Log),
 * and delegate to specific check functions for cheat detection and system responses.
 * @version 1.1.1
 */
import * as mc from '@minecraft/server';
// rankManager functions (getPlayerRankFormattedChatElements, updatePlayerNametag) and permissionLevels are now accessed via dependencies.rankManager
import { getExpectedBreakTicks, isNetherLocked, isEndLocked } from '../utils/index.js';
// getString will be accessed via dependencies.getString
import { formatSessionDuration } from '../utils/playerUtils.js'; // formatSessionDuration is a standalone utility

export async function handlePlayerLeave(eventData, dependencies) {
    const { playerDataManager, playerUtils, config: currentConfig, logManager } = dependencies;
    const translationsDict = dependencies.translations_dict || {};
    const { player } = eventData;
    if (!player) {
        console.warn("[AntiCheat] handlePlayerLeave: Player undefined in eventData.");
        return;
    }
    playerUtils.debugLog(`Player ${player.nameTag} is leaving. Processing data...`, dependencies, player.nameTag);

    if (playerDataManager.saveDirtyPlayerData) {
        try {
            await playerDataManager.saveDirtyPlayerData(player, dependencies); // Pass dependencies
            playerUtils.debugLog(`Data saved for ${player.nameTag} on leave via saveDirtyPlayerData.`, dependencies, player.nameTag);
        } catch (error) {
            console.error(`[AntiCheat] Error in saveDirtyPlayerData for ${player.nameTag} on leave: ${error}`);
        }
    }

    const pData = playerDataManager.getPlayerData(player.id); // This typically doesn't need full dependencies for a simple get

    if (pData && currentConfig.enableCombatLogDetection && pData.lastCombatInteractionTime > 0) {
        const currentTime = Date.now();
        const timeSinceLastCombatMs = currentTime - pData.lastCombatInteractionTime;
        const combatLogThresholdMs = (currentConfig.combatLogThresholdSeconds || 15) * 1000;

        if (timeSinceLastCombatMs < combatLogThresholdMs) {
            const timeSinceLastCombatSeconds = (timeSinceLastCombatMs / 1000).toFixed(1);
            const flagType = 'combatLog';
            const incrementAmount = currentConfig.combatLogFlagIncrement || 1;
            const baseFlagReason = `Disconnected ${timeSinceLastCombatSeconds}s after combat.`;

            playerUtils.debugLog(`CombatLog: Player ${player.nameTag} left ${timeSinceLastCombatSeconds}s after combat. Threshold: ${currentConfig.combatLogThresholdSeconds}s. Flagging +${incrementAmount}.`, dependencies, player.nameTag);

            for (let i = 0; i < incrementAmount; i++) {
                await playerDataManager.addFlag(player, flagType, baseFlagReason, `(#${i + 1}/${incrementAmount}) Details: ${timeSinceLastCombatSeconds}s delay.`, dependencies);
            }

            if (currentConfig.combatLogMessage && currentConfig.combatLogMessageKey) {
                const messageKey = currentConfig.combatLogMessageKey; // e.g., "message.combatLogAdminNotify"
                let notifyMessage = translationsDict[messageKey] || "§c[CombatLog] §e{playerName}§c disconnected {timeSinceCombat}s after being in combat! Flags: +{incrementAmount}"; // Fallback
                notifyMessage = notifyMessage.replace("{playerName}", player.nameTag)
                                           .replace("{timeSinceCombat}", timeSinceLastCombatSeconds)
                                           .replace("{incrementAmount}", incrementAmount.toString());
                playerUtils.notifyAdmins(notifyMessage, dependencies, player, pData);
            }

            if (logManager?.addLog) {
                logManager.addLog({
                    adminName: 'System',
                    actionType: 'combatLogDetected',
                    targetName: player.nameTag,
                    details: `Disconnected ${timeSinceLastCombatSeconds}s after PvP. Last interaction at ${new Date(pData.lastCombatInteractionTime).toISOString()}. Flagged +${incrementAmount}.`,
                    reason: baseFlagReason
                }, dependencies);
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
        }, dependencies);
    }

    await playerDataManager.prepareAndSavePlayerData(player, dependencies); // Pass dependencies
    playerUtils.debugLog(`Finished processing playerLeave event for ${player.nameTag}.`, dependencies, player.nameTag);

    if (currentConfig.enableDetailedJoinLeaveLogging) {
        console.warn(`[LeaveLog] Player: ${player.nameTag || player.name} (ID: ${player.id}) left the game.`);
    }
}

export async function handlePlayerSpawn(eventData, dependencies) {
    const { player, initialSpawn } = eventData;
    const { playerDataManager, playerUtils, config, logManager, actionManager, checks, rankManager } = dependencies; // Added rankManager, removed getString
    const translationsDict = dependencies.translations_dict || {};

    if (!player) {
        console.warn('[AntiCheat] handlePlayerSpawn: eventData.player is undefined.');
        return;
    }
    playerUtils.debugLog(`Processing playerSpawn event for ${player.nameTag} (Initial Spawn: ${initialSpawn}). Tick: ${mc.system.currentTick}`, dependencies, player.nameTag);

    try {
        const pData = playerDataManager.getPlayerData(player.id);
        if (!pData) {
            console.warn(`[AntiCheat] handlePlayerSpawn: pData is unexpectedly null for ${player.nameTag}. Attempting to initialize.`);
        } else {
            pData.lastGameMode = player.gameMode;
            pData.lastDimensionId = player.dimension.id;
        }

        const banInfo = playerDataManager.getBanInfo(player, dependencies); // Pass dependencies
        if (banInfo) {
            playerUtils.debugLog(`Player ${player.nameTag} is banned. Kicking. Ban reason: ${banInfo.reason}, Expires: ${new Date(banInfo.unbanTime).toISOString()}`, dependencies, player.nameTag);
            const durationStringKick = banInfo.unbanTime === Infinity ? (translationsDict["ban.duration.permanent"] || "Permanent") : (translationsDict["ban.duration.expires"] || "Expires: {expiryDate}").replace("{expiryDate}", new Date(banInfo.unbanTime).toLocaleString());
            let kickReasonUnlocalized = translationsDict["ban.kickMessage"] || "§cYou are banned.\nReason: {reason}\n{durationMessage}";
            let kickReason = kickReasonUnlocalized.replace("{reason}", banInfo.reason || (translationsDict["common.value.noReasonProvided"] || "No reason provided."))
                                               .replace("{durationMessage}", durationStringKick);

            if (config.discordLink && config.discordLink.trim() !== "" && config.discordLink !== "https://discord.gg/example") {
                kickReason += "\n" + (translationsDict["ban.kickMessage.discord"] || "Appeal on our Discord: {discordLink}").replace("{discordLink}", config.discordLink);
            }
            player.kick(kickReason);
            return;
        }

        rankManager.updatePlayerNametag(player, dependencies); // Pass full dependencies
        playerUtils.debugLog(`Nametag updated for ${player.nameTag} on spawn.`, dependencies, player.nameTag);

        if (initialSpawn) {
            if (config.enableDetailedFirstJoinMessage) {
                // Send the detailed first join message
                let baseDetailedMessage = config.firstJoinMessage;
                let fullDetailedMessage = `Welcome, ${player.nameTag}!\n\n${baseDetailedMessage}`;
                mc.system.runTimeout(() => {
                    player.sendMessage(fullDetailedMessage);
                }, 20);

            } else if (config.enableWelcomerMessage) {
                // Fallback to the original simple welcome message if detailed is off BUT old welcomer is on
                const simpleWelcomeMsg = (config.welcomeMessage || "Welcome, {playerName}, to our amazing server! We're glad to have you.").replace("{playerName}", player.nameTag);
                mc.system.runTimeout(() => {
                    player.sendMessage(simpleWelcomeMsg);
                }, 20);
            }

            // Common logic for initialSpawn
            if (pData) {
                pData.joinTime = Date.now();
                pData.isDirtyForSave = true;
            }

            if (logManager?.addLog) {
                const spawnLocation = player.location;
                const spawnDimensionId = player.dimension.id.split(':')[1];
                const spawnGameMode = mc.GameMode[player.gameMode];
                let logDetails = `Joined for the first time. Loc: ${Math.floor(spawnLocation.x)},${Math.floor(spawnLocation.y)},${Math.floor(spawnLocation.z)} in ${spawnDimensionId}. GameMode: ${spawnGameMode}.`;
                if (config.enableDetailedFirstJoinMessage) {
                    logDetails += " Detailed join message sent.";
                } else if (config.enableWelcomerMessage) {
                    logDetails += " Simple welcome message sent.";
                } else {
                    logDetails += " No welcome message sent (disabled).";
                }
                logManager.addLog({
                    actionType: 'playerInitialJoin',
                    targetName: player.nameTag,
                    targetId: player.id,
                    details: logDetails,
                    location: { x: Math.floor(spawnLocation.x), y: Math.floor(spawnLocation.y), z: Math.floor(spawnLocation.z), dimensionId: spawnDimensionId },
                    gameMode: spawnGameMode
                }, dependencies);
            }

            if (playerUtils?.notifyAdmins && config.notifyAdminOnNewPlayerJoin) {
                // The content of this admin notification does not need to change based on which welcome message was sent.
                playerUtils.notifyAdmins(("§e[Admin] New player {playerName} has joined the server for the first time!").replace("{playerName}", player.nameTag), dependencies, player, pData);
            }
        } else if (!initialSpawn && logManager?.addLog && pData) { // This is for respawn, not initial join
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
            }, dependencies);
        }

        if (pData && pData.deathMessageToShowOnSpawn && config.enableDeathCoordsMessage) {
            mc.system.runTimeout(() => {
                player.sendMessage(pData.deathMessageToShowOnSpawn); // This is already a direct string
            }, 5);
            playerUtils.debugLog(`DeathCoords: Displayed death message to ${player.nameTag}: "${pData.deathMessageToShowOnSpawn}"`, dependencies, pData.isWatched ? player.nameTag : null);
            pData.deathMessageToShowOnSpawn = null;
            pData.isDirtyForSave = true;
        }

        if (checks?.checkInvalidRenderDistance && config.enableInvalidRenderDistanceCheck) {
            await checks.checkInvalidRenderDistance(player, pData, dependencies);
        }

        if (config.enableDetailedJoinLeaveLogging) {
            const deviceType = player.clientSystemInfo?.platformType?.toString() || (translationsDict["common.value.unknown"] || "Unknown");
            const gameModeName = mc.GameMode[player.gameMode] || (translationsDict["common.value.unknown"] || "Unknown");
            const loc = player.location;
            const dimId = player.dimension.id.split(':')[1] || (translationsDict["common.value.unknown"] || "Unknown");
            const locStr = `${Math.floor(loc.x)}, ${Math.floor(loc.y)}, ${Math.floor(loc.z)} in ${dimId}`;
            console.warn(`[JoinLog] Player: ${player.nameTag} (ID: ${player.id}, Device: ${deviceType}, Mode: ${gameModeName}) ${initialSpawn ? 'joined' : 'spawned'} at ${locStr}.`);
        }

    } catch (error) {
        console.error(`[AntiCheat] Error in handlePlayerSpawn for ${player?.nameTag || "unknown player"}: ${error.stack || error}`);
        playerUtils?.debugLog?.(`Error in handlePlayerSpawn for ${player?.nameTag || "unknown player"}: ${error}`, dependencies, player?.nameTag);
        if (dependencies.logManager && dependencies.logManager.addLog) {
            dependencies.logManager.addLog('error', {
                message: `Error in handlePlayerSpawn for ${player?.nameTag || "unknown player"}`,
                error: error.message,
                stack: error.stack,
                context: "handlePlayerSpawn"
            }, dependencies);
        }
    }
}

export async function handlePistonActivate_AntiGrief(eventData, dependencies) {
    const { config, playerUtils, checks } = dependencies;
    if (!config.enablePistonLagCheck) return;

    const { pistonBlock, dimension } = eventData;
    if (!pistonBlock) {
        playerUtils.debugLog("PistonLag: eventData.pistonBlock is undefined.", dependencies, null);
        return;
    }
    if (!dimension) {
        playerUtils.debugLog(`PistonLag: dimension is undefined for piston at ${JSON.stringify(pistonBlock.location)}.`, dependencies, null);
        return;
    }

    if (checks?.checkPistonLag) {
        await checks.checkPistonLag(pistonBlock, dimension, dependencies);
    } else {
        playerUtils.debugLog("PistonLag: checkPistonLag function is not available.", dependencies, null);
    }
}

export async function handleEntitySpawnEvent_AntiGrief(eventData, dependencies) {
    const { config, playerUtils, actionManager, playerDataManager, checks } = dependencies;
    const { entity } = eventData;

    if (!entity) {
        playerUtils.debugLog("AntiGrief: eventData.entity is undefined in handleEntitySpawnEvent_AntiGrief.", dependencies, null);
        return;
    }

    if (entity.typeId === "minecraft:wither" && config.enableWitherAntiGrief) {
        playerUtils.debugLog(`AntiGrief: Wither spawned (ID: ${entity.id}). Config action: ${config.witherSpawnAction}.`, dependencies, null);
        const violationDetails = { entityId: entity.id, entityType: entity.typeId };
        await actionManager.executeCheckAction("worldAntigriefWitherSpawn", null, violationDetails, dependencies);
        if (config.witherSpawnAction === "kill") {
            entity.kill();
            playerUtils.debugLog(`AntiGrief: Wither (ID: ${entity.id}) killed due to witherSpawnAction config.`, dependencies, null);
        }
    } else if (config.enableEntitySpamAntiGrief && (entity.typeId === "minecraft:snow_golem" || entity.typeId === "minecraft:iron_golem")) {
        playerUtils.debugLog(`AntiGrief: ${entity.typeId} spawned. Checking attribution. Tick: ${dependencies.currentTick}`, dependencies, null);
        for (const player of mc.world.getAllPlayers()) {
            const pData = playerDataManager.getPlayerData(player.id);
            if (pData?.expectingConstructedEntity?.type === entity.typeId) {
                 playerUtils.debugLog(`AntiGrief: Attributed ${entity.typeId} to ${player.nameTag}. Expectation: ${JSON.stringify(pData.expectingConstructedEntity)}`, dependencies, player.nameTag);
                if (checks?.checkEntitySpam) {
                    const isSpam = await checks.checkEntitySpam(player, entity.typeId, dependencies);
                    if (isSpam && config.entitySpamAction === "kill") {
                        entity.kill();
                        playerUtils.debugLog(`AntiGrief: ${entity.typeId} (ID: ${entity.id}) killed due to spam detection by ${player.nameTag}.`, dependencies, player.nameTag);
                    }
                }
                pData.expectingConstructedEntity = null;
                pData.isDirtyForSave = true;
                break;
            }
        }
    }
}

export async function handlePlayerPlaceBlockBeforeEvent_AntiGrief(eventData, dependencies) {
    const { config, playerUtils, actionManager, rankManager, permissionLevels } = dependencies; // Added rankManager, permissionLevels, removed getString
    const translationsDict = dependencies.translations_dict || {};
    const { player, itemStack, block } = eventData;

    if (!player || !itemStack || !block) return;

    if (itemStack.typeId === "minecraft:tnt" && config.enableTntAntiGrief) {
        const playerPermission = rankManager.getPlayerPermissionLevel(player, dependencies); // Use rankManager
        if (config.allowAdminTntPlacement && playerPermission <= permissionLevels.admin) { // permissionLevels from dependencies
            playerUtils.debugLog(`AntiGrief: Admin ${player.nameTag} placed TNT. Allowed by config.`, dependencies, player.nameTag);
            return;
        }

        const violationDetails = { itemTypeId: itemStack.typeId, location: block.location };
        await actionManager.executeCheckAction(player,"worldAntigriefTntPlace", violationDetails, dependencies);

        const profile = config.checkActionProfiles?.world_antigrief_tnt_place;
        if (profile?.cancelEvent) {
            eventData.cancel = true;
            const messageKey = profile.messageKey || "antigrief.tntPlacementDenied";
            playerUtils.warnPlayer(player, translationsDict[messageKey] || "§cTNT placement is currently restricted.");
        }
    }
}

export async function handleEntityDieForDeathEffects(eventData, dependencies) {
    const { config: currentConfig, playerUtils } = dependencies;
    if (!currentConfig.enableDeathEffects) return;
    const { deadEntity } = eventData;

    if (!(deadEntity instanceof mc.Player)) return;

    playerUtils.debugLog(`Player ${deadEntity.nameTag} died. Processing death effects.`, dependencies, deadEntity.nameTag);
    if (currentConfig.deathEffectParticleName) {
        try {
            deadEntity.dimension.spawnParticle(currentConfig.deathEffectParticleName, deadEntity.location);
        } catch (e) {
            console.warn(`[AntiCheat] Failed to spawn death particle ${currentConfig.deathEffectParticleName}: ${e}`);
        }
    }
    if (currentConfig.deathEffectSoundId) {
         try {
            deadEntity.dimension.playSound(currentConfig.deathEffectSoundId, deadEntity.location);
        } catch (e) {
            console.warn(`[AntiCheat] Failed to play death sound ${currentConfig.deathEffectSoundId}: ${e}`);
        }
    }
}

export async function handleEntityHurt(eventData, dependencies) {
    const { playerDataManager, checks, config, currentTick, actionManager, playerUtils } = dependencies;
    const { hurtEntity, cause, damagingEntity: directDamagingEntity } = eventData;

    if (hurtEntity?.typeId === 'minecraft:player') {
        const victimPlayer = hurtEntity;
        const victimPData = playerDataManager.getPlayerData(victimPlayer.id);
        if (victimPData) {
            victimPData.lastTookDamageTick = currentTick;
            victimPData.lastDamageCause = cause.cause;
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

                    const eventSpecificData = {
                        targetEntity: victimPlayer,
                        damagingEntity: attackerPlayer,
                        cause: cause,
                        gameMode: attackerPlayer.gameMode
                    };

                    if (checks?.checkReach && config.enableReachCheck) {
                        await checks.checkReach(attackerPlayer, attackerPData, dependencies, eventSpecificData);
                    }
                    if (checks?.checkMultiTarget && config.enableMultiTargetCheck) {
                        await checks.checkMultiTarget(attackerPlayer, attackerPData, dependencies, eventSpecificData);
                    }
                    if (checks?.checkAttackWhileSleeping && config.enableStateConflictCheck) {
                        await checks.checkAttackWhileSleeping(attackerPlayer, attackerPData, dependencies, eventSpecificData);
                    }
                    if (checks?.checkAttackWhileUsingItem && config.enableStateConflictCheck) {
                        await checks.checkAttackWhileUsingItem(attackerPlayer, attackerPData, dependencies, eventSpecificData);
                    }
                    attackerPData.lastAttackTick = currentTick;
                }
            }

            if (checks?.checkSelfHurt && config.enableSelfHurtCheck) {
                const selfHurtEventSpecificData = {
                    damagingEntity: directDamagingEntity,
                    cause: cause,
                    // hurtEntity: victimPlayer // Pass hurtEntity if checkSelfHurt needs it explicitly
                };
                await checks.checkSelfHurt(victimPlayer, victimPData, dependencies, selfHurtEventSpecificData);
            }
        }
    }

    if (checks?.processCombatEvent) {
        await checks.processCombatEvent(eventData, dependencies);
    }
}

export async function handlePlayerDeath(eventData, dependencies) {
    const { player } = eventData;
    // config is now directly from dependencies.config
    const { playerDataManager, config, logManager } = dependencies;
    const translationsDict = dependencies.translations_dict || {};

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

        const deathCoordsMsgKey = config.deathCoordsMessage || "message.deathCoords";
        let message = (translationsDict[deathCoordsMsgKey] || "§7You died at X: {x}, Y: {y}, Z: {z} in dimension {dimensionId}.")
            .replace("{x}", x.toString())
            .replace("{y}", y.toString())
            .replace("{z}", z.toString())
            .replace("{dimensionId}", dimensionId);
        pData.deathMessageToShowOnSpawn = message;
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
        }, dependencies);
    }
}

export function subscribeToCombatLogEvents(dependencies) {
    const { config, playerDataManager } = dependencies; // Already using dependencies correctly
    if (!config.enableCombatLogDetection) return;

    mc.world.afterEvents.entityHurt.subscribe(eventData => {
        const { hurtEntity, damagingEntity } = eventData;
        if (hurtEntity?.typeId === 'minecraft:player' && damagingEntity?.typeId === 'minecraft:player') {
            if (hurtEntity.id === damagingEntity.id) return;

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

export async function handlePlayerBreakBlockBeforeEvent(eventData, dependencies) {
    const { checks, config } = dependencies;
    const { player, block, itemStack } = eventData;

    if (!player || !block) return;

    if (checks?.checkInstaBreak && config.enableInstaBreakCheck) {
        const pData = dependencies.playerDataManager.getPlayerData(player.id);
        if (!pData) return;

        const expectedTicks = getExpectedBreakTicks(player, block.permutation, itemStack, dependencies.config);
        pData.blockBreakStartTime = dependencies.currentTick;
        pData.expectedBreakTicks = expectedTicks;
        pData.blockBeingBroken = block;
        pData.isDirtyForSave = true;
    }

    if (checks?.checkNukerRaycast && config.enableNukerCheck) {
         await checks.checkNukerRaycast(player, block, dependencies);
    }
}

export async function handlePlayerBreakBlockAfterEvent(eventData, dependencies) {
    const { config, playerDataManager, playerUtils, checks, actionManager, logManager, currentTick, getString } = dependencies; // Added getString for completeness
    const { player, block, brokenBlockPermutation } = eventData; // Use brokenBlockPermutation for type

    if (!player || !brokenBlockPermutation) return;

    const pData = playerDataManager.getPlayerData(player.id);
    if (!pData) return;

    const eventSpecificBlockData = { block: block, brokenBlockPermutation: brokenBlockPermutation }; // block might be undefined here if it's fully broken. Use brokenBlockPermutation.

    if (checks?.checkXray && config.enableXRayCheck) {
        // checkXray might need brokenBlockPermutation.type (BlockType)
        await checks.checkXray(player, brokenBlockPermutation.type, pData, dependencies);
    }

    if (checks?.checkInstaBreak && config.enableInstaBreakCheck && pData.blockBeingBroken) {
        // Insta-break verification logic
    }
    pData.blockBeingBroken = null; // Clear state related to blockBeingBroken
    pData.isDirtyForSave = true;

    if (checks?.checkAutoTool && config.enableAutoToolCheck) {
        // checkAutoTool might need itemStackAfterBreak which is not directly on PlayerBreakBlockAfterEvent
        // It uses pData.lastUsedTool, so that needs to be accurate.
        // For now, assuming it works with pData state primarily.
        await checks.checkAutoTool(player, pData, dependencies);
    }

    // checkFlatRotationBuilding is called from main tick loop as it analyzes pData.recentBlockPlacements
    // Misplaced building checks and golem logic have been removed from this handler.
}

export async function handleItemUse(eventData, dependencies) {
    const { checks, config, playerUtils } = dependencies;
    const translationsDict = dependencies.translations_dict || {};
    const { source: player, itemStack } = eventData;

    if (!player || !itemStack) return;

    const pData = dependencies.playerDataManager.getPlayerData(player.id);
    if (!pData) return;

    if (checks?.checkSwitchAndUseInSameTick && config.enableInventoryModCheck) {
        const eventSpecificData = {
            itemStack: itemStack,
        };
        await checks.checkSwitchAndUseInSameTick(player, pData, dependencies, eventSpecificData);
    }

    if (checks?.checkFastUse && config.enableFastUseCheck) {
        const eventSpecificData = { itemStack: itemStack };
        await checks.checkFastUse(player, pData, dependencies, eventSpecificData);
    }

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

    if (config.preventedItemUses && config.preventedItemUses.includes(itemStack.typeId)) {
        playerUtils.warnPlayer(player, (translationsDict["antigrief.itemUseDenied"] || "§cUse of {item} is restricted.").replace("{item}", itemStack.typeId));
    }
}

export async function handleItemUseOn(eventData, dependencies) {
    const { checks, config } = dependencies; // getString, playerUtils, etc., are already in scope if needed by checks
    const { source: player, itemStack, block } = eventData;

    if (!player || !itemStack || !block) return;

    if (checks?.checkIllegalItemUseOnBlock && config.enableIllegalItemUseOnBlockCheck) {
        await checks.checkIllegalItemUseOnBlock(player, itemStack, block, dependencies);
    }
    if (checks?.checkAirPlace && config.enableAirPlaceCheck) {
        await checks.checkAirPlace(player, dependencies.playerDataManager.getPlayerData(player.id), dependencies, eventData);
    }

    if (itemStack.typeId === "minecraft:bow" && config.enableChatDuringItemUseCheck) {
        const pData = dependencies.playerDataManager.getPlayerData(player.id);
        if (pData) {
            pData.isChargingBow = true;
            pData.isDirtyForSave = true;
        }
    }
}

export async function handleInventoryItemChange(player, newItem, _oldItem, slotName, dependencies) {
    const { checks, config } = dependencies; // getString, playerUtils not directly used here but available in dependencies

    if (!player) return;

    const pData = dependencies.playerDataManager.getPlayerData(player.id);
    if (!pData) return;

    if (checks?.checkInventoryMoveWhileActionLocked && config.enableInventoryModCheck) {
        const inventoryChangeDetails = {
            newItem: newItem,
            oldItem: _oldItem,
            slotName: slotName,
        };
        const eventSpecificData = { inventoryChangeDetails: inventoryChangeDetails };
        await checks.checkInventoryMoveWhileActionLocked(player, pData, dependencies, eventSpecificData);
    }

    if (checks?.checkIllegalItems && config.enableIllegalItemCheck) {
        await checks.checkIllegalItems(player, newItem, slotName, dependencies);
    }
}

export async function handlePlayerPlaceBlockBefore(eventData, dependencies) {
    const { checks, config } = dependencies; // getString, playerUtils not directly used here but available in dependencies
    const { player, block, itemStack } = eventData;

    if (!player || !block || !itemStack) return;

    if (checks?.checkBuildingRestrictions && config.enableBuildingRestrictionCheck) {
        await checks.checkBuildingRestrictions(player, block, itemStack, dependencies);
        if (eventData.cancel) return;
    }
    if (checks?.checkAirPlace && config.enableAirPlaceCheck) {
        await checks.checkAirPlace(player, dependencies.playerDataManager.getPlayerData(player.id), dependencies, eventData);
        if (eventData.cancel) return;
    }

    await handlePlayerPlaceBlockBeforeEvent_AntiGrief(eventData, dependencies); // This function was already updated
}

async function _processPlayerPlaceBlockAfterEffects(player, pData, block, dependencies) {
    const { config, playerUtils, checks, currentTick } = dependencies; // Destructure what's needed

    const eventSpecificBlockData = { block: block };

    if (checks?.checkTower && config.enableTowerCheck) {
        await checks.checkTower(player, pData, dependencies, eventSpecificBlockData);
    }
    if (checks?.checkFastPlace && config.enableFastPlaceCheck) {
        await checks.checkFastPlace(player, pData, dependencies, eventSpecificBlockData);
    }
    if (checks?.checkDownwardScaffold && config.enableDownwardScaffoldCheck) {
        await checks.checkDownwardScaffold(player, pData, dependencies, eventSpecificBlockData);
    }
    if (checks?.checkBlockSpam && config.enableBlockSpamAntiGrief) {
        await checks.checkBlockSpam(player, pData, dependencies, eventSpecificBlockData);
    }
    if (checks?.checkBlockSpamDensity && config.enableBlockSpamDensityCheck) {
        await checks.checkBlockSpamDensity(player, pData, dependencies, eventSpecificBlockData);
    }
    // Note: checkFlatRotationBuilding is called from the main tick loop in main.js

    // AntiGrief: Track potential golem construction
    if (config.enableEntitySpamAntiGrief && block.typeId === "minecraft:carved_pumpkin") {
        // pData is already passed as a parameter and validated before this helper is called
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
                tick: currentTick // Use currentTick from dependencies
            };
            pData.isDirtyForSave = true;
            // Corrected debugLog call to pass dependencies first
            playerUtils.debugLog(dependencies, `[EventHandler][AntiGrief] Player ${player.nameTag} placed pumpkin for potential ${potentialGolemType}. Expecting entity.`, player.nameTag);
        }
    }
}

export async function handlePlayerPlaceBlockAfterEvent(eventData, dependencies) {
    const { playerDataManager } = dependencies;
    const { player, block } = eventData;

    if (!player || !block) return;

    const pData = playerDataManager.getPlayerData(player.id);
    if (!pData) return;

    await _processPlayerPlaceBlockAfterEffects(player, pData, block, dependencies);
}

export async function handleBeforeChatSend(eventData, dependencies) {
    const { playerDataManager, config, playerUtils, checks, logManager, actionManager, rankManager } = dependencies; // Added rankManager, removed getString
    const translationsDict = dependencies.translations_dict || {};
    const { sender: player, message: originalMessage } = eventData;

    if (!player) return;

    const pData = playerDataManager.getPlayerData(player.id);
    if (!pData) {
        playerUtils.warnPlayer(player, translationsDict["error.playerDataNotFound"] || "§cError: Your player data could not be loaded. Please try again or contact an admin.");
        eventData.cancel = true;
        return;
    }

    if (playerDataManager.isMuted(player, dependencies)) { // isMuted might need dependencies
        const muteInfo = playerDataManager.getMuteInfo(player, dependencies); // getMuteInfo might need dependencies
        const reason = muteInfo?.reason || (translationsDict["common.value.noReasonProvided"] || "No reason provided.");
        playerUtils.warnPlayer(player, translationsDict["system.chat_error_muted"] || "§cYou are currently muted and cannot send messages.");
        eventData.cancel = true;
        logManager?.addLog?.({ actionType: 'chatAttemptMuted', targetName: player.nameTag, details: `Msg: "${originalMessage}". Reason: ${reason}` }, dependencies);
        return;
    }

    if (originalMessage.startsWith(config.prefix)) {
        console.warn(`[AntiCheat] Command message \`${originalMessage}\` reached non-command chat handler. This should be handled by main.js's direct call to commandManager.handleChatCommand.`);
        eventData.cancel = true;
        return;
    }

    // All chat processing logic, including mute checks, content checks, and final message formatting,
    // has been moved to chatProcessor.processChatMessage.

    // Ensure chatProcessor is available in dependencies
    if (!dependencies.chatProcessor || typeof dependencies.chatProcessor.processChatMessage !== 'function') {
        console.warn("[AntiCheat] handleBeforeChatSend: chatProcessor.processChatMessage is not available in dependencies. Chat will not be processed.");
        playerUtils.warnPlayer(player, translationsDict["error.chatProcessingUnavailable"] || "§cChat processing is temporarily unavailable. Please try again later."); // Inform player if possible
        eventData.cancel = true; // Cancel to prevent raw message if processing fails
        return;
    }

    await dependencies.chatProcessor.processChatMessage(player, pData, originalMessage, eventData, dependencies);

    // The processChatMessage function now handles:
    // - All chat checks
    // - Setting eventData.cancel = true if a check cancels the message OR if the formatted message is sent
    // - Sending the formatted message itself
    // Therefore, no further logic is needed here for non-command messages.
}

export async function handlePlayerDimensionChangeAfterEvent(eventData, dependencies) {
    const { player, fromDimension, toDimension, fromLocation } = eventData;
    const { playerUtils, config, rankManager, permissionLevels } = dependencies; // Added rankManager, permissionLevels, removed getString
    const translationsDict = dependencies.translations_dict || {};

    if (!player || !toDimension || !fromDimension || !fromLocation) return;

    // Use rankManager from dependencies
    const playerPermission = rankManager.getPlayerPermissionLevel(player, dependencies);
    if (playerPermission <= permissionLevels.bypass) { // permissionLevels from dependencies
        playerUtils.debugLog(`Player ${player.nameTag} has bypass permission for dimension locks.`, dependencies, player.nameTag);
        return;
    }

    let dimensionIsLocked = false;
    let lockedDimensionName = "";
    const toDimensionId = toDimension.id.split(':')[1];

    if (toDimensionId === 'nether' && isNetherLocked(config)) { // isNetherLocked might need config from dependencies if refactored
        dimensionIsLocked = true;
        lockedDimensionName = translationsDict["dimensionLock.name.nether"] || "The Nether";
    } else if (toDimensionId === 'the_end' && isEndLocked(config)) { // isEndLocked might need config from dependencies
        dimensionIsLocked = true;
        lockedDimensionName = translationsDict["dimensionLock.name.end"] || "The End";
    }

    if (dimensionIsLocked) {
        try {
            player.teleport(fromLocation, { dimension: fromDimension });
            playerUtils.warnPlayer(player, (translationsDict["system.dimensionLock_teleportMessage"] || "§cYou cannot enter {lockedDimensionName} as it is currently locked.").replace("{lockedDimensionName}", lockedDimensionName));
            playerUtils.notifyAdmins((translationsDict["admin.notify.dimensionLockAttempt"] || "§7[AdminNotify] §e{playerName} §7attempted to enter the locked dimension: §c{dimensionName}").replace("{playerName}", player.nameTag).replace("{dimensionName}", lockedDimensionName), dependencies, player);
        } catch (e) {
            console.error(`[AntiCheat] Failed to teleport ${player.nameTag} back from locked dimension ${toDimensionId}: ${e}`);
            playerUtils.debugLog(`Teleport fail for ${player.nameTag} from ${toDimensionId}: ${e}`, dependencies, player.nameTag);
        }
    }
}
