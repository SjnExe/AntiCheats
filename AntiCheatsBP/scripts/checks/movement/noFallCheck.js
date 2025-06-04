import * as mc from '@minecraft/server';
import { addFlag } from '../../core/playerDataManager.js';
import { debugLog } from '../../utils/playerUtils.js';
import {
    ENABLE_NOFALL_CHECK,
    MIN_FALL_DISTANCE_FOR_DAMAGE
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
    if (!ENABLE_NOFALL_CHECK) return;
    const watchedPrefix = pData.isWatched ? player.nameTag : null;

    if (player.isFlying || player.isGliding || player.isInWater || player.isClimbing || player.getVehicle()) {
        // debugLog(`NoFallCheck: ${player.nameTag} in legitimate no-fall state. FallDistance=${pData.fallDistance.toFixed(2)}`, watchedPrefix);
        // If in these states, they are not "falling" in a way that should cause damage, so reset fallDistance.
        // This might need careful consideration if we want to track fall distance even while gliding into a wall.
        // For now, this matches original intent of not checking these states.
        // pData.fallDistance = 0; // Resetting here might be too aggressive. Let main loop or landing handle it.
        return;
    }

    const slowFallingEffect = player.getEffects().find(effect => effect.typeId === "slow_falling");
    if (slowFallingEffect) {
        // debugLog(`NoFallCheck: ${player.nameTag} has slow_falling. FallDistance=${pData.fallDistance.toFixed(2)}`, watchedPrefix);
        // Similar to above, slow falling prevents damage.
        // pData.fallDistance = 0; // Resetting here might be too aggressive.
        return;
    }

    // This logic primarily acts when the player lands (isOnGround becomes true in main.js tick loop).
    // pData.isTakingFallDamage is set by handleEntityHurt.
    // pData.fallDistance is accumulated in main.js tick loop.
    if (player.isOnGround) { // This check is more effective if called right after ground status is updated
        if (pData.isWatched) {
             debugLog(`NoFallCheck: ${player.nameTag} landed. FallDistance=${pData.fallDistance.toFixed(2)}, TookDamage=${pData.isTakingFallDamage}`, watchedPrefix);
        }

        if (pData.fallDistance > MIN_FALL_DISTANCE_FOR_DAMAGE) {
            if (!pData.isTakingFallDamage) {
                addFlag(
                    player,
                    "nofall",
                    "Potential NoFall hack detected.",
                    `Landed from ${pData.fallDistance.toFixed(2)} blocks without expected damage. Last Vy: ${pData.velocity.y.toFixed(2)}`
                );
            } else {
                // debugLog(`NoFallCheck: ${player.nameTag} landed with fallDistance ${pData.fallDistance.toFixed(2)} and took damage, no flag.`, watchedPrefix);
            }
        }
        // Crucial: Reset fallDistance and isTakingFallDamage AFTER this check has used them.
        // This is now handled in the main tick loop in main.js after all checks for the tick.
        // pData.fallDistance = 0;
        // pData.isTakingFallDamage = false;
    }
}
