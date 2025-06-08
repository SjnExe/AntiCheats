/**
 * @file AntiCheatsBP/scripts/checks/movement/flyCheck.js
 * Implements checks for various forms of fly-related hacks, including sustained vertical movement,
 * hovering, and excessively high vertical velocity.
 * Relies on player state (effects, gliding status) being updated in `pData` by other systems
 * (e.g., `updateTransientPlayerData` for effects, event handlers for gliding).
 * @version 1.0.2
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
 * Checks for fly-related hacks by analyzing player's vertical movement, airborne state,
 * and active effects (expected to be pre-processed into `pData`).
 *
 * @description
 * This function performs several checks:
 * 1.  **High Y-Velocity Check**: Detects if player's upward velocity exceeds limits, considering jump boost but not normal ascent from jumping.
 * 2.  **Sustained Upward Movement**: Detects prolonged upward flight not attributable to game mechanics like levitation or climbing.
 * 3.  **Hover Detection**: Detects players remaining airborne at a relatively stable height without valid reasons.
 *
 * It bypasses checks if the player is legitimately flying (Creative/Spectator mode) or gliding with elytra.
 * Assumes `pData` contains fields like `jumpBoostAmplifier`, `hasSlowFalling`, `hasLevitation`,
 * `lastUsedElytraTick`, `lastTookDamageTick`, which should be updated by `updateTransientPlayerData` or relevant event handlers.
 *
 * @param {mc.Player} player - The player instance to check.
 * @param {PlayerAntiCheatData} pData - Player-specific anti-cheat data.
 * @param {Config} config - The server configuration object.
 * @param {PlayerUtils} playerUtils - Utility functions for player interactions.
 * @param {PlayerDataManager} playerDataManager - Manager for player data.
 * @param {LogManager} logManager - Manager for logging.
 * @param {ExecuteCheckAction} executeCheckAction - Function to execute defined actions for a check.
 * @param {number} currentTick - The current game tick.
 * @returns {Promise<void>}
 */
export async function checkFly(
    player,
    pData,
    config,
    playerUtils,
    playerDataManager,
    logManager,
    executeCheckAction,
    currentTick
) {
    // Primary guard: if neither major check type is enabled, or pData is missing, exit.
    if ((!config.enableFlyCheck && !config.enableHighYVelocityCheck) || !pData) {
        return;
    }

    const watchedPrefix = pData.isWatched ? player.nameTag : null;
    const dependencies = { config, playerDataManager, playerUtils, logManager };

    // Update elytra state in pData if player is gliding
    if (player.isGliding) {
        pData.lastUsedElytraTick = currentTick;
        pData.isDirtyForSave = true; // Mark dirty as a pData field changed
        playerUtils.debugLog?.(`FlyCheck: ${player.nameTag} is gliding. lastUsedElytraTick updated. Standard fly checks bypassed.`, watchedPrefix);
        return; // Bypass other fly/hover checks if gliding
    }

    // Bypass checks if player is in a game mode that allows flight, or has known flight-like effects active.
    if (player.isFlying) { // Creative or Spectator mode flight
        playerUtils.debugLog?.(`FlyCheck: ${player.nameTag} is legitimately flying (Creative/Spectator). Standard fly checks bypassed.`, watchedPrefix);
        return;
    }

    // --- High Y-Velocity Check ---
    // This check should run if enabled, regardless of the main enableFlyCheck for hover/sustained.
    if (config.enableHighYVelocityCheck && !pData.hasLevitation) { // Don't run if levitating, as that's a specific upward force
        const currentYVelocity = pData.velocity.y;
        const jumpBoostAmplifierValue = pData.jumpBoostAmplifier ?? 0;
        const jumpBoostYVelocityBonusValue = config.jumpBoostYVelocityBonus ?? 0.0;
        const jumpBoostBonus = jumpBoostAmplifierValue * jumpBoostYVelocityBonusValue;
        const baseYVelocityPositive = config.maxYVelocityPositive ?? 2.0;
        const effectiveMaxYVelocity = baseYVelocityPositive + jumpBoostBonus;

        if (pData.isWatched && playerUtils.debugLog) {
            playerUtils.debugLog(`FlyCheck ${player.nameTag}: BaseMaxYVel: ${baseYVelocityPositive.toFixed(3)}, JumpBoostLvl: ${jumpBoostAmplifierValue}, JumpBoostBonus: ${jumpBoostBonus.toFixed(3)}, EffectiveMaxYVel: ${effectiveMaxYVelocity.toFixed(3)}`, player.nameTag);
        }

        // Grace conditions evaluation
        const ticksSinceLastDamage = currentTick - (pData.lastTookDamageTick ?? -Infinity);
        const ticksSinceLastElytra = currentTick - (pData.lastUsedElytraTick ?? -Infinity);
        // Add other grace conditions like Riptide, Slime Block if those pData fields are implemented:
        // const ticksSinceLastRiptide = currentTick - (pData.lastUsedRiptideTick ?? -Infinity);
        // const ticksSinceLastSlime = currentTick - (pData.lastOnSlimeBlockTick ?? -Infinity);

        let underGraceCondition = false;
        const graceTicks = config.yVelocityGraceTicks ?? 10; // Default grace period

        if (ticksSinceLastDamage <= graceTicks) {
            underGraceCondition = true;
            if (pData.isWatched && playerUtils.debugLog) playerUtils.debugLog(`FlyCheck ${player.nameTag}: Y-velocity check grace due to recent damage (Ticks: ${ticksSinceLastDamage})`, player.nameTag);
        }
        if (ticksSinceLastElytra <= graceTicks) {
            underGraceCondition = true;
            if (pData.isWatched && playerUtils.debugLog) playerUtils.debugLog(`FlyCheck ${player.nameTag}: Y-velocity check grace due to recent elytra use (Ticks: ${ticksSinceLastElytra})`, player.nameTag);
        }
        // if (ticksSinceLastRiptide <= graceTicks) underGraceCondition = true;
        // if (ticksSinceLastSlime <= graceTicks) underGraceCondition = true;
        if (player.isClimbing) {
            underGraceCondition = true;
            if (pData.isWatched && playerUtils.debugLog) playerUtils.debugLog(`FlyCheck ${player.nameTag}: Y-velocity check grace due to climbing.`, player.nameTag);
        }
        // If slow falling is active and player is moving down, Y velocity check is not reliable for upward bursts.
        if (pData.hasSlowFalling && currentYVelocity < 0) {
            underGraceCondition = true;
            if (pData.isWatched && playerUtils.debugLog) playerUtils.debugLog(`FlyCheck ${player.nameTag}: Y-velocity check grace due to slow falling and downward movement.`, player.nameTag);
        }


        if (currentYVelocity > effectiveMaxYVelocity && !underGraceCondition) {
            const violationDetails = {
                yVelocity: currentYVelocity.toFixed(3),
                effectiveMaxYVelocity: effectiveMaxYVelocity.toFixed(3),
                jumpBoostLevel: pData.jumpBoostAmplifier ?? 0,
                onGround: player.isOnGround,
                gracePeriodActive: underGraceCondition.toString(),
                ticksSinceDamage: ticksSinceLastDamage > graceTicks ? "N/A" : ticksSinceLastDamage.toString(),
                ticksSinceElytra: ticksSinceLastElytra > graceTicks ? "N/A" : ticksSinceLastElytra.toString(),
                isClimbing: player.isClimbing.toString(),
                hasSlowFalling: pData.hasSlowFalling?.toString() ?? "false",
                hasLevitation: pData.hasLevitation?.toString() ?? "false"
            };
            await executeCheckAction(player, "movement_high_y_velocity", violationDetails, dependencies);
            playerUtils.debugLog?.(`HighYVelocity: Flagged ${player.nameTag}. Velo: ${currentYVelocity.toFixed(3)}, Max: ${effectiveMaxYVelocity.toFixed(3)}`, watchedPrefix);
        }
    }

    // --- Traditional Fly/Hover Checks (Sustained Upward Movement & Hover) ---
    // These checks only run if enableFlyCheck is true.
    if (!config.enableFlyCheck) {
        return;
    }

    // If player has Levitation and is moving upwards, it's considered legitimate for fly/hover.
    if (pData.hasLevitation && pData.velocity.y > 0) {
        playerUtils.debugLog?.(`FlyCheck: ${player.nameTag} allowing upward movement due to levitation. VSpeed: ${pData.velocity.y.toFixed(2)}`, watchedPrefix);
        return;
    }
    // If player has Slow Falling and is moving downwards, it's legitimate for hover-like behavior.
    if (pData.hasSlowFalling && pData.velocity.y < 0) {
        playerUtils.debugLog?.(`FlyCheck: ${player.nameTag} allowing slow descent due to Slow Falling. VSpeed: ${pData.velocity.y.toFixed(2)}`, watchedPrefix);
        // This might still allow hover detection if vertical speed is very close to 0 for too long.
        // The hover check's fallDistance condition can help differentiate.
    }


    const verticalSpeed = pData.velocity.y;
    playerUtils.debugLog?.(`FlyCheck: Processing for ${player.nameTag}. VSpeed=${verticalSpeed.toFixed(2)}, OffGroundTicks=${pData.consecutiveOffGroundTicks}`, watchedPrefix);

    // 1. Sustained Upward Movement (not climbing, not levitating)
    const sustainedThreshold = config.flySustainedVerticalSpeedThreshold ?? 0.5;
    const sustainedTicks = config.flySustainedOffGroundTicksThreshold ?? 10;

    if (!player.isOnGround && verticalSpeed > sustainedThreshold && !player.isClimbing && !pData.hasLevitation) {
        if (pData.consecutiveOffGroundTicks > sustainedTicks) {
            const violationDetails = {
                type: "sustained_vertical",
                verticalSpeed: verticalSpeed.toFixed(2),
                offGroundTicks: pData.consecutiveOffGroundTicks.toString(),
                isClimbing: player.isClimbing.toString(),
                isInWater: player.isInWater.toString(), // isInWater is a native boolean property
                hasLevitation: pData.hasLevitation?.toString() ?? "false"
            };
            await executeCheckAction(player, "example_fly_hover", violationDetails, dependencies); // TODO: Use distinct action profile
        }
    }

    // 2. Hover Detection (minimal vertical speed, off-ground, low fall distance, not climbing, not in water, not levitating)
    const hoverVSpeedThreshold = config.flyHoverVerticalSpeedThreshold ?? 0.08;
    const hoverOffGroundTicks = config.flyHoverOffGroundTicksThreshold ?? 20;
    const hoverMaxFallDist = config.flyHoverMaxFallDistanceThreshold ?? 1.0;
    const hoverMinHeight = config.flyHoverNearGroundThreshold ?? 3.0;

    if (!player.isOnGround &&
        Math.abs(verticalSpeed) < hoverVSpeedThreshold &&
        pData.consecutiveOffGroundTicks > hoverOffGroundTicks &&
        pData.fallDistance < hoverMaxFallDist &&
        !player.isClimbing &&
        !player.isInWater && // Player is not in water (or use isSwimming if more specific)
        !pData.hasLevitation
    ) {
        const playerLoc = player.location;
        // Ensure lastOnGroundPosition is valid before calculating height
        const heightAboveLastGround = pData.lastOnGroundPosition ? (playerLoc.y - pData.lastOnGroundPosition.y) : hoverMinHeight + 1; // Assume high if no ground pos

        if (heightAboveLastGround > hoverMinHeight) {
            const violationDetails = {
                type: "hover",
                verticalSpeed: verticalSpeed.toFixed(2),
                offGroundTicks: pData.consecutiveOffGroundTicks.toString(),
                fallDistance: pData.fallDistance.toFixed(2),
                heightAboveLastGround: heightAboveLastGround.toFixed(2),
                isClimbing: player.isClimbing.toString(),
                isInWater: player.isInWater.toString(),
                hasLevitation: pData.hasLevitation?.toString() ?? "false"
            };
            await executeCheckAction(player, "example_fly_hover", violationDetails, dependencies); // TODO: Use distinct action profile
        }
    }
}
