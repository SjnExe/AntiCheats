import * as mc from '@minecraft/server';
import { addFlag } from '../../core/playerDataManager.js';
import { debugLog } from '../../utils/playerUtils.js';
import {
    ENABLE_FLY_CHECK,
    FLY_SUSTAINED_VERTICAL_SPEED_THRESHOLD,
    FLY_SUSTAINED_OFF_GROUND_TICKS_THRESHOLD,
    FLY_HOVER_NEAR_GROUND_THRESHOLD,
    FLY_HOVER_VERTICAL_SPEED_THRESHOLD,
    FLY_HOVER_OFF_GROUND_TICKS_THRESHOLD,
    FLY_HOVER_MAX_FALL_DISTANCE_THRESHOLD
    // MAX_VERTICAL_SPEED is also in config but not directly used by checkFly's flagging logic, more for context if needed
} from '../../config.js';

/**
 * @typedef {import('../../core/playerDataManager.js').PlayerAntiCheatData} PlayerAntiCheatData
 * // Or ideally, a central types definition file if PlayerAntiCheatData is used in many places.
 */

/**
 * Checks for fly-related hacks by analyzing player's vertical movement and airborne state.
 * Detects sustained upward movement while airborne (potential fly) and prolonged hovering.
 * @param {mc.Player} player The player instance to check.
 * @param {PlayerAntiCheatData} pData Player-specific data.
 */
export function checkFly(player, pData) {
    if (!ENABLE_FLY_CHECK) return;
    const watchedPrefix = pData.isWatched ? player.nameTag : null;

    if (player.isFlying || player.isGliding) {
        debugLog(`FlyCheck: ${player.nameTag} legitimately flying or gliding.`, watchedPrefix);
        return;
    }

    const levitationEffect = player.getEffects().find(effect => effect.typeId === "levitation");
    if (levitationEffect && pData.velocity.y > 0) {
        debugLog(`FlyCheck: ${player.nameTag} allowing upward movement due to levitation. VSpeed: ${pData.velocity.y.toFixed(2)}`, watchedPrefix);
        return;
    }

    const verticalSpeed = pData.velocity.y;
    // Basic debug log, more detailed logs will come from addFlag if a violation occurs
    if (pData.isWatched) { // Only log general check info if watched to reduce spam
        debugLog(`FlyCheck: Processing for ${player.nameTag}. VSpeed=${verticalSpeed.toFixed(2)}, OffGroundTicks=${pData.consecutiveOffGroundTicks}`, watchedPrefix);
    }


    // Sustained Upward Movement
    if (!player.isOnGround && verticalSpeed > FLY_SUSTAINED_VERTICAL_SPEED_THRESHOLD && !player.isClimbing) {
        if (pData.consecutiveOffGroundTicks > FLY_SUSTAINED_OFF_GROUND_TICKS_THRESHOLD) {
            addFlag(
                player,
                "fly",
                "Potential fly hack detected (sustained upward movement).",
                `VSpeed: ${verticalSpeed.toFixed(2)}, OffGroundTicks: ${pData.consecutiveOffGroundTicks}`
            );
            // No need to return immediately, let hover check also run if applicable, though unlikely for this case.
        }
    }

    // Hover Detection
    if (!player.isOnGround &&
        Math.abs(verticalSpeed) < FLY_HOVER_VERTICAL_SPEED_THRESHOLD &&
        pData.consecutiveOffGroundTicks > FLY_HOVER_OFF_GROUND_TICKS_THRESHOLD &&
        pData.fallDistance < FLY_HOVER_MAX_FALL_DISTANCE_THRESHOLD &&
        !player.isClimbing &&
        !player.isInWater
    ) {
        const playerLoc = player.location;
        const heightAboveLastGround = playerLoc.y - (pData.lastOnGroundPosition ? pData.lastOnGroundPosition.y : playerLoc.y);

        if (heightAboveLastGround > FLY_HOVER_NEAR_GROUND_THRESHOLD) {
            addFlag(
                player,
                "fly",
                "Potential fly hack detected (hovering).",
                `VSpeed: ${verticalSpeed.toFixed(2)}, OffGroundTicks: ${pData.consecutiveOffGroundTicks}, FallD: ${pData.fallDistance.toFixed(2)}, HeightAboveLastGround: ${heightAboveLastGround.toFixed(2)}`
            );
        }
    }
}
