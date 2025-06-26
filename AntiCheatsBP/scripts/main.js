/**
 * @file Main entry point for the AntiCheat system.
 * Initializes all core modules, subscribes to Minecraft server events,
 * and runs the main system tick loop for processing checks, player data updates,
 * and other periodic tasks.
 */

import * as mc from '@minecraft/server';
import * as mcui from '@minecraft/server-ui';

import * as configModule from './config.js';
import { automodConfig } from './core/automodConfig.js';
import { checkActionProfiles } from './core/actionProfiles.js';
import * as playerUtils from './utils/playerUtils.js';
import * as playerDataManager from './core/playerDataManager.js';
import * as commandManager from './core/commandManager.js';
import * as uiManager from './core/uiManager.js';
import * as eventHandlers from './core/eventHandlers.js';
import * as logManager from './core/logManager.js';
import * as reportManager from './core/reportManager.js';
import * as tpaManager from './core/tpaManager.js';
import * as actionManager from './core/actionManager.js';
import * as rankManager from './core/rankManager.js';
import * as checks from './checks/index.js';
import * as worldBorderManager from './utils/worldBorderManager.js';
import * as chatProcessor from './core/chatProcessor.js';

let currentTick = 0;

/**
 * @returns {import('./types.js').Dependencies} A standard set of dependencies for event handlers and tick loops.
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
            getPlayerRankId: rankManager.getPlayerRankId,
            getPlayerPermissionLevel: rankManager.getPlayerPermissionLevel,
            updatePlayerNametag: rankManager.updatePlayerNametag,
            getPlayerRankFormattedChatElements: rankManager.getPlayerRankFormattedChatElements,
            getRankById: rankManager.getRankById,
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

// Event Subscriptions
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

// System Intervals
mc.system.runInterval(async () => {
    currentTick++;
    const tickDependencies = getStandardDependencies();

    // ReportManager cache should be initialized once at startup.

    if (tickDependencies.config.enableWorldBorderSystem) {
        try {
            worldBorderManager.processWorldBorderResizing(tickDependencies);
        } catch (e) {
            const error = e;
            console.error(`[MainTick] Error processing world border resizing: ${error.stack || error.message}`);
            playerUtils.debugLog(`[MainTick] Error processing world border resizing: ${error.message}`, 'System', tickDependencies);
            logManager.addLog({ actionType: 'errorWorldBorderResizeTick', context: 'MainTickLoop.worldBorderResizing', details: `Error: ${error.message}`, error: error.stack || error.message }, tickDependencies);
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

        // Movement Checks
        if (tickDependencies.config.enableFlyCheck && checks.checkFly) await checks.checkFly(player, pData, tickDependencies);
        if (tickDependencies.config.enableSpeedCheck && checks.checkSpeed) await checks.checkSpeed(player, pData, tickDependencies);
        if (tickDependencies.config.enableNofallCheck && checks.checkNoFall) await checks.checkNoFall(player, pData, tickDependencies);
        if (tickDependencies.config.enableNoSlowCheck && checks.checkNoSlow) await checks.checkNoSlow(player, pData, tickDependencies);
        if (tickDependencies.config.enableInvalidSprintCheck && checks.checkInvalidSprint) await checks.checkInvalidSprint(player, pData, tickDependencies);
        if (tickDependencies.config.enableNetherRoofCheck && checks.checkNetherRoof && (currentTick - (pData.lastCheckNetherRoofTick || 0) >= tickDependencies.config.netherRoofCheckIntervalTicks)) {
             await checks.checkNetherRoof(player, pData, tickDependencies); pData.lastCheckNetherRoofTick = currentTick;
        }

        // Combat Checks
        if (tickDependencies.config.enableCpsCheck && checks.checkCps) await checks.checkCps(player, pData, tickDependencies, null);
        if (tickDependencies.config.enableViewSnapCheck && checks.checkViewSnap) await checks.checkViewSnap(player, pData, tickDependencies, null);
        if (tickDependencies.config.enableReachCheck && checks.checkReach) { /* checkReach typically runs on entityHurt */ }
        if (tickDependencies.config.enableMultiTargetCheck && checks.checkMultiTarget) await checks.checkMultiTarget(player, pData, tickDependencies, null);
        if (tickDependencies.config.enableStateConflictCheck && checks.checkStateConflict) await checks.checkStateConflict(player, pData, tickDependencies, null);

        // World Interaction / Building Checks
        if (tickDependencies.config.enableNukerCheck && checks.checkNuker) await checks.checkNuker(player, pData, tickDependencies);
        if (tickDependencies.config.enableAutoToolCheck && checks.checkAutoTool && (currentTick - (pData.lastCheckAutoToolTick || 0) >= tickDependencies.config.autoToolCheckIntervalTicks)) {
            await checks.checkAutoTool(player, pData, tickDependencies); pData.lastCheckAutoToolTick = currentTick;
        }
        if (tickDependencies.config.enableInstaBreakSpeedCheck && checks.checkInstaBreak) { /* InstaBreak typically runs on blockBreak */ }
        // Removed tower check from tick, it's in PlayerPlaceBlockAfterEvent
        // if (tickDependencies.config.enableTowerCheck && checks.checkTower) await checks.checkTower(player, pData, tickDependencies);
        if (tickDependencies.config.enableFlatRotationCheck && checks.checkFlatRotationBuilding && (currentTick - (pData.lastCheckFlatRotationBuildingTick || 0) >= tickDependencies.config.flatRotationCheckIntervalTicks)) {
            await checks.checkFlatRotationBuilding(player, pData, tickDependencies); pData.lastCheckFlatRotationBuildingTick = currentTick;
        }
        // Removed downward scaffold from tick, it's in PlayerPlaceBlockAfterEvent
        // if (tickDependencies.config.enableDownwardScaffoldCheck && checks.checkDownwardScaffold) await checks.checkDownwardScaffold(player, pData, tickDependencies);
        if (tickDependencies.config.enableAirPlaceCheck && checks.checkAirPlace) { /* AirPlace typically runs on blockPlace */ }
        // Removed fast place from tick, it's in PlayerPlaceBlockAfterEvent
        // if (tickDependencies.config.enableFastPlaceCheck && checks.checkFastPlace) await checks.checkFastPlace(player, pData, tickDependencies);


        // Player State / Info / Behavior Checks
        if (tickDependencies.config.enableNameSpoofCheck && checks.checkNameSpoof && (currentTick - (pData.lastCheckNameSpoofTick || 0) >= tickDependencies.config.nameSpoofCheckIntervalTicks)) {
            await checks.checkNameSpoof(player, pData, tickDependencies); pData.lastCheckNameSpoofTick = currentTick;
        }
        if (tickDependencies.config.enableAntiGmcCheck && checks.checkAntiGmc && (currentTick - (pData.lastCheckAntiGmcTick || 0) >= tickDependencies.config.antiGmcCheckIntervalTicks)) {
            await checks.checkAntiGmc(player, pData, tickDependencies); pData.lastCheckAntiGmcTick = currentTick;
        }
        if (tickDependencies.config.enableSelfHurtCheck && checks.checkSelfHurt) { /* SelfHurt typically runs on entityHurt */ }
        // Removed illegal item check from tick, it's event-based
        // if (tickDependencies.config.enableIllegalItemCheck && checks.checkIllegalItems) await checks.checkIllegalItems(player, pData, tickDependencies);
        // Removed inventory mod check from tick, it's event-based
        // if (tickDependencies.config.enableInventoryModCheck && checks.checkInventoryModifications) await checks.checkInventoryModifications(player, pData, tickDependencies);


        // Client Behavior Checks
        if (tickDependencies.config.enableInvalidRenderDistanceCheck && checks.checkInvalidRenderDistance && (currentTick - (pData.lastRenderDistanceCheckTick || 0) >= tickDependencies.config.invalidRenderDistanceCheckIntervalTicks)) {
            await checks.checkInvalidRenderDistance(player, pData, tickDependencies);
            pData.lastRenderDistanceCheckTick = currentTick;
        }

        // Item Use Checks
        if (tickDependencies.config.enableFastUseCheck && checks.checkFastUse) { /* FastUse typically runs on itemUse event */ }

        // Fall distance accumulation
        if (!player.isOnGround) {
            if ((pData.velocity?.y ?? 0) < -0.078 && pData.previousPosition && pData.lastPosition) {
                const deltaY = pData.previousPosition.y - pData.lastPosition.y;
                if (deltaY > 0 && deltaY < 100) { // Ensure deltaY is positive and reasonable
                    pData.fallDistance = (pData.fallDistance || 0) + deltaY;
                }
            }
        } else {
            if (!pData.isTakingFallDamage) { // Only reset if not actively taking fall damage this tick
                pData.fallDistance = 0;
            }
            pData.isTakingFallDamage = false; // Reset this flag after checking
            pData.consecutiveOffGroundTicks = 0;
        }
        // previousPosition is updated in updateTransientPlayerData, so it's already set for next tick's deltaY calc.

        // World Border Enforcement
        if (tickDependencies.config.enableWorldBorderSystem) {
            try {
                worldBorderManager.enforceWorldBorderForPlayer(player, pData, tickDependencies);
            } catch (e) {
                    const error = e;
                console.error(`[MainTick] Error enforcing world border for player ${player.nameTag}: ${error.stack || error.message}`);
                playerUtils.debugLog(`[MainTick] Error enforcing world border for ${player.nameTag}: ${error.message}`, player.nameTag, tickDependencies);
                logManager.addLog({ actionType: 'errorWorldBorderEnforceTick', context: 'MainTickLoop.worldBorderEnforcement', targetName: player.nameTag, details: `Error: ${error.message}`, error: error.stack || error.message }, tickDependencies);
            }
        }
    }

    // Periodic Data Persistence
    if (currentTick % 600 === 0) { // Approx. every 30 seconds
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
                    // const err = error; // JavaScript doesn't have 'as Error' type casting
                    console.error(`Error during periodic save for ${player.nameTag}: ${error.message}`);
                    logManager.addLog({ actionType: 'error', context: 'PeriodicSaveFail', details: `Player: ${player.nameTag}, Error: ${error.message}` }, tickDependencies);
                }
            }
        }
        logManager.persistLogCacheToDisk(tickDependencies);
        reportManager.persistReportsToDisk(tickDependencies);
        if (tickDependencies.config.enableWorldBorderSystem) {
            // Settings are saved when modified by commands. A global periodic save isn't strictly necessary
            // unless there's a mechanism for settings to become "dirty" without explicit saves.
            // For now, specific save calls are in the command logic.
            // If a global save is desired, it would iterate dimensions and saveBorderSettings if a setting object is dirty.
            // Example:
            // const knownDims = tickDependencies.config.worldBorderKnownDimensions || ['minecraft:overworld', 'minecraft:the_nether', 'minecraft:the_end'];
            // for (const dimId of knownDims) {
            //    const settings = worldBorderManager.getBorderSettings(dimId, tickDependencies);
            //    if (settings && settings.isDirtyForSave) { // Assuming an isDirtyForSave flag could be added
            //        worldBorderManager.saveBorderSettings(dimId, settings, tickDependencies);
            //        settings.isDirtyForSave = false;
            //    }
            // }
            playerUtils.debugLog("[MainTick] World border settings are saved on modification. No global periodic save implemented currently.", "System", tickDependencies);
        }
    }
}, 1);

// TPA Processing
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
}, 20); // Approx. every second

// Initial System Setup
function initializeSystem() {
    const startupDependencies = getStandardDependencies();
    playerUtils.debugLog('Anti-Cheat Script Loaded. Initializing modules...', 'System', startupDependencies);

    commandManager.initializeCommands(startupDependencies); // Assuming this populates the maps in commandManager
    logManager.initializeLogCache(startupDependencies);
    reportManager.initializeReportCache(startupDependencies); // Moved here
    rankManager.initializeRanks(startupDependencies);
    if (startupDependencies.config.enableWorldBorderSystem) {
        const knownDims = startupDependencies.config.worldBorderKnownDimensions || ['minecraft:overworld', 'minecraft:the_nether', 'minecraft:the_end'];
        for (const dimId of knownDims) {
            // getBorderSettings effectively loads it into cache if accessed,
            // actual "loading" into a manager-level cache isn't explicitly done here,
            // but settings are read from properties when needed.
            // We can call it to ensure it's read once if there's any internal caching in worldBorderManager.
             worldBorderManager.getBorderSettings(dimId, startupDependencies);
        }
        playerUtils.debugLog("[InitializeSystem] World border settings will be loaded on demand for configured dimensions.", "System", startupDependencies);
    }


    playerUtils.debugLog('Anti-Cheat Core System Initialized. Event handlers and tick loop are active.', 'System', startupDependencies);
    mc.world.sendMessage('§a[AntiCheat] §2System Core Initialized. Version: ' + configModule.acVersion);
}

// Initialize after a short delay to ensure Minecraft modules are ready.
mc.system.runTimeout(() => {
    initializeSystem();
}, 1);
