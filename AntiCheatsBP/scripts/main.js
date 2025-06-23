/**
 * Main entry point for the AntiCheat system. Initializes modules, subscribes to events,
 * and runs the main tick loop for processing checks and player data.
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
// import { permissionLevels as importedPermissionLevels } from './core/rankManager.js'; // Replaced by full module import
import * as rankManagerModule from './core/rankManager.js'; // Import all exports from rankManager
import { ActionFormData as ImportedActionFormData, MessageFormData as ImportedMessageFormData, ModalFormData as ImportedModalFormData } from '@minecraft/server-ui';
import { ItemComponentTypes as ImportedItemComponentTypes } from '@minecraft/server';
import * as checks from './checks/index.js';
import { getBorderSettings, saveBorderSettings, processWorldBorderResizing, enforceWorldBorderForPlayer } from './utils/worldBorderManager.js';
import * as chatProcessor from './core/chatProcessor.js';

// Initial log to confirm script loading
playerUtils.debugLog("Anti-Cheat Script Loaded. Initializing modules...", null, getStandardDependencies()); // getStandardDependencies might not be fully ready here, but ok for initial log

mc.world.beforeEvents.chatSend.subscribe(async (eventData) => {
    const baseDependencies = getStandardDependencies(); // Get fresh dependencies for each event
    if (eventData.message.startsWith(baseDependencies.config.prefix)) {
        // Pass the commandDefinitionMap and commandExecutionMap directly
        const commandHandlingDependencies = {
            ...baseDependencies,
            commandDefinitionMap: commandManager.commandDefinitionMap, // Assuming these are populated in commandManager.js
            commandExecutionMap: commandManager.commandExecutionMap,   // Assuming these are populated in commandManager.js
            // rankManager is now part of baseDependencies via getStandardDependencies if rankManager is imported and added there
        };
        await commandManager.handleChatCommand(eventData, commandHandlingDependencies);
    } else {
        // For regular chat messages, eventHandlers.handleBeforeChatSend is called, which then calls chatProcessor
        await eventHandlers.handleBeforeChatSend(eventData, baseDependencies);
    }
});

mc.world.beforeEvents.playerJoin.subscribe(async (eventData) => {
    const player = eventData.player;
    // Intentionally using a minimal set of dependencies for playerJoin to avoid premature access to other systems
    // that might rely on the player being fully initialized or having pData ready.
    const joinDependencies = {
        config: configModule.editableConfigValues, // Direct access for critical early config
        playerUtils: playerUtils,
        playerDataManager: playerDataManager,
        getString: playerUtils.getString, // Assuming getString is part of playerUtils or needs to be passed
        // Minimal logManager for ban logging if needed, or add later if full context is required
        logManager: { addLog: logManager.addLog }, // Pass only addLog initially
        // No full commandManager, uiManager, etc. needed here typically
    };

    await playerDataManager.ensurePlayerDataInitialized(player, currentTick, joinDependencies); // Pass currentTick

    if (playerDataManager.isBanned(player, joinDependencies)) {
        eventData.cancel = true; // Cancel the join event
        const banInfo = playerDataManager.getBanInfo(player, joinDependencies);
        let detailedKickMessage = `§cYou are banned from this server.\n`;
        if (banInfo) {
            detailedKickMessage += `§fBanned by: §e${banInfo.bannedBy || "Unknown"}\n`;
            detailedKickMessage += `§fReason: §e${banInfo.reason || "No reason provided."}\n`;
            detailedKickMessage += `§fExpires: §e${banInfo.unbanTime === Infinity ? "Permanent" : new Date(banInfo.unbanTime).toLocaleString()}\n`;
        } else {
            detailedKickMessage += `§fReason: §eSystem detected an active ban, but details could not be fully retrieved. Please contact an admin.\n`;
        }
        if (joinDependencies.config.discordLink && joinDependencies.config.discordLink.trim() !== "" && joinDependencies.config.discordLink !== "https://discord.gg/example") {
            detailedKickMessage += `§fDiscord: §b${joinDependencies.config.discordLink}`;
        }
        // Player is cancelled from joining, so player.kick() won't work here.
        // The cancellation of playerJoin event is the "kick".
        // Logging the attempt:
        const logMessage = `[AntiCheat] Banned player ${player.nameTag} (ID: ${player.id}) attempt to join. Event cancelled. Ban details: By ${banInfo?.bannedBy || "N/A"}, Reason: ${banInfo?.reason || "N/A"}, Expires: ${banInfo?.unbanTime === Infinity ? "Permanent" : new Date(banInfo?.unbanTime).toLocaleString()}`;
        console.warn(logMessage);
        if (playerUtils.notifyAdmins && joinDependencies.config.notifyAdminOnBannedPlayerAttempt) { // Added config check
            playerUtils.notifyAdmins(`Banned player ${player.nameTag} tried to join. Banned by: ${banInfo?.bannedBy || "N/A"}, Reason: ${banInfo?.reason || "N/A"}`, joinDependencies, null, null); // Pass null for player/pData context for general admin notify
        }
    }
    // If not banned, the regular playerSpawn event will handle further initialization like nametags.
});

// Centralized function to get a standard set of dependencies for event handlers and tick loops.
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
        permissionLevels: rankManagerModule.permissionLevels, // Use permissionLevels from the rankManagerModule
        ActionFormData: ImportedActionFormData,
        MessageFormData: ImportedMessageFormData,
        ModalFormData: ImportedModalFormData,
        ItemComponentTypes: ImportedItemComponentTypes,
        chatProcessor: chatProcessor,
        getString: playerUtils.getString, // Make getString consistently available
        rankManager: {
            getPlayerRankId: rankManagerModule.getPlayerRankId,
            getPlayerPermissionLevel: rankManagerModule.getPlayerPermissionLevel, // This function is now exported from rankManager.js
            updatePlayerNametag: rankManagerModule.updatePlayerNametag,
            getPlayerRankFormattedChatElements: rankManagerModule.getPlayerRankFormattedChatElements
        },
        worldBorderManager: { getBorderSettings, saveBorderSettings, processWorldBorderResizing, enforceWorldBorderForPlayer },
        system: mc.system // Add mc.system to dependencies
    };
}

mc.world.afterEvents.playerSpawn.subscribe((eventData) => {
    eventHandlers.handlePlayerSpawn(eventData, getStandardDependencies());
});

mc.world.beforeEvents.playerLeave.subscribe((eventData) => { // Changed to beforeEvents if save on leave is critical
    eventHandlers.handlePlayerLeave(eventData, getStandardDependencies());
});

mc.world.afterEvents.entityHurt.subscribe((eventData) => {
    eventHandlers.handleEntityHurt(eventData, getStandardDependencies());
});

// Initializing combat log event subscription
eventHandlers.subscribeToCombatLogEvents(getStandardDependencies());


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
    // handleInventoryItemChange expects: player, newItem, oldItem, slotName, dependencies
    await eventHandlers.handleInventoryItemChange(eventData.player, eventData.newItemStack, eventData.oldItemStack, eventData.inventorySlot, getStandardDependencies());
});


mc.world.afterEvents.playerDimensionChange.subscribe((eventData) => {
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

// Main TPA processing interval
mc.system.runInterval(() => {
    const tpaIntervalDependencies = getStandardDependencies();
    if (tpaIntervalDependencies.config.enableTPASystem) {
        tpaManager.clearExpiredRequests(tpaIntervalDependencies);
        const requestsInWarmup = tpaManager.getRequestsInWarmup();
        for (const request of requestsInWarmup) {
            if (Date.now() >= request.warmupExpiryTimestamp) {
                tpaManager.executeTeleport(request.requestId, tpaIntervalDependencies);
            }
        }
    }
}, 20); // Process TPA logic every second (20 ticks)

// TPA Warmup cancellation on damage
mc.world.beforeEvents.entityHurt.subscribe(eventData => {
    const tpaEntityHurtDependencies = getStandardDependencies();
    if (!tpaEntityHurtDependencies.config.enableTPASystem) return;

    const { hurtEntity, damageSource } = eventData;
    let playerNameTag;
    try {
        // Ensure hurtEntity is a player and has a nameTag
        if (hurtEntity.typeId !== 'minecraft:player' || typeof hurtEntity.nameTag !== 'string') return;
        playerNameTag = hurtEntity.nameTag;
    } catch (e) { return; } // Not a player or error accessing nameTag

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
                const reasonMsgPlayer = tpaEntityHurtDependencies.getString("tpa.manager.warmupCancelledDamage.player", { damageCause });
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
    const tickDependencies = getStandardDependencies(); // Get a fresh set of dependencies for this tick

    // Failsafe initialization for reportManager if not already done
    if (typeof reportManager.initializeReportCache === 'function' && !reportManager.isInitialized) {
        reportManager.initializeReportCache(tickDependencies);
        reportManager.isInitialized = true; // Mark as initialized
        playerUtils.debugLog("ReportManager cache initialized from main tick loop (failsafe).", "System", tickDependencies);
    }

    if (tickDependencies.config.enableWorldBorderSystem) {
        try { processWorldBorderResizing(tickDependencies); }
        catch (e) {
            console.error(`[MainTick] Error processing world border resizing: ${e.stack || e}`);
            playerUtils.debugLog(`[MainTick] Error processing world border resizing: ${e.message}`, "System", tickDependencies);
        }
    }

    const allPlayers = mc.world.getAllPlayers();
    // playerDataManager.cleanupActivePlayerData(allPlayers); // This line seems to be missing its dependencies argument

    for (const player of allPlayers) {
        const pData = await playerDataManager.ensurePlayerDataInitialized(player, currentTick, tickDependencies);
        if (!pData) {
            playerUtils.debugLog(`Critical: pData not available for ${player.nameTag} in tick loop after ensure.`, player.nameTag, tickDependencies);
            continue;
        }
        // Ensure these properties exist if not loaded from persistence
        pData.lastBorderVisualTick = pData.lastBorderVisualTick || 0;
        pData.ticksOutsideBorder = pData.ticksOutsideBorder || 0;
        pData.borderDamageApplications = pData.borderDamageApplications || 0;

        playerDataManager.updateTransientPlayerData(player, pData, tickDependencies);
        playerDataManager.clearExpiredItemUseStates(pData, tickDependencies);

        // Movement Checks
        if (tickDependencies.config.enableFlyCheck && checks.checkFly) await checks.checkFly(player, pData, tickDependencies);
        if (tickDependencies.config.enableSpeedCheck && checks.checkSpeed) await checks.checkSpeed(player, pData, tickDependencies);
        if (tickDependencies.config.enableNofallCheck && checks.checkNoFall) await checks.checkNoFall(player, pData, tickDependencies);
        if (tickDependencies.config.enableNoSlowCheck && checks.checkNoSlow) await checks.checkNoSlow(player, pData, tickDependencies);
        if (tickDependencies.config.enableInvalidSprintCheck && checks.checkInvalidSprint) await checks.checkInvalidSprint(player, pData, tickDependencies);

        // Combat Checks
        if (tickDependencies.config.enableCPSCheck && checks.checkCPS) await checks.checkCPS(player, pData, tickDependencies, null);
        if (tickDependencies.config.enableViewSnapCheck && checks.checkViewSnap) await checks.checkViewSnap(player, pData, tickDependencies, null);

        // World Interaction Checks (with intervals)
        if (tickDependencies.config.enableNukerCheck && checks.checkNuker) await checks.checkNuker(player, pData, tickDependencies);
        if (tickDependencies.config.enableAutoToolCheck && checks.checkAutoTool && (currentTick - (pData.lastCheckAutoToolTick || 0) >= tickDependencies.config.autoToolCheckIntervalTicks)) {
            await checks.checkAutoTool(player, pData, tickDependencies); pData.lastCheckAutoToolTick = currentTick;
        }

        // Player State/Info Checks (with intervals)
        if (tickDependencies.config.enableNameSpoofCheck && checks.checkNameSpoof && (currentTick - (pData.lastCheckNameSpoofTick || 0) >= tickDependencies.config.nameSpoofCheckIntervalTicks)) {
            await checks.checkNameSpoof(player, pData, tickDependencies); pData.lastCheckNameSpoofTick = currentTick;
        }
        if (tickDependencies.config.enableAntiGMCCheck && checks.checkAntiGMC && (currentTick - (pData.lastCheckAntiGMCTick || 0) >= tickDependencies.config.antiGMCCheckIntervalTicks)) {
            await checks.checkAntiGMC(player, pData, tickDependencies); pData.lastCheckAntiGMCTick = currentTick;
        }
        if (tickDependencies.config.enableFlatRotationCheck && checks.checkFlatRotationBuilding && (currentTick - (pData.lastCheckFlatRotationBuildingTick || 0) >= tickDependencies.config.flatRotationCheckIntervalTicks)) {
            await checks.checkFlatRotationBuilding(player, pData, tickDependencies); pData.lastCheckFlatRotationBuildingTick = currentTick;
        }
        if (tickDependencies.config.enableInvalidRenderDistanceCheck && (currentTick - (pData.lastRenderDistanceCheckTick || 0) >= 400)) { // Approx 20s
            if (checks.checkInvalidRenderDistance) await checks.checkInvalidRenderDistance(player, pData, tickDependencies);
            pData.lastRenderDistanceCheckTick = currentTick;
        }
        if (tickDependencies.config.enableNetherRoofCheck && checks.checkNetherRoof && (currentTick - (pData.lastCheckNetherRoofTick || 0) >= tickDependencies.config.netherRoofCheckIntervalTicks)) {
            checks.checkNetherRoof(player, pData, tickDependencies); pData.lastCheckNetherRoofTick = currentTick;
        }

        // Fall distance accumulation
        if (!player.isOnGround) {
            if (pData.velocity.y < -0.07 && pData.previousPosition) { // Check if actually falling
                const deltaY = pData.previousPosition.y - pData.lastPosition.y;
                if (deltaY > 0) pData.fallDistance += deltaY;
            }
        } else {
            if (!pData.isTakingFallDamage) pData.fallDistance = 0; // Reset if landed and didn't take fall damage
            pData.isTakingFallDamage = false; // Reset this flag each tick player is on ground
        }

        if (tickDependencies.config.enableWorldBorderSystem) {
            try { enforceWorldBorderForPlayer(player, pData, tickDependencies); }
            catch (e) {
                console.error(`[MainTick] Error enforcing world border for player ${player.nameTag}: ${e.stack || e}`);
                playerUtils.debugLog(`[MainTick] Error enforcing world border for ${player.nameTag}: ${e.message}`, player.nameTag, tickDependencies);
            }
        }
    }

    // Periodic data persistence
    if (currentTick % 600 === 0) { // Every 30 seconds (600 ticks / 20 tps)
        for (const player of allPlayers) {
            const pData = playerDataManager.getPlayerData(player.id);
            if (pData?.isDirtyForSave) { // Check if data is dirty before saving
                try {
                    await playerDataManager.saveDirtyPlayerData(player, tickDependencies); // Pass dependencies
                    if (pData.isWatched) playerUtils.debugLog(`Deferred save executed for ${player.nameTag}. Tick: ${currentTick}`, player.nameTag, tickDependencies);
                } catch (error) {
                    console.error(`Error during deferred save for ${player.nameTag}: ${error}`);
                    logManager.addLog({actionType: 'error', details: `DeferredSaveFail: ${player.nameTag}, ${error.message}`}, tickDependencies);
                }
            }
        }
        logManager.persistLogCacheToDisk(tickDependencies); // Persist logs
        reportManager.persistReportsToDisk(tickDependencies); // Persist reports
    }
}, 1); // Run every tick

playerUtils.debugLog("Anti-Cheat Core System Initialized. Event handlers and tick loop are active.", "System", getStandardDependencies());

// Initialize LogManager and ReportManager caches on startup
const startupDependencies = getStandardDependencies();
logManager.initializeLogCache(startupDependencies); // Ensure logs are loaded
reportManager.initializeReportCache(startupDependencies);
// isInitialized for reportManager is set inside its initializeReportCache
// No need to set it here again if initializeReportCache handles it.
playerUtils.debugLog("LogManager and ReportManager caches initialized on startup.", "System", startupDependencies);
