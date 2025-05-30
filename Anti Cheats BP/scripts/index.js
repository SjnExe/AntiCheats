import { world, system } from '@minecraft/server'; // Ensure system and world are imported
// import * as Minecraft from '@minecraft/server'; // Unused Minecraft import
// Local Script Imports
import CONFIG from "./config.js"; // Assuming this is still CONFIG.default structure
// import { i18n } from './assets/i18n.js'; // Unused i18n import
import "./command/importer.js"; // Still needed for command registration?
import "./slash_commands.js"; // Still needed for slash command registration?
// import { ModuleStatusManager } from './classes/module.js'; // Unused ModuleStatusManager import

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
			} catch (_playerError) { // playerError -> _playerError
			    // Intentionally empty - errors for individual player setup shouldn't stop others
			}
		}
		
		initializeReachCheck(); 
		initializeNoSwingCheck(); 


	} catch (_e) { // e -> _e
	    // Intentionally empty - main initialization errors are logged by Initialize() or other sub-initializers
	}
});

// Any other essential, top-level logic that doesn't fit into the new modules would remain here.
// For instance, one-time version checks or dynamic property initializations for the world itself, if any.
system.run(async () => {
    try {
        const currentVersion = world.getDynamicProperty("ac:version");
        if (currentVersion !== CONFIG.version) { // Assuming config is now CONFIG.default -> CONFIG
            world.setDynamicProperty("ac:version", CONFIG.version);
            // Potentially send a message to admins about the update if it's a significant version change
            // This could also be part of Initialize() or a dedicated update/migration script.
        }
    } catch (_e) { // e -> _e
        // Intentionally empty - version check failure is not critical
    }
});
