import * as mc from '@minecraft/server';
// Removed: import { addFlag } from '../../core/playerDataManager.js';
// Removed: import { debugLog } from '../../utils/playerUtils.js';
// Config values are accessed via the config object passed as a parameter.

/**
 * @typedef {import('../../core/playerDataManager.js').PlayerAntiCheatData} PlayerAntiCheatData
 */

/**
 * Checks for fly-related hacks by analyzing player's vertical movement and airborne state.
 * @param {mc.Player} player The player instance to check.
 * @param {PlayerAntiCheatData} pData Player-specific data.
 * @param {object} config The server configuration object.
 * @param {object} playerUtils Utility functions for players.
 * @param {object} playerDataManager Manager for player data.
 * @param {object} logManager Manager for logging.
 * @param {function} executeCheckAction Function to execute defined actions for a check.
 */
export async function checkFly(player, pData, config, playerUtils, playerDataManager, logManager, executeCheckAction) {
    if (!config.enableFlyCheck && !config.enableHighYVelocityCheck) return; // Adjusted to also consider high Y velocity check
    const watchedPrefix = pData.isWatched ? player.nameTag : null;

    // Update effect-related pData fields at the start of checkFly
    const effects = player.getEffects();
    const jumpBoost = effects.find(e => e.typeId === "jump_boost");
    pData.lastJumpBoostLevel = jumpBoost ? jumpBoost.amplifier : 0;

    const slowFalling = effects.find(e => e.typeId === "slow_falling");
    pData.lastSlowFallingTicks = slowFalling ? slowFalling.duration : 0; // duration is remaining ticks

    const levitation = effects.find(e => e.typeId === "levitation");
    pData.lastLevitationTicks = levitation ? levitation.duration : 0;
    // pData.lastTookDamageTick is updated in handleEntityHurt
    // pData.lastUsedRiptideTick (deferred)
    // pData.lastOnSlimeBlockTick (deferred)

    if (player.isGliding) {
        pData.lastUsedElytraTick = pData.currentTick; // Assuming pData.currentTick is updated in main loop
        if (!config.enableFlyCheck) return; // If only high Y velocity is on, and player is gliding, fly check part is done.
        if (playerUtils.debugLog) playerUtils.debugLog(`FlyCheck: ${player.nameTag} legitimately gliding. lastUsedElytraTick updated.`, watchedPrefix);
        return; // Standard fly checks are bypassed if gliding
    }

    if (player.isFlying) {
        if (!config.enableFlyCheck) return; // If only high Y velocity is on, and player is flying, fly check part is done.
        if (playerUtils.debugLog) playerUtils.debugLog(`FlyCheck: ${player.nameTag} legitimately flying.`, watchedPrefix);
        return; // Standard fly checks are bypassed if flying (creative/spectator)
    }

    const dependencies = { config, playerDataManager, playerUtils, logManager };

    // High Y-Velocity Check (New)
    if (config.enableHighYVelocityCheck && !player.isFlying && !player.isGliding && pData.lastLevitationTicks <= 0) {
        const currentYVelocity = pData.velocity.y;

        let effectiveMaxYVelocity = config.maxYVelocityPositive + (pData.lastJumpBoostLevel * config.jumpBoostYVelocityBonus);

        const tickSinceLastDamage = pData.currentTick - pData.lastTookDamageTick;
        const tickSinceLastElytra = pData.currentTick - pData.lastUsedElytraTick;
        // const tickSinceLastRiptide = pData.currentTick - pData.lastUsedRiptideTick; // Deferred
        // const tickSinceLastSlime = pData.currentTick - pData.lastOnSlimeBlockTick;   // Deferred

        let underGraceCondition = false;
        if (tickSinceLastDamage <= config.yVelocityGraceTicks && pData.lastTookDamageTick > 0) underGraceCondition = true;
        if (tickSinceLastElytra <= config.yVelocityGraceTicks && pData.lastUsedElytraTick > 0) underGraceCondition = true;
        // if (tickSinceLastRiptide <= config.yVelocityGraceTicks && pData.lastUsedRiptideTick > 0) underGraceCondition = true; // Deferred
        // if (tickSinceLastSlime <= config.yVelocityGraceTicks && pData.lastOnSlimeBlockTick > 0) underGraceCondition = true;   // Deferred
        if (player.isClimbing) underGraceCondition = true;
        if (pData.lastSlowFallingTicks > 0 && currentYVelocity < 0) underGraceCondition = true;

        if (currentYVelocity > effectiveMaxYVelocity && !underGraceCondition) {
            const violationDetails = {
                yVelocity: currentYVelocity.toFixed(3),
                effectiveMaxYVelocity: effectiveMaxYVelocity.toFixed(3),
                jumpBoostLevel: pData.lastJumpBoostLevel,
                onGround: player.isOnGround,
                lastTookDamageTick: pData.lastTookDamageTick,
                lastUsedElytraTick: pData.lastUsedElytraTick,
                lastLevitationTicks: pData.lastLevitationTicks,
                lastSlowFallingTicks: pData.lastSlowFallingTicks,
                isClimbing: player.isClimbing
            };
            await executeCheckAction(player, "movement_high_y_velocity", violationDetails, dependencies);
            if (pData.isWatched && playerUtils.debugLog) {
                playerUtils.debugLog(`HighYVelocity: Flagged ${player.nameTag}. Velo: ${currentYVelocity.toFixed(3)}, Max: ${effectiveMaxYVelocity.toFixed(3)}`, watchedPrefix);
            }
        }
    }

    // Existing Fly Checks (ensure this only runs if enableFlyCheck is true)
    if (!config.enableFlyCheck) return;

    // This specific levitation check might be redundant if High Y Velocity handles levitation grace,
    // but keeping it for now as it's specific to upward movement with levitation.
    const levitationEffect = effects.find(effect => effect.typeId === "levitation"); // Re-fetch or use pData.lastLevitationTicks
    if (pData.lastLevitationTicks > 0 && pData.velocity.y > 0) { // Use pData.lastLevitationTicks
        if (playerUtils.debugLog) playerUtils.debugLog(`FlyCheck: ${player.nameTag} allowing upward movement due to levitation. VSpeed: ${pData.velocity.y.toFixed(2)}`, watchedPrefix);
        return;
    }

    const verticalSpeed = pData.velocity.y;
    if (pData.isWatched && playerUtils.debugLog) {
        playerUtils.debugLog(`FlyCheck: Processing for ${player.nameTag}. VSpeed=${verticalSpeed.toFixed(2)}, OffGroundTicks=${pData.consecutiveOffGroundTicks}`, watchedPrefix);
    }

    // Sustained Upward Movement
    // For sustained, we might need a different checkType key if its actions are different.
    // For now, using "example_fly_hover" but ideally this would be "fly_sustained_example" or similar.
    // Ensure levitation isn't causing this
    if (!player.isOnGround && verticalSpeed > config.flySustainedVerticalSpeedThreshold && !player.isClimbing && pData.lastLevitationTicks <= 0) {
        if (pData.consecutiveOffGroundTicks > config.flySustainedOffGroundTicksThreshold) {
            const violationDetails = {
                type: "sustained_vertical",
                verticalSpeed: verticalSpeed.toFixed(2),
                offGroundTicks: pData.consecutiveOffGroundTicks,
                isClimbing: player.isClimbing,
                isInWater: player.isInWater,
                lastLevitationTicks: pData.lastLevitationTicks
            };
            // Using "example_fly_hover" for now, but ideally, this might be a distinct profile like "fly_sustained_example"
            await executeCheckAction(player, "example_fly_hover", violationDetails, dependencies);
        }
    }

    // Hover Detection
    // Ensure levitation isn't causing this
    if (!player.isOnGround &&
        Math.abs(verticalSpeed) < config.flyHoverVerticalSpeedThreshold &&
        pData.consecutiveOffGroundTicks > config.flyHoverOffGroundTicksThreshold &&
        pData.fallDistance < config.flyHoverMaxFallDistanceThreshold &&
        !player.isClimbing &&
        !player.isInWater &&
        pData.lastLevitationTicks <= 0
    ) {
        const playerLoc = player.location;
        const heightAboveLastGround = playerLoc.y - (pData.lastOnGroundPosition ? pData.lastOnGroundPosition.y : playerLoc.y);

        if (heightAboveLastGround > config.flyHoverNearGroundThreshold) {
            const violationDetails = {
                type: "hover",
                verticalSpeed: verticalSpeed.toFixed(2),
                offGroundTicks: pData.consecutiveOffGroundTicks,
                fallDistance: pData.fallDistance.toFixed(2),
                heightAboveLastGround: heightAboveLastGround.toFixed(2),
                isClimbing: player.isClimbing,
                isInWater: player.isInWater,
                lastLevitationTicks: pData.lastLevitationTicks
            };
            await executeCheckAction(player, "example_fly_hover", violationDetails, dependencies);
        }
    }
}
