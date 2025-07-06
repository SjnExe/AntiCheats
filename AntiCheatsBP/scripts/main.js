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
const mainModuleName = 'Main'; // For consistent log prefixes

/**
 * Assembles and returns the standard dependencies object used throughout the system.
 * This object provides access to configuration, utilities, managers, and Minecraft APIs.
 */
function getStandardDependencies() {
    try {
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
    } catch (error) {
        console.error(`[${mainModuleName}.getStandardDependenciesCRITICAL] Error: ${error.stack || error}`);
        throw error;
    }
}

const maxInitRetries = 3;
const initialRetryDelayTicks = 20;

/**
 * Checks if all required Minecraft event APIs are available.
 * @param {object} dependencies - The standard dependencies object, primarily for playerUtils.debugLog.
 * @returns {boolean} True if all essential event objects are defined, false otherwise.
 */
function checkEventAPIsReady(dependencies) {
    let overallAllReady = true;
    const errorLogger = console.error;
    const useDebugLog = dependencies?.config?.enableDebugLogging && dependencies?.playerUtils?.debugLog;

    const logger = (msg) => {
        if (useDebugLog && dependencies?.playerUtils?.debugLog) {
            dependencies.playerUtils.debugLog(msg, 'System', dependencies);
        }
    };

    if (useDebugLog) logger(`[${mainModuleName}.checkEventAPIsReady] Starting API readiness check...`);

    if (!mc.world) {
        errorLogger(`[${mainModuleName}.checkEventAPIsReady] mc.world: UNDEFINED - CRITICAL`);
        overallAllReady = false;
        return overallAllReady;
    } else {
        if (useDebugLog) logger(`[${mainModuleName}.checkEventAPIsReady] mc.world: DEFINED`);
    }

    const requiredBeforeEvents = ['chatSend', 'playerLeave', 'playerBreakBlock', 'itemUse', 'playerPlaceBlock'];
    if (!mc.world.beforeEvents) {
        errorLogger(`[${mainModuleName}.checkEventAPIsReady] mc.world.beforeEvents: UNDEFINED - CRITICAL`);
        overallAllReady = false;
        for (const eventName of requiredBeforeEvents) {
            errorLogger(`[${mainModuleName}.checkEventAPIsReady] mc.world.beforeEvents.${eventName}: UNDEFINED (parent 'beforeEvents' is undefined)`);
        }
    } else {
        if (useDebugLog) logger(`[${mainModuleName}.checkEventAPIsReady] mc.world.beforeEvents: DEFINED`);
        for (const eventName of requiredBeforeEvents) {
            if (mc.world.beforeEvents[eventName]) {
                if (useDebugLog) logger(`[${mainModuleName}.checkEventAPIsReady] mc.world.beforeEvents.${eventName}: DEFINED (type: ${typeof mc.world.beforeEvents[eventName]})`);
            } else {
                errorLogger(`[${mainModuleName}.checkEventAPIsReady] mc.world.beforeEvents.${eventName}: UNDEFINED - CRITICAL`);
                overallAllReady = false;
            }
        }
    }

    const requiredAfterEvents = ['playerSpawn', 'entityHurt', 'playerBreakBlock', 'playerPlaceBlock', 'playerInventoryItemChange', 'playerDimensionChange', 'entityDie', 'entitySpawn', 'pistonActivate'];
    if (!mc.world.afterEvents) {
        errorLogger(`[${mainModuleName}.checkEventAPIsReady] mc.world.afterEvents: UNDEFINED - CRITICAL`);
        overallAllReady = false;
        for (const eventName of requiredAfterEvents) {
            errorLogger(`[${mainModuleName}.checkEventAPIsReady] mc.world.afterEvents.${eventName}: UNDEFINED (parent 'afterEvents' is undefined)`);
        }
    } else {
        if (useDebugLog) logger(`[${mainModuleName}.checkEventAPIsReady] mc.world.afterEvents: DEFINED`);
        for (const eventName of requiredAfterEvents) {
            if (mc.world.afterEvents[eventName]) {
                if (useDebugLog) logger(`[${mainModuleName}.checkEventAPIsReady] mc.world.afterEvents.${eventName}: DEFINED (type: ${typeof mc.world.afterEvents[eventName]})`);
            } else {
                errorLogger(`[${mainModuleName}.checkEventAPIsReady] mc.world.afterEvents.${eventName}: UNDEFINED - CRITICAL`);
                overallAllReady = false;
            }
        }
    }

    if (overallAllReady) {
        if (useDebugLog) logger(`[${mainModuleName}.checkEventAPIsReady] All checked Minecraft event APIs appear to be available.`);
    } else {
        errorLogger(`[${mainModuleName}.checkEventAPIsReady] Not all required Minecraft event APIs are available. See details above.`);
    }
    return overallAllReady;
}

/**
 * Performs the actual initialization of event subscriptions and other modules.
 * This function is called by attemptInitializeSystem once APIs are deemed ready.
 */
function performInitializations() {
    const startupDependencies = getStandardDependencies();
    startupDependencies.playerUtils.debugLog('Anti-Cheat Script Loaded. Performing initializations...', 'System', startupDependencies);
    startupDependencies.playerUtils.debugLog(`[${mainModuleName}.performInitializations] Attempting to subscribe to events...`, 'System', startupDependencies);

    if (mc.world?.beforeEvents?.chatSend) {
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
    } else {
        console.warn(`[${mainModuleName}.performInitializations] Skipping subscription for chatSend: mc.world.beforeEvents.chatSend is undefined.`);
    }

    if (mc.world?.afterEvents?.playerSpawn) {
        mc.world.afterEvents.playerSpawn.subscribe((eventData) => {
            eventHandlers.handlePlayerSpawn(eventData, getStandardDependencies());
        });
    } else {
        console.warn(`[${mainModuleName}.performInitializations] Skipping subscription for playerSpawn: mc.world.afterEvents.playerSpawn is undefined.`);
    }

    if (mc.world?.beforeEvents?.playerLeave) {
        mc.world.beforeEvents.playerLeave.subscribe((eventData) => {
            eventHandlers.handlePlayerLeave(eventData, getStandardDependencies());
        });
    } else {
        console.warn(`[${mainModuleName}.performInitializations] Skipping subscription for playerLeave: mc.world.beforeEvents.playerLeave is undefined.`);
    }

    if (mc.world?.afterEvents?.entityHurt) {
        mc.world.afterEvents.entityHurt.subscribe((eventData) => {
            const dependencies = getStandardDependencies();
            eventHandlers.handleEntityHurt(eventData, dependencies);
        });
    } else {
        console.warn(`[${mainModuleName}.performInitializations] Skipping subscription for afterEvents.entityHurt: object undefined.`);
    }

    console.warn(`[${mainModuleName}.performInitializations] Feature disabled: TPA warmup damage cancellation (world.beforeEvents.entityHurt unavailable).`);

    if (mc.world?.beforeEvents?.playerBreakBlock) {
        mc.world.beforeEvents.playerBreakBlock.subscribe(async (eventData) => {
            await eventHandlers.handlePlayerBreakBlockBeforeEvent(eventData, getStandardDependencies());
        });
    } else {
        console.warn(`[${mainModuleName}.performInitializations] Skipping subscription for playerBreakBlock (before): object undefined.`);
    }

    if (mc.world?.afterEvents?.playerBreakBlock) {
        mc.world.afterEvents.playerBreakBlock.subscribe(async (eventData) => {
            await eventHandlers.handlePlayerBreakBlockAfterEvent(eventData, getStandardDependencies());
        });
    } else {
        console.warn(`[${mainModuleName}.performInitializations] Skipping subscription for playerBreakBlock (after): object undefined.`);
    }

    if (mc.world?.beforeEvents?.itemUse) {
        mc.world.beforeEvents.itemUse.subscribe(async (eventData) => {
            await eventHandlers.handleItemUse(eventData, getStandardDependencies());
        });
    } else {
        console.warn(`[${mainModuleName}.performInitializations] Skipping subscription for itemUse (before): object undefined.`);
    }

    console.warn(`[${mainModuleName}.performInitializations] Feature disabled: world.beforeEvents.itemUseOn event handler (event unavailable).`);

    if (mc.world?.beforeEvents?.playerPlaceBlock) {
        mc.world.beforeEvents.playerPlaceBlock.subscribe(async (eventData) => {
            await eventHandlers.handlePlayerPlaceBlockBefore(eventData, getStandardDependencies());
        });
    } else {
        console.warn(`[${mainModuleName}.performInitializations] Skipping subscription for playerPlaceBlock (before): object undefined.`);
    }

    if (mc.world?.afterEvents?.playerPlaceBlock) {
        mc.world.afterEvents.playerPlaceBlock.subscribe(async (eventData) => {
            await eventHandlers.handlePlayerPlaceBlockAfterEvent(eventData, getStandardDependencies());
        });
    } else {
        console.warn(`[${mainModuleName}.performInitializations] Skipping subscription for playerPlaceBlock (after): object undefined.`);
    }

    if (mc.world?.afterEvents?.playerInventoryItemChange) {
        mc.world.afterEvents.playerInventoryItemChange.subscribe(async (eventData) => {
        await eventHandlers.handleInventoryItemChange(
            eventData.player,
            eventData.newItemStack,
            eventData.oldItemStack,
            eventData.inventorySlot,
            getStandardDependencies()
        );
    });
    } else {
        console.warn(`[${mainModuleName}.performInitializations] Skipping subscription for playerInventoryItemChange (after): object undefined.`);
    }

    if (mc.world?.afterEvents?.playerDimensionChange) {
        mc.world.afterEvents.playerDimensionChange.subscribe((eventData) => {
            eventHandlers.handlePlayerDimensionChangeAfterEvent(eventData, getStandardDependencies());
        });
    } else {
        console.warn(`[${mainModuleName}.performInitializations] Skipping subscription for playerDimensionChange (after): object undefined.`);
    }

    if (mc.world?.afterEvents?.entityDie) {
        mc.world.afterEvents.entityDie.subscribe((eventData) => {
            const dependencies = getStandardDependencies();
            if (eventData.deadEntity.typeId === mc.MinecraftEntityTypes.player.id) {
                eventHandlers.handlePlayerDeath(eventData, dependencies);
            }
            if (dependencies.config.enableDeathEffects) {
                eventHandlers.handleEntityDieForDeathEffects(eventData, dependencies);
            }
        });
    } else {
        console.warn(`[${mainModuleName}.performInitializations] Skipping subscription for entityDie (after): object undefined.`);
    }

    if (mc.world?.afterEvents?.entitySpawn) {
        mc.world.afterEvents.entitySpawn.subscribe(async (eventData) => {
            await eventHandlers.handleEntitySpawnEvent_AntiGrief(eventData, getStandardDependencies());
        });
    } else {
        console.warn(`[${mainModuleName}.performInitializations] Skipping subscription for entitySpawn (after): object undefined.`);
    }

    if (mc.world?.afterEvents?.pistonActivate) {
        mc.world.afterEvents.pistonActivate.subscribe(async (eventData) => {
            await eventHandlers.handlePistonActivate_AntiGrief(eventData, getStandardDependencies());
        });
    } else {
        console.warn(`[${mainModuleName}.performInitializations] Skipping subscription for pistonActivate (after): object undefined.`);
    }

    startupDependencies.playerUtils.debugLog(`[${mainModuleName}.performInitializations] Initializing other modules (commands, logs, ranks, etc.)...`, 'System', startupDependencies);
    commandManager.initializeCommands(startupDependencies);
    logManager.initializeLogCache(startupDependencies);
    reportManager.initializeReportCache(startupDependencies);
    rankManager.initializeRanks(startupDependencies);
    if (startupDependencies.config.enableWorldBorderSystem) {
        const knownDims = startupDependencies.config.worldBorderKnownDimensions || ['minecraft:overworld', 'minecraft:the_nether', 'minecraft:the_end'];
        for (const dimId of knownDims) {
             worldBorderManager.getBorderSettings(dimId, startupDependencies);
        }
        startupDependencies.playerUtils.debugLog(`[${mainModuleName}.performInitializations] World border settings will be loaded on demand or by initial getBorderSettings call.`, "System", startupDependencies);
    }

    startupDependencies.playerUtils.debugLog(`[${mainModuleName}.performInitializations] Anti-Cheat Core System Initialized. Event handlers and tick loop are active.`, 'System', startupDependencies);
    mc.world.sendMessage(startupDependencies.getString('system.core.initialized', { version: configModule.acVersion }));

    startupDependencies.playerUtils.debugLog(`[${mainModuleName}.performInitializations] Starting main tick loop and TPA tick loop...`, 'System', startupDependencies);

    mc.system.runInterval(async () => {
        currentTick++;
        const tickDependencies = getStandardDependencies();

        if (tickDependencies.config.enableWorldBorderSystem) {
            try {
                worldBorderManager.processWorldBorderResizing(tickDependencies);
            } catch (e) {
                console.error(`[${mainModuleName}.TickLoop] Error processing world border resizing: ${e.stack || e.message}`);
                tickDependencies.playerUtils.debugLog(`[${mainModuleName}.TickLoop] Error processing world border resizing: ${e.message}`, 'System', tickDependencies);
                logManager.addLog({
                    actionType: 'errorMainWorldBorderResize',
                    context: 'Main.TickLoop.worldBorderResizing',
                    details: {
                        errorMessage: e.message,
                        stack: e.stack
                    }
                }, tickDependencies);
            }
        }

        let allPlayers = [];
        try {
            if (mc.world && typeof mc.world.getAllPlayers === 'function') {
                allPlayers = mc.world.getAllPlayers();
            } else {
                 if (currentTick === 1 || currentTick % 600 === 0) {
                    console.error(`[${mainModuleName}.TickLoop] mc.world or mc.world.getAllPlayers is not available!`);
                 }
            }
        } catch (e) {
            console.error(`[${mainModuleName}.TickLoop] Error calling mc.world.getAllPlayers(): ${e}`);
        }

        playerDataManager.cleanupActivePlayerData(allPlayers, tickDependencies);

        for (const player of allPlayers) {
            if (!(player instanceof mc.Player) || !player.isValid()) {
                if (tickDependencies?.config?.enableDebugLogging) {
                    let playerIdInfo = 'unknown player object';
                    try {
                        playerIdInfo = player?.id || player?.nameTag || JSON.stringify(player);
                    } catch (e) { /* ignore stringify errors for potentially odd objects */ }
                    console.warn(`[${mainModuleName}.TickLoop] Skipping invalid player object in loop: ${playerIdInfo}`);
                }
                continue;
            }

            let pData;
            try {
                pData = await playerDataManager.ensurePlayerDataInitialized(player, currentTick, tickDependencies);
            } catch (e) {
                console.error(`[${mainModuleName}.TickLoop] Error in ensurePlayerDataInitialized for ${player?.nameTag}: ${e}`);
                if (tickDependencies.playerUtils && typeof tickDependencies.playerUtils.debugLog === 'function') {
                    tickDependencies.playerUtils.debugLog(`[${mainModuleName}.TickLoop] Error in ensurePlayerDataInitialized for ${player?.nameTag}: ${e}`, player?.nameTag, tickDependencies);
                }
                continue;
            }

            if (!pData) {
                tickDependencies.playerUtils.debugLog(`Critical: pData not available for ${player.nameTag} in tick loop after ensure. Skipping checks for this player this tick.`, player.nameTag, tickDependencies);
                continue;
            }

            playerDataManager.updateTransientPlayerData(player, pData, tickDependencies);
            playerDataManager.clearExpiredItemUseStates(pData, tickDependencies);

            try {
                if (tickDependencies.config.enableFlyCheck && checks.checkFly) {
                    await checks.checkFly(player, pData, tickDependencies);
                }
                if (tickDependencies.config.enableSpeedCheck && checks.checkSpeed) {
                    await checks.checkSpeed(player, pData, tickDependencies);
                }
                if (tickDependencies.config.enableNofallCheck && checks.checkNoFall) {
                    await checks.checkNoFall(player, pData, tickDependencies);
                }
                if (tickDependencies.config.enableNoSlowCheck && checks.checkNoSlow) {
                    await checks.checkNoSlow(player, pData, tickDependencies, null);
                }
                if (tickDependencies.config.enableInvalidSprintCheck && checks.checkInvalidSprint) {
                    await checks.checkInvalidSprint(player, pData, tickDependencies);
                }
                if (tickDependencies.config.enableNetherRoofCheck && checks.checkNetherRoof &&
                    (currentTick - (pData.lastCheckNetherRoofTick || 0) >= tickDependencies.config.netherRoofCheckIntervalTicks)) {
                    await checks.checkNetherRoof(player, pData, tickDependencies);
                    pData.lastCheckNetherRoofTick = currentTick;
                }
                if (tickDependencies.config.enableAntiGmcCheck && checks.checkAntiGmc &&
                    (currentTick - (pData.lastCheckAntiGmcTick || 0) >= tickDependencies.config.antiGmcCheckIntervalTicks)) {
                    await checks.checkAntiGmc(player, pData, tickDependencies);
                    pData.lastCheckAntiGmcTick = currentTick;
                }
                if (tickDependencies.config.enableNameSpoofCheck && checks.checkNameSpoof &&
                    (currentTick - (pData.lastCheckNameSpoofTick || 0) >= tickDependencies.config.nameSpoofCheckIntervalTicks)) {
                    await checks.checkNameSpoof(player, pData, tickDependencies);
                    pData.lastCheckNameSpoofTick = currentTick;
                }
                if (tickDependencies.config.enableAutoToolCheck && checks.checkAutoTool &&
                    (currentTick - (pData.lastCheckAutoToolTick || 0) >= tickDependencies.config.autoToolCheckIntervalTicks)) {
                    await checks.checkAutoTool(player, pData, tickDependencies, null);
                    pData.lastCheckAutoToolTick = currentTick;
                }
                if (tickDependencies.config.enableInvalidRenderDistanceCheck && checks.checkInvalidRenderDistance &&
                    (currentTick - (pData.lastRenderDistanceCheckTick || 0) >= tickDependencies.config.invalidRenderDistanceCheckIntervalTicks)) {
                    await checks.checkInvalidRenderDistance(player, pData, tickDependencies);
                    pData.lastRenderDistanceCheckTick = currentTick;
                }
            } catch (checkError) {
                console.error(`[${mainModuleName}.TickLoop] Error during player-specific checks for ${player?.nameTag}: ${checkError.stack || checkError}`);
                tickDependencies.playerUtils.debugLog(`[${mainModuleName}.TickLoop] Error during player-specific checks for ${player?.nameTag}: ${checkError.message}`, player?.nameTag, tickDependencies);
                logManager.addLog({
                    actionType: 'errorMainPlayerTickChecks',
                    context: 'Main.TickLoop.playerChecks',
                    targetName: player?.nameTag || 'UnknownPlayer',
                    details: {
                        errorMessage: checkError.message,
                        stack: checkError.stack
                    }
                }, tickDependencies);
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
                    console.error(`[${mainModuleName}.TickLoop] Error enforcing world border for player ${player.nameTag}: ${e.stack || e.message}`);
                    tickDependencies.playerUtils.debugLog(`[${mainModuleName}.TickLoop] Error enforcing world border for ${player.nameTag}: ${e.message}`, player.nameTag, tickDependencies);
                    logManager.addLog({
                        actionType: 'errorMainWorldBorderEnforce',
                        context: 'Main.TickLoop.worldBorderEnforcement',
                        targetName: player.nameTag,
                        details: {
                            errorMessage: e.message,
                            stack: e.stack
                        }
                    }, tickDependencies);
                }
            }
        }

        if (currentTick % 600 === 0) {
            tickDependencies.playerUtils.debugLog(`Performing periodic data persistence. Current Tick: ${currentTick}`, 'System', tickDependencies);
            for (const player of allPlayers) {
                const pData = playerDataManager.getPlayerData(player.id);
                if (pData?.isDirtyForSave) {
                    try {
                        await playerDataManager.saveDirtyPlayerData(player, tickDependencies);
                        if (pData.isWatched) {
                            tickDependencies.playerUtils.debugLog(`Periodic save executed for watched player ${player.nameTag}.`, player.nameTag, tickDependencies);
                        }
                    } catch (error) {
                        console.error(`Error during periodic save for ${player.nameTag}: ${error.message}`);
                        logManager.addLog({
                            actionType: 'errorMainPeriodicSave',
                            context: 'Main.TickLoop.periodicDataSave',
                            details: {
                                playerName: player.nameTag,
                                errorMessage: error.message,
                                stack: error.stack
                            }
                        }, tickDependencies);
                    }
                }
            }
            logManager.persistLogCacheToDisk(tickDependencies);
            reportManager.persistReportsToDisk(tickDependencies);
            if (tickDependencies.config.enableWorldBorderSystem) {
                tickDependencies.playerUtils.debugLog(`[${mainModuleName}.TickLoop] World border settings are saved on modification. No global periodic save implemented currently.`, "System", tickDependencies);
            }
        }
    }, 1);

    mc.system.runInterval(() => {
        const tpaIntervalDependencies = getStandardDependencies();
        if (tpaIntervalDependencies.config.enableTpaSystem) {
            tpaManager.clearExpiredRequests(tpaIntervalDependencies);
            const requestsInWarmup = tpaManager.getRequestsInWarmup();
            for (const request of requestsInWarmup) {
                if (tpaIntervalDependencies.config.tpaCancelOnMoveDuringWarmup) {
                    tpaManager.checkPlayerMovementDuringWarmup(request, tpaIntervalDependencies);
                }
                if (request.status === 'pendingTeleportWarmup' && Date.now() >= (request.warmupExpiryTimestamp || 0)) {
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
    const tempStartupDepsForLog = getStandardDependencies();

    if (checkEventAPIsReady(tempStartupDepsForLog)) {
        performInitializations();
    } else {
        const delay = initialRetryDelayTicks * Math.pow(2, retryCount);
        console.warn(`[${mainModuleName}.attemptInitializeSystem] API not fully ready. Retrying initialization in ${delay} ticks (Attempt ${retryCount + 1}/${maxInitRetries})`);

        if (retryCount < maxInitRetries) {
            mc.system.runTimeout(() => attemptInitializeSystem(retryCount + 1), delay);
        } else {
            if (checkEventAPIsReady(tempStartupDepsForLog)) {
                console.warn(`[${mainModuleName}.attemptInitializeSystem] MAX RETRIES REACHED, but APIs appear to be ready now. Proceeding with initialization.`);
                performInitializations();
            } else {
                console.error(`[${mainModuleName}.attemptInitializeSystemCRITICAL] MAX RETRIES REACHED and critical APIs are STILL MISSING. AntiCheat system will NOT initialize.`);
                console.error(`[${mainModuleName}.attemptInitializeSystemCRITICAL] Please check Minecraft version, experimental toggles, and for conflicting addons or script engine errors.`);
            }
        }
    }
}

// Initial call to start the initialization process
mc.system.runTimeout(() => {
    attemptInitializeSystem();
}, initialRetryDelayTicks);
