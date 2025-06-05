import * as mc from '@minecraft/server';
import * as config from './config.js';
import * as playerUtils from './utils/playerUtils.js';
import * as playerDataManager from './core/playerDataManager.js';
import * as commandManager from './core/commandManager.js';
import * as uiManager from './core/uiManager.js';
import * as eventHandlers from './core/eventHandlers.js';

// Import all checks from the barrel file
import * as checks from './checks/index.js';

playerUtils.debugLog("Anti-Cheat Script Loaded. Initializing modules...");

// --- Event Subscriptions ---
// Pass necessary modules/objects to the handlers

mc.world.beforeEvents.chatSend.subscribe(async (eventData) => {
    if (eventData.message.startsWith(config.prefix)) { // Renamed
        // Pass necessary dependencies to handleChatCommand
        await commandManager.handleChatCommand(
            eventData,
            playerDataManager,
            uiManager,
            config,
            playerUtils,
            playerDataManager.getPlayerData(eventData.sender.id) // Pass sender's pData for convenience
        );
    } else {
        // Call the general chat handler for non-command messages
        eventHandlers.handleBeforeChatSend(eventData, playerDataManager, config, playerUtils);
    }
});

// Player Spawn Event for nametag updates and other initializations
mc.world.afterEvents.playerSpawn.subscribe((eventData) => {
    // PlayerDataManager and PlayerUtils are generally useful for most event handlers.
    eventHandlers.handlePlayerSpawn(eventData, playerDataManager, playerUtils);
});

mc.world.beforeEvents.playerLeave.subscribe((eventData) => {
    eventHandlers.handlePlayerLeave(eventData, playerDataManager, playerUtils);
});

mc.world.afterEvents.entityHurt.subscribe((eventData) => {
    // Pass config as well, if any handler needs it directly, though many will get it via checks or utils
    eventHandlers.handleEntityHurt(eventData, playerDataManager, checks, playerUtils, config, currentTick);
});

mc.world.beforeEvents.playerBreakBlock.subscribe((eventData) => {
    eventHandlers.handlePlayerBreakBlock(eventData, playerDataManager);
});

mc.world.afterEvents.playerBreakBlock.subscribe((eventData) => {
    eventHandlers.handlePlayerBreakBlockAfter(eventData, config, playerUtils);
});

mc.world.beforeEvents.itemUse.subscribe((eventData) => {
    eventHandlers.handleItemUse(eventData, playerDataManager, checks, playerUtils, config);
});

// Changed from itemUseOn to playerPlaceBlock for illegal item placement checks.
// The handleItemUseOn function expects eventData.player (or source) and eventData.itemStack,
// which PlayerPlaceBlockBeforeEvent provides.
mc.world.beforeEvents.playerPlaceBlock.subscribe((eventData) => {
    eventHandlers.handleItemUseOn(eventData, playerDataManager, checks, playerUtils, config);
});

let currentTick = 0;
mc.system.runInterval(async () => {
    currentTick++;

    const allPlayers = mc.world.getAllPlayers();
    playerDataManager.cleanupActivePlayerData(allPlayers);

    for (const player of allPlayers) {
        const pData = await playerDataManager.ensurePlayerDataInitialized(player, currentTick);
        if (!pData) {
            playerUtils.debugLog(`Critical: pData not available for ${player.nameTag} in tick loop after ensure.`, player.nameTag);
            continue;
        }

        playerDataManager.updateTransientPlayerData(player, pData, currentTick);

        // --- Call All Checks ---
        // Checks are now imported via the 'checks' barrel object.
        // They will internally use playerDataManager.addFlag if a violation is detected.
        // pData is passed, which includes velocity, positions, etc., updated by updateTransientPlayerData.

        if (config.enableFlyCheck) checks.checkFly(player, pData); // Renamed
        if (config.enableSpeedCheck) checks.checkSpeed(player, pData); // Renamed
        if (config.enableNofallCheck) checks.checkNoFall(player, pData);  // Renamed
        if (config.enableCpsCheck) checks.checkCPS(player, pData); // Renamed
        if (config.enableNukerCheck) checks.checkNuker(player, pData); // Renamed
        if (config.enableViewSnapCheck) checks.checkViewSnap(player, pData, config, currentTick); // Renamed

        // Fall distance accumulation and isTakingFallDamage reset
        // This logic is critical for NoFall's accuracy.
        if (!player.isOnGround) {
            // Check if velocity.y is significantly negative (falling)
            // Vanilla fall damage starts at -0.078125 m/tick^2 (or blocks/tick)
            // We use a slightly more lenient threshold to ensure we capture falls.
            if (pData.velocity.y < -0.07 && pData.previousPosition) {
                const deltaY = pData.previousPosition.y - pData.lastPosition.y;
                if (deltaY > 0) { // Ensure Y position actually decreased
                    pData.fallDistance += deltaY;
                }
            }
        } else { // Player is on ground
            // If NoFall check ran this tick and player took damage, isTakingFallDamage would be true.
            // If they landed from a fall but NoFall didn't flag (e.g., legitimate landing), reset fallDistance.
            // If they just walked on ground, fallDistance should be 0.
            if (!pData.isTakingFallDamage) {
                 pData.fallDistance = 0; // Reset if no damage was taken on landing or if just walking
            }
            pData.isTakingFallDamage = false; // Reset for the next tick cycle
        }
    }
}, 1);

playerUtils.debugLog("Anti-Cheat Core System Initialized. Event handlers and tick loop are active.", "System");
