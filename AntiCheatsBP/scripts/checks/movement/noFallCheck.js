/**
 * @file Implements a check to detect players negating fall damage (NoFall).
 * It compares accumulated fall distance with whether the player actually took damage upon landing.
 * Relies on `pData.fallDistance` being accumulated in the main tick loop and
 * `pData.isTakingFallDamage` being set by `handleEntityHurt` and reset in the main tick loop.
 * Assumes `pData.hasSlowFalling` is updated by `updateTransientPlayerData`.
 */
import * as mc from '@minecraft/server';

/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').CommandDependencies} CommandDependencies
 * @typedef {import('../../types.js').Config} Config
 */

/**
 * Checks for NoFall violations by verifying if a player takes appropriate fall damage
 * after accumulating significant fall distance. This check runs every tick.
 *
 * @async
 * @param {mc.Player} player - The player instance to check.
 * @param {PlayerAntiCheatData} pData - Player-specific anti-cheat data. Expected to contain `fallDistance`,
 *                                     `isTakingFallDamage`, `hasSlowFalling`, `lastOnSlimeBlockTick`, etc.
 * @param {CommandDependencies} dependencies - The standard dependencies object, including `currentTick`.
 * @returns {Promise<void>}
 */
export async function checkNoFall(player, pData, dependencies) {
    const { config, playerUtils, actionManager, currentTick } = dependencies; // Added currentTick from dependencies

    if (!config.enableNofallCheck || !pData) {
        return;
    }

    const watchedPrefix = pData.isWatched ? player.nameTag : null;

    // Exemptions from NoFall check
    if (player.isFlying ||
        player.isGliding ||
        player.isInWater || // Vanilla water negates fall damage
        player.isClimbing || // Climbing ladders/vines
        pData.hasSlowFalling || // Slow Falling effect active
        player.hasComponent('minecraft:rider') // Player is riding an entity
    ) {
        if (config.enableDebugLogging && pData.isWatched) {
            let exemptReasons = [];
            if (player.isFlying) exemptReasons.push('Flying');
            if (player.isGliding) exemptReasons.push('Gliding');
            if (player.isInWater) exemptReasons.push('InWater');
            if (player.isClimbing) exemptReasons.push('Climbing');
            if (pData.hasSlowFalling) exemptReasons.push('SlowFallingEffect');
            if (player.hasComponent('minecraft:rider')) exemptReasons.push('RidingEntity');
            playerUtils.debugLog(`[NoFallCheck] ${player.nameTag} in exempt state: ${exemptReasons.join(', ')}. FallDistance reset.`, watchedPrefix, dependencies);
        }
        // If exempt, ensure fallDistance is reset if they were accumulating it.
        // This is important because pData.fallDistance might not reset if they land in water, for example.
        if (pData.fallDistance > 0) {
            pData.fallDistance = 0;
            pData.isDirtyForSave = true;
        }
        return;
    }

    // Logic for when player is on ground
    if (player.isOnGround) {
        // Grace period for recent slime block bounce
        if ((currentTick - (pData.lastOnSlimeBlockTick || 0)) < (config.slimeBlockNoFallGraceTicks ?? 20)) {
            if (playerUtils.debugLog && pData.isWatched) {
                playerUtils.debugLog(`[NoFallCheck] Player ${player.nameTag} recently on slime block (LastTick: ${pData.lastOnSlimeBlockTick}, Current: ${currentTick}). Fall damage check modified/bypassed. FallDistance reset.`, player.nameTag, dependencies);
            }
            pData.fallDistance = 0; // Reset fall distance as slime block handles it
            pData.isDirtyForSave = true;
            return;
        }

        // Check for landing on other fall damage mitigating blocks
        try {
            const blockBelowLocation = { x: Math.floor(player.location.x), y: Math.floor(player.location.y) - 1, z: Math.floor(player.location.z) };
            const blockBelow = player.dimension.getBlock(blockBelowLocation);
            if (blockBelow && (config.noFallMitigationBlocks || []).includes(blockBelow.typeId)) {
                if (playerUtils.debugLog && pData.isWatched) {
                    playerUtils.debugLog(`[NoFallCheck] Player ${player.nameTag} landed on a fall damage mitigating block: ${blockBelow.typeId}. Check bypassed/modified. FallDistance reset.`, player.nameTag, dependencies);
                }
                pData.fallDistance = 0; // Reset fall distance
                pData.isDirtyForSave = true;
                return;
            }
        } catch (e) {
            // Log error if debug mode is on
            if (playerUtils.debugLog && config.enableDebugLogging) {
                playerUtils.debugLog(`[NoFallCheck] Error checking block below player ${player.nameTag}: ${e.message}`, player.nameTag, dependencies);
            }
            // console.error(`[NoFallCheck] Error checking block below ${player.nameTag}: ${e.stack || e}`); // Optionally log full error
        }

        if (pData.isWatched) {
            playerUtils.debugLog(
                `[NoFallCheck] ${player.nameTag} landed. FallDistance=${pData.fallDistance.toFixed(2)}, ` +
                `TookDamageThisTick=${pData.isTakingFallDamage}, LastVy=${pData.velocity?.y?.toFixed(2) ?? 'N/A'}`, // Use pData.velocity
                watchedPrefix, dependencies
            );
        }

        const minDamageDistance = config.minFallDistanceForDamage ?? 3.5;

        // If player fell far enough to take damage but didn't register damage this tick
        if (pData.fallDistance > minDamageDistance && !pData.isTakingFallDamage) {
            let currentHealth = 'N/A';
            try {
                const healthComponent = player.getComponent(mc.EntityComponentTypes.Health);
                if (healthComponent) {
                    currentHealth = healthComponent.currentValue.toString();
                }
            } catch (e) {
                playerUtils.debugLog(`[NoFallCheck] Error getting health for ${player.nameTag}: ${e.message}`, watchedPrefix, dependencies);
                // console.error(`[NoFallCheck] Error getting health for ${player.nameTag}: ${e.stack || e}`);
            }

            let activeEffectsString = 'none';
            try {
                const effects = player.getEffects();
                if (effects.length > 0) {
                    activeEffectsString = effects.map(e => `${e.typeId.replace('minecraft:', '')} (Amp: ${e.amplifier}, Dur: ${e.duration})`).join(', ') || 'none';
                }
            } catch (e) {
                playerUtils.debugLog(`[NoFallCheck] Error getting effects for ${player.nameTag}: ${e.message}`, watchedPrefix, dependencies);
                // console.error(`[NoFallCheck] Error getting effects for ${player.nameTag}: ${e.stack || e}`);
            }

            const violationDetails = {
                fallDistance: pData.fallDistance.toFixed(2),
                minDamageDistance: minDamageDistance.toFixed(2),
                playerHealth: currentHealth,
                lastVerticalVelocity: pData.previousVelocity?.y?.toFixed(2) ?? 'N/A', // Use pData.previousVelocity
                activeEffects: activeEffectsString,
            };
            // Standardized action profile key
            await actionManager.executeCheckAction(player, 'movementNoFall', violationDetails, dependencies);
        }

        // Reset fallDistance and isTakingFallDamage once player is on ground and checks are done
        pData.fallDistance = 0;
        pData.isTakingFallDamage = false; // Explicitly reset here as well
        pData.isDirtyForSave = true;
    }
    // If player is not on ground, fallDistance accumulation is handled in updateTransientPlayerData or main tick loop.
    // isTakingFallDamage is set true by entityHurt event and reset here or in updateTransientPlayerData when on ground.
}
