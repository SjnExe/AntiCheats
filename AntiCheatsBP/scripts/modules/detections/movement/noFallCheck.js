import * as mc from '@minecraft/server';

/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').Dependencies} Dependencies
 */

/**
 * Checks for NoFall violations by verifying if a player takes appropriate fall damage
 * after accumulating significant fall distance. This check runs every tick.
 * @async
 * @param {import('@minecraft/server').Player} player - The player instance to check.
 * @param {PlayerAntiCheatData} pData - Player-specific anti-cheat data. Expected to contain `fallDistance`,
 * `isTakingFallDamage`, `hasSlowFalling`, `lastOnSlimeBlockTick`, etc.
 * @param {Dependencies} dependencies - The standard dependencies object, including `currentTick`.
 * @returns {Promise<void>}
 */
export async function checkNoFall(player, pData, dependencies) {
    const { config, playerUtils, actionManager, currentTick } = dependencies;
    const playerName = player?.name ?? 'UnknownPlayer';

    if (!config?.enableNofallCheck) {
        return;
    }
    if (!pData) {
        playerUtils?.debugLog(`[NoFallCheck] Skipping for ${playerName}: pData is null.`, playerName, dependencies);
        return;
    }

    const watchedPlayerName = pData.isWatched ? playerName : null;

    if (
        player.isFlying ||
        player.isGliding ||
        player.isInWater ||
        player.isClimbing ||
        pData.hasSlowFalling ||
        player.hasComponent(mc.EntityComponentTypes.Rider)
    ) {
        if (config?.enableDebugLogging && pData.isWatched) {
            const exemptReasons = [];
            if (player.isFlying) {
                exemptReasons.push('Flying');
            }
            if (player.isGliding) {
                exemptReasons.push('Gliding');
            }
            if (player.isInWater) {
                exemptReasons.push('InWater');
            }
            if (player.isClimbing) {
                exemptReasons.push('Climbing');
            }
            if (pData.hasSlowFalling) {
                exemptReasons.push('SlowFallingEffect');
            }
            if (player.hasComponent(mc.EntityComponentTypes.Rider)) {
                exemptReasons.push('RidingEntity');
            }
            playerUtils?.debugLog(`[NoFallCheck] ${playerName} in exempt state: ${exemptReasons.join(', ')}.`, watchedPlayerName, dependencies);
        }
        return;
    }

    if (player.isOnGround) {
        const slimeBlockGraceTicks = config?.slimeBlockNoFallGraceTicks ?? 20;
        if ((currentTick - (pData.lastOnSlimeBlockTick ?? -Infinity)) < slimeBlockGraceTicks) {
            if (pData.isWatched) {
                playerUtils?.debugLog(`[NoFallCheck] Player ${playerName} recently on slime block (LastSlimeTick: ${pData.lastOnSlimeBlockTick}, CurrentTick: ${currentTick}). Fall damage check modified/bypassed.`, watchedPlayerName, dependencies);
            }
            return;
        }

        try {
            const blockLocationBelow = { x: Math.floor(player.location.x), y: Math.floor(player.location.y) - 1, z: Math.floor(player.location.z) };
            const blockBelow = player.dimension.getBlock(blockLocationBelow);

            if (blockBelow && (config?.noFallMitigationBlocks ?? []).includes(blockBelow.typeId)) {
                if (pData.isWatched) {
                    playerUtils?.debugLog(`[NoFallCheck] Player ${playerName} landed on a configured fall damage mitigating block: ${blockBelow.typeId}. Check bypassed/modified.`, watchedPlayerName, dependencies);
                }
                return;
            }
        } catch (e) {
            playerUtils?.debugLog(`[NoFallCheck] Error checking block below for ${playerName}: ${e.message}`, watchedPlayerName, dependencies);
        }

        if (pData.isWatched) {
            playerUtils?.debugLog(
                `[NoFallCheck] ${playerName} landed. FallDistance=${pData.fallDistance.toFixed(2)}, ` + // .toFixed(2) is fine
                `TookDamageThisTick=${pData.isTakingFallDamage}, LastVy=${pData.previousVelocity?.y?.toFixed(3) ?? 'N/A'}`,
                watchedPlayerName, dependencies,
            );
        }

        const minDamageDistance = config?.minFallDistanceForDamage ?? 3.5;

        if (pData.fallDistance > minDamageDistance && !pData.isTakingFallDamage) {
            let currentHealth = 'N/A';
            let activeEffectsString = 'N/A';
            try {
                const healthComponent = player.getComponent(mc.EntityComponentTypes.Health);
                if (healthComponent) {
                    currentHealth = healthComponent.currentValue.toString();
                }

                const effects = player.getEffects();
                if (effects.length > 0) {
                    activeEffectsString = effects.map(eff => `${eff.typeId.replace('minecraft:', '')}(${eff.amplifier})`).join(', ') || 'none';
                } else {
                    activeEffectsString = 'none';
                }
            } catch (e) {
                playerUtils?.debugLog(`[NoFallCheck] Error getting health/effects for ${playerName}: ${e.message}`, watchedPlayerName, dependencies);
            }

            const violationDetails = {
                fallDistance: pData.fallDistance.toFixed(2), // .toFixed(2) is fine
                minDamageDistance: minDamageDistance.toFixed(2), // .toFixed(2) is fine
                playerHealth: currentHealth,
                lastVerticalVelocity: pData.previousVelocity?.y?.toFixed(3) ?? 'N/A',
                activeEffects: activeEffectsString,
                onGround: player.isOnGround.toString(),
                isTakingFallDamageReported: (pData.isTakingFallDamage ?? false).toString(),
            };
            const actionProfileKey = config?.noFallActionProfileName ?? 'movementNoFall';
            await actionManager?.executeCheckAction(player, actionProfileKey, violationDetails, dependencies);
            playerUtils?.debugLog(`[NoFallCheck] Flagged ${playerName} for NoFall. FallDist: ${pData.fallDistance.toFixed(2)}, MinDamageDist: ${minDamageDistance}`, watchedPlayerName, dependencies);
        }

        // The isTakingFallDamage flag is reset at the start of the next tick
        // in main.js to prevent race conditions. Fall distance is now handled centrally.
    }
}
