/**
 * @file Main entry point for the AntiCheat system.
 * Initializes all core modules, subscribes to Minecraft server events,
 * and runs the main system tick loop for processing checks, player data updates,
 * and other periodic tasks.
 */

import * as mc from '@minecraft/server';
import * as mcui from '@minecraft/server-ui';

import * as actionManager from './core/actionManager.js';
import { automodConfig } from './core/automodConfig.js';
import * as chatProcessor from './core/chatProcessor.js';
import { checkActionProfiles } from './core/actionProfiles.js';
import * as checks from './checks/index.js';
import * as commandManager from './core/commandManager.js';
import * as configModule from './config.js';
import * as eventHandlers from './core/eventHandlers.js';
import * as logManager from './core/logManager.js';
import * as playerDataManager from './core/playerDataManager.js';
import * as playerUtils from './utils/playerUtils.js';
import * as rankManager from './core/rankManager.js';
import * as reportManager from './core/reportManager.js';
import * as tpaManager from './core/tpaManager.js';
import * as uiManager from './core/uiManager.js';
import * as worldBorderManager from './utils/worldBorderManager.js';

let currentTick = 0;

/**
 * Assembles and returns the standard dependencies object used throughout the system.
 * This object provides access to configuration, utilities, managers, and Minecraft APIs.
 */
function getStandardDependencies() {
    return {
        config: configModule.editableConfigValues,
        automodConfig: automodConfig,
        checkActionProfiles: checkActionProfiles,
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
        permissionLevels: rankManager.permissionLevels,
        ActionFormData: mcui.ActionFormData,
        MessageFormData: mcui.MessageFormData,
        ModalFormData: mcui.ModalFormData,
        ItemComponentTypes: mc.ItemComponentTypes,
        chatProcessor,
        getString: playerUtils.getString,
        rankManager: {
            getPlayerPermissionLevel: rankManager.getPlayerPermissionLevel,
            updatePlayerNametag: rankManager.updatePlayerNametag,
            getPlayerRankFormattedChatElements: rankManager.getPlayerRankFormattedChatElements,
        },
        worldBorderManager: {
            getBorderSettings: worldBorderManager.getBorderSettings,
            saveBorderSettings: worldBorderManager.saveBorderSettings,
            processWorldBorderResizing: worldBorderManager.processWorldBorderResizing,
            enforceWorldBorderForPlayer: worldBorderManager.enforceWorldBorderForPlayer,
            isPlayerOutsideBorder: worldBorderManager.isPlayerOutsideBorder,
        },
        system: mc.system,
        commandManager: {
            registerCommand: commandManager.registerCommandInternal,
            unregisterCommand: commandManager.unregisterCommandInternal,
            reloadCommands: commandManager.initializeCommands,
        },
        editableConfig: configModule,
    };
}

// Event subscriptions will be moved into initializeSystem

// Tick loops will be moved into performInitializations()
/*
mc.system.runInterval(async () => {
    currentTick++;
    const tickDependencies = getStandardDependencies();

    if (tickDependencies.config.enableWorldBorderSystem) {
        try {
            worldBorderManager.processWorldBorderResizing(tickDependencies);
        } catch (e) {
            console.error(`[MainTick] Error processing world border resizing: ${e.stack || e.message}`);
            playerUtils.debugLog(`[MainTick] Error processing world border resizing: ${e.message}`, 'System', tickDependencies);
            logManager.addLog({ actionType: 'errorWorldBorderResizeTick', context: 'MainTickLoop.worldBorderResizing', details: `Error: ${e.message}`, error: e.stack || e.message }, tickDependencies);
        }
    }

    const allPlayers = mc.world.getAllPlayers();
    playerDataManager.cleanupActivePlayerData(allPlayers, tickDependencies);

    for (const player of allPlayers) {
        const pData = await playerDataManager.ensurePlayerDataInitialized(player, currentTick, tickDependencies);
        if (!pData) {
            playerUtils.debugLog(`Critical: pData not available for ${player.nameTag} in tick loop after ensure. Skipping checks for this player this tick.`, player.nameTag, tickDependencies);
            continue;
        }

        playerDataManager.updateTransientPlayerData(player, pData, tickDependencies);
        playerDataManager.clearExpiredItemUseStates(pData, tickDependencies);

        if (tickDependencies.config.enableFlyCheck && checks.checkFly) await checks.checkFly(player, pData, tickDependencies);
        if (tickDependencies.config.enableSpeedCheck && checks.checkSpeed) await checks.checkSpeed(player, pData, tickDependencies);
        if (tickDependencies.config.enableNofallCheck && checks.checkNoFall) await checks.checkNoFall(player, pData, tickDependencies);
        if (tickDependencies.config.enableNoSlowCheck && checks.checkNoSlow) await checks.checkNoSlow(player, pData, tickDependencies);
        if (tickDependencies.config.enableInvalidSprintCheck && checks.checkInvalidSprint) await checks.checkInvalidSprint(player, pData, tickDependencies);
        if (tickDependencies.config.enableNetherRoofCheck && checks.checkNetherRoof && (currentTick - (pData.lastCheckNetherRoofTick || 0) >= tickDependencies.config.netherRoofCheckIntervalTicks)) {
             await checks.checkNetherRoof(player, pData, tickDependencies); pData.lastCheckNetherRoofTick = currentTick;
        }

        if (tickDependencies.config.enableCpsCheck && checks.checkCps) await checks.checkCps(player, pData, tickDependencies, null);
        if (tickDependencies.config.enableViewSnapCheck && checks.checkViewSnap) await checks.checkViewSnap(player, pData, tickDependencies, null);
        if (tickDependencies.config.enableMultiTargetCheck && checks.checkMultiTarget) await checks.checkMultiTarget(player, pData, tickDependencies, null);
        if (tickDependencies.config.enableStateConflictCheck && checks.checkStateConflict) await checks.checkStateConflict(player, pData, tickDependencies, null);

        if (tickDependencies.config.enableNukerCheck && checks.checkNuker) await checks.checkNuker(player, pData, tickDependencies);
        if (tickDependencies.config.enableAutoToolCheck && checks.checkAutoTool && (currentTick - (pData.lastCheckAutoToolTick || 0) >= tickDependencies.config.autoToolCheckIntervalTicks)) {
            await checks.checkAutoTool(player, pData, tickDependencies); pData.lastCheckAutoToolTick = currentTick;
        }
        if (tickDependencies.config.enableFlatRotationCheck && checks.checkFlatRotationBuilding && (currentTick - (pData.lastCheckFlatRotationBuildingTick || 0) >= tickDependencies.config.flatRotationCheckIntervalTicks)) {
            await checks.checkFlatRotationBuilding(player, pData, tickDependencies); pData.lastCheckFlatRotationBuildingTick = currentTick;
        }

        if (tickDependencies.config.enableNameSpoofCheck && checks.checkNameSpoof && (currentTick - (pData.lastCheckNameSpoofTick || 0) >= tickDependencies.config.nameSpoofCheckIntervalTicks)) {
            await checks.checkNameSpoof(player, pData, tickDependencies); pData.lastCheckNameSpoofTick = currentTick;
        }
        if (tickDependencies.config.enableAntiGmcCheck && checks.checkAntiGmc && (currentTick - (pData.lastCheckAntiGmcTick || 0) >= tickDependencies.config.antiGmcCheckIntervalTicks)) {
            await checks.checkAntiGmc(player, pData, tickDependencies); pData.lastCheckAntiGmcTick = currentTick;
        }

        if (tickDependencies.config.enableInvalidRenderDistanceCheck && checks.checkInvalidRenderDistance && (currentTick - (pData.lastRenderDistanceCheckTick || 0) >= tickDependencies.config.invalidRenderDistanceCheckIntervalTicks)) {
            await checks.checkInvalidRenderDistance(player, pData, tickDependencies);
            pData.lastRenderDistanceCheckTick = currentTick;
        }

        if (!player.isOnGround) {
            if ((pData.velocity?.y ?? 0) < -0.078 && pData.previousPosition && pData.lastPosition) {
                const deltaY = pData.previousPosition.y - pData.lastPosition.y;
                if (deltaY > 0 && deltaY < 100) {
                    pData.fallDistance = (pData.fallDistance || 0) + deltaY;
                }
            }
        } else {
            if (!pData.isTakingFallDamage) {
                pData.fallDistance = 0;
            }
            pData.isTakingFallDamage = false;
            pData.consecutiveOffGroundTicks = 0;
        }

        if (tickDependencies.config.enableWorldBorderSystem) {
            try {
                worldBorderManager.enforceWorldBorderForPlayer(player, pData, tickDependencies);
            } catch (e) {
                console.error(`[MainTick] Error enforcing world border for player ${player.nameTag}: ${e.stack || e.message}`);
                playerUtils.debugLog(`[MainTick] Error enforcing world border for ${player.nameTag}: ${e.message}`, player.nameTag, tickDependencies);
                logManager.addLog({ actionType: 'errorWorldBorderEnforceTick', context: 'MainTickLoop.worldBorderEnforcement', targetName: player.nameTag, details: `Error: ${e.message}`, error: e.stack || e.message }, tickDependencies);
            }
        }
    }

    if (currentTick % 600 === 0) {
        playerUtils.debugLog(`Performing periodic data persistence. Current Tick: ${currentTick}`, 'System', tickDependencies);
        for (const player of allPlayers) {
            const pData = playerDataManager.getPlayerData(player.id);
            if (pData?.isDirtyForSave) {
                try {
                    await playerDataManager.saveDirtyPlayerData(player, tickDependencies);
                    if (pData.isWatched) {
                        playerUtils.debugLog(`Periodic save executed for watched player ${player.nameTag}.`, player.nameTag, tickDependencies);
                    }
                } catch (error) {
                    console.error(`Error during periodic save for ${player.nameTag}: ${error.message}`);
                    logManager.addLog({ actionType: 'error', context: 'PeriodicSaveFail', details: `Player: ${player.nameTag}, Error: ${error.message}` }, tickDependencies);
                }
            }
        }
        logManager.persistLogCacheToDisk(tickDependencies);
        reportManager.persistReportsToDisk(tickDependencies);
        if (tickDependencies.config.enableWorldBorderSystem) {
            playerUtils.debugLog("[MainTick] World border settings are saved on modification. No global periodic save implemented currently.", "System", tickDependencies);
        }
    }
}, 1);
*/

// Moved TPA tick loop into performInitializations()
/*
mc.system.runInterval(() => {
    const tpaIntervalDependencies = getStandardDependencies();
    if (tpaIntervalDependencies.config.enableTpaSystem) {
        tpaManager.clearExpiredRequests(tpaIntervalDependencies);
        const requestsInWarmup = tpaManager.getRequestsInWarmup();
        for (const request of requestsInWarmup) {
            if (Date.now() >= (request.warmupExpiryTimestamp || 0)) {
                tpaManager.executeTeleport(request.requestId, tpaIntervalDependencies);
            }
        }
    }
}, 20);
*/
const MAX_INIT_RETRIES = 7; // Max retries (0-6 attempts after initial). Total time ~2 minutes.
const INITIAL_RETRY_DELAY_TICKS = 20; // Start with a 1-second delay for the first retry

/**
 * Checks if all required Minecraft event APIs are available.
 * @param {object} dependencies - The standard dependencies object, primarily for playerUtils.debugLog.
 * @returns {boolean} True if all essential event objects are defined, false otherwise.
 */
function checkEventAPIsReady(dependencies) {
    let allReady = true;
    if (!mc.world) {
        console.error('[AntiCheat] CRITICAL: mc.world is undefined during API readiness check!');
        allReady = false;
    } else {
        if (!mc.world.beforeEvents) {
            console.error('[AntiCheat] CRITICAL: mc.world.beforeEvents is undefined during API readiness check!');
            allReady = false;
        } else {
            const requiredBeforeEvents = ['chatSend', 'playerLeave', 'entityHurt', 'playerBreakBlock', 'itemUse', 'itemUseOn', 'playerPlaceBlock'];
            for (const eventName of requiredBeforeEvents) {
                if (!mc.world.beforeEvents[eventName]) {
                    console.error(`[AntiCheat] CRITICAL: mc.world.beforeEvents.${eventName} is undefined during API readiness check!`);
                    allReady = false;
                }
            }
        }

        if (!mc.world.afterEvents) {
            console.error('[AntiCheat] CRITICAL: mc.world.afterEvents is undefined during API readiness check!');
            allReady = false;
        } else {
            const requiredAfterEvents = ['playerSpawn', 'entityHurt', 'playerBreakBlock', 'playerPlaceBlock', 'playerInventoryItemChange', 'playerDimensionChange', 'entityDie', 'entitySpawn', 'pistonActivate'];
            for (const eventName of requiredAfterEvents) {
                if (!mc.world.afterEvents[eventName]) {
                    console.error(`[AntiCheat] CRITICAL: mc.world.afterEvents.${eventName} is undefined during API readiness check!`);
                    allReady = false;
                }
            }
        }
    }

    if (allReady && dependencies && dependencies.playerUtils) {
        dependencies.playerUtils.debugLog('[AntiCheat] All checked Minecraft event objects appear to be available.', 'System', dependencies);
    }
    return allReady;
}

/**
 * Performs the actual initialization of event subscriptions and other modules.
 * This function is called by attemptInitializeSystem once APIs are deemed ready.
 */
function performInitializations() {
    const startupDependencies = getStandardDependencies(); // Get fresh dependencies now that we're sure mc object is somewhat stable
    playerUtils.debugLog('Anti-Cheat Script Loaded. Performing initializations...', 'System', startupDependencies);

    // Subscribe to events
    mc.world.beforeEvents.chatSend.subscribe(async (eventData) => {
        const dependencies = getStandardDependencies();
        if (eventData.message.startsWith(dependencies.config.prefix)) {
            const commandHandlingDependencies = {
                ...dependencies,
                commandDefinitionMap: commandManager.commandDefinitionMap,
                commandExecutionMap: commandManager.commandExecutionMap,
            };
            await commandManager.handleChatCommand(eventData, commandHandlingDependencies);
        } else {
            await eventHandlers.handleBeforeChatSend(eventData, dependencies);
        }
    });

    mc.world.afterEvents.playerSpawn.subscribe((eventData) => {
        eventHandlers.handlePlayerSpawn(eventData, getStandardDependencies());
    });

    mc.world.beforeEvents.playerLeave.subscribe((eventData) => {
        eventHandlers.handlePlayerLeave(eventData, getStandardDependencies());
    });

    mc.world.afterEvents.entityHurt.subscribe((eventData) => {
        const dependencies = getStandardDependencies();
        eventHandlers.handleEntityHurt(eventData, dependencies);
    });

    mc.world.beforeEvents.entityHurt.subscribe(eventData => {
        const dependencies = getStandardDependencies();
        if (!dependencies.config.enableTpaSystem || !dependencies.config.tpaTeleportWarmupSeconds || dependencies.config.tpaTeleportWarmupSeconds <= 0) {
            return;
        }
        const { hurtEntity, damageSource } = eventData;
        if (hurtEntity.typeId !== mc.MinecraftEntityTypes.player.id) return;
        const player = hurtEntity;
        const requestsInWarmup = tpaManager.getRequestsInWarmup();
        const playerActiveWarmupRequest = requestsInWarmup.find(
            req => (req.requesterName === player.nameTag && req.requestType === 'tpa') ||
                   (req.targetName === player.nameTag && req.requestType === 'tpahere')
        );
        if (playerActiveWarmupRequest && playerActiveWarmupRequest.status === 'pending_teleport_warmup') {
            const damageCause = damageSource?.cause || 'unknown';
            const reasonMsgPlayer = dependencies.getString('tpa.manager.warmupCancelledDamage.player', { damageCause });
            const reasonMsgLog = `Player ${player.nameTag} took damage (cause: ${damageCause}) during TPA warm-up for request ${playerActiveWarmupRequest.requestId}.`;
            tpaManager.cancelTeleport(playerActiveWarmupRequest.requestId, reasonMsgPlayer, reasonMsgLog, dependencies);
        }
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
        await eventHandlers.handleInventoryItemChange(
            eventData.player,
            eventData.newItemStack,
            eventData.oldItemStack,
            eventData.inventorySlot,
            getStandardDependencies()
        );
    });

    mc.world.afterEvents.playerDimensionChange.subscribe((eventData) => {
        eventHandlers.handlePlayerDimensionChangeAfterEvent(eventData, getStandardDependencies());
    });

    mc.world.afterEvents.entityDie.subscribe((eventData) => {
        const dependencies = getStandardDependencies();
        if (eventData.deadEntity.typeId === mc.MinecraftEntityTypes.player.id) {
            eventHandlers.handlePlayerDeath(eventData, dependencies);
        }
        if (dependencies.config.enableDeathEffects) {
            eventHandlers.handleEntityDieForDeathEffects(eventData, dependencies);
        }
    });

    mc.world.afterEvents.entitySpawn.subscribe(async (eventData) => {
        await eventHandlers.handleEntitySpawnEvent_AntiGrief(eventData, getStandardDependencies());
    });

    mc.world.afterEvents.pistonActivate.subscribe(async (eventData) => {
        await eventHandlers.handlePistonActivate_AntiGrief(eventData, getStandardDependencies());
    });

    // Initialize other modules
    commandManager.initializeCommands(startupDependencies);
    logManager.initializeLogCache(startupDependencies);
    reportManager.initializeReportCache(startupDependencies);
    rankManager.initializeRanks(startupDependencies);
    if (startupDependencies.config.enableWorldBorderSystem) {
        const knownDims = startupDependencies.config.worldBorderKnownDimensions || ['minecraft:overworld', 'minecraft:the_nether', 'minecraft:the_end'];
        for (const dimId of knownDims) {
             worldBorderManager.getBorderSettings(dimId, startupDependencies);
        }
        playerUtils.debugLog("[PerformInitializations] World border settings will be loaded on demand.", "System", startupDependencies);
    }

    playerUtils.debugLog('Anti-Cheat Core System Initialized. Event handlers and tick loop are active.', 'System', startupDependencies);
    mc.world.sendMessage('§a[AntiCheat] §2System Core Initialized. Version: ' + configModule.acVersion);

    // Start Tick Loops now that initializations are done
    playerUtils.debugLog('[PerformInitializations] Starting main tick loop and TPA tick loop...', 'System', startupDependencies);

    mc.system.runInterval(async () => {
        currentTick++;
        const tickDependencies = getStandardDependencies();

        if (tickDependencies.config.enableWorldBorderSystem) {
            try {
                worldBorderManager.processWorldBorderResizing(tickDependencies);
            } catch (e) {
                console.error(`[MainTick] Error processing world border resizing: ${e.stack || e.message}`);
                playerUtils.debugLog(`[MainTick] Error processing world border resizing: ${e.message}`, 'System', tickDependencies);
                logManager.addLog({ actionType: 'errorWorldBorderResizeTick', context: 'MainTickLoop.worldBorderResizing', details: `Error: ${e.message}`, error: e.stack || e.message }, tickDependencies);
            }
        }

        const allPlayers = mc.world.getAllPlayers();
        playerDataManager.cleanupActivePlayerData(allPlayers, tickDependencies);

        for (const player of allPlayers) {
            const pData = await playerDataManager.ensurePlayerDataInitialized(player, currentTick, tickDependencies);
            if (!pData) {
                playerUtils.debugLog(`Critical: pData not available for ${player.nameTag} in tick loop after ensure. Skipping checks for this player this tick.`, player.nameTag, tickDependencies);
                continue;
            }

            playerDataManager.updateTransientPlayerData(player, pData, tickDependencies);
            playerDataManager.clearExpiredItemUseStates(pData, tickDependencies);

            if (tickDependencies.config.enableFlyCheck && checks.checkFly) await checks.checkFly(player, pData, tickDependencies);
            if (tickDependencies.config.enableSpeedCheck && checks.checkSpeed) await checks.checkSpeed(player, pData, tickDependencies);
            if (tickDependencies.config.enableNofallCheck && checks.checkNoFall) await checks.checkNoFall(player, pData, tickDependencies);
            if (tickDependencies.config.enableNoSlowCheck && checks.checkNoSlow) await checks.checkNoSlow(player, pData, tickDependencies);
            if (tickDependencies.config.enableInvalidSprintCheck && checks.checkInvalidSprint) await checks.checkInvalidSprint(player, pData, tickDependencies);
            if (tickDependencies.config.enableNetherRoofCheck && checks.checkNetherRoof && (currentTick - (pData.lastCheckNetherRoofTick || 0) >= tickDependencies.config.netherRoofCheckIntervalTicks)) {
                 await checks.checkNetherRoof(player, pData, tickDependencies); pData.lastCheckNetherRoofTick = currentTick;
            }

            if (tickDependencies.config.enableCpsCheck && checks.checkCps) await checks.checkCps(player, pData, tickDependencies, null);
            if (tickDependencies.config.enableViewSnapCheck && checks.checkViewSnap) await checks.checkViewSnap(player, pData, tickDependencies, null);
            if (tickDependencies.config.enableMultiTargetCheck && checks.checkMultiTarget) await checks.checkMultiTarget(player, pData, tickDependencies, null);
            if (tickDependencies.config.enableStateConflictCheck && checks.checkStateConflict) await checks.checkStateConflict(player, pData, tickDependencies, null);

            if (tickDependencies.config.enableNukerCheck && checks.checkNuker) await checks.checkNuker(player, pData, tickDependencies);
            if (tickDependencies.config.enableAutoToolCheck && checks.checkAutoTool && (currentTick - (pData.lastCheckAutoToolTick || 0) >= tickDependencies.config.autoToolCheckIntervalTicks)) {
                await checks.checkAutoTool(player, pData, tickDependencies); pData.lastCheckAutoToolTick = currentTick;
            }
            if (tickDependencies.config.enableFlatRotationCheck && checks.checkFlatRotationBuilding && (currentTick - (pData.lastCheckFlatRotationBuildingTick || 0) >= tickDependencies.config.flatRotationCheckIntervalTicks)) {
                await checks.checkFlatRotationBuilding(player, pData, tickDependencies); pData.lastCheckFlatRotationBuildingTick = currentTick;
            }

            if (tickDependencies.config.enableNameSpoofCheck && checks.checkNameSpoof && (currentTick - (pData.lastCheckNameSpoofTick || 0) >= tickDependencies.config.nameSpoofCheckIntervalTicks)) {
                await checks.checkNameSpoof(player, pData, tickDependencies); pData.lastCheckNameSpoofTick = currentTick;
            }
            if (tickDependencies.config.enableAntiGmcCheck && checks.checkAntiGmc && (currentTick - (pData.lastCheckAntiGmcTick || 0) >= tickDependencies.config.antiGmcCheckIntervalTicks)) {
                await checks.checkAntiGmc(player, pData, tickDependencies); pData.lastCheckAntiGmcTick = currentTick;
            }

            if (tickDependencies.config.enableInvalidRenderDistanceCheck && checks.checkInvalidRenderDistance && (currentTick - (pData.lastRenderDistanceCheckTick || 0) >= tickDependencies.config.invalidRenderDistanceCheckIntervalTicks)) {
                await checks.checkInvalidRenderDistance(player, pData, tickDependencies);
                pData.lastRenderDistanceCheckTick = currentTick;
            }

            if (!player.isOnGround) {
                if ((pData.velocity?.y ?? 0) < -0.078 && pData.previousPosition && pData.lastPosition) {
                    const deltaY = pData.previousPosition.y - pData.lastPosition.y;
                    if (deltaY > 0 && deltaY < 100) {
                        pData.fallDistance = (pData.fallDistance || 0) + deltaY;
                    }
                }
            } else {
                if (!pData.isTakingFallDamage) {
                    pData.fallDistance = 0;
                }
                pData.isTakingFallDamage = false;
                pData.consecutiveOffGroundTicks = 0;
            }

            if (tickDependencies.config.enableWorldBorderSystem) {
                try {
                    worldBorderManager.enforceWorldBorderForPlayer(player, pData, tickDependencies);
                } catch (e) {
                    console.error(`[MainTick] Error enforcing world border for player ${player.nameTag}: ${e.stack || e.message}`);
                    playerUtils.debugLog(`[MainTick] Error enforcing world border for ${player.nameTag}: ${e.message}`, player.nameTag, tickDependencies);
                    logManager.addLog({ actionType: 'errorWorldBorderEnforceTick', context: 'MainTickLoop.worldBorderEnforcement', targetName: player.nameTag, details: `Error: ${e.message}`, error: e.stack || e.message }, tickDependencies);
                }
            }
        }

        if (currentTick % 600 === 0) {
            playerUtils.debugLog(`Performing periodic data persistence. Current Tick: ${currentTick}`, 'System', tickDependencies);
            for (const player of allPlayers) {
                const pData = playerDataManager.getPlayerData(player.id);
                if (pData?.isDirtyForSave) {
                    try {
                        await playerDataManager.saveDirtyPlayerData(player, tickDependencies);
                        if (pData.isWatched) {
                            playerUtils.debugLog(`Periodic save executed for watched player ${player.nameTag}.`, player.nameTag, tickDependencies);
                        }
                    } catch (error) {
                        console.error(`Error during periodic save for ${player.nameTag}: ${error.message}`);
                        logManager.addLog({ actionType: 'error', context: 'PeriodicSaveFail', details: `Player: ${player.nameTag}, Error: ${error.message}` }, tickDependencies);
                    }
                }
            }
            logManager.persistLogCacheToDisk(tickDependencies);
            reportManager.persistReportsToDisk(tickDependencies);
            if (tickDependencies.config.enableWorldBorderSystem) {
                playerUtils.debugLog("[MainTick] World border settings are saved on modification. No global periodic save implemented currently.", "System", tickDependencies);
            }
        }
    }, 1);

    mc.system.runInterval(() => {
        const tpaIntervalDependencies = getStandardDependencies();
        if (tpaIntervalDependencies.config.enableTpaSystem) {
            tpaManager.clearExpiredRequests(tpaIntervalDependencies);
            const requestsInWarmup = tpaManager.getRequestsInWarmup();
            for (const request of requestsInWarmup) {
                if (Date.now() >= (request.warmupExpiryTimestamp || 0)) {
                    tpaManager.executeTeleport(request.requestId, tpaIntervalDependencies);
                }
            }
        }
    }, 20);
}


/**
 * Attempts to initialize the system. If critical APIs are not ready, it schedules a retry.
 * @param {number} retryCount - Current number of retry attempts.
 */
function attemptInitializeSystem(retryCount = 0) {
    const tempStartupDepsForLog = getStandardDependencies(); // For logging, might be partial if mc is not fully up

    if (checkEventAPIsReady(tempStartupDepsForLog)) {
        performInitializations();
    } else {
        const delay = INITIAL_RETRY_DELAY_TICKS * Math.pow(2, retryCount); // Exponential backoff
        console.warn(`[AntiCheat] API not fully ready. Retrying initialization in ${delay} ticks (Attempt ${retryCount + 1}/${MAX_INIT_RETRIES})`);

        if (retryCount < MAX_INIT_RETRIES) {
            mc.system.runTimeout(() => attemptInitializeSystem(retryCount + 1), delay);
        } else {
            console.error('[AntiCheat] CRITICAL: API did not become ready after multiple retries. System may be unstable or non-functional.');
            if (tempStartupDepsForLog && tempStartupDepsForLog.playerUtils) {
                 tempStartupDepsForLog.playerUtils.notifyAdmins("§c[AntiCheat] CRITICAL: Failed to initialize event system after multiple retries. Some AntiCheat features will be disabled. Please check server logs.", tempStartupDepsForLog, null, null);
            }
            // Optionally, could try to run a very minimal version of performInitializations
            // that only sets up things not dependent on events, but for now, we just log failure.
        }
    }
}

// Initial call to start the initialization process
mc.system.runTimeout(() => {
    attemptInitializeSystem();
}, INITIAL_RETRY_DELAY_TICKS); // Start first attempt after an initial delay
