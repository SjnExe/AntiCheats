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
    if (eventData.message.startsWith(config.PREFIX)) {
        // Pass necessary dependencies to handleChatCommand
        await commandManager.handleChatCommand(
            eventData,
            playerDataManager,
            uiManager,
            config,
            playerUtils,
            playerDataManager.getPlayerData(eventData.sender.id) // Pass sender's pData for convenience
        );
    }
});

mc.world.beforeEvents.playerLeave.subscribe((eventData) => {
    eventHandlers.handlePlayerLeave(eventData, playerDataManager, playerUtils);
});

mc.world.afterEvents.entityHurt.subscribe((eventData) => {
    eventHandlers.handleEntityHurt(eventData, playerDataManager, checks, playerUtils, config);
});

mc.world.beforeEvents.playerBreakBlock.subscribe((eventData) => {
    eventHandlers.handlePlayerBreakBlock(eventData, playerDataManager);
});

mc.world.beforeEvents.itemUse.subscribe((eventData) => {
    eventHandlers.handleItemUse(eventData, playerDataManager, checks, playerUtils, config);
});

mc.world.beforeEvents.itemUseOn.subscribe((eventData) => {
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

        if (config.ENABLE_FLY_CHECK) checks.checkFly(player, pData);
        if (config.ENABLE_SPEED_CHECK) checks.checkSpeed(player, pData);
        if (config.ENABLE_NOFALL_CHECK) checks.checkNoFall(player, pData); // Depends on pData.isTakingFallDamage & pData.fallDistance
        if (config.ENABLE_CPS_CHECK) checks.checkCPS(player, pData); // Uses pData.attackEvents
        if (config.ENABLE_NUKER_CHECK) checks.checkNuker(player, pData); // Uses pData.blockBreakEvents

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
