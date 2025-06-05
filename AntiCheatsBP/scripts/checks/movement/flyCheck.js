import * as mc from '@minecraft/server';
import { addFlag } from '../../core/playerDataManager.js';
import { debugLog } from '../../utils/playerUtils.js';
import {
    enableFlyCheck, // Renamed
    flySustainedVerticalSpeedThreshold, // Renamed
    flySustainedOffGroundTicksThreshold, // Renamed
    flyHoverNearGroundThreshold, // Renamed
    flyHoverVerticalSpeedThreshold, // Renamed
    flyHoverOffGroundTicksThreshold, // Renamed
    flyHoverMaxFallDistanceThreshold // Renamed
} from '../../config.js';

/**
 * @typedef {import('../../core/playerDataManager.js').PlayerAntiCheatData} PlayerAntiCheatData
 */

/**
 * Checks for fly-related hacks by analyzing player's vertical movement and airborne state.
 * @param {mc.Player} player The player instance to check.
 * @param {PlayerAntiCheatData} pData Player-specific data.
 */
export function checkFly(player, pData) {
    if (!enableFlyCheck) return; // Renamed
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
    if (pData.isWatched) {
        debugLog(`FlyCheck: Processing for ${player.nameTag}. VSpeed=${verticalSpeed.toFixed(2)}, OffGroundTicks=${pData.consecutiveOffGroundTicks}`, watchedPrefix);
    }

    // Sustained Upward Movement
    if (!player.isOnGround && verticalSpeed > flySustainedVerticalSpeedThreshold && !player.isClimbing) { // Renamed
        if (pData.consecutiveOffGroundTicks > flySustainedOffGroundTicksThreshold) { // Renamed
            addFlag(
                player,
                "fly",
                "Potential fly hack detected (sustained upward movement).",
                `VSpeed: ${verticalSpeed.toFixed(2)}, OffGroundTicks: ${pData.consecutiveOffGroundTicks}`
            );
        }
    }

    // Hover Detection
    if (!player.isOnGround &&
        Math.abs(verticalSpeed) < flyHoverVerticalSpeedThreshold && // Renamed
        pData.consecutiveOffGroundTicks > flyHoverOffGroundTicksThreshold && // Renamed
        pData.fallDistance < flyHoverMaxFallDistanceThreshold && // Renamed
        !player.isClimbing &&
        !player.isInWater
    ) {
        const playerLoc = player.location;
        const heightAboveLastGround = playerLoc.y - (pData.lastOnGroundPosition ? pData.lastOnGroundPosition.y : playerLoc.y);

        if (heightAboveLastGround > flyHoverNearGroundThreshold) { // Renamed
            addFlag(
                player,
                "fly",
                "Potential fly hack detected (hovering).",
                `VSpeed: ${verticalSpeed.toFixed(2)}, OffGroundTicks: ${pData.consecutiveOffGroundTicks}, FallD: ${pData.fallDistance.toFixed(2)}, HeightAboveLastGround: ${heightAboveLastGround.toFixed(2)}`
            );
        }
    }
}
