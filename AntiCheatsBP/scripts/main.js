/**
 * @file AntiCheatsBP/scripts/main.js
 * Main entry point for the AntiCheat system. Initializes modules, subscribes to events,
 * and runs the main tick loop for processing checks and player data.
 * @version 1.1.0
 */
import * as mc from '@minecraft/server';
import * as config from './config.js';
import * as playerUtils from './utils/playerUtils.js';
import * as playerDataManager from './core/playerDataManager.js';
import * as commandManager from './core/commandManager.js';
import * as uiManager from './core/uiManager.js';
import * as eventHandlers from './core/eventHandlers.js';
import * as logManager from './core/logManager.js'; // Ensure logManager is imported for addLog
import * as tpaManager from './core/tpaManager.js';
import { executeCheckAction } from './core/actionManager.js';

// Import all checks from the barrel file
import * as checks from './checks/index.js';

playerUtils.debugLog("Anti-Cheat Script Loaded. Initializing modules...");

// --- Event Subscriptions ---

/**
 * Handles chat messages before they are sent.
 * If a message starts with the command prefix, it's treated as a command.
 * Otherwise, it's processed as a regular chat message.
 * @param {mc.ChatSendBeforeEvent} eventData The chat send event data.
 */
mc.world.beforeEvents.chatSend.subscribe(async (eventData) => {
    if (eventData.message.startsWith(config.prefix)) {
        // Pass necessary dependencies to handleChatCommand
        // Note: pData for sender is fetched inside handleChatCommand or command modules
        await commandManager.handleChatCommand(
            eventData,
            playerDataManager,
            uiManager,
            config,
            playerUtils
            // No longer passing senderPData directly here
        );
    } else {
        // Call the general chat handler for non-command messages
        await eventHandlers.handleBeforeChatSend(eventData, playerDataManager, config, playerUtils, checks, logManager, executeCheckAction, mc.system.currentTick);
    }
});

/**
 * Handles player spawn events.
 * @param {mc.PlayerSpawnAfterEvent} eventData The player spawn event data.
 */
mc.world.afterEvents.playerSpawn.subscribe((eventData) => {
    eventHandlers.handlePlayerSpawn(eventData, playerDataManager, playerUtils, config, { addLog: logManager.addLog });
});

/**
 * Handles player leave events.
 * @param {mc.PlayerLeaveBeforeEvent} eventData The player leave event data.
 */
mc.world.beforeEvents.playerLeave.subscribe((eventData) => {
    // Pass addLog from logManager to handlePlayerLeave for combat logging
    eventHandlers.handlePlayerLeave(eventData, playerDataManager, playerUtils, config, logManager.addLog);
});

/**
 * Handles entity hurt events, primarily for combat-related checks.
 * @param {mc.EntityHurtAfterEvent} eventData The entity hurt event data.
 */
// Existing entityHurt subscription for general combat checks and NoFall
mc.world.afterEvents.entityHurt.subscribe((eventData) => {
    eventHandlers.handleEntityHurt(eventData, playerDataManager, checks, playerUtils, config, currentTick, logManager, executeCheckAction);
});

// New subscription specifically for Combat Log interaction tracking
// This needs to be called after dependencies like playerDataManager, config, playerUtils are initialized.
// Assuming they are available globally or passed appropriately if this were in an init function.
// For now, direct call:
eventHandlers.subscribeToCombatLogEvents(playerDataManager, config, playerUtils);

/**
 * Handles player break block events before they occur.
 * @param {mc.PlayerBreakBlockBeforeEvent} eventData The event data.
 */
mc.world.beforeEvents.playerBreakBlock.subscribe(async (eventData) => {
    // Pass necessary dependencies if checkIllegalItems (called via handlePlayerBreakBlock indirectly) needs them
    // For now, assuming checkIllegalItems gets what it needs from the event or pData
    // eventHandlers.handlePlayerBreakBlock(eventData, playerDataManager); // Old call
    await eventHandlers.handlePlayerBreakBlockBeforeEvent(eventData, playerDataManager, checks, playerUtils, config, logManager, executeCheckAction, currentTick);
});

/**
 * Handles player break block events after they occur.
 * @param {mc.PlayerBreakBlockAfterEvent} eventData The event data.
 */
mc.world.afterEvents.playerBreakBlock.subscribe(async (eventData) => { // Made async
    // eventHandlers.handlePlayerBreakBlockAfter(eventData, config, playerUtils); // Old call
    await eventHandlers.handlePlayerBreakBlockAfter(eventData, playerDataManager, checks, playerUtils, config, logManager, executeCheckAction, currentTick);
});

/**
 * Handles item use events before they occur.
 * @param {mc.ItemUseBeforeEvent} eventData The event data.
 */
mc.world.beforeEvents.itemUse.subscribe(async (eventData) => { // Made async
    await eventHandlers.handleItemUse(eventData, playerDataManager, checks, playerUtils, config, logManager, executeCheckAction, currentTick); // Added currentTick
});

/**
 * Handles player place block events before they occur.
 * @param {mc.PlayerPlaceBlockBeforeEvent} eventData The event data.
 */
mc.world.beforeEvents.playerPlaceBlock.subscribe((eventData) => {
    // TODO: Review this subscription. handleItemUseOn is typically for ItemUseOnBeforeEvent.
    // PlayerPlaceBlockBeforeEvent is passed here. This might lead to issues if handleItemUseOn
    // or its downstream checks (like checkIllegalItems for "place") expect properties unique to ItemUseOnBeforeEvent
    // that are not present or different in PlayerPlaceBlockBeforeEvent (e.g., faceLocation object vs. faceLocationX/Y/Z).
    // For now, keeping as is from previous state, but needs verification.
    eventHandlers.handleItemUseOn(eventData, playerDataManager, checks, playerUtils, config, logManager, executeCheckAction);
});

/**
 * Handles player place block events before they occur for AirPlace check.
 * @param {mc.PlayerPlaceBlockBeforeEvent} eventData The event data.
 */
mc.world.beforeEvents.playerPlaceBlock.subscribe(async (eventData) => {
    // currentTick from main.js scope is passed to the handler
    await eventHandlers.handlePlayerPlaceBlockBefore(eventData, playerDataManager, checks, playerUtils, config, logManager, executeCheckAction, currentTick);
});

/**
 * Handles player place block events after they occur for Tower check.
 * @param {mc.PlayerPlaceBlockAfterEvent} eventData The event data.
 */
mc.world.afterEvents.playerPlaceBlock.subscribe(async (eventData) => {
    // currentTick from main.js scope is passed to the handler
    await eventHandlers.handlePlayerPlaceBlockAfter(eventData, playerDataManager, checks, playerUtils, config, logManager, executeCheckAction, currentTick);
});

/**
 * Handles player inventory item changes after they occur.
 * @param {mc.PlayerInventoryItemChangeAfterEvent} eventData
 */
mc.world.afterEvents.playerInventoryItemChange.subscribe(async (eventData) => {
    await eventHandlers.handleInventoryItemChange(eventData, playerDataManager, checks, playerUtils, config, logManager, executeCheckAction, currentTick);
});

/**
 * Handles player dimension change events after they occur.
 * @param {mc.PlayerDimensionChangeAfterEvent} eventData The event data.
 */
mc.world.afterEvents.playerDimensionChange.subscribe((eventData) => {
    eventHandlers.handlePlayerDimensionChangeAfter(eventData, playerUtils, config);
});

/**
 * Handles entity die events, specifically for player deaths to record coordinates.
 * @param {mc.EntityDieAfterEvent} eventData The event data.
 */
mc.world.afterEvents.entityDie.subscribe((eventData) => {
    // Assuming player is deadEntity from this event type (needs verification if API differs for players specifically)
    // Pass logManager.addLog for logging within handlePlayerDeath
    eventHandlers.handlePlayerDeath(eventData, playerDataManager, playerUtils, config, logManager.addLog);
});

// Periodically clear expired TPA requests (e.g., every second = 20 ticks)
// Also process TPA warmups in this interval or a similar one.
mc.system.runInterval(() => {
    if (config.enableTpaSystem) { // Only run if TPA system is enabled
        tpaManager.clearExpiredRequests();

        // Process TPA warm-ups
        const requestsInWarmup = tpaManager.getRequestsInWarmup();
        for (const request of requestsInWarmup) {
            if (Date.now() >= request.warmupExpiryTimestamp) {
                tpaManager.executeTeleport(request.requestId);
            }
        }
    }
}, 20); // Run this check every 20 ticks (1 second)

/**
 * Handles entity hurt events, for TPA warm-up cancellation.
 * @param {mc.EntityHurtBeforeEvent} eventData The entity hurt event data.
 */
mc.world.beforeEvents.entityHurt.subscribe(eventData => {
    if (!config.enableTpaSystem) return;

    const { hurtEntity, damageSource } = eventData;
    // Ensure hurtEntity is a Player. For some reason, instanceof Player doesn't work directly with Player objects from events in some contexts.
    // Using a try-catch or checking for a unique player property like 'nameTag' or 'id' is safer.
    let playerNameTag;
    try {
        playerNameTag = hurtEntity.nameTag; // This will throw if hurtEntity is not a Player-like object
        if (typeof playerNameTag !== 'string') return; // Not a player
    } catch (e) {
        return; // Not a player if nameTag access fails
    }


    // Iterate all active requests that are in warmup
    // tpaManager.findRequestsForPlayer might be too broad if it gets all requests ever,
    // better to use getRequestsInWarmup and then filter by player.
    const requestsInWarmup = tpaManager.getRequestsInWarmup();
    const playerActiveWarmupRequests = requestsInWarmup.filter(
        req => req.requesterName === playerNameTag || req.targetName === playerNameTag
    );

    for (const request of playerActiveWarmupRequests) {
        // No need to check request.status here as getRequestsInWarmup should only return 'pending_teleport_warmup'
        // but double-checking won't hurt if getRequestsInWarmup changes.
        if (request.status === 'pending_teleport_warmup') {
            let playerIsTeleporting = false;
            if (request.requestType === 'tpa' && request.requesterName === playerNameTag) {
                playerIsTeleporting = true;
            } else if (request.requestType === 'tpahere' && request.targetName === playerNameTag) {
                playerIsTeleporting = true;
            }

            if (playerIsTeleporting) {
                const damageCause = damageSource?.cause || 'unknown'; // Get cause if available
                const reasonMsgPlayer = `§cTeleport cancelled: You took damage (cause: ${damageCause}).`;
                const reasonMsgLog = `Player ${playerNameTag} took damage (cause: ${damageCause}) during TPA warm-up for request ${request.requestId}.`;

                tpaManager.cancelTeleport(request.requestId, reasonMsgPlayer, reasonMsgLog);
                // eventData.cancel = true; // Usually, do NOT cancel the damage itself.
                break; // Stop checking further requests for this player for this damage event
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
 */
mc.system.runInterval(async () => {
    currentTick++;

    const allPlayers = mc.world.getAllPlayers();
    playerDataManager.cleanupActivePlayerData(allPlayers);

    for (const player of allPlayers) {
        const pData = await playerDataManager.ensurePlayerDataInitialized(player, currentTick);
        if (!pData) {
            if (playerUtils.debugLog) playerUtils.debugLog(`Critical: pData not available for ${player.nameTag} in tick loop after ensure.`, player.nameTag);
            continue;
        }

        playerDataManager.updateTransientPlayerData(player, pData, currentTick);

        // Reset item usage states based on timeout
        if (pData.isUsingConsumable && (currentTick - pData.lastItemUseTick > config.itemUseStateClearTicks)) {
            if (playerUtils.debugLog && pData.isWatched) playerUtils.debugLog(`StateConflict: Auto-clearing isUsingConsumable for ${player.nameTag} after timeout. Tick: ${currentTick}`, player.nameTag);
            pData.isUsingConsumable = false;
        }
        if (pData.isChargingBow && (currentTick - pData.lastItemUseTick > config.itemUseStateClearTicks)) { // Potentially a different timeout for bows later
            if (playerUtils.debugLog && pData.isWatched) playerUtils.debugLog(`StateConflict: Auto-clearing isChargingBow for ${player.nameTag} after timeout. Tick: ${currentTick}`, player.nameTag);
            pData.isChargingBow = false;
        }
        if (pData.isUsingShield && (currentTick - pData.lastItemUseTick > config.itemUseStateClearTicks)) {
            if (playerUtils.debugLog && pData.isWatched) playerUtils.debugLog(`StateConflict: Auto-clearing isUsingShield for ${player.nameTag} after timeout. Tick: ${currentTick}`, player.nameTag);
            pData.isUsingShield = false;
        }

        // --- Call All Checks ---
        // Pass executeCheckAction and logManager to all checks called in the tick loop
        if (config.enableFlyCheck && checks.checkFly) await checks.checkFly(player, pData, config, playerUtils, playerDataManager, logManager, executeCheckAction, currentTick);
        if (config.enableSpeedCheck && checks.checkSpeed) await checks.checkSpeed(player, pData, config, playerUtils, playerDataManager, logManager, executeCheckAction, currentTick);
        if (config.enableNofallCheck && checks.checkNoFall) await checks.checkNoFall(player, pData, config, playerUtils, playerDataManager, logManager, executeCheckAction);
        if (config.enableCpsCheck && checks.checkCPS) await checks.checkCPS(player, pData, config, playerUtils, playerDataManager, logManager, executeCheckAction);
        if (config.enableNukerCheck && checks.checkNuker) await checks.checkNuker(player, pData, config, playerUtils, playerDataManager, logManager, executeCheckAction);

        // ViewSnap check might need config and currentTick directly if not passed via dependencies object to all checks
        if (config.enableViewSnapCheck && checks.checkViewSnap) await checks.checkViewSnap(player, pData, config, currentTick, playerUtils, playerDataManager, logManager, executeCheckAction);

        // Call NoSlow Check
        if (config.enableNoSlowCheck && checks.checkNoSlow) {
            await checks.checkNoSlow(player, pData, config, playerUtils, playerDataManager, logManager, executeCheckAction, currentTick);
        }

        // Call InvalidSprint Check
        if (config.enableInvalidSprintCheck && checks.checkInvalidSprint) {
            await checks.checkInvalidSprint(player, pData, config, playerUtils, playerDataManager, logManager, executeCheckAction, currentTick);
        }

        // Call AutoTool Check
        if (config.enableAutoToolCheck && checks.checkAutoTool) {
            await checks.checkAutoTool(player, pData, config, playerUtils, playerDataManager, logManager, executeCheckAction, currentTick, player.dimension);
        }

        // Call NameSpoof Check
        if (config.enableNameSpoofCheck && checks.checkNameSpoof) {
            await checks.checkNameSpoof(player, pData, config, playerUtils, playerDataManager, logManager, executeCheckAction, currentTick);
        }

        // Call Anti-GMC Check
        if (config.enableAntiGMCCheck && checks.checkAntiGMC) {
            await checks.checkAntiGMC(player, pData, config, playerUtils, playerDataManager, logManager, executeCheckAction, currentTick);
        }

        // Fall distance accumulation and isTakingFallDamage reset
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
    }

    // Deferred player data saving
    if (currentTick % 600 === 0) {
        for (const player of allPlayers) {
            const pData = playerDataManager.getPlayerData(player.id); // Assuming getPlayerData takes playerId
            if (pData && pData.isDirtyForSave) {
                try {
                    await playerDataManager.saveDirtyPlayerData(player); // Assuming saveDirtyPlayerData takes player object
                    if (playerUtils.debugLog && pData.isWatched) {
                        playerUtils.debugLog(`Deferred save executed for ${player.nameTag}. Tick: ${currentTick}`, player.nameTag);
                    }
                } catch (error) {
                    console.error(`Error during deferred save for ${player.nameTag}: ${error}`);
                    logManager.addLog('error', `DeferredSaveFail: ${player.nameTag}, ${error}`);
                }
            }
        }
    }
}, 1);

playerUtils.debugLog("Anti-Cheat Core System Initialized. Event handlers and tick loop are active.", "System");
