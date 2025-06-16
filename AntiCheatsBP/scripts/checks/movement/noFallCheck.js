/**
 * @file AntiCheatsBP/scripts/checks/movement/noFallCheck.js
 * Implements a check to detect players negating fall damage (NoFall).
 * It compares accumulated fall distance with whether the player actually took damage upon landing.
 * Relies on `pData.fallDistance` being accumulated in the main tick loop and
 * `pData.isTakingFallDamage` being set by `handleEntityHurt` and reset in the main tick loop.
 * Assumes `pData.hasSlowFalling` is updated by `updateTransientPlayerData`.
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
 * Checks for NoFall violations by verifying if a player takes appropriate fall damage
 * after accumulating significant fall distance.
 *
 * @param {mc.Player} player - The player instance to check.
 * @param {PlayerAntiCheatData} pData - Player-specific anti-cheat data. Expected to contain `fallDistance`,
 *                                     `isTakingFallDamage`, and `hasSlowFalling`.
 * @param {Config} config - The server configuration object, with `enableNofallCheck` and `minFallDistanceForDamage`.
 * @param {PlayerUtils} playerUtils - Utility functions for player interactions.
 * @param {PlayerDataManager} playerDataManager - Manager for player data.
 * @param {LogManager} logManager - Manager for logging.
 * @param {ExecuteCheckAction} executeCheckAction - Function to execute defined actions for a check.
 * @param {number} currentTick - The current game tick (not directly used in this check's core logic).
 * @returns {Promise<void>}
 */
export async function checkNoFall(
    player,
    pData,
    config,
    playerUtils,
    playerDataManager,
    logManager,
    executeCheckAction,
    currentTick // Not directly used by this check's core logic
) {
    if (!config.enableNofallCheck || !pData) { // Added null check for pData
        return;
    }

    const watchedPrefix = pData.isWatched ? player.nameTag : null;

    // Exemptions for legitimate flight, gliding, swimming, climbing, riding, or active Slow Falling effect
    if (player.isFlying ||
        player.isGliding ||
        player.isInWater || // Consider player.isSwimming for more specific water scenarios if API evolves
        player.isClimbing ||
        pData.hasSlowFalling || // Use pre-calculated pData.hasSlowFalling
        player.hasComponent('minecraft:rider')) { // Check if player is riding an entity

        playerUtils.debugLog?.(
            `NoFallCheck: ${player.nameTag} in exempt state. ` +
            `Flying: ${player.isFlying}, Gliding: ${player.isGliding}, InWater: ${player.isInWater}, ` +
            `Climbing: ${player.isClimbing}, SlowFalling: ${pData.hasSlowFalling}, Riding: ${player.hasComponent('minecraft:rider')}.`,
            watchedPrefix
        );
        return;
    }

    if (player.isOnGround) {
        playerUtils.debugLog?.(
            `NoFallCheck: ${player.nameTag} landed. FallDistance=${pData.fallDistance.toFixed(2)}, ` +
            `TookDamageThisTick=${pData.isTakingFallDamage}, LastVy=${pData.velocity?.y?.toFixed(2) ?? 'N/A'}`,
            watchedPrefix
        );

        const minDamageDistance = config.minFallDistanceForDamage ?? 3.5;

        // If fallDistance exceeds threshold and player did NOT take fall damage this landing cycle
        if (pData.fallDistance > minDamageDistance && !pData.isTakingFallDamage) {
            let currentHealth = 'N/A';
            try {
                const healthComponent = player.getComponent(mc.EntityComponentTypes.Health);
                if (healthComponent) {
                    currentHealth = healthComponent.currentValue.toString();
                }
            } catch (e) {
                playerUtils.debugLog?.(`NoFallCheck: Error getting health for ${player.nameTag}: ${e}`, watchedPrefix);
            }

            // Gather effect information for details
            let activeEffectsString = "none";
            try {
                const effects = player.getEffects();
                if (effects.length > 0) {
                    activeEffectsString = effects.map(e => `${e.typeId} (Amp: ${e.amplifier}, Dur: ${e.duration})`).join(', ') || "none";
                }
            } catch(e) {
                 playerUtils.debugLog?.(`NoFallCheck: Error getting effects for ${player.nameTag}: ${e}`, watchedPrefix);
            }


            const violationDetails = {
                fallDistance: pData.fallDistance.toFixed(2),
                minDamageDistance: minDamageDistance.toFixed(2),
                playerHealth: currentHealth,
                lastVerticalVelocity: pData.previousVelocity?.y?.toFixed(2) ?? 'N/A', // Use previous tick's velocity for impact
                activeEffects: activeEffectsString
            };
            const dependencies = { config, playerDataManager, playerUtils, logManager };
            await executeCheckAction(player, "movementNofall", violationDetails, dependencies);
        }
        // pData.fallDistance is reset in main.js tick loop when player is onGround and not pData.isTakingFallDamage.
        // pData.isTakingFallDamage is also reset in main.js tick loop after checks if player is onGround.
    }
    // No pData fields are directly modified here that need isDirtyForSave, relies on external updates.
}
