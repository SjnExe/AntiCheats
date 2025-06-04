import * as mc from '@minecraft/server';
import * as playerDataManager from '../../../core/playerDataManager.js'; // Imports addFlag, getPlayerData
import * as playerUtils from '../../../utils/playerUtils.js'; // Imports debugLog
import * as config from '../../../config.js'; // Imports all config values

/**
 * @typedef {import('../../../core/playerDataManager.js').PlayerAntiCheatData} PlayerAntiCheatData
 * // This path might need adjustment if PlayerAntiCheatData is moved to a types.js file
 */

/**
 * Checks for invalid pitch and rapid view snaps after an attack.
 * @param {mc.Player} player The player instance to check.
 * @param {PlayerAntiCheatData} pData Player-specific anti-cheat data.
 * @param {object} config The configuration object (passed from main.js, containing all constants).
 * @param {number} currentTick The current game tick.
 */
export function checkViewSnap(player, pData, config, currentTick) {
    if (!config.ENABLE_VIEW_SNAP_CHECK) return;

    // pData.lastPitch and pData.lastYaw are updated every tick in playerDataManager.updateTransientPlayerData
    const currentPitch = player.getRotation().x; // More accurate to get live rotation
    const currentYaw = player.getRotation().y;   // More accurate to get live rotation

    // 1. Out-of-Bounds Pitch Check (Independent of attack state)
    if (currentPitch < config.INVALID_PITCH_THRESHOLD_MIN || currentPitch > config.INVALID_PITCH_THRESHOLD_MAX) {
        playerDataManager.addFlag(
            player,
            "invalidPitch", // This will be a new flag type in pData.flags if not predefined
            config.FLAG_REASON_INVALID_PITCH,
            // config.FLAG_INCREMENT_VIEW_SNAP, // Using the specific increment from config
            `Pitch: ${currentPitch.toFixed(2)}`
        );
        // It might be good to return here or ensure this flag doesn't also trigger a snap immediately if it's the first time.
        // For now, let it proceed; addFlag handles multiple flags.
    }

    // 2. View Snap Logic (Post-Attack)
    // pData.lastAttackTick is set in eventHandlers.handleEntityHurt
    if (pData.lastAttackTick && (currentTick - pData.lastAttackTick < config.VIEW_SNAP_WINDOW_TICKS)) {
        const deltaPitch = Math.abs(currentPitch - pData.lastPitch); // pData.lastPitch is from previous tick
        let deltaYaw = Math.abs(currentYaw - pData.lastYaw);     // pData.lastYaw is from previous tick

        // Handle yaw wrapping (e.g., change from -170 to 170 is 20 degrees, not 340)
        if (deltaYaw > 180) {
            deltaYaw = 360 - deltaYaw;
        }

        if (deltaPitch > config.MAX_PITCH_SNAP_PER_TICK || deltaYaw > config.MAX_YAW_SNAP_PER_TICK) {
            playerDataManager.addFlag(
                player,
                "viewSnap", // This will be a new flag type
                config.FLAG_REASON_VIEW_SNAP,
                // config.FLAG_INCREMENT_VIEW_SNAP, // Using the specific increment
                `PitchΔ: ${deltaPitch.toFixed(2)}, YawΔ: ${deltaYaw.toFixed(2)} (Tick after attack: ${currentTick - pData.lastAttackTick})`
            );
            if (pData.isWatched) {
                playerUtils.debugLog(`View snap detected for ${player.nameTag}: dP=${deltaPitch.toFixed(1)}, dY=${deltaYaw.toFixed(1)} within ${currentTick - pData.lastAttackTick} ticks of attack.`, player.nameTag);
            }
        }
    }
    // Note: No need to update pData.lastPitch/Yaw here; it's handled globally in playerDataManager.updateTransientPlayerData
}
