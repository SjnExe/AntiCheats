/**
 * @file AntiCheatsBP/scripts/main.js
 * Main entry point for the AntiCheat system. Initializes modules, subscribes to events,
 * and runs the main tick loop for processing checks and player data.
 * @version 1.1.1
 */
import * as mc from '@minecraft/server';
import * as configModule from './config.js';
import * as playerUtils from './utils/playerUtils.js';
import * as playerDataManager from './core/playerDataManager.js';
import * as commandManager from './core/commandManager.js';
import * as uiManager from './core/uiManager.js';
import * as eventHandlers from './core/eventHandlers.js';
import * as logManager from './core/logManager.js';
import * as reportManager from './core/reportManager.js';
import * as tpaManager from './core/tpaManager.js';
import * as actionManager from './core/actionManager.js';
import { permissionLevels as importedPermissionLevels } from './core/rankManager.js';
import { ActionFormData as ImportedActionFormData, MessageFormData as ImportedMessageFormData, ModalFormData as ImportedModalFormData } from '@minecraft/server-ui';
import { ItemComponentTypes as ImportedItemComponentTypes } from '@minecraft/server';

// Import all checks from the barrel file
import * as checks from './checks/index.js';
import { getString } from './core/i18n.js';
import { getBorderSettings, saveBorderSettings } from './utils/worldBorderManager.js';

function easeOutQuad(t) {
    return t * (2 - t);
}

function easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

function mapRange(value, inMin, inMax, outMin, outMax) {
    return (value - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
}

playerUtils.debugLog("Anti-Cheat Script Loaded. Initializing modules...");

mc.world.beforeEvents.chatSend.subscribe(async (eventData) => {
    const baseDependencies = {
        config: configModule.editableConfigValues,
        playerUtils,
        playerDataManager,
        logManager,
        actionManager,
        uiManager,
        reportManager,
        tpaManager,
        checks,
        mc,
        currentTick,
        permissionLevels: importedPermissionLevels,
        ActionFormData: ImportedActionFormData,
        MessageFormData: ImportedMessageFormData,
        ModalFormData: ImportedModalFormData,
        ItemComponentTypes: ImportedItemComponentTypes,
        getString,
    };

    if (eventData.message.startsWith(baseDependencies.config.prefix)) {
        const commandHandlingDependencies = {
            ...baseDependencies,
            commandManager: commandManager,
            commandDefinitionMap: commandManager.commandDefinitionMap,
            commandExecutionMap: commandManager.commandExecutionMap,
        };
        await commandManager.handleChatCommand(eventData, commandHandlingDependencies);
    } else {
        // For non-command chat messages, pass a slightly reduced set if some deps are not needed
        const chatEventDependencies = {
            ...baseDependencies,
            // Potentially remove commandManager, commandDefinitionMap, commandExecutionMap if not used by handleBeforeChatSend
            // For now, keeping them for consistency unless a clear need to remove arises.
        };
        await eventHandlers.handleBeforeChatSend(eventData, chatEventDependencies);
    }
});

mc.world.beforeEvents.playerJoin.subscribe(async (eventData) => {
    const player = eventData.player;
    // Create a minimal dependencies object for this handler
    const dependencies = {
        config: configModule.editableConfigValues,
        playerUtils: playerUtils,
        playerDataManager: playerDataManager,
        // getString: getString, // Not strictly needed for this part unless kick messages are localized here
        // logManager: logManager // For console.warn consistency if desired, but not essential for this change
    };

    await dependencies.playerDataManager.ensurePlayerDataInitialized(player, currentTick);

    if (dependencies.playerDataManager.isBanned(player)) {
        eventData.cancel = true;
        const banInfo = dependencies.playerDataManager.getBanInfo(player);
        let detailedKickMessage = `§cYou are banned from this server.\n`;
        if (banInfo) {
            detailedKickMessage += `§fBanned by: §e${banInfo.bannedBy || "Unknown"}\n`;
            detailedKickMessage += `§fReason: §e${banInfo.reason || "No reason provided."}\n`;
            detailedKickMessage += `§fExpires: §e${banInfo.unbanTime === Infinity ? "Permanent" : new Date(banInfo.unbanTime).toLocaleString()}\n`;
        } else {
            detailedKickMessage += `§fReason: §eSystem detected an active ban, but details could not be fully retrieved. Please contact an admin.\n`;
        }

        if (dependencies.config.discordLink && dependencies.config.discordLink.trim() !== "" && dependencies.config.discordLink !== "https://discord.gg/example") {
            detailedKickMessage += `§fDiscord: §b${dependencies.config.discordLink}`;
        }
        const logMessage = `[AntiCheat] Banned player ${player.nameTag} (ID: ${player.id}) attempt to join. Ban details: By ${banInfo?.bannedBy || "N/A"}, Reason: ${banInfo?.reason || "N/A"}, Expires: ${banInfo?.unbanTime === Infinity ? "Permanent" : new Date(banInfo?.unbanTime).toLocaleString()}`;
        console.warn(logMessage); // Keep console.warn for this critical log or switch to dependencies.logManager.addLog if included
        if (dependencies.playerUtils.notifyAdmins) {
            dependencies.playerUtils.notifyAdmins(`Banned player ${player.nameTag} tried to join. Banned by: ${banInfo?.bannedBy || "N/A"}, Reason: ${banInfo?.reason || "N/A"}`, null);
        }
    }
});

const getStandardDependencies = () => ({
    config: configModule.editableConfigValues,
    playerUtils,
    playerDataManager,
    logManager,
    actionManager,
    uiManager,
    reportManager,
    tpaManager,
    checks,
    mc,
    currentTick,
    permissionLevels: importedPermissionLevels,
    ActionFormData: ImportedActionFormData,
    MessageFormData: ImportedMessageFormData,
    ModalFormData: ImportedModalFormData,
    ItemComponentTypes: ImportedItemComponentTypes,
    getString,
});

mc.world.afterEvents.playerSpawn.subscribe((eventData) => {
    eventHandlers.handlePlayerSpawn(eventData, getStandardDependencies());
});

mc.world.beforeEvents.playerLeave.subscribe((eventData) => {
    eventHandlers.handlePlayerLeave(eventData, getStandardDependencies());
});

mc.world.afterEvents.entityHurt.subscribe((eventData) => {
    const deps = getStandardDependencies();
    // combatLogEvents subscription might need adjustment if it also needs full deps
    eventHandlers.handleEntityHurt(eventData, deps);
});

// Ensure this subscription also uses standardized dependencies if it calls functions needing them.
// For now, assuming it's self-contained or uses what's passed.
// This was already correct, passing config aliased from editableConfigValues.
eventHandlers.subscribeToCombatLogEvents({
    config: configModule.editableConfigValues, playerDataManager, playerUtils
});

mc.world.beforeEvents.playerBreakBlock.subscribe(async (eventData) => {
    await eventHandlers.handlePlayerBreakBlockBeforeEvent(eventData, getStandardDependencies());
});

mc.world.afterEvents.playerBreakBlock.subscribe(async (eventData) => {
    await eventHandlers.handlePlayerBreakBlockAfterEvent(eventData, getStandardDependencies());
});

mc.world.beforeEvents.itemUse.subscribe(async (eventData) => {
    await eventHandlers.handleItemUse(eventData, getStandardDependencies());
});

mc.world.beforeEvents.itemUseOn.subscribe(async (eventData) => {
    await eventHandlers.handleItemUseOn(eventData, getStandardDependencies());
});

mc.world.beforeEvents.playerPlaceBlock.subscribe(async (eventData) => {
    await eventHandlers.handlePlayerPlaceBlockBefore(eventData, getStandardDependencies());
});

mc.world.afterEvents.playerPlaceBlock.subscribe(async (eventData) => {
    await eventHandlers.handlePlayerPlaceBlockAfterEvent(eventData, getStandardDependencies());
});

mc.world.afterEvents.playerInventoryItemChange.subscribe(async (eventData) => {
    await eventHandlers.handleInventoryItemChange(eventData.player, eventData.newItem, eventData.oldItem, eventData.slotName, getStandardDependencies());
});

mc.world.afterEvents.playerDimensionChange.subscribe((eventData) => {
    // This handler might only need a subset, adjust if necessary
    eventHandlers.handlePlayerDimensionChangeAfterEvent(eventData, getStandardDependencies());
});

mc.world.afterEvents.entityDie.subscribe((eventData) => {
    const dependencies = getStandardDependencies();
    if (eventData.deadEntity.typeId === 'minecraft:player') {
        eventHandlers.handlePlayerDeath(eventData, dependencies);
    }
    eventHandlers.handleEntityDieForDeathEffects(eventData, dependencies);
});

mc.world.afterEvents.entitySpawn.subscribe(async (eventData) => {
    await eventHandlers.handleEntitySpawnEvent_AntiGrief(eventData, getStandardDependencies());
});

mc.world.afterEvents.pistonActivate.subscribe(async (eventData) => {
    await eventHandlers.handlePistonActivate_AntiGrief(eventData, getStandardDependencies());
});

mc.system.runInterval(() => {
    const tpaIntervalDependencies = getStandardDependencies();
    if (tpaIntervalDependencies.config.enableTPASystem) {
        tpaManager.clearExpiredRequests(tpaIntervalDependencies);
        const requestsInWarmup = tpaManager.getRequestsInWarmup(); // This function does not require dependencies
        for (const request of requestsInWarmup) {
            if (Date.now() >= request.warmupExpiryTimestamp) {
                tpaManager.executeTeleport(request.requestId, tpaIntervalDependencies);
            }
        }
    }
}, 20);

function findSafeTeleportY(dimension, targetX, initialY, targetZ, playerForDebug, playerUtilsForDebug) {
    const minDimensionHeight = dimension.heightRange.min;
    const maxDimensionHeight = dimension.heightRange.max - 2;
    let currentY = Math.floor(initialY);
    currentY = Math.max(minDimensionHeight, Math.min(currentY, maxDimensionHeight));
    const maxSearchDepthDown = 10;
    const maxSearchDepthUp = 5;
    for (let i = 0; i < maxSearchDepthDown; i++) {
        const checkY = currentY - i;
        if (checkY < minDimensionHeight) break;
        try {
            const blockFeet = dimension.getBlock({ x: targetX, y: checkY, z: targetZ });
            const blockHead = dimension.getBlock({ x: targetX, y: checkY + 1, z: targetZ });
            if (blockFeet && blockHead && blockFeet.isAir && blockHead.isAir) {
                const blockBelowFeet = dimension.getBlock({ x: targetX, y: checkY - 1, z: targetZ });
                if (blockBelowFeet && blockBelowFeet.isSolid) return checkY;
                else if (blockFeet.isAir && blockHead.isAir) return checkY;
            }
        } catch (e) {}
    }
    let searchUpStartY = Math.floor(initialY);
    searchUpStartY = Math.max(minDimensionHeight, Math.min(searchUpStartY, maxDimensionHeight));
    for (let i = 1; i < maxSearchDepthUp; i++) {
        const checkY = searchUpStartY + i;
        if (checkY > maxDimensionHeight) break;
        try {
            const blockFeet = dimension.getBlock({ x: targetX, y: checkY, z: targetZ });
            const blockHead = dimension.getBlock({ x: targetX, y: checkY + 1, z: targetZ });
             if (blockFeet && blockHead && blockFeet.isAir && blockHead.isAir) {
                const blockBelowFeet = dimension.getBlock({ x: targetX, y: checkY - 1, z: targetZ });
                if (blockBelowFeet && blockBelowFeet.isSolid) return checkY;
                else if (blockFeet.isAir && blockHead.isAir) return checkY;
            }
        } catch(e) {}
    }
    return Math.floor(initialY);
}

mc.world.beforeEvents.entityHurt.subscribe(eventData => {
    const tpaEntityHurtDependencies = getStandardDependencies();
    if (!tpaEntityHurtDependencies.config.enableTPASystem) return;
    const { hurtEntity, damageSource } = eventData;
    let playerNameTag;
    try {
        playerNameTag = hurtEntity.nameTag;
        if (typeof playerNameTag !== 'string') return;
    } catch (e) { return; }

    const requestsInWarmup = tpaManager.getRequestsInWarmup();
    const playerActiveWarmupRequests = requestsInWarmup.filter(
        req => req.requesterName === playerNameTag || req.targetName === playerNameTag
    );
    for (const request of playerActiveWarmupRequests) {
        if (request.status === 'pending_teleport_warmup') {
            let playerIsTeleporting = false;
            if (request.requestType === 'tpa' && request.requesterName === playerNameTag) playerIsTeleporting = true;
            else if (request.requestType === 'tpahere' && request.targetName === playerNameTag) playerIsTeleporting = true;

            if (playerIsTeleporting) {
                const damageCause = damageSource?.cause || 'unknown';
                const reasonMsgPlayer = tpaEntityHurtDependencies.getString("tpa.manager.error.warmupDamageTaken", { damageCause: damageCause });
                const reasonMsgLog = `Player ${playerNameTag} took damage (cause: ${damageCause}) during TPA warm-up for request ${request.requestId}.`;
                tpaManager.cancelTeleport(request.requestId, reasonMsgPlayer, reasonMsgLog, tpaEntityHurtDependencies);
                break;
            }
        }
    }
});

let currentTick = 0;

mc.system.runInterval(async () => {
    currentTick++;

    const knownBorderDimensions = ["minecraft:overworld", "minecraft:the_nether", "minecraft:the_end"];
    for (const dimId of knownBorderDimensions) {
        let dimBorderSettings = null;
        try {
            dimBorderSettings = getBorderSettings(dimId);
        } catch (e) {
            console.warn(`[WB Resize] Error getting border settings for ${dimId} during resize check: ${e}`);
            continue;
        }
        if (dimBorderSettings && dimBorderSettings.isResizing && dimBorderSettings.enabled) {
            const currentTimeMs = Date.now();
            if (typeof dimBorderSettings.resizeStartTimeMs !== 'number' || typeof dimBorderSettings.resizeDurationMs !== 'number' || typeof dimBorderSettings.originalSize !== 'number' || typeof dimBorderSettings.targetSize !== 'number') {
                console.warn(`[WB Resize] Invalid resize parameters for dimension ${dimId}. Cancelling resize.`);
                dimBorderSettings.isResizing = false;
                delete dimBorderSettings.originalSize; delete dimBorderSettings.targetSize;
                delete dimBorderSettings.resizeStartTimeMs; delete dimBorderSettings.resizeDurationMs;
                saveBorderSettings(dimId, dimBorderSettings);
                continue;
            }
            const accumulatedPausedMs = dimBorderSettings.resizePausedTimeMs || 0;
            const effectiveElapsedMs = (currentTimeMs - dimBorderSettings.resizeStartTimeMs) - accumulatedPausedMs;
            const durationMs = dimBorderSettings.resizeDurationMs;
            if (dimBorderSettings.isPaused) continue;
            if (effectiveElapsedMs >= durationMs) {
                const targetSize = dimBorderSettings.targetSize;
                if (dimBorderSettings.shape === "square") dimBorderSettings.halfSize = targetSize;
                else if (dimBorderSettings.shape === "circle") dimBorderSettings.radius = targetSize;
                dimBorderSettings.isResizing = false;
                delete dimBorderSettings.originalSize; delete dimBorderSettings.targetSize;
                delete dimBorderSettings.resizeStartTimeMs; delete dimBorderSettings.resizeDurationMs;
                if (saveBorderSettings(dimId, dimBorderSettings)) {
                     console.warn(`[AntiCheat][WorldBorder] Border resize in ${dimId.replace("minecraft:","")} completed. New size parameter: ${targetSize}.`);
                     if (logManager && typeof logManager.addLog === 'function') {
                        logManager.addLog({ adminName: 'System', actionType: 'worldborder_resize_complete', targetName: dimId, details: `Resize to ${targetSize} complete.` });
                     }
                } else {
                    console.warn(`[AntiCheat][WorldBorder] Failed to save completed border resize for ${dimId}.`);
                }
            }
        }
    }

    const allPlayers = mc.world.getAllPlayers();
    playerDataManager.cleanupActivePlayerData(allPlayers);

    const tickDependencies = getStandardDependencies(); // Use the standardized getter

    for (const player of allPlayers) {
        const pData = await playerDataManager.ensurePlayerDataInitialized(player, currentTick);
        if (!pData) {
            if (playerUtils.debugLog) playerUtils.debugLog(`Critical: pData not available for ${player.nameTag} in tick loop after ensure.`, player.nameTag);
            continue;
        }

        pData.lastBorderVisualTick = pData.lastBorderVisualTick || 0;
        pData.ticksOutsideBorder = pData.ticksOutsideBorder || 0;
        pData.borderDamageApplications = pData.borderDamageApplications || 0;

        playerDataManager.updateTransientPlayerData(player, pData, currentTick);

        if (pData.isUsingConsumable && (currentTick - pData.lastItemUseTick > tickDependencies.config.itemUseStateClearTicks)) {
            if (playerUtils.debugLog && pData.isWatched) playerUtils.debugLog(`StateConflict: Auto-clearing isUsingConsumable for ${player.nameTag} after timeout. Tick: ${currentTick}`, player.nameTag);
            pData.isUsingConsumable = false;
        }
        if (pData.isChargingBow && (currentTick - pData.lastItemUseTick > tickDependencies.config.itemUseStateClearTicks)) {
            if (playerUtils.debugLog && pData.isWatched) playerUtils.debugLog(`StateConflict: Auto-clearing isChargingBow for ${player.nameTag} after timeout. Tick: ${currentTick}`, player.nameTag);
            pData.isChargingBow = false;
        }
        if (pData.isUsingShield && (currentTick - pData.lastItemUseTick > tickDependencies.config.itemUseStateClearTicks)) {
            if (playerUtils.debugLog && pData.isWatched) playerUtils.debugLog(`StateConflict: Auto-clearing isUsingShield for ${player.nameTag} after timeout. Tick: ${currentTick}`, player.nameTag);
            pData.isUsingShield = false;
        }

        // --- MOVEMENT CHECKS ---
        if (tickDependencies.config.enableFlyCheck && checks.checkFly) await checks.checkFly(player, pData, tickDependencies);
        if (tickDependencies.config.enableSpeedCheck && checks.checkSpeed) await checks.checkSpeed(player, pData, tickDependencies);
        if (tickDependencies.config.enableNofallCheck && checks.checkNoFall) await checks.checkNoFall(player, pData, tickDependencies);
        if (tickDependencies.config.enableNoSlowCheck && checks.checkNoSlow) await checks.checkNoSlow(player, pData, tickDependencies);
        if (tickDependencies.config.enableInvalidSprintCheck && checks.checkInvalidSprint) await checks.checkInvalidSprint(player, pData, tickDependencies);

        // --- COMBAT CHECKS (Tick-based) ---
        if (tickDependencies.config.enableCPSCheck && checks.checkCPS) await checks.checkCPS(player, pData, tickDependencies, null);
        if (tickDependencies.config.enableViewSnapCheck && checks.checkViewSnap) await checks.checkViewSnap(player, pData, tickDependencies, null);

        // --- WORLD/PLAYER CHECKS (Tick-based) ---
        if (tickDependencies.config.enableNukerCheck && checks.checkNuker) {
            await checks.checkNuker(player, pData, tickDependencies);
        }
        if (tickDependencies.config.enableAutoToolCheck && checks.checkAutoTool) {
            await checks.checkAutoTool(player, pData, tickDependencies);
        }
        if (tickDependencies.config.enableNameSpoofCheck && checks.checkNameSpoof) {
            await checks.checkNameSpoof(player, pData, tickDependencies);
        }
        if (tickDependencies.config.enableAntiGMCCheck && checks.checkAntiGMC) {
            await checks.checkAntiGMC(player, pData, tickDependencies);
        }
        if (tickDependencies.config.enableFlatRotationCheck && checks.checkFlatRotationBuilding) { // Added checkFlatRotationBuilding
            await checks.checkFlatRotationBuilding(player, pData, tickDependencies);
        }


        if (tickDependencies.config.enableInvalidRenderDistanceCheck && (currentTick - (pData.lastRenderDistanceCheckTick || 0) >= 400)) {
            if (checks.checkInvalidRenderDistance) {
                await checks.checkInvalidRenderDistance(player, pData, tickDependencies);
            }
            pData.lastRenderDistanceCheckTick = currentTick;
        }

        if (tickDependencies.config.enableNetherRoofCheck && checks.checkNetherRoof) {
            checks.checkNetherRoof(player, pData, tickDependencies);
        }

        // Fall distance accumulation and reset
        if (!player.isOnGround) {
            if (pData.velocity.y < -0.07 && pData.previousPosition) {
                const deltaY = pData.previousPosition.y - pData.lastPosition.y;
                if (deltaY > 0) pData.fallDistance += deltaY;
            }
        } else {
            if (!pData.isTakingFallDamage) pData.fallDistance = 0;
            pData.isTakingFallDamage = false;
        }

        let borderSettings = null;
        if (tickDependencies.config.enableWorldBorderSystem) {
            borderSettings = getBorderSettings(player.dimension.id);
            if (borderSettings && borderSettings.enabled) {
                const playerPermLevel = playerUtils.getPlayerPermissionLevel(player);
                if (playerPermLevel > importedPermissionLevels.admin) {
                    const loc = player.location;
                    let isPlayerOutside = false;
                    let targetX = loc.x; let targetZ = loc.z;
                    let currentEffectiveHalfSize = borderSettings.halfSize;
                    let currentEffectiveRadius = borderSettings.radius;

                    if (borderSettings.isResizing && borderSettings.enabled && typeof borderSettings.originalSize === 'number' && typeof borderSettings.targetSize === 'number' && typeof borderSettings.resizeStartTimeMs === 'number' && typeof borderSettings.resizeDurationMs === 'number') {
                        const currentTimeMs = Date.now();
                        const accumulatedPausedMs = borderSettings.resizePausedTimeMs || 0;
                        let elapsedMs = (currentTimeMs - borderSettings.resizeStartTimeMs) - accumulatedPausedMs;
                        if (borderSettings.isPaused) {
                            const lastPauseStart = borderSettings.resizeLastPauseStartTimeMs || currentTimeMs;
                            elapsedMs = (lastPauseStart - borderSettings.resizeStartTimeMs) - accumulatedPausedMs;
                        }
                        elapsedMs = Math.max(0, elapsedMs);
                        const durationMs = borderSettings.resizeDurationMs;
                        let rawProgress = (durationMs > 0) ? Math.min(1, elapsedMs / durationMs) : 1;
                        let easedProgress = rawProgress;
                        if (borderSettings.resizeInterpolationType === "easeOutQuad") easedProgress = easeOutQuad(rawProgress);
                        else if (borderSettings.resizeInterpolationType === "easeInOutQuad") easedProgress = easeInOutQuad(rawProgress);
                        const interpolatedSize = borderSettings.originalSize + (borderSettings.targetSize - borderSettings.originalSize) * easedProgress;
                        if (borderSettings.shape === "square") currentEffectiveHalfSize = interpolatedSize;
                        else if (borderSettings.shape === "circle") currentEffectiveRadius = interpolatedSize;
                    } else if (borderSettings.isResizing && borderSettings.enabled) {
                        if (typeof borderSettings.targetSize === 'number') {
                            if (borderSettings.shape === "square") currentEffectiveHalfSize = borderSettings.targetSize;
                            else if (borderSettings.shape === "circle") currentEffectiveRadius = borderSettings.targetSize;
                        }
                        if(playerUtils.debugLog && pData.isWatched) playerUtils.debugLog(`WorldBorder: In-progress resize for dim ${player.dimension.id} has incomplete parameters in player loop. Using targetSize or stored size.`, player.nameTag);
                    }

                    if (borderSettings.shape === "square" && typeof currentEffectiveHalfSize === 'number' && currentEffectiveHalfSize > 0) {
                        const { centerX, centerZ } = borderSettings;
                        const minX = centerX - currentEffectiveHalfSize; const maxX = centerX + currentEffectiveHalfSize;
                        const minZ = centerZ - currentEffectiveHalfSize; const maxZ = centerZ + currentEffectiveHalfSize;
                        if (loc.x < minX || loc.x > maxX || loc.z < minZ || loc.z > maxZ) {
                            isPlayerOutside = true; targetX = loc.x; targetZ = loc.z;
                            if (targetX < minX) targetX = minX + 0.5; else if (targetX > maxX) targetX = maxX - 0.5;
                            if (targetZ < minZ) targetZ = minZ + 0.5; else if (targetZ > maxZ) targetZ = maxZ - 0.5;
                        }
                    } else if (borderSettings.shape === "circle" && typeof currentEffectiveRadius === 'number' && currentEffectiveRadius > 0) {
                        const { centerX, centerZ } = borderSettings;
                        const dx = loc.x - centerX; const dz = loc.z - centerZ;
                        const distSq = dx * dx + dz * dz; const radiusSq = currentEffectiveRadius * currentEffectiveRadius;
                        if (distSq > radiusSq) {
                            isPlayerOutside = true; const currentDist = Math.sqrt(distSq); const teleportOffset = 0.5;
                            if (currentDist === 0 || currentEffectiveRadius <= teleportOffset) {
                                targetX = centerX + (currentEffectiveRadius > teleportOffset ? currentEffectiveRadius - teleportOffset : 0); targetZ = centerZ;
                            } else {
                                const scale = (currentEffectiveRadius - teleportOffset) / currentDist;
                                targetX = centerX + dx * scale; targetZ = centerZ + dz * scale;
                            }
                        }
                    } else if (borderSettings.shape) {
                         if(playerUtils.debugLog && pData.isWatched) playerUtils.debugLog(`WorldBorder: Invalid shape ('${borderSettings.shape}') or non-positive effective size (Sq: ${currentEffectiveHalfSize}, Circ: ${currentEffectiveRadius}) in dimension ${player.dimension.id}. Skipping enforcement.`, player.nameTag);
                    }

                    if (isPlayerOutside) {
                        pData.ticksOutsideBorder = (pData.ticksOutsideBorder || 0) + 1;
                        const enableDamage = borderSettings.enableDamage ?? tickDependencies.config.worldBorderDefaultEnableDamage;
                        const damageAmount = borderSettings.damageAmount ?? tickDependencies.config.worldBorderDefaultDamageAmount;
                        const damageIntervalTicks = borderSettings.damageIntervalTicks ?? tickDependencies.config.worldBorderDefaultDamageIntervalTicks;
                        const teleportAfterNumDamageEvents = borderSettings.teleportAfterNumDamageEvents ?? tickDependencies.config.worldBorderTeleportAfterNumDamageEvents;
                        let performTeleport = true;
                        if (enableDamage && damageIntervalTicks > 0 && damageAmount > 0) {
                            performTeleport = false;
                            if (pData.ticksOutsideBorder % damageIntervalTicks === 0) {
                                try {
                                    player.applyDamage(damageAmount, { cause: mc.EntityDamageCause.worldBorder });
                                    pData.borderDamageApplications++; pData.isDirtyForSave = true;
                                    if (playerUtils.debugLog && pData.isWatched) playerUtils.debugLog(`WorldBorder: Applied ${damageAmount} damage to ${player.nameTag}. Total applications: ${pData.borderDamageApplications}`, player.nameTag);
                                    if (pData.borderDamageApplications >= teleportAfterNumDamageEvents) {
                                        performTeleport = true;
                                        if (playerUtils.debugLog && pData.isWatched) playerUtils.debugLog(`WorldBorder: ${player.nameTag} reached ${pData.borderDamageApplications} damage events. Triggering teleport.`, player.nameTag);
                                    }
                                } catch (e) { console.warn(`[WorldBorder] Failed to apply damage to player ${player.nameTag}: ${e}`); }
                            }
                        }
                        if (performTeleport) {
                            const safeY = findSafeTeleportY(player.dimension, targetX, loc.y, targetZ, player, playerUtils);
                            try {
                                player.teleport({ x: targetX, y: safeY, z: targetZ }, { dimension: player.dimension });
                        if (tickDependencies.config.worldBorderWarningMessage) playerUtils.warnPlayer(player, tickDependencies.getString(tickDependencies.config.worldBorderWarningMessage));
                                if (playerUtils.debugLog && pData.isWatched) playerUtils.debugLog(`WorldBorder: Teleported ${player.nameTag} to XZ(${targetX.toFixed(1)},${targetZ.toFixed(1)}) Y=${safeY}. Reason: ${enableDamage && pData.borderDamageApplications >= teleportAfterNumDamageEvents ? 'Max damage events reached' : (!enableDamage ? 'Standard enforcement' : 'Damage logic did not require teleport yet')}.`, player.nameTag);
                                pData.ticksOutsideBorder = 0; pData.borderDamageApplications = 0; pData.isDirtyForSave = true;
                            } catch (e) {
                                console.warn(`[WorldBorder] Failed to teleport player ${player.nameTag}: ${e}`);
                                 if (playerUtils.debugLog && pData.isWatched) playerUtils.debugLog(`WorldBorder: Teleport failed for ${player.nameTag}. Error: ${e}`, player.nameTag);
                            }
                        }
                    } else {
                        if (pData.ticksOutsideBorder > 0 || pData.borderDamageApplications > 0) {
                             if (playerUtils.debugLog && pData.isWatched) playerUtils.debugLog(`WorldBorder: Player ${player.nameTag} re-entered border. Resetting counters.`, player.nameTag);
                            pData.ticksOutsideBorder = 0; pData.borderDamageApplications = 0; pData.isDirtyForSave = true;
                        }
                    }
                } else {
                    if (pData.ticksOutsideBorder > 0 || pData.borderDamageApplications > 0) { pData.ticksOutsideBorder = 0; pData.borderDamageApplications = 0; pData.isDirtyForSave = true; }
                }
            } else {
                 if (pData.ticksOutsideBorder > 0 || pData.borderDamageApplications > 0) { pData.ticksOutsideBorder = 0; pData.borderDamageApplications = 0; pData.isDirtyForSave = true; }
            }
        } else {
            if (pData.ticksOutsideBorder > 0 || pData.borderDamageApplications > 0) { pData.ticksOutsideBorder = 0; pData.borderDamageApplications = 0; pData.isDirtyForSave = true; }
        }

        if (tickDependencies.config.enableWorldBorderSystem && tickDependencies.config.worldBorderEnableVisuals) {
            const currentBorderSettings = borderSettings || getBorderSettings(player.dimension.id);
            if (currentBorderSettings && currentBorderSettings.enabled) {
                if (currentTick - (pData.lastBorderVisualTick || 0) >= tickDependencies.config.worldBorderVisualUpdateIntervalTicks) {
                    pData.lastBorderVisualTick = currentTick;
                    const playerLoc = player.location;
                    let particleNameToUse;
                    const particleSequence = tickDependencies.config.worldBorderParticleSequence;
                    if (Array.isArray(particleSequence) && particleSequence.length > 0) {
                        const visualUpdateInterval = tickDependencies.config.worldBorderVisualUpdateIntervalTicks > 0 ? tickDependencies.config.worldBorderVisualUpdateIntervalTicks : 20;
                        const sequenceIndex = Math.floor(currentTick / visualUpdateInterval) % particleSequence.length;
                        particleNameToUse = particleSequence[sequenceIndex];
                    } else {
                        particleNameToUse = currentBorderSettings.particleNameOverride || tickDependencies.config.worldBorderParticleName;
                    }
                    const visualRange = tickDependencies.config.worldBorderVisualRange;
                    let density;
                    if (tickDependencies.config.worldBorderEnablePulsingDensity) {
                        const pulseSpeed = tickDependencies.config.worldBorderPulseSpeed > 0 ? tickDependencies.config.worldBorderPulseSpeed : 1.0;
                        const pulseTime = (currentTick * pulseSpeed) / 20.0;
                        const sineWave = Math.sin(pulseTime);
                        const minDensity = tickDependencies.config.worldBorderPulseDensityMin > 0 ? tickDependencies.config.worldBorderPulseDensityMin : 0.1;
                        const maxDensity = tickDependencies.config.worldBorderPulseDensityMax > minDensity ? tickDependencies.config.worldBorderPulseDensityMax : minDensity + 1.0;
                        density = mapRange(sineWave, -1, 1, minDensity, maxDensity);
                        density = Math.max(0.1, density);
                    } else {
                        density = Math.max(0.1, tickDependencies.config.worldBorderParticleDensity);
                    }
                    const wallHeight = tickDependencies.config.worldBorderParticleWallHeight;
                    const segmentLength = tickDependencies.config.worldBorderParticleSegmentLength;
                    const yBase = Math.floor(playerLoc.y);

                    if (currentBorderSettings.shape === "square" && typeof currentEffectiveHalfSize === 'number' && currentEffectiveHalfSize > 0) {
                        const { centerX, centerZ } = currentBorderSettings;
                        const minX = centerX - currentEffectiveHalfSize; const maxX = centerX + currentEffectiveHalfSize;
                        const minZ = centerZ - currentEffectiveHalfSize; const maxZ = centerZ + currentEffectiveHalfSize;
                        const spawnSquareParticleLine = (isXPlane, fixedCoord, startDynamic, endDynamic, playerCoordDynamic) => {
                            const lengthToRender = Math.min(segmentLength, Math.abs(endDynamic - startDynamic));
                            let actualSegmentStart = playerCoordDynamic - lengthToRender / 2; let actualSegmentEnd = playerCoordDynamic + lengthToRender / 2;
                            actualSegmentStart = Math.max(startDynamic, actualSegmentStart); actualSegmentEnd = Math.min(endDynamic, actualSegmentEnd);
                            if (actualSegmentStart >= actualSegmentEnd) return;
                            for (let dyn = actualSegmentStart; dyn <= actualSegmentEnd; dyn += (1 / density)) {
                                for (let h = 0; h < wallHeight; h++) {
                                    try { player.dimension.spawnParticle(particleNameToUse, isXPlane ? { x: fixedCoord, y: yBase + h, z: dyn } : { x: dyn, y: yBase + h, z: fixedCoord }); } catch (e) {}
                                }
                            }
                        };
                        if (Math.abs(playerLoc.x - minX) < visualRange) spawnSquareParticleLine(true, minX, minZ, maxZ, playerLoc.z);
                        if (Math.abs(playerLoc.x - maxX) < visualRange) spawnSquareParticleLine(true, maxX, minZ, maxZ, playerLoc.z);
                        if (Math.abs(playerLoc.z - minZ) < visualRange) spawnSquareParticleLine(false, minZ, minX, maxX, playerLoc.x);
                        if (Math.abs(playerLoc.z - maxZ) < visualRange) spawnSquareParticleLine(false, maxZ, minX, maxX, playerLoc.x);
                    } else if (currentBorderSettings.shape === "circle" && typeof currentEffectiveRadius === 'number' && currentEffectiveRadius > 0) {
                        const { centerX, centerZ } = currentBorderSettings; const radiusToUse = currentEffectiveRadius;
                        const distanceToCenter = Math.sqrt(Math.pow(playerLoc.x - centerX, 2) + Math.pow(playerLoc.z - centerZ, 2));
                        if (Math.abs(distanceToCenter - radiusToUse) < visualRange) {
                            const playerAngle = Math.atan2(playerLoc.z - centerZ, playerLoc.x - centerX);
                            const halfAngleSpan = radiusToUse > 0 ? (segmentLength / 2) / radiusToUse : Math.PI;
                            for (let i = 0; i < segmentLength * density; i++) {
                                const currentAngleOffset = (i / (segmentLength * density) - 0.5) * (segmentLength / radiusToUse);
                                const angle = playerAngle + currentAngleOffset;
                                if (Math.abs(currentAngleOffset) > halfAngleSpan && segmentLength * density > 1) continue;
                                const particleX = centerX + radiusToUse * Math.cos(angle); const particleZ = centerZ + radiusToUse * Math.sin(angle);
                                for (let h = 0; h < wallHeight; h++) {
                                    try { player.dimension.spawnParticle(particleNameToUse, { x: particleX, y: yBase + h, z: particleZ }); } catch (e) {}
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    if (currentTick % 600 === 0) {
        for (const player of allPlayers) {
            const pData = playerDataManager.getPlayerData(player.id);
            if (pData && pData.isDirtyForSave) {
                try {
                    await playerDataManager.saveDirtyPlayerData(player);
                    if (playerUtils.debugLog && pData.isWatched) playerUtils.debugLog(`Deferred save executed for ${player.nameTag}. Tick: ${currentTick}`, player.nameTag);
                } catch (error) {
                    console.error(`Error during deferred save for ${player.nameTag}: ${error}`);
                    logManager.addLog('error', `DeferredSaveFail: ${player.nameTag}, ${error}`);
                }
            }
        }
        if (logManager.persistLogCacheToDisk) logManager.persistLogCacheToDisk();
        if (reportManager.persistReportsToDisk) reportManager.persistReportsToDisk();
    }
}, 1);

playerUtils.debugLog("Anti-Cheat Core System Initialized. Event handlers and tick loop are active.", "System");
