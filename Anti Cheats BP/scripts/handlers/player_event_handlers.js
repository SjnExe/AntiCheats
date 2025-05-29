import { world, system } from "@minecraft/server"; // Ensure world and system are imported
import CONFIG from "../config.js";
import { i18n } from "../assets/i18n.js"; // Assuming i18n is from assets
import { sendMessageToAdmins } from "../assets/util.js"; // Assuming 효율 is still needed, otherwise remove
import { ModuleStatusManager as ACModule } from "../classes/module.js";
import { seedGlobalBanList } from "../assets/global_ban_list.js"; // Assuming this is used or will be used
import { inMemoryPlayerActivityLogs, MAX_LOG_ENTRIES, initializePlayerState, removePlayerState } from "../systems/periodic_checks.js";

const gamertagRegex = /^[a-zA-Z0-9_ ]{3,16}$/; // Max length 16 for Xbox, 3-24 generally

// Function to add player activity log
function addPlayerActivityLog(player, activity) {
    if (inMemoryPlayerActivityLogs.length >= MAX_LOG_ENTRIES) {
        inMemoryPlayerActivityLogs.shift(); // Remove the oldest entry
    }
    inMemoryPlayerActivityLogs.push({
        timestamp: new Date().toISOString(),
        player: player.name,
        activity: activity
    });
}

// Player Join Event
world.afterEvents.playerJoin.subscribe((eventData) => {
    const player = eventData.player;
    const playerId = player.id;
    const initialLocation = player.location;
    const currentTick = system.currentTick;

    initializePlayerState(playerId, initialLocation, currentTick);

    addPlayerActivityLog(player, "joined");

    // Global Ban Check
    if (seedGlobalBanList.includes(player.name)) {
        player.kick(i18n.getText("system.global_ban_kick_message", {}, player));
        sendMessageToAdmins("system.global_ban_alert", { player: player.name });
        return; // Stop further processing for banned player
    }

    // Gamertag validation
    if (!gamertagRegex.test(player.name)) {
        player.kick(i18n.getText("system.invalid_gamertag_kick", {}, player));
        sendMessageToAdmins("system.invalid_gamertag_alert", { player: player.name });
        return;
    }

    // Welcome message
    if (CONFIG.uiSettings.welcomeMessage && CONFIG.uiSettings.welcomeMessage.length > 0) {
        player.sendMessage(i18n.getText("system.welcome_message", { player: player.name }, player));
    }

    // Admin join notification
    if (player.hasTag("admin")) {
        sendMessageToAdmins("system.admin_join_notification", { player: player.name }, true); // true to exclude self
    }

    // Dynamic property initialization for modules (example)
    // TODO: Revisit module dynamic property initialization. 
    // The previous ACModule.getAllModules() returned objects with id, dynamicProperties, and defaultDynamicValue.
    // The new ModuleStatusManager.getValidModules() returns an array of module names (strings).
    // A different approach is needed here if per-module dynamic properties need to be set on player join.
    // For now, commenting out to prevent errors.
    // ACModule.getValidModules().forEach(moduleName => {
    //     // Example: if a module definition object could be retrieved by name:
    //     // const moduleDefinition = ACModule.getModuleDefinition(moduleName); // This function doesn't exist
    //     // if (moduleDefinition && moduleDefinition.dynamicProperties && player.getDynamicProperty(moduleDefinition.id) === undefined) {
    //     //     player.setDynamicProperty(moduleDefinition.id, moduleDefinition.defaultDynamicValue);
    //     // }
    // });
});

// Player Leave Event
world.afterEvents.playerLeave.subscribe((eventData) => {
    const playerName = eventData.playerName; // In case player object is not available
    const playerId = eventData.playerId;

    // It's good practice to ensure player object exists if needed for addPlayerActivityLog
    // However, for removePlayerState, only playerId is needed.
    // The 'player' variable was defined as eventData.player which might be undefined on leave.
    // For addPlayerActivityLog, if it requires a Player object, it might need adjustment
    // or to use a placeholder if the full Player object isn't guaranteed.
    // For now, assuming addPlayerActivityLog can handle 'playerName' if 'player' object is not fully available.
    // If addPlayerActivityLog strictly needs a Player object, this might be:
    // const playerForLog = world.getPlayer(playerName);
    // if(playerForLog) addPlayerActivityLog(playerForLog, ...); else addPlayerActivityLog({name: playerName}, ...);

    addPlayerActivityLog({ name: playerName }, `left (Reason: ${eventData.cause})`); // Minecraft API does not provide cause directly

    removePlayerState(playerId);
});

// Player Dimension Change Event
world.afterEvents.playerDimensionChange.subscribe((eventData) => {
    const player = eventData.player;
    addPlayerActivityLog(player, `changed dimension from ${eventData.oldDimension.identifier} to ${eventData.newDimension.identifier}`);
    // Example: Resetting fall distance to prevent false positives in NoFall detection
    player.setDynamicProperty("fall_distance_custom", 0);
});

// Player Spawn Event
world.afterEvents.playerSpawn.subscribe((eventData) => {
    const player = eventData.player;
    if (eventData.initialSpawn) {
        addPlayerActivityLog(player, "initially spawned");
        // Perform actions specific to the very first time a player spawns in the world

    } else {
        addPlayerActivityLog(player, "respawned");
        // Perform actions for respawns (e.g., after death)
    }
    // For spawn, if state needs re-initialization or specific updates (like lastGroundTime):
    removePlayerState(player.id); // Remove old state if any (e.g. if player re-logged quickly)
    initializePlayerState(player.id, player.location, system.currentTick); // Re-initialize state
});

// Player Game Mode Change Event
world.afterEvents.playerGameModeChange.subscribe((eventData) => {
    const player = eventData.player;
    addPlayerActivityLog(player, `game mode changed from ${eventData.oldGameMode} to ${eventData.newGameMode}`);
    // Removed: if (configData.log_gamemode_changes) { ... } block as log_gamemode_changes is not in CONFIG.
});

// Export functions if they need to be called from elsewhere.
// For event subscriptions, side effects are often enough.
// addPlayerActivityLog might be useful elsewhere if direct logging is needed outside events.
export { addPlayerActivityLog, gamertagRegex };
