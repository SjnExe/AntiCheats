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
 * Handles player join events before they fully join the world.
 * Used for checks like active bans.
 * @param {mc.PlayerJoinBeforeEvent} eventData
 */
mc.world.beforeEvents.playerJoin.subscribe(async (eventData) => {
    const player = eventData.player; // Player object is directly available on eventData for playerJoin
    // Ensure player data is loaded or initialized early, especially for ban checks.
    // ensurePlayerDataInitialized might be too late if it relies on player being fully in world for some ops.
    // For bans, we might need a more direct check if getBanInfo can work with just player.id or nameTag.
    // Assuming getBanInfo can work with the player object from this event.

    // It's crucial to initialize or at least load minimal data for ban checks *before* player fully spawns.
    // Let's try to initialize player data here. This might need careful handling if player is not fully "valid" yet for all ops.
    await playerDataManager.ensurePlayerDataInitialized(player, currentTick); // Use currentTick from global scope

    if (playerDataManager.isBanned(player)) {
        eventData.cancel = true;

        const banInfo = playerDataManager.getBanInfo(player);
        let detailedKickMessage = `§cYou are banned from this server.\n`;

        if (banInfo) {
            detailedKickMessage += `§fBanned by: §e${banInfo.bannedBy || "Unknown"}\n`;
            detailedKickMessage += `§fReason: §e${banInfo.reason || "No reason provided."}\n`;
            detailedKickMessage += `§fExpires: §e${banInfo.unbanTime === Infinity ? "Permanent" : new Date(banInfo.unbanTime).toLocaleString()}\n`;
        } else {
            detailedKickMessage += `§fReason: §eSystem detected an active ban, but details could not be fully retrieved. Please contact an admin.\n`; // Fallback
        }

        if (config.discordLink && config.discordLink.trim() !== "" && config.discordLink !== "https://discord.gg/example") {
            detailedKickMessage += `§fDiscord: §b${config.discordLink}`;
        }

        // Log the detailed ban info to console/admin chat
        const logMessage = `[AntiCheat] Banned player ${player.nameTag} (ID: ${player.id}) attempt to join. Ban details: By ${banInfo?.bannedBy || "N/A"}, Reason: ${banInfo?.reason || "N/A"}, Expires: ${banInfo?.unbanTime === Infinity ? "Permanent" : new Date(banInfo?.unbanTime).toLocaleString()}`;
        console.warn(logMessage);
        if (playerUtils.notifyAdmins) { // Check if notifyAdmins is available
            playerUtils.notifyAdmins(`Banned player ${player.nameTag} tried to join. Banned by: ${banInfo?.bannedBy || "N/A"}, Reason: ${banInfo?.reason || "N/A"}`, null);
        }

        // As discussed, player.kick() might not work here to display a custom message.
        // The eventData.cancel = true; will prevent join. The game shows a generic message.
        // The detailed message is logged for admins.
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
    await eventHandlers.handlePlayerBreakBlockBeforeEvent(eventData, playerDataManager, checks, playerUtils, config, logManager, executeCheckAction, currentTick);
});

/**
 * Handles player break block events after they occur.
 * @param {mc.PlayerBreakBlockAfterEvent} eventData The event data.
 */
mc.world.afterEvents.playerBreakBlock.subscribe(async (eventData) => { // Made async
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
 * Handles item use on block events before they occur, for AntiGrief (Fire) and IllegalItem checks.
 * @param {mc.ItemUseOnBeforeEvent} eventData The event data.
 */
mc.world.beforeEvents.itemUseOn.subscribe(async (eventData) => { // Changed to itemUseOn and made async
    const eventDependencies = {
        config: config.editableConfigValues, // Pass runtime editable config
        playerUtils: playerUtils,
        logManager: logManager,
        actionManager: { executeCheckAction },
        playerDataManager: playerDataManager, // Added for consistency if executeCheckAction needs it via dependencies
        checks: checks // Pass checks object if handleItemUseOn calls other checks directly
    };
    // Original parameters are still passed for now, but handleItemUseOn should ideally use the 'dependencies' object.
    // The signature of handleItemUseOn was: (eventData, playerDataManager, checks, playerUtils, config, logManager, executeCheckAction, dependencies)
    // We will call it with the new consolidated dependencies object.
    await eventHandlers.handleItemUseOn(eventData, playerDataManager, checks, playerUtils, config.editableConfigValues, logManager, executeCheckAction, eventDependencies);
});

/**
 * Handles player place block events before they occur for AirPlace check.
 * @param {mc.PlayerPlaceBlockBeforeEvent} eventData The event data.
 */
mc.world.beforeEvents.playerPlaceBlock.subscribe(async (eventData) => {
    // currentTick from main.js scope is passed to the handler
    await eventHandlers.handlePlayerPlaceBlockBefore(eventData, playerDataManager, checks, playerUtils, config, logManager, executeCheckAction, currentTick);

    // Call AntiGrief TNT check
    const antiGriefDependencies = {
        config: config.editableConfigValues, // Pass the editable config values
        playerUtils: playerUtils,
        logManager: logManager,
        actionManager: { executeCheckAction } // Pass the executeCheckAction function
        // playerDataManager is not explicitly listed as a direct dependency for handlePlayerPlaceBlockBeforeEvent_AntiGrief
        // but executeCheckAction might need it via its own 'dependencies' argument.
        // The 'dependencies' object passed to executeCheckAction from within AntiGrief handler will include playerDataManager.
    };
    await eventHandlers.handlePlayerPlaceBlockBeforeEvent_AntiGrief(eventData, antiGriefDependencies);
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

mc.world.afterEvents.entityDie.subscribe(async (eventData) => {
    // Assuming 'config' here refers to the imported 'config.js' module,
    // and editableConfigValues holds the runtime values.
    await eventHandlers.handleEntityDieForDeathEffects(eventData, config.editableConfigValues);
});

/**
 * Handles entity spawn events, for AntiGrief checks (e.g., Wither control).
 * @param {mc.EntitySpawnAfterEvent} eventData The event data.
 */
mc.world.afterEvents.entitySpawn.subscribe(async (eventData) => {
    const antiGriefDependencies = {
        config: config.editableConfigValues,
        playerUtils: playerUtils,
        logManager: logManager,
        actionManager: { executeCheckAction },
        playerDataManager: playerDataManager // ensure playerDataManager is available if needed by executeCheckAction's internals
    };
    await eventHandlers.handleEntitySpawnEvent_AntiGrief(eventData, antiGriefDependencies);
});

// Periodically clear expired TPA requests (e.g., every second = 20 ticks)
// Also process TPA warmups in this interval or a similar one.
mc.system.runInterval(() => {
    if (config.enableTPASystem) {
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
    if (!config.enableTPASystem) return;

    const { hurtEntity, damageSource } = eventData;
    // Ensure hurtEntity is a Player. For some reason, instanceof Player doesn't work directly with Player objects from events in some contexts.
    // Using a try-catch or checking for a unique player property like 'nameTag' or 'id' is safer.
    let playerNameTag;
    try {
        playerNameTag = hurtEntity.nameTag; // This will throw if hurtEntity is not a Player-like object
        if (typeof playerNameTag !== 'string') return;
    } catch (e) {
        return;
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
                const damageCause = damageSource?.cause || 'unknown';
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
 * @returns {Promise<void>}
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
        if (config.enableCPSCheck && checks.checkCPS) await checks.checkCPS(player, pData, config, playerUtils, playerDataManager, logManager, executeCheckAction);
        if (config.enableNukerCheck && checks.checkNuker) await checks.checkNuker(player, pData, config, playerUtils, playerDataManager, logManager, executeCheckAction);

        // ViewSnap check might need config and currentTick directly if not passed via dependencies object to all checks
        if (config.enableViewSnapCheck && checks.checkViewSnap) await checks.checkViewSnap(player, pData, config, currentTick, playerUtils, playerDataManager, logManager, executeCheckAction);

        if (config.enableNoSlowCheck && checks.checkNoSlow) {
            await checks.checkNoSlow(player, pData, config, playerUtils, playerDataManager, logManager, executeCheckAction, currentTick);
        }

        if (config.enableInvalidSprintCheck && checks.checkInvalidSprint) {
            await checks.checkInvalidSprint(player, pData, config, playerUtils, playerDataManager, logManager, executeCheckAction, currentTick);
        }

        if (config.enableAutoToolCheck && checks.checkAutoTool) {
            await checks.checkAutoTool(player, pData, config, playerUtils, playerDataManager, logManager, executeCheckAction, currentTick, player.dimension);
        }

        if (config.enableNameSpoofCheck && checks.checkNameSpoof) {
            await checks.checkNameSpoof(player, pData, config, playerUtils, playerDataManager, logManager, executeCheckAction, currentTick);
        }

        if (config.enableAntiGMCCheck && checks.checkAntiGMC) {
            await checks.checkAntiGMC(player, pData, config, playerUtils, playerDataManager, logManager, executeCheckAction, currentTick);
        }

        // Construct dependencies specifically for checkNetherRoof as its signature expects a 'dependencies' object
        const netherRoofDependencies = {
            config: config,
            playerDataManager: playerDataManager,
            playerUtils: playerUtils
            // logManager and executeCheckAction are not expected by checkNetherRoof's current signature
        };
        if (config.enableNetherRoofCheck && checks.checkNetherRoof) {
            // Note: checkNetherRoof is not async currently, so no await
            checks.checkNetherRoof(player, pData, netherRoofDependencies);
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
