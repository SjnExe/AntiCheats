import * as Minecraft from '@minecraft/server';
import * as config from '../config.js';
import { sendMessageToAllAdmins } from '../assets/util.js';
import { logDebug } from '../assets/logger.js'; // Moved logDebug to logger.js
// Removed i18n import

const world = Minecraft.world;
const system = Minecraft.system;

/**
 * Stores the last known rotation (yaw and pitch) and the timestamp of the last check for each player.
 * This data is used to calculate yaw delta per tick for the rotation check.
 * Key: player.id (string)
 * Value: { yaw: number, pitch: number, lastCheckTime: number }
 * @type {Map<string, { yaw: number, pitch: number, lastCheckTime: number }>}
 */
const playerLastRotation = new Map(); 

/**
 * Initializes the Invalid Head Rotation Check module.
 * This function checks if the feature is enabled in the configuration.
 * If enabled, it starts a per-tick interval that monitors player head rotations
 * for pitch violations and excessive yaw deltas (spins).
 *
 * @export
 * @returns {void} This function does not return a value.
 */
export function initializeRotationCheck() {
    const rotationConfig = config.default.packetChecks?.invalidHeadRotationCheck;
    if (!rotationConfig || !rotationConfig.enabled) {
        return;
    }

    /**
     * Periodically executed function (every tick) to check player head rotations.
     * For each online player, it:
     * 1. Validates current pitch against configured min/max pitch values.
     * 2. Calculates the yaw delta since the last check and compares it against `maxYawDeltaPerTick`.
     * If a violation is detected (pitch out of bounds or yaw delta too high),
     * it calls `handleViolation` to process the infraction.
     * It updates the `playerLastRotation` map with the current rotation data for the next check.
     *
     * @returns {void}
     */
    system.runInterval(() => {
        for (const player of world.getPlayers()) {
            const currentRotation = player.getRotation(); // { x: pitch, y: yaw }
            const currentTime = Date.now();

            // Pitch Check
            if (currentRotation.x < rotationConfig.minPitch || currentRotation.x > rotationConfig.maxPitch) {
                handleViolation(player, "Pitch", currentRotation.x.toFixed(2));
                // Optional: force valid pitch (might be jarring)
                // player.teleport(player.location, { rotation: { x: Math.max(rotationConfig.minPitch, Math.min(rotationConfig.maxPitch, currentRotation.x)), y: currentRotation.y }});
            }

            // Yaw Delta Check (Spin Check)
            if (playerLastRotation.has(player.id)) {
                const lastData = playerLastRotation.get(player.id);
                let yawDelta = Math.abs(currentRotation.y - lastData.yaw);
                
                // Normalize yawDelta for wrap-around (e.g., -170 to 170 is a 20 degree change, not 340)
                if (yawDelta > 180) {
                    yawDelta = 360 - yawDelta;
                }

                // const timeDiffSeconds = (currentTime - lastData.lastCheckTime) / 1000;
                // if (timeDiffSeconds > 0) { // Avoid division by zero if interval is very fast
                //    const yawSpeed = yawDelta / timeDiffSeconds; // Degrees per second
                //    if (yawSpeed > rotationConfig.maxYawSpeed) {
                //        handleViolation(player, "Yaw Speed", yawSpeed.toFixed(2));
                //    }
                // }
                // Using maxYawDeltaPerTick is simpler if the interval is consistent (every tick)
                 if (yawDelta > rotationConfig.maxYawDeltaPerTick) {
                     handleViolation(player, "Yaw Delta", yawDelta.toFixed(2) + " per tick");
                 }
            }
            
            playerLastRotation.set(player.id, { yaw: currentRotation.y, pitch: currentRotation.x, lastCheckTime: currentTime });
        }
    }, 1); // Run every tick for responsive checking of delta. Adjust if performance issues arise.
}

/**
 * Handles detected invalid head rotation violations.
 * It increments a violation counter for the player stored as a dynamic property.
 * If the violation count reaches a configured threshold, it resets the counter,
 * sends an alert to admins, and executes a configured action (e.g., a custom command).
 *
 * @param {Minecraft.Player} player - The player who committed the rotation violation.
 * @param {string} type - A string indicating the type of violation (e.g., "Pitch", "Yaw Delta").
 * @param {string | number} value - The actual rotation value or delta that caused the violation.
 * @returns {void}
 */
function handleViolation(player, type, value) {
    const rotationConfig = config.default.packetChecks.invalidHeadRotationCheck;
    let violations = player.getDynamicProperty("ac:rotationViolations") || 0;
    violations++;
    player.setDynamicProperty("ac:rotationViolations", violations);

    logDebug(`[RotationCheck] Player ${player.name} ${type} violation. Value: ${value}. Violations: ${violations}`);

    if (violations >= rotationConfig.violationThreshold) {
        player.setDynamicProperty("ac:rotationViolations", 0); // Reset violations

        sendMessageToAllAdmins("modules.rotation.notify.adminFlag", {
            playerName: player.name,
            type: type,
            value: String(value) // Ensure value is string for localization
        });
        
        const action = rotationConfig.action;
        if (action === "customCommand") {
            let command = rotationConfig.customCommand;
            command = command.replace(/{playerName}/g, player.name)
                             .replace(/{type}/g, type)
                             .replace(/{value}/g, String(value));
            try {
                world.overworld.runCommandAsync(command);
                logDebug(`[RotationCheck] Executed custom command for ${player.name}: ${command}`);
            } catch(e) {
                logDebug(`[RotationCheck] Error executing custom command for ${player.name}: ${e}`);
            }
        }
        // Add other actions like "teleportBack" if desired
    }
}
