import * as mc from '@minecraft/server';
import { addFlag } from '../../core/playerDataManager.js';
import { debugLog } from '../../utils/playerUtils.js';
import {
    enableNofallCheck, // Renamed
    minFallDistanceForDamage // Renamed
} from '../../config.js';

/**
 * @typedef {import('../../core/playerDataManager.js').PlayerAntiCheatData} PlayerAntiCheatData
 */

/**
 * Checks for NoFall hacks by comparing accumulated fall distance with expected fall damage.
 * @param {mc.Player} player The player instance to check.
 * @param {PlayerAntiCheatData} pData Player-specific data.
 */
export function checkNoFall(player, pData) {
    if (!enableNofallCheck) return; // Renamed
    const watchedPrefix = pData.isWatched ? player.nameTag : null;

    if (player.isFlying || player.isGliding || player.isInWater || player.isClimbing || player.hasComponent('minecraft:rider')) {
        return;
    }

    const slowFallingEffect = player.getEffects().find(effect => effect.typeId === "slow_falling");
    if (slowFallingEffect) {
        return;
    }

    if (player.isOnGround) {
        if (pData.isWatched) {
             debugLog(`NoFallCheck: ${player.nameTag} landed. FallDistance=${pData.fallDistance.toFixed(2)}, TookDamage=${pData.isTakingFallDamage}`, watchedPrefix);
        }

        if (pData.fallDistance > minFallDistanceForDamage) { // Renamed
            if (!pData.isTakingFallDamage) {
                addFlag(
                    player,
                    "nofall",
                    "Potential NoFall hack detected.",
                    `Landed from ${pData.fallDistance.toFixed(2)} blocks without expected damage. Last Vy: ${pData.velocity.y.toFixed(2)}`
                );
            }
        }
    }
}
