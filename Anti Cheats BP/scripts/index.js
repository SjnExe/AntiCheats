import { world, system } from '@minecraft/server'; // Ensure system and world are imported
import * as Minecraft from '@minecraft/server'; // For types like Player, GameMode, etc.

// Local Script Imports
import * as config from "./config.js"; // Assuming this is still CONFIG.default structure
import { i18n } from './assets/i18n.js';
// import { logDebug, sendMessageToAllAdmins } from "./assets/util.js"; // Selected utils, others are in their modules
// import { globalBanList as seedGlobalBanList } from './assets/global_ban_list.js'; // Moved to player_event_handlers
// import { commandHandler } from './command/handle.js'; // Moved to chat_manager
import "./command/importer.js"; // Still needed for command registration?
import "./slash_commands.js"; // Still needed for slash command registration?
import { ModuleStatusManager } from './classes/module.js';
// import { Vector3utils } from './classes/vector3.js'; // Moved to periodic_checks or other relevant modules

import "./classes/player.js"; // Player prototype extensions
import { Initialize } from './initialize.js';
import { initializeReachCheck } from './modules/reach_check.js';
import { initializeNoSwingCheck } from './modules/noswing_check.js';

// Import new refactored modules for their side effects (event subscriptions, system.runInterval calls)
import "./managers/chat_manager.js";
import "./handlers/player_event_handlers.js";
import "./handlers/combat_event_handlers.js";
import "./handlers/world_interaction_handlers.js";
import "./systems/periodic_checks.js";


// logDebug("[Anti Cheats] Script Loaded - Refactored Structure");

// --- Global Variables and Constants ---
// Most global variables (currentTickCounter, log arrays, MAX_LOG_ENTRIES, gamertagRegex)
// have been moved to their respective modules (e.g., periodic_checks.js, player_event_handlers.js).
// `world` is imported directly in modules that need it.


// --- Removed Event Subscriptions and Functions ---
// All event subscriptions (chatSend, playerJoin, playerLeave, entityHitEntity, etc.)
// and their helper functions (handleMute, handleAntiSpam, addPlayerActivityLog, etc.)
// have been moved to the new modules.

// --- Removed Periodic Checks ---
// All system.runInterval blocks (main tick loop, Night Vision, log saving, vanish reminder)
// have been moved to `systems/periodic_checks.js`.
// The `betaFeatures` function is also moved there.


// --- Remaining Initial Setup ---

/**
 * Executes a one-time setup routine when the script module is initially loaded by the server.
 * This block is intended for final initializations that should occur once the world is active
 * and other core systems are expected to be available.
 */
system.run(() => { // Final initialization run
	try {
		if(!world.acInitialized) Initialize(); // Ensure main initialization logic is called
		
		// Cache initial gamemodes for all currently online players
		// Note: player.currentGamemode is also set in playerSpawn event for players joining later.
		for (const player of world.getPlayers()) {
			try {
				// Ensure player prototype extensions have loaded if they set player.currentGamemode
				// If player.js directly manipulates GameMode, this is fine.
				// Otherwise, explicitly set it:
				// player.setDynamicProperty("currentGamemode", player.getGameMode()); // Example if not using prototype
                if (player.getGameMode) { // Check if method exists
                    // Assuming player.js extension adds currentGamemode or similar handling
                     player.currentGamemode = player.getGameMode();
                }
			} catch (playerError) {
				// logDebug("[Anti Cheats ERROR] Error setting currentGamemode for player on initial run:", player?.name, playerError, playerError.stack);
			}
		}
		
		initializeReachCheck(); 
		initializeNoSwingCheck(); 

		// logDebug("[Anti Cheats] Initial setup checks complete.");

	} catch (e) {
		// logDebug("[Anti Cheats ERROR] Error in final system.run for initialization:", e, e.stack);
	}
});

// Any other essential, top-level logic that doesn't fit into the new modules would remain here.
// For instance, one-time version checks or dynamic property initializations for the world itself, if any.
system.run(async () => {
    try {
        const currentVersion = world.getDynamicProperty("ac:version");
        if (currentVersion !== config.CONFIG.version) { // Assuming config is now CONFIG.default -> CONFIG
            world.setDynamicProperty("ac:version", config.CONFIG.version);
            // logDebug(`[Anti Cheats] Updated ac:version from ${currentVersion} to ${config.CONFIG.version}`);
            // Potentially send a message to admins about the update if it's a significant version change
            // This could also be part of Initialize() or a dedicated update/migration script.
        }
    } catch (e) {
        // logDebug("[Anti Cheats ERROR] Error checking/setting ac:version dynamic property:", e, e.stack);
    }
});
