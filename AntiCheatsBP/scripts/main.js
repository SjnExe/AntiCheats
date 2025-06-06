import * as mc from '@minecraft/server';
import * as config from './config.js';
import * as playerUtils from './utils/playerUtils.js';
import * as playerDataManager from './core/playerDataManager.js';
import * as commandManager from './core/commandManager.js';
import * as uiManager from './core/uiManager.js';
import * as eventHandlers from './core/eventHandlers.js';
import * as logManager from './core/logManager.js'; // Ensure logManager is imported for addLog
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
        eventHandlers.handleBeforeChatSend(eventData, playerDataManager, config, playerUtils);
    }
});

/**
 * Handles player spawn events.
 * @param {mc.PlayerSpawnAfterEvent} eventData The player spawn event data.
 */
mc.world.afterEvents.playerSpawn.subscribe((eventData) => {
    eventHandlers.handlePlayerSpawn(eventData, playerDataManager, playerUtils, config);
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
mc.world.beforeEvents.playerBreakBlock.subscribe((eventData) => {
    // Pass necessary dependencies if checkIllegalItems (called via handlePlayerBreakBlock indirectly) needs them
    // For now, assuming checkIllegalItems gets what it needs from the event or pData
    eventHandlers.handlePlayerBreakBlock(eventData, playerDataManager);
});

/**
 * Handles player break block events after they occur.
 * @param {mc.PlayerBreakBlockAfterEvent} eventData The event data.
 */
mc.world.afterEvents.playerBreakBlock.subscribe((eventData) => {
    eventHandlers.handlePlayerBreakBlockAfter(eventData, config, playerUtils);
});

/**
 * Handles item use events before they occur.
 * @param {mc.ItemUseBeforeEvent} eventData The event data.
 */
mc.world.beforeEvents.itemUse.subscribe((eventData) => {
    eventHandlers.handleItemUse(eventData, playerDataManager, checks, playerUtils, config, logManager, executeCheckAction);
});

/**
 * Handles player place block events before they occur.
 * @param {mc.PlayerPlaceBlockBeforeEvent} eventData The event data.
 */
mc.world.beforeEvents.playerPlaceBlock.subscribe((eventData) => {
    // Assuming handleItemUseOn is a typo and should be handlePlayerPlaceBlock or similar,
    // or that checkIllegalItems within it handles the eventData type correctly.
    // For now, keeping as is from previous state.
    eventHandlers.handleItemUseOn(eventData, playerDataManager, checks, playerUtils, config, logManager, executeCheckAction);
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

        // --- Call All Checks ---
        // Pass executeCheckAction and logManager to all checks called in the tick loop
        if (config.enableFlyCheck && checks.checkFly) checks.checkFly(player, pData, config, playerUtils, playerDataManager, logManager, executeCheckAction);
        if (config.enableSpeedCheck && checks.checkSpeed) checks.checkSpeed(player, pData, config, playerUtils, playerDataManager, logManager, executeCheckAction);
        if (config.enableNofallCheck && checks.checkNoFall) checks.checkNoFall(player, pData, config, playerUtils, playerDataManager, logManager, executeCheckAction);
        if (config.enableCpsCheck && checks.checkCPS) checks.checkCPS(player, pData, config, playerUtils, playerDataManager, logManager, executeCheckAction);
        if (config.enableNukerCheck && checks.checkNuker) checks.checkNuker(player, pData, config, playerUtils, playerDataManager, logManager, executeCheckAction);

        // ViewSnap check might need config and currentTick directly if not passed via dependencies object to all checks
        if (config.enableViewSnapCheck && checks.checkViewSnap) checks.checkViewSnap(player, pData, config, currentTick, playerUtils, playerDataManager, logManager, executeCheckAction);

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
}, 1);

playerUtils.debugLog("Anti-Cheat Core System Initialized. Event handlers and tick loop are active.", "System");
