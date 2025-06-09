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
import { getBorderSettings } from './utils/worldBorderManager.js'; // For World Border
import { permissionLevels } from './core/rankManager.js'; // For World Border (used by playerUtils.getPlayerPermissionLevel)

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
        // Construct a comprehensive dependencies object for chat handler
        const chatHandlerDependencies = {
            config: config.editableConfigValues,
            automodConfig: config.editableConfigValues.automodConfig,
            playerUtils: playerUtils,
            logManager: logManager,
            actionManager: { executeCheckAction }, // Pass the wrapper
            playerDataManager: playerDataManager,
            checks: checks,
            currentTick: currentTick // currentTick from main.js tick loop scope
        };
        // Pass editableConfigValues as the 'config' parameter for the handler too
        await eventHandlers.handleBeforeChatSend(eventData, playerDataManager, config.editableConfigValues, playerUtils, checks, logManager, executeCheckAction, currentTick, chatHandlerDependencies);
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
    // Augment dependencies for handlePlayerSpawn to include more modules
    const spawnHandlerDependencies = {
        config: config.editableConfigValues, // Pass the editable runtime config
        automodConfig: config.editableConfigValues.automodConfig,
        playerUtils: playerUtils,
        logManager: logManager, // Pass the full logManager
        actionManager: { executeCheckAction }, // Pass executeCheckAction
        checks: checks, // Pass all available checks
        addLog: logManager.addLog // Keep addLog for direct use if still needed by handlePlayerSpawn internally
    };
    eventHandlers.handlePlayerSpawn(eventData, playerDataManager, playerUtils, config.editableConfigValues, spawnHandlerDependencies);
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
        automodConfig: config.editableConfigValues.automodConfig,
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
        automodConfig: config.editableConfigValues.automodConfig,
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
        automodConfig: config.editableConfigValues.automodConfig,
        playerUtils: playerUtils,
        logManager: logManager,
        actionManager: { executeCheckAction },
            playerDataManager: playerDataManager, // ensure playerDataManager is available
            checks: checks, // Add the checks object
            currentTick: currentTick // Add currentTick from the main tick loop scope
    };
    await eventHandlers.handleEntitySpawnEvent_AntiGrief(eventData, antiGriefDependencies);
});

/**
 * Handles piston activation events for AntiGrief checks (e.g., Piston Lag).
 * @param {mc.PistonActivateAfterEvent} eventData The event data.
 */
mc.world.afterEvents.pistonActivate.subscribe(async (eventData) => {
    // Using the same antiGriefDependencies as entitySpawn, as it contains all necessary components
    // (config, playerUtils, logManager, actionManager, playerDataManager, checks, currentTick)
    // If a more specific set is needed, a new dependencies object can be created here.
    await eventHandlers.handlePistonActivate_AntiGrief(eventData, antiGriefDependencies);
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
                    // if (playerForDebug && playerUtilsForDebug && playerUtilsForDebug.debugLog && playerUtilsForDebug.isWatched(playerForDebug.nameTag)) {
                    //     playerUtilsForDebug.debugLog(`SafeY: Found safe Y=${checkY} (solid below) for ${playerForDebug.nameTag} at XZ(${targetX.toFixed(1)},${targetZ.toFixed(1)})`, playerForDebug.nameTag);
                    // }
                    return checkY;
                } else if (blockFeet.isAir && blockHead.isAir) { // If below is not solid, but current spot is air (e.g. on a torch)
                    // if (playerForDebug && playerUtilsForDebug && playerUtilsForDebug.debugLog && playerUtilsForDebug.isWatched(playerForDebug.nameTag)) {
                    //     playerUtilsForDebug.debugLog(`SafeY: Found air Y=${checkY} (below not solid) for ${playerForDebug.nameTag} at XZ(${targetX.toFixed(1)},${targetZ.toFixed(1)})`, playerForDebug.nameTag);
                    // }
                    return checkY;
                }
            }
        } catch (e) {
            // if (playerForDebug && playerUtilsForDebug && playerUtilsForDebug.debugLog && playerUtilsForDebug.isWatched(playerForDebug.nameTag)) {
            //     playerUtilsForDebug.debugLog(`SafeY: Error checking Y=${checkY} (down) for ${playerForDebug.nameTag}: ${e}`, playerForDebug.nameTag);
            // }
        }
    }

    // If no spot found searching down, try searching up a little from initialY
    // Start from initialY + 1 because currentY might have been adjusted down by the loop above
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
                    // if (playerForDebug && playerUtilsForDebug && playerUtilsForDebug.debugLog && playerUtilsForDebug.isWatched(playerForDebug.nameTag)) {
                    //    playerUtilsForDebug.debugLog(`SafeY: Found safe Y=${checkY} (up, solid below) for ${playerForDebug.nameTag} at XZ(${targetX.toFixed(1)},${targetZ.toFixed(1)})`, playerForDebug.nameTag);
                    // }
                    return checkY;
                } else if (blockFeet.isAir && blockHead.isAir) { // Air gap, even if not solid below, is better than inside unknown block
                    // if (playerForDebug && playerUtilsForDebug && playerUtilsForDebug.debugLog && playerUtilsForDebug.isWatched(playerForDebug.nameTag)) {
                    //    playerUtilsForDebug.debugLog(`SafeY: Found air Y=${checkY} (up, below not solid) for ${playerForDebug.nameTag} at XZ(${targetX.toFixed(1)},${targetZ.toFixed(1)})`, playerForDebug.nameTag);
                    // }
                    return checkY;
                }
            }
        } catch(e) {
            // if (playerForDebug && playerUtilsForDebug && playerUtilsForDebug.debugLog && playerUtilsForDebug.isWatched(playerForDebug.nameTag)) {
            //     playerUtilsForDebug.debugLog(`SafeY: Error checking Y=${checkY} (up) for ${playerForDebug.nameTag}: ${e}`, playerForDebug.nameTag);
            // }
        }
    }

    // if (playerForDebug && playerUtilsForDebug && playerUtilsForDebug.debugLog && playerUtilsForDebug.isWatched(playerForDebug.nameTag)) {
    //     playerUtilsForDebug.debugLog(`SafeY: No ideal safe Y found for ${playerForDebug.nameTag} at XZ(${targetX.toFixed(1)},${targetZ.toFixed(1)}). Defaulting to ${Math.floor(initialY)}`, playerForDebug.nameTag);
    // }
    return Math.floor(initialY);
}


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

// Helper function for finding a safe Y level for teleportation
function findSafeY(player, dimension, x, z, startY, playerUtilsInstance) {
    const maxSearchDown = 3;
    const maxSearchUp = 5;
    const worldMinY = dimension.heightRange.min;
    const worldMaxY = dimension.heightRange.max;

    let currentY = Math.max(worldMinY, Math.min(Math.floor(startY), worldMaxY - 2));

    // Search down
    for (let i = 0; i <= maxSearchDown; i++) {
        const checkY = currentY - i;
        if (checkY < worldMinY) break;

        try {
            const blockBelow = dimension.getBlock({ x: x, y: checkY -1, z: z });
            const blockAtFeet = dimension.getBlock({ x: x, y: checkY, z: z });
            const blockAtHead = dimension.getBlock({ x: x, y: checkY + 1, z: z });

            if (blockBelow && !blockBelow.isAir && !blockBelow.isLiquid &&
                blockAtFeet && blockAtFeet.isAir &&
                blockAtHead && blockAtHead.isAir) {
                if (playerUtilsInstance.debugLog) playerUtilsInstance.debugLog(`SafeY: Found safe Y=${checkY} downwards for (${x},${z}) for player ${player.nameTag}`, player.nameTag);
                return checkY;
            }
        } catch (e) { /* getBlock can fail */ }
    }

    // Search up from original startY
    currentY = Math.floor(startY); // Start search from original Y upwards
    for (let i = 0; i <= maxSearchUp; i++) {
        const checkY = currentY + i;
        if (checkY > worldMaxY - 2) break;

        try {
            const blockBelow = dimension.getBlock({ x: x, y: checkY - 1, z: z });
            const blockAtFeet = dimension.getBlock({ x: x, y: checkY, z: z });
            const blockAtHead = dimension.getBlock({ x: x, y: checkY + 1, z: z });

            if (blockBelow && !blockBelow.isAir && !blockBelow.isLiquid &&
                blockAtFeet && blockAtFeet.isAir &&
                blockAtHead && blockAtHead.isAir) {
                if (playerUtilsInstance.debugLog) playerUtilsInstance.debugLog(`SafeY: Found safe Y=${checkY} upwards for (${x},${z}) for player ${player.nameTag}`, player.nameTag);
                return checkY;
            }
        } catch (e) { /* getBlock can fail */ }
    }

    if (playerUtilsInstance.debugLog) playerUtilsInstance.debugLog(`SafeY: No safe Y found for (${x},${z}) near ${startY} for player ${player.nameTag}, using original Y.`, player.nameTag);
    return Math.floor(startY);
}


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

    // --- Process Active Border Resizes (Dimension-based, runs once per server tick) ---
    const knownBorderDimensions = ["minecraft:overworld", "minecraft:the_nether", "minecraft:the_end"];
    for (const dimId of knownBorderDimensions) {
        let dimBorderSettings = null;
        try {
            // Ensure getBorderSettings and saveBorderSettings are in scope. They are imported at the top of main.js.
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

            if (effectiveElapsedMs >= durationMs) { // Resize finished
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
                     // Ensure logManager is imported and available if this line is uncommented
                     if (logManager && typeof logManager.addLog === 'function') {
                        logManager.addLog({ adminName: 'System', actionType: 'worldborder_resize_complete', targetName: dimId, details: `Resize to ${targetSize} complete.` });
                     }
                } else {
                    console.warn(`[AntiCheat][WorldBorder] Failed to save completed border resize for ${dimId}.`);
                }
            }
        }
    }
    // --- End of Processing Active Border Resizes ---

    const allPlayers = mc.world.getAllPlayers();
    playerDataManager.cleanupActivePlayerData(allPlayers);

    for (const player of allPlayers) {
        const pData = await playerDataManager.ensurePlayerDataInitialized(player, currentTick);
        if (!pData) {
            if (playerUtils.debugLog) playerUtils.debugLog(`Critical: pData not available for ${player.nameTag} in tick loop after ensure.`, player.nameTag);
            continue;
        }

        // Initialize World Border Visuals pData field if it doesn't exist
        pData.lastBorderVisualTick = pData.lastBorderVisualTick || 0;

        // Initialize World Border pData fields if they don't exist (moved up for clarity)
        pData.ticksOutsideBorder = pData.ticksOutsideBorder || 0;
        pData.borderDamageApplications = pData.borderDamageApplications || 0;

        if (!pData) { // This check is redundant now due to the earlier one, but kept for safety if code moves
            if (playerUtils.debugLog) playerUtils.debugLog(`Critical: pData somehow became null for ${player.nameTag} before transient update.`, player.nameTag);
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

        // Periodic Invalid Render Distance Check
        if (config.enableInvalidRenderDistanceCheck && (currentTick - (pData.lastRenderDistanceCheckTick || 0) >= 400)) { // 400 ticks = 20 seconds
            if (checks.checkInvalidRenderDistance) {
                const renderDistDependencies = {
                    config: config.editableConfigValues, // Ensure this is the editable one
                    automodConfig: config.editableConfigValues.automodConfig,
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
                    config.editableConfigValues, // Pass editableConfigValues explicitly
                    playerUtils,
                    logManager,
                    { executeCheckAction },
                    renderDistDependencies
                );
            }
            pData.lastRenderDistanceCheckTick = currentTick;
        }

        // Construct dependencies specifically for checkNetherRoof as its signature expects a 'dependencies' object
        const netherRoofDependencies = {
            config: config.editableConfigValues, // Ensure this is the editable one
            automodConfig: config.editableConfigValues.automodConfig,
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
            if (pData.velocity.y < -0.07 && pData.previousPosition) { // Ensure previousPosition exists
                const deltaY = pData.previousPosition.y - pData.lastPosition.y; // Ensure lastPosition exists
                if (deltaY > 0) {
                    pData.fallDistance += deltaY;
                }
            }
        } else { // Player is on ground
            if (!pData.isTakingFallDamage) { // Only reset fallDistance if not currently processing fall damage
                 pData.fallDistance = 0;
            }
            pData.isTakingFallDamage = false; // Reset this flag once player is on ground
        }

        // World Border Enforcement
        // borderSettings variable will be declared here for potential use in Visuals section too
        let borderSettings = null;
        if (config.enableWorldBorderSystem) { // config here is config.editableConfigValues from the tick loop scope
            borderSettings = getBorderSettings(player.dimension.id);

            if (borderSettings && borderSettings.enabled) {
                const playerPermLevel = playerUtils.getPlayerPermissionLevel(player);

                if (playerPermLevel > permissionLevels.admin) { // Apply to non-admins/owners
                    const loc = player.location;
                    let isPlayerOutside = false;
                    let targetX = loc.x; // Default to current location, will be updated if outside
                    let targetZ = loc.z;

                    // Calculate effective size if resizing
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
                            // If paused, use the time elapsed until the pause started
                            const lastPauseStart = borderSettings.resizeLastPauseStartTimeMs || currentTimeMs; // Fallback
                            elapsedMs = (lastPauseStart - borderSettings.resizeStartTimeMs) - accumulatedPausedMs;
                        } else {
                            // If not paused, use current time minus start time, adjusted for total paused duration
                            elapsedMs = (currentTimeMs - borderSettings.resizeStartTimeMs) - accumulatedPausedMs;
                        }
                        elapsedMs = Math.max(0, elapsedMs); // Ensure elapsedMs is not negative

                        const durationMs = borderSettings.resizeDurationMs;
                        let progress = 0;

                        if (durationMs > 0) {
                             progress = Math.min(1, elapsedMs / durationMs);
                        } else {
                             progress = 1;
                        }

                        const interpolatedSize = borderSettings.originalSize + (borderSettings.targetSize - borderSettings.originalSize) * progress;

                        if (borderSettings.shape === "square") {
                            currentEffectiveHalfSize = interpolatedSize;
                        } else if (borderSettings.shape === "circle") {
                            currentEffectiveRadius = interpolatedSize;
                        }
                    } else if (borderSettings.isResizing && borderSettings.enabled) {
                        // Fallback or if resize fields are somehow incomplete
                        // This indicates an issue, ideally the dimension loop should have cleaned/finalized it.
                        // For safety, use targetSize if isResizing is still true but params seem off.
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

                        const enableDamage = borderSettings.enableDamage ?? config.worldBorderDefaultEnableDamage;
                        const damageAmount = borderSettings.damageAmount ?? config.worldBorderDefaultDamageAmount;
                        const damageIntervalTicks = borderSettings.damageIntervalTicks ?? config.worldBorderDefaultDamageIntervalTicks;
                        const teleportAfterNumDamageEvents = borderSettings.teleportAfterNumDamageEvents ?? config.worldBorderTeleportAfterNumDamageEvents;

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
                            // const safeY = findSafeY(player, player.dimension, targetX, targetZ, loc.y, playerUtils); // Old call
                            const safeY = findSafeTeleportY(player.dimension, targetX, loc.y, targetZ, player, playerUtils);
                            try {
                                player.teleport({ x: targetX, y: safeY, z: targetZ }, { dimension: player.dimension });
                                if (config.worldBorderWarningMessage) {
                                    playerUtils.warnPlayer(player, config.worldBorderWarningMessage);
                                }
                                if (playerUtils.debugLog && pData.isWatched) {
                                    playerUtils.debugLog(`WorldBorder: Teleported ${player.nameTag} to XZ(${targetX.toFixed(1)},${targetZ.toFixed(1)}) Y=${safeY}. Reason: ${enableDamage && pData.borderDamageApplications >= teleportAfterNumDamageEvents ? 'Max damage events reached' : (!enableDamage ? 'Standard enforcement' : 'Damage logic did not require teleport yet')}.`, player.nameTag);
                                }
                                pData.ticksOutsideBorder = 0;
                                pData.borderDamageApplications = 0;
                                pData.isDirtyForSave = true;
                            } catch (e) {
                                console.warn(`[WorldBorder] Failed to teleport player ${player.nameTag}: ${e}`);
                                 if (playerUtils.debugLog && pData.isWatched) { // Check pData.isWatched for contextual logging
                                     playerUtils.debugLog(`WorldBorder: Teleport failed for ${player.nameTag}. Error: ${e}`, player.nameTag);
                                 }
                            }
                        }

                    } else { // Player is inside the border
                        if (pData.ticksOutsideBorder > 0 || pData.borderDamageApplications > 0) {
                             if (playerUtils.debugLog && pData.isWatched) { // Check pData.isWatched for contextual logging
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

        // World Border Visuals
        if (config.enableWorldBorderSystem && config.worldBorderEnableVisuals) {
            // Use borderSettings if already fetched by enforcement, otherwise fetch it.
            const currentBorderSettings = borderSettings || getBorderSettings(player.dimension.id);

            if (currentBorderSettings && currentBorderSettings.enabled) {
                if (currentTick - (pData.lastBorderVisualTick || 0) >= config.worldBorderVisualUpdateIntervalTicks) {
                    pData.lastBorderVisualTick = currentTick;
                    // No need to set pData.isDirtyForSave for lastBorderVisualTick as it's transient and not saved

                    const playerLoc = player.location; // playerLoc is already defined earlier in the player loop
                    // Use per-dimension override if available, otherwise global default
                    const particleNameToUse = currentBorderSettings.particleNameOverride || config.editableConfigValues.worldBorderParticleName;
                    const visualRange = config.editableConfigValues.worldBorderVisualRange;
                    const density = Math.max(0.1, config.editableConfigValues.worldBorderParticleDensity);
                    const wallHeight = config.editableConfigValues.worldBorderParticleWallHeight;
                    const segmentLength = config.editableConfigValues.worldBorderParticleSegmentLength;
                    const yBase = Math.floor(playerLoc.y);

                    // Use currentEffectiveHalfSize/Radius from the enforcement section
                    // currentBorderSettings is the same as borderSettings from the enforcement section in this player loop iteration

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
                                    } catch (e) { /* Silently ignore */ }
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
                                    } catch (e) { /* Silently ignore */ }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // Deferred player data saving
    if (currentTick % 600 === 0) { // Approx every 30 seconds (600 ticks / 20 ticks_per_second)
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
