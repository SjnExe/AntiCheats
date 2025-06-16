/**
 * @file AntiCheatsBP/scripts/checks/combat/viewSnapCheck.js
 * Implements checks for invalid player view pitch and rapid view snaps (aimbot-like behavior)
 * that can occur shortly after a player performs an attack.
 * @version 1.0.1
 */

import * as mc from '@minecraft/server';

/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').Config} Config
 * @typedef {import('../../types.js').PlayerUtils} PlayerUtils
 * @typedef {import('../../types.js').PlayerDataManager} PlayerDataManager
 * @typedef {import('../../types.js').LogManager} LogManager
 * @typedef {import('../../types.js').ExecuteCheckAction} ExecuteCheckAction
 */

/**
 * Checks for invalid pitch (looking too far up or down) and for excessively rapid
 * changes in view angle (pitch/yaw snaps) that occur shortly after a player attacks.
 * Player's last pitch and yaw are updated in `updateTransientPlayerData` in `main.js`.
 * Player's last attack tick is updated in `handleEntityHurt` in `eventHandlers.js`.
 *
 * @param {mc.Player} player - The player instance to check.
 * @param {PlayerAntiCheatData} pData - Player-specific anti-cheat data, containing `lastAttackTick`, `lastPitch`, `lastYaw`.
 * @param {Config} config - The server configuration object with thresholds like `invalidPitchThresholdMin/Max`,
 *                          `maxPitchSnapPerTick`, `maxYawSnapPerTick`, and `viewSnapWindowTicks`.
 * @param {number} currentTick - The current game tick.
 * @param {PlayerUtils} playerUtils - Utility functions for player interactions.
 * @param {PlayerDataManager} playerDataManager - Manager for player data.
 * @param {LogManager} logManager - Manager for logging.
 * @param {ExecuteCheckAction} executeCheckAction - Function to execute defined actions for a check.
 * @returns {Promise<void>}
 */
export async function checkViewSnap(
    player,
    pData,
    config,
    currentTick,
    playerUtils,
    playerDataManager,
    logManager,
    executeCheckAction
) {
    if (!config.enableViewSnapCheck || !pData) { // Added null check for pData
        return;
    }

    const currentRotation = player.getRotation();
    const currentPitch = currentRotation.x;
    const currentYaw = currentRotation.y;
    const watchedPrefix = pData.isWatched ? player.nameTag : null;
    const dependencies = { config, playerDataManager, playerUtils, logManager };

    // 1. Check for invalid absolute pitch (looking straight up/down beyond vanilla limits)
    const invalidPitchMin = config.invalidPitchThresholdMin ?? -90.5;
    const invalidPitchMax = config.invalidPitchThresholdMax ?? 90.5;

    if (currentPitch < invalidPitchMin || currentPitch > invalidPitchMax) {
        const violationDetails = {
            pitch: currentPitch.toFixed(2),
            minLimit: invalidPitchMin.toFixed(2),
            maxLimit: invalidPitchMax.toFixed(2)
        };
        await executeCheckAction(player, "combatInvalidPitch", violationDetails, dependencies);
    }

    // 2. Check for view snaps (rapid rotation changes) after an attack
    // pData.lastAttackTick is set in handleEntityHurt when the player is the attacker.
    const viewSnapWindow = config.viewSnapWindowTicks ?? 10;
    if (pData.lastAttackTick && (currentTick - pData.lastAttackTick < viewSnapWindow)) {
        const deltaPitch = Math.abs(currentPitch - pData.lastPitch);
        let deltaYaw = Math.abs(currentYaw - pData.lastYaw);

        // Normalize yaw difference (e.g., turning from 350 to 10 degrees is 20 deg, not 340)
        if (deltaYaw > 180) {
            deltaYaw = 360 - deltaYaw;
        }

        const ticksSinceLastAttack = currentTick - pData.lastAttackTick;
        const postAttackTimeMs = ticksSinceLastAttack * 50; // Approximate ms (assuming 20 TPS)

        const maxPitchSnap = config.maxPitchSnapPerTick ?? 75;
        if (deltaPitch > maxPitchSnap) {
            const violationDetails = {
                type: "pitch",
                change: deltaPitch.toFixed(2),
                limit: maxPitchSnap.toFixed(2),
                ticksSinceAttack: ticksSinceLastAttack.toString(),
                postAttackTimeMs: postAttackTimeMs.toString()
            };
            await executeCheckAction(player, "combatViewsnapPitch", violationDetails, dependencies);
            playerUtils.debugLog?.(`ViewSnap (Pitch) for ${player.nameTag}: dP=${deltaPitch.toFixed(1)} within ${ticksSinceLastAttack} ticks.`, watchedPrefix);
        }

        const maxYawSnap = config.maxYawSnapPerTick ?? 100;
        if (deltaYaw > maxYawSnap) {
            const violationDetails = {
                type: "yaw",
                change: deltaYaw.toFixed(2),
                limit: maxYawSnap.toFixed(2),
                ticksSinceAttack: ticksSinceLastAttack.toString(),
                postAttackTimeMs: postAttackTimeMs.toString()
            };
            await executeCheckAction(player, "combatViewsnapYaw", violationDetails, dependencies);
            playerUtils.debugLog?.(`ViewSnap (Yaw) for ${player.nameTag}: dY=${deltaYaw.toFixed(1)} within ${ticksSinceLastAttack} ticks.`, watchedPrefix);
        }
    }
    // Note: pData.lastPitch and pData.lastYaw are updated externally in main.js's updateTransientPlayerData.
    // No need to mark pData as dirty here unless this check itself modifies persisted fields.
}
