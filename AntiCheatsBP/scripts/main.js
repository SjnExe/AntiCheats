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

// import { permissionLevels } from './core/rankManager.js'; // REMOVED - Unused in main.js

playerUtils.debugLog("Anti-Cheat Script Loaded. Initializing modules...");

// --- Event Subscriptions ---

/**
 * Handles chat messages before they are sent.
 * If a message starts with the command prefix, it's treated as a command.
 * Otherwise, it's processed as a regular chat message.
 * @param {mc.ChatSendBeforeEvent} eventData The chat send event data.
 */
mc.world.beforeEvents.chatSend.subscribe(async (eventData) => {
    // Standardized dependencies object
    const dependencies = {
        config: configModule.editableConfigValues,
        configModule: configModule, // Provide access to the whole module (e.g., for functions like updateConfigValue)
        playerUtils,
        playerDataManager,
        logManager,
        actionManager: { executeCheckAction },
        checks,
        uiManager, // Added for command processing
        commandManager, // Added for command processing
        commandExecutionMap: commandManager.commandExecutionMap, // Added for command processing
        currentTick,
        // Note: automodConfig is now part of config.editableConfigValues, so accessible via dependencies.config.automodConfig
    };

    if (eventData.message.startsWith(dependencies.config.prefix)) {
        // Pass the standardized dependencies object to handleChatCommand
        // handleChatCommand internally will use dependencies.config, dependencies.playerDataManager etc.
        await commandManager.handleChatCommand(eventData, dependencies);
    } else {
        // Pass the standardized dependencies object to the chat event handler
        await eventHandlers.handleBeforeChatSend(eventData, dependencies);
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
    const dependencies = {
        config: configModule.editableConfigValues,
        configModule: configModule,
        playerUtils,
        playerDataManager,
        logManager,
        actionManager: { executeCheckAction },
        checks,
        currentTick
        // uiManager, commandManager not typically needed directly in spawn event handler
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
        actionManager: { executeCheckAction }, // Though likely not used in leave
        checks, // Though likely not used in leave
        currentTick
    };
    eventHandlers.handlePlayerLeave(eventData, dependencies);
});

/**
 * Handles entity hurt events, primarily for combat-related checks.
 * @param {mc.EntityHurtAfterEvent} eventData The entity hurt event data.
 */
// Existing entityHurt subscription for general combat checks and NoFall
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

// New subscription specifically for Combat Log interaction tracking
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
    // This handler might call two sub-handlers, both should get the same dependencies.
    await eventHandlers.handlePlayerPlaceBlockBefore(eventData, dependencies);
    // handlePlayerPlaceBlockBeforeEvent_AntiGrief is also called inside handlePlayerPlaceBlockBefore if needed,
    // or could be called here if its logic is distinct and always runs.
    // For now, assuming handlePlayerPlaceBlockBefore covers it or calls it.
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
    // This handler's original signature was: (eventData, playerDataManager, checks, playerUtils, config, logManager, executeCheckAction, currentTick)
    // It needs to be adapted to use the dependencies object if it's standardized.
    // For now, passing a constructed one.
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
    // The original handleInventoryItemChange had a different signature pattern.
    // Assuming it's refactored to accept (eventData, dependencies) like others.
    // If not, this call would need to match its specific signature.
    // For the sake of this refactor, we'll assume it's standardized:
    // await eventHandlers.handleInventoryItemChange(eventData, dependencies);
    // Keeping original call structure for now if its signature is very different:
    await eventHandlers.handleInventoryItemChange(eventData.player, eventData.newItem, eventData.oldItem, eventData.slotName, dependencies);
});

/**
 * Handles player dimension change events after they occur.
 * @param {mc.PlayerDimensionChangeAfterEvent} eventData The event data.
 */
mc.world.afterEvents.playerDimensionChange.subscribe((eventData) => {
    const dependencies = {
        config: configModule.editableConfigValues,
        configModule: configModule,
        playerUtils,
        playerDataManager,
        // logManager, // REMOVED - Not directly used by handlePlayerDimensionChangeAfterEvent
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

// Periodically clear expired TPA requests (e.g., every second = 20 ticks)
// Also process TPA warmups in this interval or a similar one.
mc.system.runInterval(() => {
    if (configModule.editableConfigValues.enableTPASystem) { // Access via editableConfigValues
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
                    return checkY;
                } else if (blockFeet.isAir && blockHead.isAir) {
                    return checkY;
                }
            }
        } catch (e) {
            // Error during block check, continue
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
                    return checkY;
                } else if (blockFeet.isAir && blockHead.isAir) {
                    return checkY;
                }
            }
        } catch(e) {
            // Error during block check, continue
        }
    }

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
    if (dependencies.config.enableWorldBorderSystem) {
            borderSettings = getBorderSettings(player.dimension.id); // Assuming getBorderSettings doesn't need full dependencies

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

                        elapsedMs = Math.max(0, elapsedMs); // Ensure elapsedMs is not negative

                        const durationMs = borderSettings.resizeDurationMs;
                        let rawProgress = 0;

                        if (durationMs > 0) {
                             rawProgress = Math.min(1, elapsedMs / durationMs);
                        } else {
                             rawProgress = 1;
                        }

                        let easedProgress = rawProgress; // Default to linear
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

                        const enableDamage = borderSettings.enableDamage ?? dependencies.config.worldBorderDefaultEnableDamage;
                        const damageAmount = borderSettings.damageAmount ?? dependencies.config.worldBorderDefaultDamageAmount;
                        const damageIntervalTicks = borderSettings.damageIntervalTicks ?? dependencies.config.worldBorderDefaultDamageIntervalTicks;
                        const teleportAfterNumDamageEvents = borderSettings.teleportAfterNumDamageEvents ?? dependencies.config.worldBorderTeleportAfterNumDamageEvents;

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
                                if (dependencies.config.worldBorderWarningMessage) {
                                    // Assuming worldBorderWarningMessage is a key, needs getString
                                    playerUtils.warnPlayer(player, getString(dependencies.config.worldBorderWarningMessage));
                                }
                                if (dependencies.playerUtils.debugLog && pData.isWatched) {
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
        if (dependencies.config.enableWorldBorderSystem && dependencies.config.worldBorderEnableVisuals) {
            // Use borderSettings if already fetched by enforcement, otherwise fetch it.
            const currentBorderSettings = borderSettings || getBorderSettings(player.dimension.id);

            if (currentBorderSettings && currentBorderSettings.enabled) {
                if (currentTick - (pData.lastBorderVisualTick || 0) >= dependencies.config.worldBorderVisualUpdateIntervalTicks) {
                    pData.lastBorderVisualTick = currentTick;

                    const playerLoc = player.location;
                    let particleNameToUse;
                    const particleSequence = dependencies.config.worldBorderParticleSequence;

                    if (Array.isArray(particleSequence) && particleSequence.length > 0) {
                        const visualUpdateInterval = dependencies.config.worldBorderVisualUpdateIntervalTicks > 0 ? dependencies.config.worldBorderVisualUpdateIntervalTicks : 20; // Default to 20 if interval is 0 to prevent division by zero
                        const sequenceIndex = Math.floor(currentTick / visualUpdateInterval) % particleSequence.length;
                        particleNameToUse = particleSequence[sequenceIndex];
                    } else {
                        particleNameToUse = currentBorderSettings.particleNameOverride || dependencies.config.worldBorderParticleName;
                    }
                    const visualRange = dependencies.config.worldBorderVisualRange;
                    let density;
                    if (dependencies.config.worldBorderEnablePulsingDensity) {
                        const pulseSpeed = dependencies.config.worldBorderPulseSpeed > 0 ? dependencies.config.worldBorderPulseSpeed : 1.0;
                        const pulseTime = (currentTick * pulseSpeed) / 20.0; // Assuming 20 TPS for a cycle related to pulseSpeed = 1.0 per ~6.28s
                        const sineWave = Math.sin(pulseTime); // Oscillates between -1 and 1
                        const minDensity = dependencies.config.worldBorderPulseDensityMin > 0 ? dependencies.config.worldBorderPulseDensityMin : 0.1;
                        const maxDensity = dependencies.config.worldBorderPulseDensityMax > minDensity ? dependencies.config.worldBorderPulseDensityMax : minDensity + 1.0;

                        density = mapRange(sineWave, -1, 1, minDensity, maxDensity);
                        density = Math.max(0.1, density); // Ensure density is at least 0.1
                    } else {
                        density = Math.max(0.1, dependencies.config.worldBorderParticleDensity);
                    }
                    const wallHeight = dependencies.config.worldBorderParticleWallHeight;
                    const segmentLength = dependencies.config.worldBorderParticleSegmentLength;
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
        // Persist logs and reports if they are dirty
        if (logManager.persistLogCacheToDisk) {
            logManager.persistLogCacheToDisk();
        }
        if (reportManager.persistReportsToDisk) {
            reportManager.persistReportsToDisk();
        }
    }
}, 1);

playerUtils.debugLog("Anti-Cheat Core System Initialized. Event handlers and tick loop are active.", "System");
