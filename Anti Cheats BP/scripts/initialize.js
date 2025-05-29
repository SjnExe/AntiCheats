import * as Minecraft from '@minecraft/server';
import { logDebug } from './assets/logger.js';
import CONFIG from './config.js';
import { globalBanList } from './assets/global_ban_list.js'; // Added import
// Removed i18n import

// PACKAGED_LANGUAGE_DATA object removed from here

// Removed logDebug: "[Anti Cheats] Setting up language dynamic properties..."
let inMemoryGeneralLogs = [];
const MAX_GENERAL_LOG_ENTRIES = 100; 

const world = Minecraft.world;

// Make sure 'world' and 'logDebug' are accessible.
// 'world' is typically: const world = Minecraft.world; (already in the file)
// 'logDebug' should be imported: import { logDebug, ... } from './assets/util'; (already in the file)
// 'PACKAGED_LANGUAGE_DATA' should also be defined in this file (from the previous step).

/**
 * Initializes the Anti Cheats addon.
 * This function is responsible for setting up various components of the addon when the world loads.
 * Key operations include:
 * - Ensuring necessary scoreboard objectives are created (`ac:gametest_on`, `ac:vanish`, `ac:notify`, `ac:setup_success`).
 * - Setting default game rules (`sendCommandFeedback: false`, `commandBlockOutput: false`) if not already set.
 * - Loading and applying the world border from a dynamic property (`ac:worldBorder`).
 * - Initializing world dynamic properties for persistent data storage, including:
 *   - `ac:unbanQueue`: Stores a list of player names pending unban.
 *   - `ac:deviceBan`: Stores a list of banned device IDs.
 *   - `ac:logs`: Stores general addon operational logs (via `world.addLog`).
 *   - `ac:version`: Tracks the current version of the addon.
 *   - `ac:config`: Stores user-modified configuration settings.
 *   - `ac:gbanList`: Stores the global ban list, seeded from `globalBanList.js` if not present.
 * - Designating the world owner: Checks for an existing owner in dynamic properties. If not found, it checks the `ownerPlayerNameManual` field in `config.js`. If an owner is still not set, it can then be claimed using the `!owner` command.
 * - Starting a script-observed TPS (Ticks Per Second) monitor, which periodically calculates and stores the script execution TPS in `ac:systemInfo_scriptTps`.
 * - Marking the script setup as complete (`ac:scriptSetupComplete`, `world.acInitialized`).
 * All operations that modify world state or subscribe to events are typically run within `Minecraft.system.run()`
 * to ensure they execute in a safe context after the world is fully loaded.
 * @returns {void}
 */
export function Initialize(){
    Minecraft.system.run(() => {
        /**
         * @description Ensures necessary scoreboard objectives for the addon are created if they don't already exist.
         */
        const objectives = [
            "ac:gametest_on",
            "ac:vanish",
            "ac:notify",
            "ac:setup_success"
        ];
        objectives.forEach(obj => {
            if (world.scoreboard.getObjective(obj) == undefined) {
                try {
                    world.scoreboard.addObjective(obj, obj); // Use obj as display name too, or customize
                    // Removed logDebug: Created scoreboard objective
                } catch (e) {
                    logDebug(`[Anti Cheats] Failed to create scoreboard objective ${obj}:`, e);
                }
            }
        });

        /**
         * @description Initializes specific game rules if they haven't been set by this addon before.
         * Sets `sendCommandFeedback` and `commandBlockOutput` to `false`.
         * Marks completion by setting the "ac:gamerulesSet" dynamic property.
         */
        if (world.getDynamicProperty("ac:gamerulesSet") === undefined) {
            try {
                world.gameRules.sendCommandFeedback = false;
                world.gameRules.commandBlockOutput = false;
                world.setDynamicProperty("ac:gamerulesSet", true);
                // Removed logDebug: Initialized gamerules
            } catch (e) {
                logDebug("[Anti Cheats] Failed to initialize gamerules:", e);
            }
        }

        /**
         * @description Loads the world border value from the "ac:worldBorder" dynamic property
         * and applies it to `world.worldBorder` if the property exists and is a number.
         */
        const existingWorldBorder = world.getDynamicProperty("ac:worldBorder");
        if (typeof existingWorldBorder === 'number') {
            world.worldBorder = existingWorldBorder;
        }

        // Initialize runtime variable for unban queue (will be populated from dynamic property).
        if (!world.acUnbanQueue) world.acUnbanQueue = [];
        
        // Determine if the script setup is complete by checking relevant dynamic properties or scoreboard objectives.
        world.acIsSetup = world.getDynamicProperty("ac:scriptSetupComplete") === true || 
                                 world.scoreboard.getObjective("ac:setup_success") !== undefined;
        
        /**
         * @description Initializes the unban queue (`world.acUnbanQueue`) by parsing the
         * "ac:unbanQueue" dynamic property. Defaults to an empty array if parsing fails or property doesn't exist.
         */
        try {
            const unbanQueueProperty = world.getDynamicProperty("ac:unbanQueue");
            world.acUnbanQueue = unbanQueueProperty ? JSON.parse(unbanQueueProperty) : [];
        } catch (error) {
            logDebug("[Anti Cheats] Error parsing unbanQueue JSON, defaulting to empty array:", error);
            world.acUnbanQueue = [];
        }
        // Removed logDebug: Unban Queue content

        /**
         * @description Initializes the device ban list (`world.acDeviceBan`) by parsing the
         * "ac:deviceBan" dynamic property. Defaults to an empty array if parsing fails or property doesn't exist.
         */
        try {
            const deviceBanProperty = world.getDynamicProperty("ac:deviceBan");
            world.acDeviceBan = deviceBanProperty ? JSON.parse(deviceBanProperty) : [];
        } catch (error) {
            logDebug("[Anti Cheats] Error parsing deviceBan JSON, defaulting to empty array:", error);
            world.acDeviceBan = [];
        }
        // Removed logDebug: Device Ban List content

        /**
         * @description Checks the addon version stored in "ac:version" dynamic property.
         * If not set, it initializes it with the version from `config.version`.
         */
        world.acVersion = world.getDynamicProperty("ac:version");
        if(!world.acVersion){
            world.setDynamicProperty("ac:version",CONFIG.version);
            world.acVersion = CONFIG.version;
        }

        /**
         * @description Initializes the addon's operational logs (`world.acLogs`) by parsing the
         * "ac:logs" dynamic property. Defaults to an empty array if parsing fails or property doesn't exist.
         * This prepares the log system before defining `world.addLog`.
         */
        try {
            const logsProperty = world.getDynamicProperty("ac:logs");
            world.acLogs = logsProperty ? JSON.parse(logsProperty) : [];
            if (!Array.isArray(world.acLogs)) world.acLogs = []; // Ensure it's an array
        } catch (error) {
            logDebug("[Anti Cheats] Error parsing logs JSON, defaulting to empty array:", error);
            world.acLogs = [];
        }
        /**
         * @function addLog
         * @memberof world
         * @param {string} message - The message to log.
         * @description Adds a log message to `inMemoryGeneralLogs`.
         * Prepends a timestamp to the message. Limits the log to a maximum number of entries,
         * removing the oldest if the limit is exceeded.
         * This function is dynamically added to the `world` object during initialization.
         * @returns {void}
         * @example world.addLog("Player logged in.");
         */
        world.addLog = function(message) {
            if (inMemoryGeneralLogs.length >= MAX_GENERAL_LOG_ENTRIES) {
                inMemoryGeneralLogs.shift(); // Remove the oldest log
            }
            inMemoryGeneralLogs.push(`[${new Date().toISOString()}] ${message}`); // Add timestamp to message
        };
        
        // Example usage (commented out, but shows how it would be used):
        // world.addLog("This is a test log message.");

        Minecraft.system.runInterval(() => {
            try {
                if (inMemoryGeneralLogs.length > 0) {
                    // world.acLogs already holds logs loaded at initialization.
                    // Combine with new in-memory logs.
                    const combinedLogs = world.acLogs.concat(inMemoryGeneralLogs);
                    const finalLogs = combinedLogs.slice(-MAX_GENERAL_LOG_ENTRIES); // Keep only the most recent
    
                    try {
                        world.setDynamicProperty("ac:logs", JSON.stringify(finalLogs));
                        world.acLogs = finalLogs; // Update the in-memory "master" list
                        inMemoryGeneralLogs = [];   // Clear the temporary new entries
                    } catch (e) {
                        logDebug("[Anti Cheats ERROR] Failed to set dynamic property for general logs in interval:", e);
                    }
                }
            } catch (e) {
                logDebug("[Anti Cheats ERROR] Error in batched general log saving interval:", e, e.stack);
            }
        }, 240); // Save every 12 seconds (240 ticks)


        /**
         * @description Loads custom configuration settings from the "ac:config" dynamic property.
         * If found and parsable, it updates the `config.default` object with these settings.
         * Only existing keys in `config.default` are updated to prevent arbitrary additions.
         */
        const editedConfigString = world.getDynamicProperty("ac:config");
        if(editedConfigString){
            try {
                const editedConfig = JSON.parse(editedConfigString);
                for (const i of Object.keys(editedConfig)) {
                    if (CONFIG.hasOwnProperty(i)) { // Ensure we only update existing config keys
                        CONFIG[i] = editedConfig[i];
                    }
                }
                // Removed logDebug: Loaded config from dynamic properties.
            } catch (error) {
                logDebug(`[Anti Cheats] Error parsing editedConfig JSON from dynamic property "ac:config":`, error);
                // Proceed with default config if parsing fails
            }
        }

        /**
         * @description Initializes the dynamic global ban list (`world.dynamicGbanListArray` and `world.dynamicGbanNameSet`).
         * It attempts to load the list from the "ac:gbanList" dynamic property.
         * If the property is missing, malformed, or not an array, it falls back to the `globalBanList` (seed data)
         * and updates the dynamic property with this seed data.
         * The `world.dynamicGbanNameSet` is populated with names for quick lookups.
         */
        let loadedGbanList = [];
        const gbanListString = world.getDynamicProperty("ac:gbanList");
        if (typeof gbanListString === 'string') {
            try {
                loadedGbanList = JSON.parse(gbanListString);
                if (!Array.isArray(loadedGbanList)) {
                    logDebug("[Anti Cheats] ac:gbanList was not an array, attempting to re-initialize from seed.");
                    loadedGbanList = globalBanList; // Use imported seed
                    world.setDynamicProperty("ac:gbanList", JSON.stringify(loadedGbanList));
                }
            } catch (e) {
                logDebug("[Anti Cheats ERROR] Failed to parse ac:gbanList, attempting to re-initialize from seed. Error:", e);
                loadedGbanList = globalBanList; // Use imported seed
                world.setDynamicProperty("ac:gbanList", JSON.stringify(loadedGbanList));
            }
        } else {
            // If property doesn't exist, initialize from seed
            logDebug("[Anti Cheats] ac:gbanList not found, initializing from seedGlobalBanList.");
            loadedGbanList = globalBanList; // Use imported seed
            world.setDynamicProperty("ac:gbanList", JSON.stringify(loadedGbanList));
        }
        world.dynamicGbanListArray = loadedGbanList; // Store the array
        world.dynamicGbanNameSet = new Set(loadedGbanList.map(entry => (typeof entry === 'string' ? entry : entry.name)));
        // Removed logDebug: Dynamic Global Ban List initialized

        // New Owner Designation Logic
        try {
            const existingOwner = world.getDynamicProperty("ac:ownerPlayerName");
            if (existingOwner !== undefined && typeof existingOwner === 'string' && existingOwner.trim() !== '') {
                // Removed logDebug: Existing Owner Found
            } else {
                // Removed logDebug: No existing owner found
                const configOwnerName = CONFIG.other.ownerPlayerNameManual;
                if (typeof configOwnerName === 'string' && configOwnerName.trim() !== '') {
                    world.setDynamicProperty("ac:ownerPlayerName", configOwnerName);
                    // Removed logDebug: Owner designated from config.js
                    // Consider adding a world.sendMessage or similar if you want to announce this.
                } else {
                    // Removed logDebug: No owner manually set in config.js
                }
            }
        } catch (e) {
            logDebug("[Anti Cheats ERROR] Error during new owner designation logic:", e, e.stack);
        }

        // Mark script setup as complete using both a dynamic property and a runtime flag.
        world.setDynamicProperty("ac:scriptSetupComplete", true);
        world.acInitialized = true; // General initialization flag for runtime checks.
        // Removed logDebug: Initialized and script setup marked as complete.
        

        /**
         * @description Initializes a mechanism to approximate the server's script execution TPS (Ticks Per Second).
         * This system periodically calculates how many game ticks have occurred within a set wall-clock time interval.
         * The result (e.g., "19.8" or "N/A") is stored in the dynamic property `ac:systemInfo_scriptTps`.
         *
         * **Methodology:**
         * 1. An initial value "Calculating..." is set for `ac:systemInfo_scriptTps`.
         * 2. After a 1-second delay (20 ticks) to allow the server to settle, the first measurement baseline is taken
         *    (current tick and current wall-clock time).
         * 3. A `system.runInterval` then runs every `SAMPLING_INTERVAL_TICKS` (e.g., 100 ticks / 5 seconds).
         * 4. In each interval:
         *    - It calculates `deltaTicks` (the number of game ticks passed since the last interval) and
         *      `deltaTimeMs` (the wall-clock time in milliseconds passed).
         *    - If `deltaTimeMs` is sufficient (>100ms, to avoid noise and division by zero), TPS is calculated as `deltaTicks / (deltaTimeMs / 1000)`.
         *    - The value is formatted to one decimal place (e.g., "19.8") and stored.
         *    - If the interval was too short for a reliable measurement (e.g., <100ms and 0 ticks passed),
         *      it may carry over the last known TPS or display "N/A".
         *    - Error handling sets the property to "Error" if issues occur during calculation.
         *
         * The dynamic property `ac:systemInfo_scriptTps` can be read by other scripts or systems (e.g., UI panels)
         * to display an indicator of the scripting engine's performance. This is not a true measure of server TPS
         * but rather an observation of how well the scripting environment is keeping up with game ticks.
         */
        // Script-Observed TPS Measurement
        let lastTickTime = 0;
        let lastWallClockTime = 0;
        const SAMPLING_INTERVAL_SECONDS = 5;
        const SAMPLING_INTERVAL_TICKS = SAMPLING_INTERVAL_SECONDS * 20; // Expected ticks in this interval (20 TPS)
        
        // Initialize dynamic property for TPS display
        try {
            world.setDynamicProperty("ac:systemInfo_scriptTps", "Calculating...");
        } catch (e) {
            logDebug("[Anti Cheats ERROR] Failed to set initial TPS dynamic property:", e, e.stack);
        }

        // Initial delay to let the server settle, then start TPS calculation
        /**
         * Initializes the baseline for TPS (Ticks Per Second) calculation after a brief server startup delay.
         * Sets the initial `lastTickTime` and `lastWallClockTime` used by the subsequent TPS calculation interval.
         *
         * @returns {void}
         */
        Minecraft.system.runTimeout(() => {
            lastTickTime = Minecraft.system.currentTick;
            lastWallClockTime = Date.now();

            /**
             * Periodically calculates the script-observed TPS (Ticks Per Second).
             * Compares game ticks passed against wall-clock time passed since the last interval
             * to estimate TPS, storing the formatted result in the "ac:systemInfo_scriptTps" dynamic property.
             * Handles potential errors during calculation.
             *
             * @returns {void}
             */
            Minecraft.system.runInterval(() => {
                try {
                    const currentTick = Minecraft.system.currentTick;
                    const currentWallClockTime = Date.now();

                    const deltaTicks = currentTick - lastTickTime;
                    const deltaTimeMs = currentWallClockTime - lastWallClockTime;
                    let observedTpsValue = "N/A"; // Default to N/A

                    if (deltaTimeMs > 100) { // Only calculate if a meaningful amount of time has passed
                        const deltaTimeSeconds = deltaTimeMs / 1000;
                        const tps = deltaTicks / deltaTimeSeconds;
                        observedTpsValue = tps.toFixed(1); // Format to one decimal place
                    } else if (deltaTicks === 0 && deltaTimeMs <= 100 && deltaTimeMs >= 0) {
                        // If no ticks passed and very little time passed, it's hard to get a reliable TPS.
                        // Attempt to use the last known good TPS value to avoid flickering "N/A".
                        const currentTPSProp = world.getDynamicProperty("ac:systemInfo_scriptTps");
                        if (typeof currentTPSProp === 'string' && !["Calculating...", "N/A", "Error"].includes(currentTPSProp)) {
                             observedTpsValue = currentTPSProp; // Keep last good value
                        } else {
                            observedTpsValue = "N/A"; // Fallback if no recent good value
                        }
                    }
                    // If deltaTimeMs is very small but deltaTicks > 0, it indicates very fast processing,
                    // the calculation `deltaTicks / (deltaTimeMs / 1000)` should handle this.

                    world.setDynamicProperty("ac:systemInfo_scriptTps", observedTpsValue);
                    // logDebug(`Script-Observed TPS: ${observedTpsValue}`); // Optional: for debugging TPS calculation - KEEP THIS COMMENTED
                    // Update baselines for the next interval
                    lastTickTime = currentTick;
                    lastWallClockTime = currentWallClockTime;
                } catch (e) {
                    logDebug("[Anti Cheats ERROR] Error during TPS calculation interval:", e, e.stack);
                    try {
                        world.setDynamicProperty("ac:systemInfo_scriptTps", "Error");
                    } catch (propError) {
                        logDebug("[Anti Cheats ERROR] Failed to set TPS dynamic property to Error:", propError, propError.stack);
                    }
                }
            }, SAMPLING_INTERVAL_TICKS);
        }, 20); // Initial 1-second delay (20 game ticks)

    });
}