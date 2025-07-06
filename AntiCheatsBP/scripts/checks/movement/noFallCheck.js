/**
 * @file Implements a check to detect players negating fall damage (NoFall).
 * It compares accumulated fall distance with whether the player actually took damage upon landing.
 * Relies on `pData.fallDistance` being accumulated in the main tick loop and
 * `pData.isTakingFallDamage` being set by `handleEntityHurt` and reset in the main tick loop.
 * Assumes `pData.hasSlowFalling` is updated by `updateTransientPlayerData`.
 */
import * as mc from '@minecraft/server'; // For mc.EntityComponentTypes, mc.MinecraftBlockTypes

/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').Dependencies} Dependencies
 */

/**
 * Checks for NoFall violations by verifying if a player takes appropriate fall damage
 * after accumulating significant fall distance. This check runs every tick.
 *
 * @async
 * @param {import('@minecraft/server').Player} player - The player instance to check.
 * @param {PlayerAntiCheatData} pData - Player-specific anti-cheat data. Expected to contain `fallDistance`,
 *                                     `isTakingFallDamage`, `hasSlowFalling`, `lastOnSlimeBlockTick`, etc.
 * @param {Dependencies} dependencies - The standard dependencies object, including `currentTick`.
 * @returns {Promise<void>}
 */
export async function checkNoFall(player, pData, dependencies) {
    const { config, playerUtils, actionManager, currentTick, logManager } = dependencies;
    const playerName = player?.nameTag ?? 'UnknownPlayer';

    if (!config?.enableNofallCheck) { // Note: config key is 'enableNofallCheck' not 'enableNoFallCheck'
        return;
    }
    if (!pData) {
        playerUtils?.debugLog(`[NoFallCheck] Skipping for ${playerName}: pData is null.`, playerName, dependencies);
        return;
    }

    const watchedPlayerName = pData.isWatched ? playerName : null;

    // Exemptions / Grace Conditions
    if (
        player.isFlying ||
        player.isGliding ||
        player.isInWater || // Vanilla water negates fall damage
        player.isClimbing || // Climbing ladders/vines
        pData.hasSlowFalling || // Slow Falling effect active
        player.hasComponent(mc.EntityComponentTypes.Rider) // If player is riding an entity
    ) {
        if (config?.enableDebugLogging && pData.isWatched) {
            const exemptReasons = [];
            if (player.isFlying) exemptReasons.push('Flying');
            if (player.isGliding) exemptReasons.push('Gliding');
            if (player.isInWater) exemptReasons.push('InWater');
            if (player.isClimbing) exemptReasons.push('Climbing');
            if (pData.hasSlowFalling) exemptReasons.push('SlowFallingEffect');
            if (player.hasComponent(mc.EntityComponentTypes.Rider)) exemptReasons.push('RidingEntity');
            playerUtils?.debugLog(`[NoFallCheck] ${playerName} in exempt state: ${exemptReasons.join(', ')}. FallDistance reset.`, watchedPlayerName, dependencies);
        }
        if (pData.fallDistance > 0) {
            pData.fallDistance = 0;
            pData.isDirtyForSave = true;
        }
        return;
    }

    if (player.isOnGround) {
        const slimeBlockGraceTicks = config?.slimeBlockNoFallGraceTicks ?? 20; // Default 1 second
        if ((currentTick - (pData.lastOnSlimeBlockTick ?? -Infinity)) < slimeBlockGraceTicks) {
            if (pData.isWatched) {
                playerUtils?.debugLog(`[NoFallCheck] Player ${playerName} recently on slime block (LastSlimeTick: ${pData.lastOnSlimeBlockTick}, CurrentTick: ${currentTick}). Fall damage check modified/bypassed. FallDistance reset.`, watchedPlayerName, dependencies);
            }
            if (pData.fallDistance > 0) { pData.fallDistance = 0; pData.isDirtyForSave = true; }
            return;
        }

        try {
            const blockLocationBelow = { x: Math.floor(player.location.x), y: Math.floor(player.location.y) - 1, z: Math.floor(player.location.z) };
            const blockBelow = player.dimension.getBlock(blockLocationBelow);

            if (blockBelow && (config?.noFallMitigationBlocks ?? []).includes(blockBelow.typeId)) {
                if (pData.isWatched) {
                    playerUtils?.debugLog(`[NoFallCheck] Player ${playerName} landed on a configured fall damage mitigating block: ${blockBelow.typeId}. Check bypassed/modified. FallDistance reset.`, watchedPlayerName, dependencies);
                }
                if (pData.fallDistance > 0) { pData.fallDistance = 0; pData.isDirtyForSave = true; }
                return;
            }
        } catch (e) {
            // Log error but don't crash the check
            playerUtils?.debugLog(`[NoFallCheck WARNING] Error checking block below player ${playerName}: ${e.message}`, watchedPlayerName, dependencies);
            logManager?.addLog({
                actionType: 'errorNoFallCheckBlockBelow', context: 'NoFallCheck.getBlockBelow',
                targetName: playerName, details: { error: e.message }, errorStack: e.stack
            }, dependencies);
        }

        if (pData.isWatched) {
            playerUtils?.debugLog(
                `[NoFallCheck] ${playerName} landed. FallDistance=${pData.fallDistance.toFixed(2)}, ` +
                `TookDamageThisTick=${pData.isTakingFallDamage}, LastVy=${pData.previousVelocity?.y?.toFixed(3) ?? 'N/A'}`, // Use previousVelocity for speed just before impact
                watchedPlayerName, dependencies
            );
        }

        const minDamageDistance = config?.minFallDistanceForDamage ?? 3.5; // Default ~3.5 blocks

        if (pData.fallDistance > minDamageDistance && !pData.isTakingFallDamage) {
            let currentHealth = 'N/A';
            try {
                const healthComponent = player.getComponent(mc.EntityComponentTypes.Health);
                if (healthComponent) currentHealth = healthComponent.currentValue.toString();
            } catch (e) { /* ignore, already logged if debug enabled */ }

            let activeEffectsString = 'none';
            try {
                const effects = player.getEffects();
                if (effects.length > 0) {
                    activeEffectsString = effects.map(e => `${e.typeId.replace('minecraft:', '')}(${e.amplifier})`).join(', ') || 'none';
                }
            } catch (e) { /* ignore */ }

            const violationDetails = {
                fallDistance: pData.fallDistance.toFixed(2),
                minDamageDistance: minDamageDistance.toFixed(2),
                playerHealth: currentHealth,
                lastVerticalVelocity: pData.previousVelocity?.y?.toFixed(3) ?? 'N/A',
                activeEffects: activeEffectsString,
                onGround: player.isOnGround.toString(),
                isTakingFallDamageReported: (pData.isTakingFallDamage ?? false).toString(),
            };
            // Ensure actionProfileKey is camelCase
            const rawActionProfileKey = config?.noFallActionProfileName ?? 'movementNoFall';
            const actionProfileKey = rawActionProfileKey
                .replace(/([-_][a-z0-9])/ig, ($1) => $1.toUpperCase().replace('-', '').replace('_', ''))
                .replace(/^[A-Z]/, (match) => match.toLowerCase());
            await actionManager?.executeCheckAction(player, actionProfileKey, violationDetails, dependencies);
            playerUtils?.debugLog(`[NoFallCheck] Flagged ${playerName} for NoFall. FallDist: ${pData.fallDistance.toFixed(2)}, MinDamageDist: ${minDamageDistance}`, watchedPlayerName, dependencies);
        }

        // Reset fall distance and damage flag now that player is on ground and checks are done for this landing
        if (pData.fallDistance > 0 || pData.isTakingFallDamage) {
            pData.fallDistance = 0;
            pData.isTakingFallDamage = false; // Reset this flag after processing the landing
            pData.isDirtyForSave = true;
        }
    }
    // If player is not onGround, fallDistance continues to accumulate in updateTransientPlayerData (or main tick loop).
}
