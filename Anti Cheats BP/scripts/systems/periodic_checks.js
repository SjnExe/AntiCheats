import { world, system, EffectType } from "@minecraft/server"; // Removed Player, EntityDamageCause, GameMode
import CONFIG from "../config.js";
import { i18n } from "../assets/i18n.js"; // Assuming i18n is from assets
import { sendMessageToAdmins, saveLogToFile, LOG_FILE_PREFIX } from "../assets/util.js";
import { logDebug } from "../assets/logger.js"; // Assuming logDebug is in util.js or assets/util.js

// Define the playerInternalStates Map
export const playerInternalStates = new Map();

// Helper Functions for State Management
export function initializePlayerState(playerId, initialLocation, currentTick) {
    const newState = {
        lastLocation: { x: initialLocation.x, y: initialLocation.y, z: initialLocation.z },
        fallDistanceCustom: 0,
        lastPositionY: initialLocation.y,
        speedVL: 0,
        flyVL: 0,
        nukerVLBreak: 0,
        lastGroundTime: currentTick,
        deepValuableOresBrokenThisTick: 0 // Add this line
    };
    playerInternalStates.set(playerId, newState);
}

export function removePlayerState(playerId) {
    const deleted = playerInternalStates.delete(playerId);
    if (deleted) {
        // Removed logDebug for successful state removal
    } else {
        logDebug(`Attempted to remove state for player ${playerId}, but no state was found.`);
    }
}

export function getPlayerState(playerId) {
    const state = playerInternalStates.get(playerId);
    if (!state) {
        // This case should ideally be prevented by robust join/leave event handling.
        // Depending on strictness, could return a default state or null/undefined.
        // For now, returning what Map.get() returns (undefined if not found) is acceptable.
    }
    return state;
}
import { ModuleStatusManager } from "../classes/module.js";
import { Vector3utils } from "../classes/vector3.js";

// Log arrays and constants
export const MAX_LOG_ENTRIES = 100; // Define how many entries to keep in memory
export let inMemoryCommandLogs = [];
export let inMemoryPlayerActivityLogs = [];

let currentTickCounter = 0;

// --- Main Tick-Based Interval (Fly, Speed, NoFall updates, etc.) ---
system.runInterval(() => {
    currentTickCounter++;

    for (const player of world.getAllPlayers()) {
        const playerVelocity = player.getVelocity();
        const isPlayerOnGround = player.isOnGround;

        const state = getPlayerState(player.id);
        if (!state) {
            // This case should ideally not happen if join/leave events are correctly handled.
            // If it does, it might mean a player existed before the script fully initialized their state
            // or an issue with leave event. For safety, log and skip this player for this tick.
            console.warn(`[AntiCheats_PeriodicChecks] No state found for player ${player.name} (${player.id}). Skipping tick.`);
            continue; 
        }
        state.deepValuableOresBrokenThisTick = 0; // Add this line to reset before any other logic uses it for the current tick
        // const lastTickPos = state.lastLocation; // Unused variable: lastTickPos

        // Update fall distance for NoFall
        // TODO: Was ModuleStatusManager.getModuleStatus("nofall") - module "nofall" not defined. Removed check.
        // if (ModuleStatusManager.getModuleStatus("nofall")) {
        //     let currentFallDistance = state.fallDistanceCustom;
        //     if (!isPlayerOnGround && player.location.y < state.lastPositionY) {
        //         state.fallDistanceCustom = currentFallDistance + (state.lastPositionY - player.location.y);
        //     } else if (isPlayerOnGround) {
        //         // If player is on ground, fall distance is typically reset by the entityHurt event
        //         // after damage calculation, or here if no damage (e.g. creative mode flight landing)
        //         // For now, we only accumulate. Resetting logic is primarily in entityHurt or when changing to fly modes.
        //         // If a more immediate reset on landing is needed here (outside of damage):
        //         // state.fallDistanceCustom = 0; // Uncomment if reset is desired here always on ground
        //     }
        //     state.lastPositionY = player.location.y;
        // }


        // --- 10-Tick Interval Checks (Speed, Fly) ---
        if (currentTickCounter % 10 === 0) {
            const movementSpeed = Vector3utils.magnitude({ x: playerVelocity.x, y: 0, z: playerVelocity.z }); // Horizontal speed
            const maxSpeed = player.isSprinting ? CONFIG.movement.speed.highSpeedThreshold : CONFIG.movement.speed.highSpeedThreshold;

            // Speed Check
            if (ModuleStatusManager.getModuleStatus(ModuleStatusManager.Modules.velocityCheck) && movementSpeed > maxSpeed && !player.hasEffect(EffectType.get("speed")) && !player.isFlying) {
                state.speedVL = (state.speedVL || 0) + 1;
                if (state.speedVL >= CONFIG.movement.speed.speedViolationThreshold) {
                    sendMessageToAdmins("detection.speed_detected_admin", { player: player.name, speed: movementSpeed.toFixed(2), max_speed: maxSpeed, vl: state.speedVL });
                    // Removed speed_punish block
                    state.speedVL = 0;
                }
            }

            // Fly Check (basic ground check)
            let lastGroundTime = state.lastGroundTime;
            if (ModuleStatusManager.getModuleStatus(ModuleStatusManager.Modules.flyCheck) && !isPlayerOnGround && !player.isFlying && !player.hasEffect(EffectType.get("levitation")) && (system.currentTick - lastGroundTime > 200 /* TODO: Revisit fly_max_air_time_ticks, was configData.fly_max_air_time_ticks */)) {
                // More sophisticated checks: e.g., vertical speed, obstacles, gliding
                state.flyVL = (state.flyVL || 0) + 1;
                if (state.flyVL >= CONFIG.movement.fly.flyViolationThreshold) {
                    sendMessageToAdmins("detection.fly_detected_admin", { player: player.name, vl: state.flyVL });
                    // Removed fly_punish block
                    state.flyVL = 0;
                }
            } else if (isPlayerOnGround) {
                state.lastGroundTime = system.currentTick;
                state.flyVL = 0; // Reset VL when on ground
            }

            // Nuker VL decay/check
            if (ModuleStatusManager.getModuleStatus(ModuleStatusManager.Modules.nukerCheck)) {
                let nukerBreakVl = state.nukerVLBreak || 0; // Read from state
                if (nukerBreakVl > CONFIG.world.nuker.maxBlocks) {
                     sendMessageToAdmins("detection.nuker_detected_admin", { player: player.name, blocks: nukerBreakVl });
                     // Removed nuker_punish block
                }
                state.nukerVLBreak = 0; // Reset in state
            }
        }

        // Update player position for next tick
        state.lastLocation = { x: player.location.x, y: player.location.y, z: player.location.z };
    }
}, 1); // Run every tick for core checks like NoFall updates

// --- Night Vision Detection Interval ---
if (CONFIG.world.nightVisionDetection.enableNightVisionCheck) {
    system.runInterval(() => {
        for (const player of world.getAllPlayers()) {
            if (player.hasEffect(EffectType.get("night_vision"))) {
                // const effect = player.getEffect(EffectType.get("night_vision")); // Unused variable: effect
                // Check if duration is unnaturally long or amplifier too high if not given by admin commands
                // This requires tracking how players get effects, which is complex.
                // A simpler check could be if they have it for > X minutes without admin intervention.
                // For now, this is a placeholder for more specific logic.
                // Example: if (effect.duration > CONFIG.world.nightVisionDetection.suspicionThreshold && !isAdmin(player)) { ... } // Placeholder for actual config path
            }
        }
    }, CONFIG.world.nightVisionDetection.checkIntervalTicks);
}

// --- Log Saving Interval ---
// Removed if (configData.enable_log_saving) condition
system.runInterval(() => {
    if (inMemoryCommandLogs.length > 0) {
        saveLogToFile(LOG_FILE_PREFIX.COMMAND, inMemoryCommandLogs.map(log => `[${log.timestamp}] ${log.player}: ${log.command}`).join("\n"));
        inMemoryCommandLogs = []; // Clear after saving
    }
    if (inMemoryPlayerActivityLogs.length > 0) {
        saveLogToFile(LOG_FILE_PREFIX.ACTIVITY, inMemoryPlayerActivityLogs.map(log => `[${log.timestamp}] ${log.player}: ${log.activity}`).join("\n"));
        inMemoryPlayerActivityLogs = []; // Clear after saving
    }
}, 1200 /* TODO: Revisit log_save_interval_ticks, was configData.log_save_interval_ticks */);


// --- Vanish Reminder Interval ---
// Removed if (ModuleStatusManager.getModuleStatus("vanish")) condition
system.runInterval(() => {
    for (const player of world.getAllPlayers()) {
        if (player.hasTag("vanished") && player.hasAdmin()) {
            player.onScreenDisplay.setActionBar(i18n("system.vanish_reminder"));
        }
    }
}, 6000 /* TODO: Revisit vanish_reminder_interval_ticks, was configData.vanish_reminder_interval_ticks */);


// No explicit exports needed for the intervals themselves as they are self-running.
// Log arrays are exported for other modules to use.
// currentTickCounter is module-local.
