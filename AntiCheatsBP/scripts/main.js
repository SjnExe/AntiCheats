/**
 * @file Main entry point for the AntiCheat system.
 * Initializes all core modules, subscribes to Minecraft server events,
 * and runs the main system tick loop for processing checks, player data updates,
 * and other periodic tasks.
 */

import * as mc from '@minecraft/server';
import * as mcui from '@minecraft/server-ui'; // Import full module for UI forms

import * as configModule from './config.js';
import * as playerUtils from './utils/playerUtils.js';
import * as playerDataManager from './core/playerDataManager.js';
import * as commandManager from './core/commandManager.js';
import * as uiManager from './core/uiManager.js';
import *s eventHandlers from './core/eventHandlers.js';
import * as logManager from './core/logManager.js';
import * as reportManager from './core/reportManager.js';
import * as tpaManager from './core/tpaManager.js';
import * as actionManager from './core/actionManager.js';
import * as rankManager from './core/rankManager.js'; // Import all exports from rankManager
import * as checks from './checks/index.js';
import * as worldBorderManager from './utils/worldBorderManager.js';
import * as chatProcessor from './core/chatProcessor.js';

// Global variable for the current tick, incremented by the system runInterval.
let currentTick = 0;

/**
 * @returns {import('./types.js').Dependencies} A standard set of dependencies for event handlers and tick loops.
 */
function getStandardDependencies() {
    return {
        config: configModule.editableConfigValues,
        playerUtils,
        playerDataManager,
        logManager,
        actionManager,
        uiManager,
        reportManager,
        tpaManager,
        checks,
        mc, // Pass the Minecraft server module itself
        currentTick, // Pass the currentTick value
        permissionLevels: rankManager.permissionLevels,
        ActionFormData: mcui.ActionFormData, // Use mcui directly
        MessageFormData: mcui.MessageFormData, // Use mcui directly
        ModalFormData: mcui.ModalFormData, // Use mcui directly
        ItemComponentTypes: mc.ItemComponentTypes, // Use mc directly
        chatProcessor,
        getString: playerUtils.getString, // Make getString consistently available
        rankManager: { // Pass specific rankManager functions needed by other modules
            getPlayerRankId: rankManager.getPlayerRankId,
            getPlayerPermissionLevel: rankManager.getPlayerPermissionLevel,
            updatePlayerNametag: rankManager.updatePlayerNametag,
            getPlayerRankFormattedChatElements: rankManager.getPlayerRankFormattedChatElements,
            getRankById: rankManager.getRankById, // Added for general use
        },
        worldBorderManager: { // Pass specific worldBorderManager functions
            getBorderSettings: worldBorderManager.getBorderSettings,
            saveBorderSettings: worldBorderManager.saveBorderSettings,
            processWorldBorderResizing: worldBorderManager.processWorldBorderResizing,
            enforceWorldBorderForPlayer: worldBorderManager.enforceWorldBorderForPlayer,
            isPlayerOutsideBorder: worldBorderManager.isPlayerOutsideBorder, // Added
        },
        system: mc.system, // Add mc.system to dependencies
        commandManager: { // Expose command registration for dynamic commands if ever needed
            registerCommand: commandManager.registerCommandInternal, // Internal registration
            unregisterCommand: commandManager.unregisterCommandInternal, // Internal unregistration
            reloadCommands: commandManager.initializeCommands, // For full reload
        },
        editableConfig: configModule, // Expose the config module for updates
    };
}


// --- Event Subscriptions ---

// Chat Send (Commands and Regular Messages)
mc.world.beforeEvents.chatSend.subscribe(async (eventData) => {
    const dependencies = getStandardDependencies();
    if (eventData.message.startsWith(dependencies.config.prefix)) {
        // Command handling expects the full commandDefinitionMap and commandExecutionMap
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

// Player Join (Initial Ban Check & Data Setup)
mc.world.beforeEvents.playerJoin.subscribe(async (eventData) => {
    const { player } = eventData;
    // Minimal dependencies for early join phase, especially for ban check.
    const joinDependencies = {
        config: configModule.editableConfigValues,
        playerUtils,
        playerDataManager,
        logManager: { addLog: logManager.addLog }, // Only addLog needed for ban logging
        getString: playerUtils.getString, // For ban messages
        currentTick, // Needed for ensurePlayerDataInitialized
        mc, // For player object properties
        permissionLevels: rankManager.permissionLevels, // For potential default rank logic if any
         rankManager: { // Minimal rank manager functions if needed for early join
            getPlayerRankId: rankManager.getPlayerRankId,
            getPlayerPermissionLevel: rankManager.getPlayerPermissionLevel,
            updatePlayerNametag: rankManager.updatePlayerNametag, // For initial nametag
            getPlayerRankFormattedChatElements: rankManager.getPlayerRankFormattedChatElements
        },
         // Other full managers (uiManager, reportManager, etc.) are generally not needed this early.
    };

    await playerDataManager.ensurePlayerDataInitialized(player, currentTick, joinDependencies);

    if (playerDataManager.isBanned(player, joinDependencies)) {
        eventData.cancel = true; // Cancel the join event
        const banInfo = playerDataManager.getBanInfo(player, joinDependencies);
        let detailedKickMessage = `§cYou are banned from this server.\n`;
        if (banInfo) {
            detailedKickMessage += `§fBanned by: §e${banInfo.bannedBy || 'Unknown'}\n`;
            detailedKickMessage += `§fReason: §e${banInfo.reason || 'No reason provided.'}\n`;
            detailedKickMessage += `§fExpires: §e${banInfo.unbanTime === Infinity ? 'Permanent' : new Date(banInfo.unbanTime).toLocaleString()}\n`;
        } else {
            detailedKickMessage += `§fReason: §eSystem detected an active ban, but details could not be fully retrieved. Please contact an admin.\n`;
        }
        if (joinDependencies.config.discordLink &&
            joinDependencies.config.discordLink.trim() !== '' &&
            joinDependencies.config.discordLink !== 'https://discord.gg/example' // Avoid showing placeholder
        ) {
            detailedKickMessage += `§fDiscord for appeal: §b${joinDependencies.config.discordLink}`;
        }

        const logMessage = `[AntiCheat] Banned player ${player.nameTag} (ID: ${player.id}) attempt to join. Event cancelled. Ban details: By ${banInfo?.bannedBy || 'N/A'}, Reason: ${banInfo?.reason || 'N/A'}, Expires: ${banInfo?.unbanTime === Infinity ? 'Permanent' : new Date(banInfo?.unbanTime || 0).toLocaleString()}`;
        console.warn(logMessage);
        joinDependencies.logManager.addLog({
            actionType: 'banned_join_attempt',
            targetName: player.nameTag,
            targetId: player.id, // Store XUID if available, otherwise game ID
            details: `Reason: ${banInfo?.reason || 'N/A'}, Expires: ${banInfo?.unbanTime === Infinity ? 'Permanent' : new Date(banInfo?.unbanTime || 0).toLocaleString()}`,
        }, joinDependencies); // Pass full joinDependencies for context if addLog uses it

        if (joinDependencies.config.notifyAdminOnBannedPlayerAttempt && playerUtils.notifyAdmins) {
            playerUtils.notifyAdmins(`Banned player ${player.nameTag} tried to join. (Reason: ${banInfo?.reason || 'N/A'})`, joinDependencies, null, null);
        }
    }
    // If not banned, regular playerSpawn event handles further setup like nametags.
});

// Player Spawn (Post-Join Initialization)
mc.world.afterEvents.playerSpawn.subscribe((eventData) => {
    eventHandlers.handlePlayerSpawn(eventData, getStandardDependencies());
});

// Player Leave (Save Data, Combat Log)
mc.world.beforeEvents.playerLeave.subscribe((eventData) => {
    eventHandlers.handlePlayerLeave(eventData, getStandardDependencies());
});

// Entity Hurt (Combat Detection, TPA Cancellation)
mc.world.afterEvents.entityHurt.subscribe((eventData) => { // Using afterEvents for combat log, beforeEvents for TPA cancel
    const dependencies = getStandardDependencies();
    eventHandlers.handleEntityHurt(eventData, dependencies); // For combat log, etc.
});

mc.world.beforeEvents.entityHurt.subscribe(eventData => { // Specifically for TPA warmup cancellation
    const dependencies = getStandardDependencies();
    if (!dependencies.config.enableTpaSystem || !dependencies.config.tpaTeleportWarmupSeconds || dependencies.config.tpaTeleportWarmupSeconds <= 0) {
        return;
    }

    const { hurtEntity, damageSource } = eventData;
    if (hurtEntity.typeId !== mc.MinecraftEntityTypes.player.id) return; // Ensure it's a player

    const player = hurtEntity as mc.Player; // Type assertion

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


// Block Breaking Events
mc.world.beforeEvents.playerBreakBlock.subscribe(async (eventData) => {
    await eventHandlers.handlePlayerBreakBlockBeforeEvent(eventData, getStandardDependencies());
});
mc.world.afterEvents.playerBreakBlock.subscribe(async (eventData) => {
    await eventHandlers.handlePlayerBreakBlockAfterEvent(eventData, getStandardDependencies());
});

// Item Usage Events
mc.world.beforeEvents.itemUse.subscribe(async (eventData) => {
    await eventHandlers.handleItemUse(eventData, getStandardDependencies());
});
mc.world.beforeEvents.itemUseOn.subscribe(async (eventData) => {
    await eventHandlers.handleItemUseOn(eventData, getStandardDependencies());
});

// Block Placement Events
mc.world.beforeEvents.playerPlaceBlock.subscribe(async (eventData) => {
    await eventHandlers.handlePlayerPlaceBlockBefore(eventData, getStandardDependencies());
});
mc.world.afterEvents.playerPlaceBlock.subscribe(async (eventData) => {
    await eventHandlers.handlePlayerPlaceBlockAfterEvent(eventData, getStandardDependencies());
});

// Inventory Item Change
mc.world.afterEvents.playerInventoryItemChange.subscribe(async (eventData) => {
    await eventHandlers.handleInventoryItemChange(
        eventData.player,
        eventData.newItemStack,
        eventData.oldItemStack,
        eventData.inventorySlot,
        getStandardDependencies()
    );
});

// Dimension Change
mc.world.afterEvents.playerDimensionChange.subscribe((eventData) => {
    eventHandlers.handlePlayerDimensionChangeAfterEvent(eventData, getStandardDependencies());
});

// Entity Death (Player Death & Cosmetic Effects)
mc.world.afterEvents.entityDie.subscribe((eventData) => {
    const dependencies = getStandardDependencies();
    if (eventData.deadEntity.typeId === mc.MinecraftEntityTypes.player.id) { // Use built-in type ID
        eventHandlers.handlePlayerDeath(eventData, dependencies);
    }
    if (dependencies.config.enableDeathEffects) { // Check config before calling
        eventHandlers.handleEntityDieForDeathEffects(eventData, dependencies);
    }
});

// Entity Spawn (AntiGrief for specific entities)
mc.world.afterEvents.entitySpawn.subscribe(async (eventData) => {
    await eventHandlers.handleEntitySpawnEvent_AntiGrief(eventData, getStandardDependencies());
});

// Piston Activation (AntiGrief for lag machines)
mc.world.afterEvents.pistonActivate.subscribe(async (eventData) => {
    await eventHandlers.handlePistonActivate_AntiGrief(eventData, getStandardDependencies());
});


// --- System Intervals ---

// Main System Tick Loop (Player data updates, checks, periodic saves)
mc.system.runInterval(async () => {
    currentTick++;
    const tickDependencies = getStandardDependencies();

    // Failsafe initialization for reportManager if not already done
    if (typeof reportManager.initializeReportCache === 'function' && !reportManager.isInitialized()) {
        reportManager.initializeReportCache(tickDependencies);
        playerUtils.debugLog('ReportManager cache initialized from main tick loop (failsafe).', 'System', tickDependencies);
    }

    if (tickDependencies.config.enableWorldBorderSystem) {
        try {
            worldBorderManager.processWorldBorderResizing(tickDependencies);
        } catch (e) {
            const error = e as Error;
            console.error(`[MainTick] Error processing world border resizing: ${error.stack || error.message}`);
            playerUtils.debugLog(`[MainTick] Error processing world border resizing: ${error.message}`, 'System', tickDependencies);
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

        // --- Execute Checks (categorized for clarity) ---
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
        if (tickDependencies.config.enableCpsCheck && checks.checkCps) await checks.checkCps(player, pData, tickDependencies, null); // Event data is null for tick-based check
        if (tickDependencies.config.enableViewSnapCheck && checks.checkViewSnap) await checks.checkViewSnap(player, pData, tickDependencies, null); // Event data is null
        if (tickDependencies.config.enableReachCheck && checks.checkReach) { /* checkReach typically runs on entityHurt */ }
        if (tickDependencies.config.enableMultiTargetCheck && checks.checkMultiTarget) await checks.checkMultiTarget(player, pData, tickDependencies, null);
        if (tickDependencies.config.enableStateConflictCheck && checks.checkStateConflict) await checks.checkStateConflict(player, pData, tickDependencies, null);


        // World Interaction / Building Checks
        if (tickDependencies.config.enableNukerCheck && checks.checkNuker) await checks.checkNuker(player, pData, tickDependencies); // Nuker often needs its own timing
        if (tickDependencies.config.enableAutoToolCheck && checks.checkAutoTool && (currentTick - (pData.lastCheckAutoToolTick || 0) >= tickDependencies.config.autoToolCheckIntervalTicks)) {
            await checks.checkAutoTool(player, pData, tickDependencies); pData.lastCheckAutoToolTick = currentTick;
        }
        if (tickDependencies.config.enableInstaBreakSpeedCheck && checks.checkInstaBreak) { /* InstaBreak typically runs on blockBreak */ }
        if (tickDependencies.config.enableTowerCheck && checks.checkTower) await checks.checkTower(player, pData, tickDependencies);
        if (tickDependencies.config.enableFlatRotationCheck && checks.checkFlatRotationBuilding && (currentTick - (pData.lastCheckFlatRotationBuildingTick || 0) >= tickDependencies.config.flatRotationCheckIntervalTicks)) {
            await checks.checkFlatRotationBuilding(player, pData, tickDependencies); pData.lastCheckFlatRotationBuildingTick = currentTick;
        }
        if (tickDependencies.config.enableDownwardScaffoldCheck && checks.checkDownwardScaffold) await checks.checkDownwardScaffold(player, pData, tickDependencies);
        if (tickDependencies.config.enableAirPlaceCheck && checks.checkAirPlace) { /* AirPlace typically runs on blockPlace */ }
        if (tickDependencies.config.enableFastPlaceCheck && checks.checkFastPlace) await checks.checkFastPlace(player, pData, tickDependencies);


        // Player State / Info / Behavior Checks
        if (tickDependencies.config.enableNameSpoofCheck && checks.checkNameSpoof && (currentTick - (pData.lastCheckNameSpoofTick || 0) >= tickDependencies.config.nameSpoofCheckIntervalTicks)) {
            await checks.checkNameSpoof(player, pData, tickDependencies); pData.lastCheckNameSpoofTick = currentTick;
        }
        if (tickDependencies.config.enableAntiGmcCheck && checks.checkAntiGmc && (currentTick - (pData.lastCheckAntiGMCTick || 0) >= tickDependencies.config.antiGmcCheckIntervalTicks)) {
            await checks.checkAntiGmc(player, pData, tickDependencies); pData.lastCheckAntiGMCTick = currentTick;
        }
        if (tickDependencies.config.enableSelfHurtCheck && checks.checkSelfHurt) { /* SelfHurt typically runs on entityHurt */ }
        if (tickDependencies.config.enableIllegalItemCheck && checks.checkIllegalItems) await checks.checkIllegalItems(player, pData, tickDependencies); // Can run on tick or inventory change
        if (tickDependencies.config.enableInventoryModCheck && checks.checkInventoryModifications) await checks.checkInventoryModifications(player, pData, tickDependencies);


        // Client Behavior Checks
        if (tickDependencies.config.enableInvalidRenderDistanceCheck && checks.checkInvalidRenderDistance && (currentTick - (pData.lastRenderDistanceCheckTick || 0) >= tickDependencies.config.invalidRenderDistanceCheckIntervalTicks)) {
            await checks.checkInvalidRenderDistance(player, pData, tickDependencies);
            pData.lastRenderDistanceCheckTick = currentTick;
        }

        // Item Use Checks
        if (tickDependencies.config.enableFastUseCheck && checks.checkFastUse) { /* FastUse typically runs on itemUse event */ }


        // Fall distance accumulation
        if (!player.isOnGround) {
            if ((pData.velocity?.y ?? 0) < -0.078 && pData.previousPosition && pData.lastPosition) { // Vanilla falling velocity threshold, ensure positions exist
                const deltaY = pData.previousPosition.y - pData.lastPosition.y;
                if (deltaY > 0 && deltaY < 100) { // Plausible fall distance change per tick
                    pData.fallDistance = (pData.fallDistance || 0) + deltaY;
                }
            }
        } else { // Player is on ground
            if (!pData.isTakingFallDamage) { // Only reset if not currently processing fall damage
                pData.fallDistance = 0;
            }
            pData.isTakingFallDamage = false; // Reset this flag each tick player is on ground
            pData.consecutiveOffGroundTicks = 0; // Reset off-ground ticks
        }
        pData.previousPosition = { ...pData.lastPosition }; // Update previous position

        // World Border Enforcement
        if (tickDependencies.config.enableWorldBorderSystem) {
            try {
                worldBorderManager.enforceWorldBorderForPlayer(player, pData, tickDependencies);
            } catch (e) {
                const error = e as Error;
                console.error(`[MainTick] Error enforcing world border for player ${player.nameTag}: ${error.stack || error.message}`);
                playerUtils.debugLog(`[MainTick] Error enforcing world border for ${player.nameTag}: ${error.message}`, player.nameTag, tickDependencies);
            }
        }
         // Mark data for saving if any check modified it (checks should set pData.isDirtyForSave = true)
    }

    // Periodic Data Persistence
    if (currentTick % 600 === 0) { // Every 30 seconds (600 ticks / 20 tps = 30s)
        playerUtils.debugLog(`Performing periodic data persistence. Current Tick: ${currentTick}`, 'System', tickDependencies);
        for (const player of allPlayers) {
            const pData = playerDataManager.getPlayerData(player.id); // Get potentially modified pData
            if (pData?.isDirtyForSave) {
                try {
                    await playerDataManager.saveDirtyPlayerData(player, tickDependencies);
                    // pData.isDirtyForSave should be reset by saveDirtyPlayerData
                    if (pData.isWatched) {
                        playerUtils.debugLog(`Periodic save executed for watched player ${player.nameTag}.`, player.nameTag, tickDependencies);
                    }
                } catch (error) {
                    const err = error as Error;
                    console.error(`Error during periodic save for ${player.nameTag}: ${err.message}`);
                    logManager.addLog({ actionType: 'error', context: 'PeriodicSaveFail', details: `Player: ${player.nameTag}, Error: ${err.message}` }, tickDependencies);
                }
            }
        }
        logManager.persistLogCacheToDisk(tickDependencies);
        reportManager.persistReportsToDisk(tickDependencies);
        if (tickDependencies.config.enableWorldBorderSystem) {
            worldBorderManager.saveBorderSettings(tickDependencies); // Save border settings if they can change
        }
    }
}, 1); // Run every game tick (1/20th of a second)

// TPA Processing Interval (Separate from main tick for clarity, can be combined if preferred)
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
}, 20); // Process TPA logic every second (20 ticks)


// --- Initial System Setup ---
function initializeSystem() {
    const startupDependencies = getStandardDependencies(); // Get dependencies for startup tasks
    playerUtils.debugLog('Anti-Cheat Script Loaded. Initializing modules...', 'System', startupDependencies);

    commandManager.initializeCommands(startupDependencies); // Load and register all commands
    logManager.initializeLogCache(startupDependencies);
    reportManager.initializeReportCache(startupDependencies);
    rankManager.initializeRanks(startupDependencies);
    if (startupDependencies.config.enableWorldBorderSystem) {
        worldBorderManager.loadBorderSettings(startupDependencies); // Load border settings on startup
    }
    // Other initializations like loading persisted data for managers

    playerUtils.debugLog('Anti-Cheat Core System Initialized. Event handlers and tick loop are active.', 'System', startupDependencies);
    mc.world.sendMessage('§a[AntiCheat] §2System Core Initialized. Version: ' + configModule.acVersion);
}

// Run initialization once the script is loaded and world is available.
// Using a short delay to ensure all Minecraft modules are ready.
mc.system.runTimeout(() => {
    initializeSystem();
}, 1); // Delay of 1 tick.
