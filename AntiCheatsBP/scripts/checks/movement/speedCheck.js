import * as mc from '@minecraft/server';
import { addFlag } from '../../core/playerDataManager.js';
import { debugLog } from '../../utils/playerUtils.js';
import {
    enableSpeedCheck, // Renamed
    maxHorizontalSpeed, // Renamed
    speedEffectBonus, // Renamed
    speedToleranceBuffer, // Renamed
    speedGroundConsecutiveTicksThreshold // Renamed
} from '../../config.js';

/**
 * @typedef {import('../../core/playerDataManager.js').PlayerAntiCheatData} PlayerAntiCheatData
 */

/**
 * Checks for speed-related hacks by analyzing player's horizontal movement speed.
 * @param {mc.Player} player The player instance to check.
 * @param {PlayerAntiCheatData} pData Player-specific data.
 */
export function checkSpeed(player, pData) {
    if (!enableSpeedCheck) return; // Renamed
    const watchedPrefix = pData.isWatched ? player.nameTag : null;

    if (player.isFlying || player.isClimbing) {
        pData.consecutiveOnGroundSpeedingTicks = 0;
        return;
    }

    const hSpeed = Math.sqrt(pData.velocity.x ** 2 + pData.velocity.z ** 2);
    let currentMaxSpeed = maxHorizontalSpeed; // Renamed

    const speedEffect = player.getEffects().find(effect => effect.typeId === "speed");
    if (speedEffect) {
        currentMaxSpeed += (speedEffect.amplifier + 1) * speedEffectBonus; // Renamed
    }

    currentMaxSpeed += speedToleranceBuffer; // Renamed

    if (pData.isWatched) {
        debugLog(`SpeedCheck: Processing for ${player.nameTag}. HSpeed=${hSpeed.toFixed(2)}, MaxAllowable=${currentMaxSpeed.toFixed(2)}, SpeedingTicks=${pData.consecutiveOnGroundSpeedingTicks}`, watchedPrefix);
    }

    if (player.isOnGround && hSpeed > currentMaxSpeed) {
        pData.consecutiveOnGroundSpeedingTicks = (pData.consecutiveOnGroundSpeedingTicks || 0) + 1;
        if (pData.consecutiveOnGroundSpeedingTicks > speedGroundConsecutiveTicksThreshold) { // Renamed
            addFlag(
                player,
                "speed",
                `Potential speed hack detected. Speed: ${hSpeed.toFixed(2)} m/s.`,
                `Max: ${currentMaxSpeed.toFixed(2)} m/s, Ticks: ${pData.consecutiveOnGroundSpeedingTicks}`
            );
            pData.consecutiveOnGroundSpeedingTicks = 0;
        }
    } else if (player.isOnGround) {
        pData.consecutiveOnGroundSpeedingTicks = 0;
    } else {
        pData.consecutiveOnGroundSpeedingTicks = 0;
    }
}
