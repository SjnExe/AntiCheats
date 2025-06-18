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
 * @typedef {import('../../types.js').Dependencies} Dependencies
 */

/**
 * Checks for NoFall violations by verifying if a player takes appropriate fall damage
 * after accumulating significant fall distance.
 *
 * @param {mc.Player} player - The player instance to check.
 * @param {PlayerAntiCheatData} pData - Player-specific anti-cheat data. Expected to contain `fallDistance`,
 *                                     `isTakingFallDamage`, and `hasSlowFalling`.
 * @param {Dependencies} dependencies - The standard dependencies object.
 * @returns {Promise<void>}
 */
export async function checkNoFall(player, pData, dependencies) {
    const { config, playerUtils, actionManager } = dependencies; // Destructure only what's needed

    if (!config.enableNofallCheck || !pData) {
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

        playerUtils.debugLog(
            `[NoFallCheck] ${player.nameTag} in exempt state. ` +
            `Flying: ${player.isFlying}, Gliding: ${player.isGliding}, InWater: ${player.isInWater}, ` +
            `Climbing: ${player.isClimbing}, SlowFalling: ${pData.hasSlowFalling}, Riding: ${player.hasComponent('minecraft:rider')}.`,
            dependencies, watchedPrefix
        );
        return;
    }

    if (player.isOnGround) {
        // Slime Block Check (Grace period of 1 second after last bounce)
        // NOTE: pData.lastOnSlimeBlockTick needs to be updated elsewhere (e.g., main tick loop or specific event)
        if ((dependencies.currentTick - (pData.lastOnSlimeBlockTick || 0)) < 20) { // 20 ticks = 1 second grace
            if (playerUtils.debugLog && pData.isWatched) {
                playerUtils.debugLog(dependencies, `[NoFallCheck] Player ${player.nameTag} recently on slime block (LastTick: ${pData.lastOnSlimeBlockTick}, Current: ${dependencies.currentTick}). Fall damage check modified/bypassed.`, player.nameTag);
            }
            // Assuming full bypass for simplicity if recently on slime.
            // More nuanced logic could adjust expected damage or fallDistance.
            return;
        }

        // Other Mitigation Blocks Check (Hay Bale, Powder Snow, Sweet Berry Bush)
        try {
            const blockBelowLocation = { x: Math.floor(player.location.x), y: Math.floor(player.location.y) - 1, z: Math.floor(player.location.z) };
            const blockBelow = player.dimension.getBlock(blockBelowLocation);
            if (blockBelow && (config.noFallMitigationBlocks || []).includes(blockBelow.typeId)) {
                if (playerUtils.debugLog && pData.isWatched) {
                    playerUtils.debugLog(dependencies, `[NoFallCheck] Player ${player.nameTag} landed on a fall damage mitigating block: ${blockBelow.typeId}. Check bypassed/modified.`, player.nameTag);
                }
                return; // Bypass for now
            }
        } catch (e) {
            if (playerUtils.debugLog) {
                playerUtils.debugLog(dependencies, `[NoFallCheck] Error checking block below player ${player.nameTag}: ${e.message}`, player.nameTag);
            }
        }

        playerUtils.debugLog(
            `[NoFallCheck] ${player.nameTag} landed. FallDistance=${pData.fallDistance.toFixed(2)}, ` +
            `TookDamageThisTick=${pData.isTakingFallDamage}, LastVy=${pData.velocity?.y?.toFixed(2) ?? 'N/A'}`,
            dependencies, watchedPrefix
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
                playerUtils.debugLog(`[NoFallCheck] Error getting health for ${player.nameTag}: ${e.message}`, dependencies, watchedPrefix);
                console.error(`[NoFallCheck] Error getting health for ${player.nameTag}: ${e.stack || e}`);
            }

            // Gather effect information for details
            let activeEffectsString = "none";
            try {
                const effects = player.getEffects();
                if (effects.length > 0) {
                    activeEffectsString = effects.map(e => `${e.typeId} (Amp: ${e.amplifier}, Dur: ${e.duration})`).join(', ') || "none";
                }
            } catch(e) {
                 playerUtils.debugLog(`[NoFallCheck] Error getting effects for ${player.nameTag}: ${e.message}`, dependencies, watchedPrefix);
                 console.error(`[NoFallCheck] Error getting effects for ${player.nameTag}: ${e.stack || e}`);
            }


            const violationDetails = {
                fallDistance: pData.fallDistance.toFixed(2),
                minDamageDistance: minDamageDistance.toFixed(2),
                playerHealth: currentHealth,
                lastVerticalVelocity: pData.previousVelocity?.y?.toFixed(2) ?? 'N/A', // Use previous tick's velocity for impact
                activeEffects: activeEffectsString
            };
            // Pass the full dependencies object to executeCheckAction
            await actionManager.executeCheckAction(player, "movementNofall", violationDetails, dependencies);
        }
        // pData.fallDistance is reset in main.js tick loop when player is onGround and not pData.isTakingFallDamage.
        // pData.isTakingFallDamage is also reset in main.js tick loop after checks if player is onGround.
    }
    // No pData fields are directly modified here that need isDirtyForSave, relies on external updates.
}
