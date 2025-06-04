import * as mc from '@minecraft/server';
import * as playerDataManager from '../../../core/playerDataManager.js';
import * as playerUtils from '../../../utils/playerUtils.js';
import * as config from '../../../config.js';

/**
 * @typedef {import('../../../core/playerDataManager.js').PlayerAntiCheatData} PlayerAntiCheatData
 */

/**
 * Checks for invalid pitch and rapid view snaps after an attack.
 * @param {mc.Player} player The player instance to check.
 * @param {PlayerAntiCheatData} pData Player-specific anti-cheat data.
 * @param {object} config The configuration object.
 * @param {number} currentTick The current game tick.
 */
export function checkViewSnap(player, pData, config, currentTick) {
    if (!config.enableViewSnapCheck) return; // Renamed

    const currentPitch = player.getRotation().x;
    const currentYaw = player.getRotation().y;

    if (currentPitch < config.invalidPitchThresholdMin || currentPitch > config.invalidPitchThresholdMax) { // Renamed
        playerDataManager.addFlag(
            player,
            "invalidPitch",
            config.flagReasonInvalidPitch, // Renamed
            `Pitch: ${currentPitch.toFixed(2)}`
        );
    }

    if (pData.lastAttackTick && (currentTick - pData.lastAttackTick < config.viewSnapWindowTicks)) { // Renamed
        const deltaPitch = Math.abs(currentPitch - pData.lastPitch);
        let deltaYaw = Math.abs(currentYaw - pData.lastYaw);

        if (deltaYaw > 180) {
            deltaYaw = 360 - deltaYaw;
        }

        if (deltaPitch > config.maxPitchSnapPerTick || deltaYaw > config.maxYawSnapPerTick) { // Renamed
            playerDataManager.addFlag(
                player,
                "viewSnap",
                config.flagReasonViewSnap, // Renamed
                `PitchΔ: ${deltaPitch.toFixed(2)}, YawΔ: ${deltaYaw.toFixed(2)} (Tick after attack: ${currentTick - pData.lastAttackTick})`
            );
            if (pData.isWatched) {
                playerUtils.debugLog(`View snap detected for ${player.nameTag}: dP=${deltaPitch.toFixed(1)}, dY=${deltaYaw.toFixed(1)} within ${currentTick - pData.lastAttackTick} ticks of attack.`, player.nameTag);
            }
        }
    }
}
