import * as mc from '@minecraft/server';
// Removed: import { addFlag } from '../../core/playerDataManager.js';
// Removed: import { debugLog } from '../../utils/playerUtils.js';
// Config values (enableNofallCheck, minFallDistanceForDamage) are accessed via the config object.

/**
 * @typedef {import('../../core/playerDataManager.js').PlayerAntiCheatData} PlayerAntiCheatData
 */

/**
 * Checks for NoFall hacks by comparing accumulated fall distance with expected fall damage.
 * @param {mc.Player} player The player instance to check.
 * @param {PlayerAntiCheatData} pData Player-specific data.
 * @param {object} config The server configuration object.
 * @param {object} playerUtils Utility functions for players.
 * @param {object} playerDataManager Manager for player data.
 * @param {object} logManager Manager for logging.
 * @param {function} executeCheckAction Function to execute defined actions for a check.
 */
export async function checkNoFall(player, pData, config, playerUtils, playerDataManager, logManager, executeCheckAction) {
    if (!config.enableNofallCheck) return;
    const watchedPrefix = pData.isWatched ? player.nameTag : null;

    if (player.isFlying || player.isGliding || player.isInWater || player.isClimbing || player.hasComponent('minecraft:rider')) {
        // if (playerUtils.debugLog && pData.isWatched) playerUtils.debugLog(`NoFallCheck: ${player.nameTag} in exempt state (flying, gliding, water, climbing, rider).`, watchedPrefix);
        return;
    }

    const slowFallingEffect = player.getEffects().find(effect => effect.typeId === "slow_falling");
    if (slowFallingEffect) {
        // if (playerUtils.debugLog && pData.isWatched) playerUtils.debugLog(`NoFallCheck: ${player.nameTag} has Slow Falling effect.`, watchedPrefix);
        return;
    }

    if (player.isOnGround) {
        if (pData.isWatched && playerUtils.debugLog) {
             playerUtils.debugLog(`NoFallCheck: ${player.nameTag} landed. FallDistance=${pData.fallDistance.toFixed(2)}, TookDamage=${pData.isTakingFallDamage}, LastVy=${pData.velocity.y.toFixed(2)}`, watchedPrefix);
        }

        if (pData.fallDistance > config.minFallDistanceForDamage) {
            if (!pData.isTakingFallDamage) { // isTakingFallDamage is reset in main.js tick after checks if player is onGround
                const violationDetails = {
                    fallDistance: pData.fallDistance.toFixed(2),
                    healthBeforeFall: pData.health, // Assuming health is tracked in pData or player.healthComponent.currentValue could be used
                    lastVerticalVelocity: pData.velocity.y.toFixed(2),
                    activeEffects: player.getEffects().map(e => `${e.typeId} (Amp: ${e.amplifier})`).join(', ') || "none"
                };
                const dependencies = { config, playerDataManager, playerUtils, logManager };
                await executeCheckAction(player, "movement_nofall", violationDetails, dependencies);
            }
        }
        // pData.fallDistance is reset in main.js tick loop when player is onGround and not taking damage.
        // pData.isTakingFallDamage is also reset in main.js tick loop.
    }
}
