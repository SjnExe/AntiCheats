/**
 * @file AntiCheatsBP/scripts/main.js
 * Main entry point for the AntiCheat system. Initializes modules, subscribes to events,
 * and runs the main tick loop for processing checks and player data.
 * @version 1.1.0
 */
import * as mc from '@minecraft/server';
import * as configModule from './config.js'; // Renamed import for clarity
import * as playerUtils from './utils/playerUtils.js';
import * as playerDataManager from './core/playerDataManager.js';
import * as commandManager from './core/commandManager.js';
import * as uiManager from './core/uiManager.js';
import * as eventHandlers from './core/eventHandlers.js';
import * as logManager from './core/logManager.js'; // Ensure logManager is imported for addLog
import * as reportManager from './core/reportManager.js';
import * as tpaManager from './core/tpaManager.js';
import { executeCheckAction } from './core/actionManager.js';
import { permissionLevels as importedPermissionLevels } from './core/rankManager.js';
import { ActionFormData as ImportedActionFormData, MessageFormData as ImportedMessageFormData, ModalFormData as ImportedModalFormData } from '@minecraft/server-ui';
import { ItemComponentTypes as ImportedItemComponentTypes } from '@minecraft/server';

// Import all checks from the barrel file
import * as checks from './checks/index.js';
import { getBorderSettings } from './utils/worldBorderManager.js'; // For World Border

/**
 * Quadratic easing out function: decelerates to zero velocity.
 * @param {number} t - Input progress (0 to 1).
 * @returns {number} Eased progress.
 */
function easeOutQuad(t) {
    return t * (2 - t);
}

/**
 * Quadratic easing in and out function: accelerates until halfway, then decelerates.
 * @param {number} t - Input progress (0 to 1).
 * @returns {number} Eased progress.
 */
function easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

/**
 * Maps a value from one range to another.
 * @param {number} value The input value to map.
 * @param {number} inMin The minimum of the input range.
 * @param {number} inMax The maximum of the input range.
 * @param {number} outMin The minimum of the output range.
 * @param {number} outMax The maximum of the output range.
 * @returns {number} The mapped value.
 */
function mapRange(value, inMin, inMax, outMin, outMax) {
    return (value - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
}

playerUtils.debugLog("Anti-Cheat Script Loaded. Initializing modules...");

/**
 * Handles chat messages before they are sent.
 * If a message starts with the command prefix, it's treated as a command.
 * Otherwise, it's processed as a regular chat message.
 * @param {mc.ChatSendBeforeEvent} eventData The chat send event data.
 */
mc.world.beforeEvents.chatSend.subscribe(async (eventData) => {
    const baseDependencies = {
        config: configModule.editableConfigValues,
        configModule: configModule,
        playerUtils,
        playerDataManager,
        logManager,
        actionManager: { executeCheckAction },
        checks,
        uiManager,
        reportManager, // Added for command processing if not already general
        currentTick,
        // Note: automodConfig is now part of config.editableConfigValues, so accessible via baseDependencies.config.automodConfig
    };

    if (eventData.message.startsWith(baseDependencies.config.prefix)) {
        const commandHandlingDependencies = {
            ...baseDependencies,
            mc, // Minecraft server module
            permissionLevels: importedPermissionLevels,
            ActionFormData: ImportedActionFormData,
            MessageFormData: ImportedMessageFormData,
            ModalFormData: ImportedModalFormData,
            ItemComponentTypes: ImportedItemComponentTypes,
            commandManager: commandManager, // The commandManager module itself
            commandDefinitionMap: commandManager.commandDefinitionMap,
            commandExecutionMap: commandManager.commandExecutionMap,
            // Pass allCommands if any command actually needs it for iterating all command definitions
            // allCommands: Array.from(commandManager.commandDefinitionMap.values()),
        };
        await commandManager.handleChatCommand(eventData, commandHandlingDependencies);
    } else {
        await eventHandlers.handleBeforeChatSend(eventData, baseDependencies); // Chat handler might not need command specific deps
    }
});

/**
 * Handles player join events before they fully join the world.
 * Used for checks like active bans.
 * @param {mc.PlayerJoinBeforeEvent} eventData
 */
mc.world.beforeEvents.playerJoin.subscribe(async (eventData) => {
    const player = eventData.player;
    await playerDataManager.ensurePlayerDataInitialized(player, currentTick);

    if (playerDataManager.isBanned(player)) {
        eventData.cancel = true;

        const banInfo = playerDataManager.getBanInfo(player);
        let detailedKickMessage = `§cYou are banned from this server.\n`;

        if (banInfo) {
            detailedKickMessage += `§fBanned by: §e${banInfo.bannedBy || "Unknown"}\n`;
            detailedKickMessage += `§fReason: §e${banInfo.reason || "No reason provided."}\n`;
            detailedKickMessage += `§fExpires: §e${banInfo.unbanTime === Infinity ? "Permanent" : new Date(banInfo.unbanTime).toLocaleString()}\n`;
        } else {
            detailedKickMessage += `§fReason: §eSystem detected an active ban, but details could not be fully retrieved. Please contact an admin.\n`;
        }

        if (configModule.editableConfigValues.discordLink && configModule.editableConfigValues.discordLink.trim() !== "" && configModule.editableConfigValues.discordLink !== "https://discord.gg/example") {
            detailedKickMessage += `§fDiscord: §b${configModule.editableConfigValues.discordLink}`;
        }

        const logMessage = `[AntiCheat] Banned player ${player.nameTag} (ID: ${player.id}) attempt to join. Ban details: By ${banInfo?.bannedBy || "N/A"}, Reason: ${banInfo?.reason || "N/A"}, Expires: ${banInfo?.unbanTime === Infinity ? "Permanent" : new Date(banInfo?.unbanTime).toLocaleString()}`;
        console.warn(logMessage);
        if (playerUtils.notifyAdmins) {
            playerUtils.notifyAdmins(`Banned player ${player.nameTag} tried to join. Banned by: ${banInfo?.bannedBy || "N/A"}, Reason: ${banInfo?.reason || "N/A"}`, null);
        }
    }
});

/**
 * Handles player spawn events.
 * @param {mc.PlayerSpawnAfterEvent} eventData The player spawn event data.
 */
mc.world.afterEvents.playerSpawn.subscribe((eventData) => {
    const dependencies = {
        config: configModule.editableConfigValues,
        configModule: configModule,
        playerUtils,
        playerDataManager,
        logManager,
        actionManager: { executeCheckAction },
        checks,
        currentTick
    };
    eventHandlers.handlePlayerSpawn(eventData, dependencies);
});

/**
 * Handles player leave events.
 * @param {mc.PlayerLeaveBeforeEvent} eventData The player leave event data.
 */
mc.world.beforeEvents.playerLeave.subscribe((eventData) => {
    const dependencies = {
        config: configModule.editableConfigValues,
        configModule: configModule,
        playerUtils,
        playerDataManager,
        logManager,
        actionManager: { executeCheckAction },
        checks,
        currentTick
    };
    eventHandlers.handlePlayerLeave(eventData, dependencies);
});

/**
 * Handles entity hurt events, primarily for combat-related checks.
 * @param {mc.EntityHurtAfterEvent} eventData The entity hurt event data.
 */
mc.world.afterEvents.entityHurt.subscribe((eventData) => {
    const dependencies = {
        config: configModule.editableConfigValues,
        configModule: configModule,
        playerUtils,
        playerDataManager,
        logManager,
        actionManager: { executeCheckAction },
        checks,
        currentTick
    };
    eventHandlers.handleEntityHurt(eventData, dependencies);
});

eventHandlers.subscribeToCombatLogEvents({
    config: configModule.editableConfigValues, // Pass runtime config
    playerDataManager,
    playerUtils
});

/**
 * Handles player break block events before they occur.
 * @param {mc.PlayerBreakBlockBeforeEvent} eventData The event data.
 */
mc.world.beforeEvents.playerBreakBlock.subscribe(async (eventData) => {
    const dependencies = {
        config: configModule.editableConfigValues,
        configModule: configModule,
        playerUtils,
        playerDataManager,
        logManager,
        actionManager: { executeCheckAction },
        checks,
        currentTick
    };
    await eventHandlers.handlePlayerBreakBlockBeforeEvent(eventData, dependencies);
});

/**
 * Handles player break block events after they occur.
 * @param {mc.PlayerBreakBlockAfterEvent} eventData The event data.
 */
mc.world.afterEvents.playerBreakBlock.subscribe(async (eventData) => {
    const dependencies = {
        config: configModule.editableConfigValues,
        configModule: configModule,
        playerUtils,
        playerDataManager,
        logManager,
        actionManager: { executeCheckAction },
        checks,
        currentTick
    };
    await eventHandlers.handlePlayerBreakBlockAfterEvent(eventData, dependencies);
});

/**
 * Handles item use events before they occur.
 * @param {mc.ItemUseBeforeEvent} eventData The event data.
 */
mc.world.beforeEvents.itemUse.subscribe(async (eventData) => {
    const dependencies = {
        config: configModule.editableConfigValues,
        configModule: configModule,
        playerUtils,
        playerDataManager,
        logManager,
        actionManager: { executeCheckAction },
        checks,
        currentTick
    };
    await eventHandlers.handleItemUse(eventData, dependencies);
});

/**
 * Handles item use on block events before they occur, for AntiGrief (Fire) and IllegalItem checks.
 * @param {mc.ItemUseOnBeforeEvent} eventData The event data.
 */
mc.world.beforeEvents.itemUseOn.subscribe(async (eventData) => {
    const dependencies = {
        config: configModule.editableConfigValues,
        configModule: configModule,
        playerUtils,
        playerDataManager,
        logManager,
        actionManager: { executeCheckAction },
        checks,
        currentTick
    };
    await eventHandlers.handleItemUseOn(eventData, dependencies);
});

/**
 * Handles player place block events before they occur for AirPlace check.
 * @param {mc.PlayerPlaceBlockBeforeEvent} eventData The event data.
 */
mc.world.beforeEvents.playerPlaceBlock.subscribe(async (eventData) => {
    const dependencies = {
        config: configModule.editableConfigValues,
        configModule: configModule,
        playerUtils,
        playerDataManager,
        logManager,
        actionManager: { executeCheckAction },
        checks,
        currentTick
    };
    await eventHandlers.handlePlayerPlaceBlockBefore(eventData, dependencies);
});

/**
 * Handles player place block events after they occur for Tower check.
 * @param {mc.PlayerPlaceBlockAfterEvent} eventData The event data.
 */
mc.world.afterEvents.playerPlaceBlock.subscribe(async (eventData) => {
    const dependencies = {
        config: configModule.editableConfigValues,
        configModule: configModule,
        playerUtils,
        playerDataManager,
        logManager,
        actionManager: { executeCheckAction },
        checks,
        currentTick
    };
    await eventHandlers.handlePlayerPlaceBlockAfterEvent(eventData, dependencies);
});

/**
 * Handles player inventory item changes after they occur.
 * @param {mc.PlayerInventoryItemChangeAfterEvent} eventData
 */
mc.world.afterEvents.playerInventoryItemChange.subscribe(async (eventData) => {
    const dependencies = {
        config: configModule.editableConfigValues,
        configModule: configModule,
        playerUtils,
        playerDataManager,
        logManager,
        actionManager: { executeCheckAction },
        checks,
        currentTick
    };
    await eventHandlers.handleInventoryItemChange(eventData.player, eventData.newItem, eventData.oldItem, eventData.slotName, dependencies);
});

/**
 * Handles player dimension change events after they occur.
 * @param {mc.PlayerDimensionChangeAfterEvent} eventData The event data.
 */
mc.world.afterEvents.playerDimensionChange.subscribe((eventData) => {
    const dependencies = {
        config: configModule.editableConfigValues,
        playerUtils,
        playerDataManager,
        currentTick
    };
    eventHandlers.handlePlayerDimensionChangeAfterEvent(eventData, dependencies);
});

/**
 * Handles entity die events, specifically for player deaths to record coordinates.
 * @param {mc.EntityDieAfterEvent} eventData The event data.
 */
mc.world.afterEvents.entityDie.subscribe((eventData) => {
    const dependencies = {
        config: configModule.editableConfigValues,
        configModule: configModule, // For deathCoordsMessageKey
        playerUtils,
        playerDataManager,
        logManager,
        currentTick
    };
    if (eventData.deadEntity.typeId === 'minecraft:player') {
        eventHandlers.handlePlayerDeath(eventData, dependencies);
    }
    eventHandlers.handleEntityDieForDeathEffects(eventData, dependencies);
});


/**
 * Handles entity spawn events, for AntiGrief checks (e.g., Wither control).
 * @param {mc.EntitySpawnAfterEvent} eventData The event data.
 */
mc.world.afterEvents.entitySpawn.subscribe(async (eventData) => {
    const dependencies = {
        config: configModule.editableConfigValues,
        configModule: configModule,
        playerUtils,
        logManager,
        actionManager: { executeCheckAction },
        playerDataManager,
        checks,
        currentTick
    };
    await eventHandlers.handleEntitySpawnEvent_AntiGrief(eventData, dependencies);
});

/**
 * Handles piston activation events for AntiGrief checks (e.g., Piston Lag).
 * @param {mc.PistonActivateAfterEvent} eventData The event data.
 */
mc.world.afterEvents.pistonActivate.subscribe(async (eventData) => {
    const dependencies = {
        config: configModule.editableConfigValues,
        configModule: configModule,
        playerUtils,
        logManager,
        actionManager: { executeCheckAction },
        playerDataManager,
        checks,
        currentTick
    };
    await eventHandlers.handlePistonActivate_AntiGrief(eventData, dependencies);
});

mc.system.runInterval(() => {
    if (configModule.editableConfigValues.enableTPASystem) {
        tpaManager.clearExpiredRequests();
        const requestsInWarmup = tpaManager.getRequestsInWarmup();
        for (const request of requestsInWarmup) {
            if (Date.now() >= request.warmupExpiryTimestamp) {
                tpaManager.executeTeleport(request.requestId);
            }
        }
    }
}, 20);

/**
 * Attempts to find a safe Y coordinate for teleportation at a given X, Z.
 * @param {mc.Dimension} dimension - The dimension to check in.
 * @param {number} targetX - The target X coordinate.
 * @param {number} initialY - The initial Y coordinate to start searching from.
 * @param {number} targetZ - The target Z coordinate.
 * @param {mc.Player} [playerForDebug] - Optional player for debug logging.
 * @param {object} [playerUtilsForDebug] - Optional playerUtils for debug logging.
 * @returns {number} A safe Y coordinate, or the initialY if no safer spot is quickly found.
 */
function findSafeTeleportY(dimension, targetX, initialY, targetZ, playerForDebug, playerUtilsForDebug) {
    const minDimensionHeight = dimension.heightRange.min;
    const maxDimensionHeight = dimension.heightRange.max - 2; // Max spawnable Y to leave room for player

    let currentY = Math.floor(initialY);
    currentY = Math.max(minDimensionHeight, Math.min(currentY, maxDimensionHeight));

    const maxSearchDepthDown = 10;
    const maxSearchDepthUp = 5;

    // Search down first
    for (let i = 0; i < maxSearchDepthDown; i++) {
        const checkY = currentY - i;
        if (checkY < minDimensionHeight) break;

        try {
            const blockFeet = dimension.getBlock({ x: targetX, y: checkY, z: targetZ });
            const blockHead = dimension.getBlock({ x: targetX, y: checkY + 1, z: targetZ });

            if (blockFeet && blockHead && blockFeet.isAir && blockHead.isAir) {
                const blockBelowFeet = dimension.getBlock({ x: targetX, y: checkY - 1, z: targetZ });
                if (blockBelowFeet && blockBelowFeet.isSolid) {
                    return checkY;
                } else if (blockFeet.isAir && blockHead.isAir) {
                    return checkY;
                }
            }
        } catch (e) {
        }
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
                if (blockBelowFeet && blockBelowFeet.isSolid) {
                    return checkY;
                } else if (blockFeet.isAir && blockHead.isAir) {
                    return checkY;
                }
            }
        } catch(e) {
        }
    }

    return Math.floor(initialY);
}

/**
 * Handles entity hurt events, for TPA warm-up cancellation.
 * @param {mc.EntityHurtBeforeEvent} eventData The entity hurt event data.
 */
mc.world.beforeEvents.entityHurt.subscribe(eventData => {
    if (!configModule.editableConfigValues.enableTPASystem) return;

    const { hurtEntity, damageSource } = eventData;
    let playerNameTag;
    try {
        playerNameTag = hurtEntity.nameTag;
        if (typeof playerNameTag !== 'string') return;
    } catch (e) {
        return;
    }

    const requestsInWarmup = tpaManager.getRequestsInWarmup();
    const playerActiveWarmupRequests = requestsInWarmup.filter(
        req => req.requesterName === playerNameTag || req.targetName === playerNameTag
    );

    for (const request of playerActiveWarmupRequests) {
        if (request.status === 'pending_teleport_warmup') {
            let playerIsTeleporting = false;
            if (request.requestType === 'tpa' && request.requesterName === playerNameTag) {
                playerIsTeleporting = true;
            } else if (request.requestType === 'tpahere' && request.targetName === playerNameTag) {
                playerIsTeleporting = true;
            }

            if (playerIsTeleporting) {
                const damageCause = damageSource?.cause || 'unknown';
                const reasonMsgPlayer = `§cTeleport cancelled: You took damage (cause: ${damageCause}).`;
                const reasonMsgLog = `Player ${playerNameTag} took damage (cause: ${damageCause}) during TPA warm-up for request ${request.requestId}.`;

                tpaManager.cancelTeleport(request.requestId, reasonMsgPlayer, reasonMsgLog);
                break;
            }
        }
    }
});

let currentTick = 0;

/**
 * Main tick loop for the Anti-Cheat system.
 * Runs every game tick (nominally 20 times per second).
 * Responsibilities:
 * - Increments currentTick.
 * - Cleans up player data for players no longer online.
 * - Ensures player data is initialized for all online players.
 * - Updates transient player data (like position, velocity).
 * - Executes various cheat checks (Fly, Speed, NoFall, CPS, Nuker, ViewSnap).
 * - Manages fall distance accumulation and reset logic.
 * @returns {Promise<void>}
 */
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

            if (typeof dimBorderSettings.resizeStartTimeMs !== 'number' ||
                typeof dimBorderSettings.resizeDurationMs !== 'number' ||
                typeof dimBorderSettings.originalSize !== 'number' ||
                typeof dimBorderSettings.targetSize !== 'number') {

                console.warn(`[WB Resize] Invalid resize parameters for dimension ${dimId}. Cancelling resize.`);
                dimBorderSettings.isResizing = false;
                delete dimBorderSettings.originalSize;
                delete dimBorderSettings.targetSize;
                delete dimBorderSettings.resizeStartTimeMs;
                delete dimBorderSettings.resizeDurationMs;
                saveBorderSettings(dimId, dimBorderSettings);
                continue;
            }

            const accumulatedPausedMs = dimBorderSettings.resizePausedTimeMs || 0;
            const effectiveElapsedMs = (currentTimeMs - dimBorderSettings.resizeStartTimeMs) - accumulatedPausedMs;
            const durationMs = dimBorderSettings.resizeDurationMs;

            if (dimBorderSettings.isPaused) {
                continue; // Skip finalization if paused
            }

            if (effectiveElapsedMs >= durationMs) {
                const targetSize = dimBorderSettings.targetSize;
                if (dimBorderSettings.shape === "square") {
                    dimBorderSettings.halfSize = targetSize;
                } else if (dimBorderSettings.shape === "circle") {
                    dimBorderSettings.radius = targetSize;
                }
                dimBorderSettings.isResizing = false;
                delete dimBorderSettings.originalSize;
                delete dimBorderSettings.targetSize;
                delete dimBorderSettings.resizeStartTimeMs;
                delete dimBorderSettings.resizeDurationMs;

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

    for (const player of allPlayers) {
        const pData = await playerDataManager.ensurePlayerDataInitialized(player, currentTick);
        if (!pData) {
            if (playerUtils.debugLog) playerUtils.debugLog(`Critical: pData not available for ${player.nameTag} in tick loop after ensure.`, player.nameTag);
            continue;
        }

        pData.lastBorderVisualTick = pData.lastBorderVisualTick || 0;
        pData.ticksOutsideBorder = pData.ticksOutsideBorder || 0;
        pData.borderDamageApplications = pData.borderDamageApplications || 0;

        if (!pData) {
            if (playerUtils.debugLog) playerUtils.debugLog(`Critical: pData somehow became null for ${player.nameTag} before transient update.`, player.nameTag);
            continue;
        }

        playerDataManager.updateTransientPlayerData(player, pData, currentTick);

        if (pData.isUsingConsumable && (currentTick - pData.lastItemUseTick > config.itemUseStateClearTicks)) {
            if (playerUtils.debugLog && pData.isWatched) playerUtils.debugLog(`StateConflict: Auto-clearing isUsingConsumable for ${player.nameTag} after timeout. Tick: ${currentTick}`, player.nameTag);
            pData.isUsingConsumable = false;
        }
        if (pData.isChargingBow && (currentTick - pData.lastItemUseTick > config.itemUseStateClearTicks)) {
            if (playerUtils.debugLog && pData.isWatched) playerUtils.debugLog(`StateConflict: Auto-clearing isChargingBow for ${player.nameTag} after timeout. Tick: ${currentTick}`, player.nameTag);
            pData.isChargingBow = false;
        }
        if (pData.isUsingShield && (currentTick - pData.lastItemUseTick > config.itemUseStateClearTicks)) {
            if (playerUtils.debugLog && pData.isWatched) playerUtils.debugLog(`StateConflict: Auto-clearing isUsingShield for ${player.nameTag} after timeout. Tick: ${currentTick}`, player.nameTag);
            pData.isUsingShield = false;
        }

        if (configModule.editableConfigValues.enableFlyCheck && checks.checkFly) await checks.checkFly(player, pData, configModule.editableConfigValues, playerUtils, playerDataManager, logManager, executeCheckAction, currentTick);
        if (configModule.editableConfigValues.enableSpeedCheck && checks.checkSpeed) await checks.checkSpeed(player, pData, configModule.editableConfigValues, playerUtils, playerDataManager, logManager, executeCheckAction, currentTick);
        if (configModule.editableConfigValues.enableNofallCheck && checks.checkNoFall) await checks.checkNoFall(player, pData, configModule.editableConfigValues, playerUtils, playerDataManager, logManager, executeCheckAction);
        if (configModule.editableConfigValues.enableCPSCheck && checks.checkCPS) await checks.checkCPS(player, pData, configModule.editableConfigValues, playerUtils, playerDataManager, logManager, executeCheckAction);
        if (configModule.editableConfigValues.enableNukerCheck && checks.checkNuker) await checks.checkNuker(player, pData, configModule.editableConfigValues, playerUtils, playerDataManager, logManager, executeCheckAction);
        if (configModule.editableConfigValues.enableViewSnapCheck && checks.checkViewSnap) await checks.checkViewSnap(player, pData, configModule.editableConfigValues, currentTick, playerUtils, playerDataManager, logManager, executeCheckAction);

        if (configModule.editableConfigValues.enableNoSlowCheck && checks.checkNoSlow) {
            await checks.checkNoSlow(player, pData, configModule.editableConfigValues, playerUtils, playerDataManager, logManager, executeCheckAction, currentTick);
        }

        if (configModule.editableConfigValues.enableInvalidSprintCheck && checks.checkInvalidSprint) {
            await checks.checkInvalidSprint(player, pData, configModule.editableConfigValues, playerUtils, playerDataManager, logManager, executeCheckAction, currentTick);
        }

        if (configModule.editableConfigValues.enableAutoToolCheck && checks.checkAutoTool) {
            await checks.checkAutoTool(player, pData, configModule.editableConfigValues, playerUtils, playerDataManager, logManager, executeCheckAction, currentTick, player.dimension);
        }

        if (configModule.editableConfigValues.enableNameSpoofCheck && checks.checkNameSpoof) {
            await checks.checkNameSpoof(player, pData, configModule.editableConfigValues, playerUtils, playerDataManager, logManager, executeCheckAction, currentTick);
        }

        if (configModule.editableConfigValues.enableAntiGMCCheck && checks.checkAntiGMC) {
            await checks.checkAntiGMC(player, pData, configModule.editableConfigValues, playerUtils, playerDataManager, logManager, executeCheckAction, currentTick);
        }

        if (configModule.editableConfigValues.enableInvalidRenderDistanceCheck && (currentTick - (pData.lastRenderDistanceCheckTick || 0) >= 400)) {
            if (checks.checkInvalidRenderDistance) {
                const renderDistDependencies = {
                    config: configModule.editableConfigValues,
                    automodConfig: configModule.editableConfigValues.automodConfig,
                    playerDataManager,
                    playerUtils,
                    logManager,
                    actionManager: { executeCheckAction },
                    checks,
                    currentTick
                };
                await checks.checkInvalidRenderDistance(
                    player,
                    pData,
                    configModule.editableConfigValues, // Pass editableConfigValues explicitly
                    playerUtils,
                    logManager,
                    { executeCheckAction },
                    renderDistDependencies
                );
            }
            pData.lastRenderDistanceCheckTick = currentTick;
        }

        const netherRoofDependencies = {
            config: configModule.editableConfigValues,
            automodConfig: configModule.editableConfigValues.automodConfig,
            playerDataManager: playerDataManager,
            playerUtils: playerUtils
        };
        if (configModule.editableConfigValues.enableNetherRoofCheck && checks.checkNetherRoof) {
            checks.checkNetherRoof(player, pData, netherRoofDependencies);
        }

        if (!player.isOnGround) {
            if (pData.velocity.y < -0.07 && pData.previousPosition) {
                const deltaY = pData.previousPosition.y - pData.lastPosition.y;
                if (deltaY > 0) {
                    pData.fallDistance += deltaY;
                }
            }
        } else {
            if (!pData.isTakingFallDamage) {
                 pData.fallDistance = 0;
            }
            pData.isTakingFallDamage = false;
        }

        let borderSettings = null;
    if (configModule.editableConfigValues.enableWorldBorderSystem) { // Changed dependencies.config to configModule.editableConfigValues
            borderSettings = getBorderSettings(player.dimension.id);

            if (borderSettings && borderSettings.enabled) {
                const playerPermLevel = playerUtils.getPlayerPermissionLevel(player);

                if (playerPermLevel > permissionLevels.admin) {
                    const loc = player.location;
                    let isPlayerOutside = false;
                    let targetX = loc.x;
                    let targetZ = loc.z;

                    let currentEffectiveHalfSize = borderSettings.halfSize;
                    let currentEffectiveRadius = borderSettings.radius;

                    if (borderSettings.isResizing && borderSettings.enabled &&
                        typeof borderSettings.originalSize === 'number' &&
                        typeof borderSettings.targetSize === 'number' &&
                        typeof borderSettings.resizeStartTimeMs === 'number' &&
                        typeof borderSettings.resizeDurationMs === 'number') {

                        const currentTimeMs = Date.now();
                        const accumulatedPausedMs = borderSettings.resizePausedTimeMs || 0;
                        let elapsedMs;

                        if (borderSettings.isPaused) {
                            const lastPauseStart = borderSettings.resizeLastPauseStartTimeMs || currentTimeMs;
                            elapsedMs = (lastPauseStart - borderSettings.resizeStartTimeMs) - accumulatedPausedMs;
                        } else {
                            elapsedMs = (currentTimeMs - borderSettings.resizeStartTimeMs) - accumulatedPausedMs;
                        }
                        elapsedMs = Math.max(0, elapsedMs);
                        elapsedMs = Math.max(0, elapsedMs);

                        const durationMs = borderSettings.resizeDurationMs;
                        let rawProgress = 0;

                        if (durationMs > 0) {
                             rawProgress = Math.min(1, elapsedMs / durationMs);
                        } else {
                             rawProgress = 1;
                        }

                        let easedProgress = rawProgress;
                        if (borderSettings.resizeInterpolationType === "easeOutQuad") {
                            easedProgress = easeOutQuad(rawProgress);
                        } else if (borderSettings.resizeInterpolationType === "easeInOutQuad") {
                            easedProgress = easeInOutQuad(rawProgress);
                        }

                        const interpolatedSize = borderSettings.originalSize + (borderSettings.targetSize - borderSettings.originalSize) * easedProgress;

                        if (borderSettings.shape === "square") {
                            currentEffectiveHalfSize = interpolatedSize;
                        } else if (borderSettings.shape === "circle") {
                            currentEffectiveRadius = interpolatedSize;
                        }
                    } else if (borderSettings.isResizing && borderSettings.enabled) {
                        if (typeof borderSettings.targetSize === 'number') {
                            if (borderSettings.shape === "square") {
                                currentEffectiveHalfSize = borderSettings.targetSize;
                            } else if (borderSettings.shape === "circle") {
                                currentEffectiveRadius = borderSettings.targetSize;
                            }
                        }
                         if(playerUtils.debugLog && pData.isWatched) playerUtils.debugLog(`WorldBorder: In-progress resize for dim ${player.dimension.id} has incomplete parameters in player loop. Using targetSize or stored size.`, player.nameTag);
                    }


                    if (borderSettings.shape === "square" && typeof currentEffectiveHalfSize === 'number' && currentEffectiveHalfSize > 0) {
                        const { centerX, centerZ } = borderSettings;
                        const minX = centerX - currentEffectiveHalfSize;
                        const maxX = centerX + currentEffectiveHalfSize;
                        const minZ = centerZ - currentEffectiveHalfSize;
                        const maxZ = centerZ + currentEffectiveHalfSize;

                        if (loc.x < minX || loc.x > maxX || loc.z < minZ || loc.z > maxZ) {
                            isPlayerOutside = true;
                            targetX = loc.x;
                            targetZ = loc.z;
                            if (targetX < minX) targetX = minX + 0.5; else if (targetX > maxX) targetX = maxX - 0.5;
                            if (targetZ < minZ) targetZ = minZ + 0.5; else if (targetZ > maxZ) targetZ = maxZ - 0.5;
                        }
                    } else if (borderSettings.shape === "circle" && typeof currentEffectiveRadius === 'number' && currentEffectiveRadius > 0) {
                        const { centerX, centerZ } = borderSettings;
                        const dx = loc.x - centerX;
                        const dz = loc.z - centerZ;
                        const distSq = dx * dx + dz * dz;
                        const radiusSq = currentEffectiveRadius * currentEffectiveRadius;

                        if (distSq > radiusSq) {
                            isPlayerOutside = true;
                            const currentDist = Math.sqrt(distSq);
                            const teleportOffset = 0.5;
                            if (currentDist === 0 || currentEffectiveRadius <= teleportOffset) {
                                targetX = centerX + (currentEffectiveRadius > teleportOffset ? currentEffectiveRadius - teleportOffset : 0);
                                targetZ = centerZ;
                            } else {
                                const scale = (currentEffectiveRadius - teleportOffset) / currentDist;
                                targetX = centerX + dx * scale;
                                targetZ = centerZ + dz * scale;
                            }
                        }
                    } else if (borderSettings.shape) {
                         if(playerUtils.debugLog && pData.isWatched) playerUtils.debugLog(`WorldBorder: Invalid shape ('${borderSettings.shape}') or non-positive effective size (Sq: ${currentEffectiveHalfSize}, Circ: ${currentEffectiveRadius}) in dimension ${player.dimension.id}. Skipping enforcement.`, player.nameTag);
                    }

                    if (isPlayerOutside) {
                        pData.ticksOutsideBorder = (pData.ticksOutsideBorder || 0) + 1;

                        const enableDamage = borderSettings.enableDamage ?? configModule.editableConfigValues.worldBorderDefaultEnableDamage;
                        const damageAmount = borderSettings.damageAmount ?? configModule.editableConfigValues.worldBorderDefaultDamageAmount;
                        const damageIntervalTicks = borderSettings.damageIntervalTicks ?? configModule.editableConfigValues.worldBorderDefaultDamageIntervalTicks;
                        const teleportAfterNumDamageEvents = borderSettings.teleportAfterNumDamageEvents ?? configModule.editableConfigValues.worldBorderTeleportAfterNumDamageEvents;

                        let performTeleport = true;

                        if (enableDamage && damageIntervalTicks > 0 && damageAmount > 0) {
                            performTeleport = false;

                            if (pData.ticksOutsideBorder % damageIntervalTicks === 0) {
                                try {
                                    player.applyDamage(damageAmount, { cause: mc.EntityDamageCause.worldBorder });
                                    pData.borderDamageApplications++;
                                    pData.isDirtyForSave = true;

                                    if (playerUtils.debugLog && pData.isWatched) {
                                        playerUtils.debugLog(`WorldBorder: Applied ${damageAmount} damage to ${player.nameTag}. Total applications: ${pData.borderDamageApplications}`, player.nameTag);
                                    }

                                    if (pData.borderDamageApplications >= teleportAfterNumDamageEvents) {
                                        performTeleport = true;
                                        if (playerUtils.debugLog && pData.isWatched) {
                                            playerUtils.debugLog(`WorldBorder: ${player.nameTag} reached ${pData.borderDamageApplications} damage events. Triggering teleport.`, player.nameTag);
                                        }
                                    }
                                } catch (e) {
                                    console.warn(`[WorldBorder] Failed to apply damage to player ${player.nameTag}: ${e}`);
                                }
                            }
                        }

                        if (performTeleport) {
                            const safeY = findSafeTeleportY(player.dimension, targetX, loc.y, targetZ, player, playerUtils);
                            try {
                                player.teleport({ x: targetX, y: safeY, z: targetZ }, { dimension: player.dimension });
                                if (configModule.editableConfigValues.worldBorderWarningMessage) { // Changed dependencies.config to configModule.editableConfigValues
                                    playerUtils.warnPlayer(player, getString(configModule.editableConfigValues.worldBorderWarningMessage)); // Changed dependencies.config to configModule.editableConfigValues
                                }
                                if (playerUtils.debugLog && pData.isWatched) { // Changed dependencies.playerUtils to playerUtils
                                    playerUtils.debugLog(`WorldBorder: Teleported ${player.nameTag} to XZ(${targetX.toFixed(1)},${targetZ.toFixed(1)}) Y=${safeY}. Reason: ${enableDamage && pData.borderDamageApplications >= teleportAfterNumDamageEvents ? 'Max damage events reached' : (!enableDamage ? 'Standard enforcement' : 'Damage logic did not require teleport yet')}.`, player.nameTag);
                                }
                                pData.ticksOutsideBorder = 0;
                                pData.borderDamageApplications = 0;
                                pData.isDirtyForSave = true;
                            } catch (e) {
                                console.warn(`[WorldBorder] Failed to teleport player ${player.nameTag}: ${e}`);
                                 if (playerUtils.debugLog && pData.isWatched) {
                                     playerUtils.debugLog(`WorldBorder: Teleport failed for ${player.nameTag}. Error: ${e}`, player.nameTag);
                                 }
                            }
                        }

                    } else {
                        if (pData.ticksOutsideBorder > 0 || pData.borderDamageApplications > 0) {
                             if (playerUtils.debugLog && pData.isWatched) {
                                playerUtils.debugLog(`WorldBorder: Player ${player.nameTag} re-entered border. Resetting counters.`, player.nameTag);
                            }
                            pData.ticksOutsideBorder = 0;
                            pData.borderDamageApplications = 0;
                            pData.isDirtyForSave = true;
                        }
                    }
                } else {
                    if (pData.ticksOutsideBorder > 0 || pData.borderDamageApplications > 0) {
                        pData.ticksOutsideBorder = 0;
                        pData.borderDamageApplications = 0;
                        pData.isDirtyForSave = true;
                    }
                }
            } else {
                 if (pData.ticksOutsideBorder > 0 || pData.borderDamageApplications > 0) {
                    pData.ticksOutsideBorder = 0;
                    pData.borderDamageApplications = 0;
                    pData.isDirtyForSave = true;
                }
            }
        } else {
            if (pData.ticksOutsideBorder > 0 || pData.borderDamageApplications > 0) {
                pData.ticksOutsideBorder = 0;
                pData.borderDamageApplications = 0;
                pData.isDirtyForSave = true;
            }
        }

        if (configModule.editableConfigValues.enableWorldBorderSystem && configModule.editableConfigValues.worldBorderEnableVisuals) { // Changed dependencies.config to configModule.editableConfigValues
            const currentBorderSettings = borderSettings || getBorderSettings(player.dimension.id);

            if (currentBorderSettings && currentBorderSettings.enabled) {
                if (currentTick - (pData.lastBorderVisualTick || 0) >= configModule.editableConfigValues.worldBorderVisualUpdateIntervalTicks) { // Changed dependencies.config to configModule.editableConfigValues
                    pData.lastBorderVisualTick = currentTick;

                    const playerLoc = player.location;
                    let particleNameToUse;
                    const particleSequence = configModule.editableConfigValues.worldBorderParticleSequence; // Changed dependencies.config to configModule.editableConfigValues

                    if (Array.isArray(particleSequence) && particleSequence.length > 0) {
                        const visualUpdateInterval = configModule.editableConfigValues.worldBorderVisualUpdateIntervalTicks > 0 ? configModule.editableConfigValues.worldBorderVisualUpdateIntervalTicks : 20; // Changed dependencies.config to configModule.editableConfigValues
                        const sequenceIndex = Math.floor(currentTick / visualUpdateInterval) % particleSequence.length;
                        particleNameToUse = particleSequence[sequenceIndex];
                    } else {
                        particleNameToUse = currentBorderSettings.particleNameOverride || configModule.editableConfigValues.worldBorderParticleName; // Changed dependencies.config to configModule.editableConfigValues
                    }
                    const visualRange = configModule.editableConfigValues.worldBorderVisualRange; // Changed dependencies.config to configModule.editableConfigValues
                    let density;
                    if (configModule.editableConfigValues.worldBorderEnablePulsingDensity) { // Changed dependencies.config to configModule.editableConfigValues
                        const pulseSpeed = configModule.editableConfigValues.worldBorderPulseSpeed > 0 ? configModule.editableConfigValues.worldBorderPulseSpeed : 1.0; // Changed dependencies.config to configModule.editableConfigValues
                        const pulseTime = (currentTick * pulseSpeed) / 20.0;
                        const sineWave = Math.sin(pulseTime);
                        const minDensity = configModule.editableConfigValues.worldBorderPulseDensityMin > 0 ? configModule.editableConfigValues.worldBorderPulseDensityMin : 0.1; // Changed dependencies.config to configModule.editableConfigValues
                        const maxDensity = configModule.editableConfigValues.worldBorderPulseDensityMax > minDensity ? configModule.editableConfigValues.worldBorderPulseDensityMax : minDensity + 1.0; // Changed dependencies.config to configModule.editableConfigValues

                        density = mapRange(sineWave, -1, 1, minDensity, maxDensity);
                        density = Math.max(0.1, density);
                    } else {
                        density = Math.max(0.1, configModule.editableConfigValues.worldBorderParticleDensity); // Changed dependencies.config to configModule.editableConfigValues
                    }
                    const wallHeight = configModule.editableConfigValues.worldBorderParticleWallHeight; // Changed dependencies.config to configModule.editableConfigValues
                    const segmentLength = configModule.editableConfigValues.worldBorderParticleSegmentLength; // Changed dependencies.config to configModule.editableConfigValues
                    const yBase = Math.floor(playerLoc.y);


                    if (currentBorderSettings.shape === "square" && typeof currentEffectiveHalfSize === 'number' && currentEffectiveHalfSize > 0) {
                        const { centerX, centerZ } = currentBorderSettings;
                        const minX = centerX - currentEffectiveHalfSize;
                        const maxX = centerX + currentEffectiveHalfSize;
                        const minZ = centerZ - currentEffectiveHalfSize;
                        const maxZ = centerZ + currentEffectiveHalfSize;

                        const spawnSquareParticleLine = (isXPlane, fixedCoord, startDynamic, endDynamic, playerCoordDynamic) => {
                            const lengthToRender = Math.min(segmentLength, Math.abs(endDynamic - startDynamic));
                            let actualSegmentStart = playerCoordDynamic - lengthToRender / 2;
                            let actualSegmentEnd = playerCoordDynamic + lengthToRender / 2;
                            actualSegmentStart = Math.max(startDynamic, actualSegmentStart);
                            actualSegmentEnd = Math.min(endDynamic, actualSegmentEnd);
                            if (actualSegmentStart >= actualSegmentEnd) return;

                            for (let dyn = actualSegmentStart; dyn <= actualSegmentEnd; dyn += (1 / density)) {
                                for (let h = 0; h < wallHeight; h++) {
                                    try {
                                        const particleLoc = isXPlane ? { x: fixedCoord, y: yBase + h, z: dyn } : { x: dyn, y: yBase + h, z: fixedCoord };
                                        player.dimension.spawnParticle(particleNameToUse, particleLoc);
                                    } catch (e) {  }
                                }
                            }
                        };
                        if (Math.abs(playerLoc.x - minX) < visualRange) spawnSquareParticleLine(true, minX, minZ, maxZ, playerLoc.z);
                        if (Math.abs(playerLoc.x - maxX) < visualRange) spawnSquareParticleLine(true, maxX, minZ, maxZ, playerLoc.z);
                        if (Math.abs(playerLoc.z - minZ) < visualRange) spawnSquareParticleLine(false, minZ, minX, maxX, playerLoc.x);
                        if (Math.abs(playerLoc.z - maxZ) < visualRange) spawnSquareParticleLine(false, maxZ, minX, maxX, playerLoc.x);

                    } else if (currentBorderSettings.shape === "circle" && typeof currentEffectiveRadius === 'number' && currentEffectiveRadius > 0) {
                        const { centerX, centerZ } = currentBorderSettings;
                        const radiusToUse = currentEffectiveRadius;

                        const distanceToCenter = Math.sqrt(Math.pow(playerLoc.x - centerX, 2) + Math.pow(playerLoc.z - centerZ, 2));

                        if (Math.abs(distanceToCenter - radiusToUse) < visualRange) {
                            const playerAngle = Math.atan2(playerLoc.z - centerZ, playerLoc.x - centerX);
                            const halfAngleSpan = radiusToUse > 0 ? (segmentLength / 2) / radiusToUse : Math.PI;

                            for (let i = 0; i < segmentLength * density; i++) {
                                const currentAngleOffset = (i / (segmentLength * density) - 0.5) * (segmentLength / radiusToUse);
                                const angle = playerAngle + currentAngleOffset;

                                if (Math.abs(currentAngleOffset) > halfAngleSpan && segmentLength * density > 1) continue;

                                const particleX = centerX + radiusToUse * Math.cos(angle);
                                const particleZ = centerZ + radiusToUse * Math.sin(angle);
                                for (let h = 0; h < wallHeight; h++) {
                                    try {
                                        player.dimension.spawnParticle(particleNameToUse, { x: particleX, y: yBase + h, z: particleZ });
                                    } catch (e) {  }
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
                    if (playerUtils.debugLog && pData.isWatched) {
                        playerUtils.debugLog(`Deferred save executed for ${player.nameTag}. Tick: ${currentTick}`, player.nameTag);
                    }
                } catch (error) {
                    console.error(`Error during deferred save for ${player.nameTag}: ${error}`);
                    logManager.addLog('error', `DeferredSaveFail: ${player.nameTag}, ${error}`);
                }
            }
        }
        if (logManager.persistLogCacheToDisk) {
            logManager.persistLogCacheToDisk();
        }
        if (reportManager.persistReportsToDisk) {
            reportManager.persistReportsToDisk();
        }
    }
}, 1);

playerUtils.debugLog("Anti-Cheat Core System Initialized. Event handlers and tick loop are active.", "System");
