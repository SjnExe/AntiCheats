import * as mc from '@minecraft/server';
import { addFlag } from '../../core/playerDataManager.js';
import { debugLog } from '../../utils/playerUtils.js';
import {
    ENABLE_SPEED_CHECK,
    MAX_HORIZONTAL_SPEED,
    SPEED_EFFECT_BONUS,
    SPEED_TOLERANCE_BUFFER,
    SPEED_GROUND_CONSECUTIVE_TICKS_THRESHOLD
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
    if (!ENABLE_SPEED_CHECK) return;
    const watchedPrefix = pData.isWatched ? player.nameTag : null;

    if (player.isFlying || player.isClimbing) {
        // debugLog(`SpeedCheck: ${player.nameTag} flying or climbing, bypassed.`, watchedPrefix);
        pData.consecutiveOnGroundSpeedingTicks = 0; // Reset counter if they become airborne/climb
        return;
    }

    const hSpeed = Math.sqrt(pData.velocity.x ** 2 + pData.velocity.z ** 2);
    let currentMaxSpeed = MAX_HORIZONTAL_SPEED;

    const speedEffect = player.getEffects().find(effect => effect.typeId === "speed");
    if (speedEffect) {
        currentMaxSpeed += (speedEffect.amplifier + 1) * SPEED_EFFECT_BONUS;
        // debugLog(`SpeedCheck: ${player.nameTag} has Speed ${speedEffect.amplifier + 1}. MaxSpeed adjusted to: ${currentMaxSpeed.toFixed(2)}`, watchedPrefix);
    }

    currentMaxSpeed += SPEED_TOLERANCE_BUFFER;

    if (pData.isWatched) { // Only log general check info if watched
        debugLog(`SpeedCheck: Processing for ${player.nameTag}. HSpeed=${hSpeed.toFixed(2)}, MaxAllowable=${currentMaxSpeed.toFixed(2)}, SpeedingTicks=${pData.consecutiveOnGroundSpeedingTicks}`, watchedPrefix);
    }

    if (player.isOnGround && hSpeed > currentMaxSpeed) {
        pData.consecutiveOnGroundSpeedingTicks = (pData.consecutiveOnGroundSpeedingTicks || 0) + 1;
        if (pData.consecutiveOnGroundSpeedingTicks > SPEED_GROUND_CONSECUTIVE_TICKS_THRESHOLD) {
            addFlag(
                player,
                "speed",
                `Potential speed hack detected. Speed: ${hSpeed.toFixed(2)} m/s.`,
                `Max: ${currentMaxSpeed.toFixed(2)} m/s, Ticks: ${pData.consecutiveOnGroundSpeedingTicks}`
            );
            pData.consecutiveOnGroundSpeedingTicks = 0; // Reset after flagging
        }
    } else if (player.isOnGround) {
        pData.consecutiveOnGroundSpeedingTicks = 0; // Reset if on ground and not speeding
    } else {
        // If airborne and not caught by isFlying/isClimbing, also reset.
        // This handles cases like jumping where they might briefly exceed if checks are too sensitive,
        // but sustained speeding is the primary concern for this ground-based check part.
        pData.consecutiveOnGroundSpeedingTicks = 0;
    }
}
