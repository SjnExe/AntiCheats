import * as mc from '@minecraft/server';
// Removed direct imports for playerDataManager, playerUtils, config as they are now passed as parameters.

/**
 * @typedef {import('../../core/playerDataManager.js').PlayerAntiCheatData} PlayerAntiCheatData
 */

/**
 * Checks for invalid pitch and rapid view snaps after an attack.
 * @param {mc.Player} player The player instance to check.
 * @param {PlayerAntiCheatData} pData Player-specific anti-cheat data.
 * @param {object} config The configuration object.
 * @param {number} currentTick The current game tick.
 * @param {object} playerUtils Utility functions for players.
 * @param {object} playerDataManager Manager for player data.
 * @param {object} logManager Manager for logging.
 * @param {function} executeCheckAction Function to execute defined actions for a check.
 */
export async function checkViewSnap(player, pData, config, currentTick, playerUtils, playerDataManager, logManager, executeCheckAction) {
    if (!config.enableViewSnapCheck) return;

    const currentRotation = player.getRotation();
    const currentPitch = currentRotation.x;
    const currentYaw = currentRotation.y;
    const watchedPrefix = pData.isWatched ? player.nameTag : null;
    const dependencies = { config, playerDataManager, playerUtils, logManager };

    // Check for invalid absolute pitch
    if (currentPitch < config.invalidPitchThresholdMin || currentPitch > config.invalidPitchThresholdMax) {
        const violationDetails = {
            pitch: currentPitch.toFixed(2),
            minLimit: config.invalidPitchThresholdMin,
            maxLimit: config.invalidPitchThresholdMax
        };
        await executeCheckAction(player, "combat_invalid_pitch", violationDetails, dependencies);
        // Note: Original logic might allow this and view snap to flag in the same execution.
        // Depending on profile settings (e.g., if invalid_pitch includes high flag increment),
        // this might be okay, or might need adjustment if only one view-related flag per tick is desired.
    }

    // Check for view snaps after an attack
    if (pData.lastAttackTick && (currentTick - pData.lastAttackTick < config.viewSnapWindowTicks)) {
        const deltaPitch = Math.abs(currentPitch - pData.lastPitch);
        let deltaYaw = Math.abs(currentYaw - pData.lastYaw);

        if (deltaYaw > 180) { // Normalize yaw difference
            deltaYaw = 360 - deltaYaw;
        }

        const ticksSinceLastAttack = currentTick - pData.lastAttackTick;
        // Calculate time in MS if pData.lastAttackTime (Date.now() at attack) is available
        // For now, using ticks as per original details. If lastAttackTime (ms) was stored in pData, it would be better.
        const postAttackTimeMs = ticksSinceLastAttack * 50; // Approximate ms if 1 tick = 50ms

        if (deltaPitch > config.maxPitchSnapPerTick) {
            const violationDetails = {
                type: "pitch",
                change: deltaPitch.toFixed(2),
                limit: config.maxPitchSnapPerTick,
                ticksSinceAttack: ticksSinceLastAttack,
                postAttackTimeMs: postAttackTimeMs
            };
            await executeCheckAction(player, "combat_viewsnap_pitch", violationDetails, dependencies);
            if (pData.isWatched && playerUtils.debugLog) {
                playerUtils.debugLog(`ViewSnap (Pitch) detected for ${player.nameTag}: dP=${deltaPitch.toFixed(1)} within ${ticksSinceLastAttack} ticks.`, watchedPrefix);
            }
        }

        // Using 'else if' here might be too restrictive if both can occur, but often one axis is more extreme.
        // If separate flags for both are desired even if one is less extreme, remove 'else'.
        // For now, allowing both to flag independently if thresholds are met.
        if (deltaYaw > config.maxYawSnapPerTick) {
            const violationDetails = {
                type: "yaw",
                change: deltaYaw.toFixed(2),
                limit: config.maxYawSnapPerTick,
                ticksSinceAttack: ticksSinceLastAttack,
                postAttackTimeMs: postAttackTimeMs
            };
            await executeCheckAction(player, "combat_viewsnap_yaw", violationDetails, dependencies);
            if (pData.isWatched && playerUtils.debugLog) {
                playerUtils.debugLog(`ViewSnap (Yaw) detected for ${player.nameTag}: dY=${deltaYaw.toFixed(1)} within ${ticksSinceLastAttack} ticks.`, watchedPrefix);
            }
        }
    }
    // pData.lastPitch and pData.lastYaw are updated in main.js's updateTransientPlayerData
}
