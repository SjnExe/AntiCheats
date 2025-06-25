/**
 * @file Implements checks for various forms of fly-related hacks, including sustained vertical movement,
 * hovering, and excessively high vertical velocity.
 * Relies on player state (effects, gliding status) being updated in `pData` by other systems
 * (e.g., `updateTransientPlayerData` for effects, event handlers for gliding).
 */
import * as mc from '@minecraft/server'; // Not strictly required if only using types, but good for consistency.

/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').Config} Config
 * @typedef {import('../../types.js').PlayerUtils} PlayerUtils
 * @typedef {import('../../types.js').ActionManager} ActionManager
 * @typedef {import('../../types.js').CommandDependencies} CommandDependencies
 */

/**
 * Checks for fly-related hacks by analyzing player's vertical movement, airborne state,
 * and active effects (expected to be pre-processed into `pData`).
 *
 * This function performs several checks:
 * 1.  **High Y-Velocity Check**: Detects if player's upward velocity exceeds limits,
 *     considering jump boost but not normal ascent from jumping.
 * 2.  **Sustained Upward Movement**: Detects prolonged upward flight not attributable
 *     to game mechanics like levitation or climbing.
 * 3.  **Hover Detection**: Detects players remaining airborne at a relatively stable height
 *     without valid reasons (e.g., not gliding, not climbing, no levitation).
 *
 * It bypasses checks if the player is legitimately flying (Creative/Spectator mode) or gliding with elytra.
 * Assumes `pData` contains fields like `jumpBoostAmplifier`, `hasSlowFalling`, `hasLevitation`,
 * `lastUsedElytraTick`, `lastTookDamageTick`, which should be updated by `updateTransientPlayerData`
 * or relevant event handlers.
 *
 * @async
 * @param {import('@minecraft/server').Player} player - The player instance to check.
 * @param {PlayerAntiCheatData} pData - Player-specific anti-cheat data.
 * @param {CommandDependencies} dependencies - Object containing shared dependencies.
 * @returns {Promise<void>}
 */
export async function checkFly(player, pData, dependencies) {
    const { config, playerUtils, actionManager, currentTick } = dependencies;

    if ((!config.enableFlyCheck && !config.enableHighYVelocityCheck) || !pData) {
        return;
    }

    const watchedPrefix = pData.isWatched ? player.nameTag : null;

    // Bypass checks for legitimate flight states
    if (player.isGliding) {
        pData.lastUsedElytraTick = currentTick; // Update last elytra usage time
        pData.isDirtyForSave = true;
        playerUtils.debugLog(`[FlyCheck] ${player.nameTag} is gliding. lastUsedElytraTick updated. Standard fly checks bypassed.`, watchedPrefix, dependencies);
        return;
    }
    if (player.isFlying) { // Covers Creative and Spectator modes
        playerUtils.debugLog(`[FlyCheck] ${player.nameTag} is legitimately flying. Standard fly checks bypassed.`, watchedPrefix, dependencies);
        return;
    }

    // 1. High Y-Velocity Check
    if (config.enableHighYVelocityCheck && !pData.hasLevitation) {
        const currentYVelocity = pData.velocity.y;
        const jumpBoostAmplifierValue = pData.jumpBoostAmplifier ?? 0;
        // Assuming jumpBoostYVelocityBonus is per level, not total.
        const jumpBoostBonus = jumpBoostAmplifierValue * (config.jumpBoostYVelocityBonus ?? 0.0);
        const baseYVelocityPositive = config.maxYVelocityPositive ?? 2.0; // Default from previous logic
        const effectiveMaxYVelocity = baseYVelocityPositive + jumpBoostBonus;

        if (pData.isWatched) {
            playerUtils.debugLog(`[FlyCheck][Y-Velo] ${player.nameTag}: CurrentYVelo: ${currentYVelocity.toFixed(3)}, BaseMax: ${baseYVelocityPositive.toFixed(3)}, JumpBoostLvl: ${jumpBoostAmplifierValue}, JumpBoostBonus: ${jumpBoostBonus.toFixed(3)}, EffectiveMax: ${effectiveMaxYVelocity.toFixed(3)}`, player.nameTag, dependencies);
        }

        const ticksSinceLastDamage = currentTick - (pData.lastTookDamageTick ?? -Infinity);
        const ticksSinceLastElytra = currentTick - (pData.lastUsedElytraTick ?? -Infinity);
        const graceTicks = config.yVelocityGraceTicks ?? 10;

        const underGraceCondition = (
            ticksSinceLastDamage <= graceTicks ||
            ticksSinceLastElytra <= graceTicks ||
            player.isClimbing ||
            (pData.hasSlowFalling && currentYVelocity < 0) // Grace if slow falling downwards
        );

        if (underGraceCondition && pData.isWatched) {
            let graceReasons = [];
            if (ticksSinceLastDamage <= graceTicks) graceReasons.push(`recent damage (${ticksSinceLastDamage}t)`);
            if (ticksSinceLastElytra <= graceTicks) graceReasons.push(`recent elytra (${ticksSinceLastElytra}t)`);
            if (player.isClimbing) graceReasons.push('climbing');
            if (pData.hasSlowFalling && currentYVelocity < 0) graceReasons.push('slow falling downwards');
            playerUtils.debugLog(`[FlyCheck][Y-Velo] ${player.nameTag}: Y-velocity check grace due to: ${graceReasons.join(', ')}.`, player.nameTag, dependencies);
        }

        if (currentYVelocity > effectiveMaxYVelocity && !underGraceCondition) {
            const violationDetails = {
                yVelocity: currentYVelocity.toFixed(3),
                effectiveMaxYVelocity: effectiveMaxYVelocity.toFixed(3),
                jumpBoostLevel: pData.jumpBoostAmplifier ?? 0,
                onGround: player.isOnGround.toString(),
                gracePeriodActive: underGraceCondition.toString(),
                ticksSinceDamage: ticksSinceLastDamage > graceTicks ? 'N/A' : ticksSinceLastDamage.toString(),
                ticksSinceElytra: ticksSinceLastElytra > graceTicks ? 'N/A' : ticksSinceLastElytra.toString(),
                isClimbing: player.isClimbing.toString(),
                hasSlowFalling: pData.hasSlowFalling?.toString() ?? 'false',
                hasLevitation: pData.hasLevitation?.toString() ?? 'false',
            };
            // Standardized action profile key
            const highYVelocityActionProfileKey = config.highYVelocityActionProfileName ?? 'movementHighYVelocity';
            await actionManager.executeCheckAction(player, highYVelocityActionProfileKey, violationDetails, dependencies);
            playerUtils.debugLog(`[FlyCheck][Y-Velo] Flagged ${player.nameTag}. Velo: ${currentYVelocity.toFixed(3)}, Max: ${effectiveMaxYVelocity.toFixed(3)}`, watchedPrefix, dependencies);
        }
    }

    // 2. Sustained Upward Movement & 3. Hover Detection (only if general fly check enabled)
    if (!config.enableFlyCheck) {
        return;
    }

    // Allow upward movement if player has levitation effect
    if (pData.hasLevitation && pData.velocity.y > 0) {
        playerUtils.debugLog(`[FlyCheck] ${player.nameTag} allowing upward movement due to levitation. VSpeed: ${pData.velocity.y.toFixed(2)}`, watchedPrefix, dependencies);
        return; // Levitation can cause sustained upward movement
    }
    // Note slow falling for context, but doesn't exempt from all hover checks if Y velocity is near zero
    if (pData.hasSlowFalling && pData.velocity.y < 0) {
        playerUtils.debugLog(`[FlyCheck] ${player.nameTag} noting slow descent due to Slow Falling. VSpeed: ${pData.velocity.y.toFixed(2)}`, watchedPrefix, dependencies);
    }

    const verticalSpeed = pData.velocity.y;
    if (pData.isWatched) {
        playerUtils.debugLog(`[FlyCheck] Processing for ${player.nameTag}. VSpeed=${verticalSpeed.toFixed(2)}, OffGroundTicks=${pData.consecutiveOffGroundTicks}`, watchedPrefix, dependencies);
    }

    // Sustained Upward Movement Check
    const sustainedThreshold = config.flySustainedVerticalSpeedThreshold ?? 0.5;
    const sustainedTicks = config.flySustainedOffGroundTicksThreshold ?? 10;

    if (!player.isOnGround && verticalSpeed > sustainedThreshold && !player.isClimbing && !pData.hasLevitation) {
        if (pData.consecutiveOffGroundTicks > sustainedTicks) {
            const violationDetails = {
                type: 'sustainedVertical', // Changed to camelCase
                verticalSpeed: verticalSpeed.toFixed(2),
                offGroundTicks: pData.consecutiveOffGroundTicks.toString(),
                isClimbing: player.isClimbing.toString(),
                isInWater: player.isInWater.toString(), // Added for context
                hasLevitation: pData.hasLevitation?.toString() ?? 'false',
            };
            // Standardized action profile key
            const sustainedFlyActionProfileKey = config.sustainedFlyActionProfileName ?? 'movementSustainedFly';
            await actionManager.executeCheckAction(player, sustainedFlyActionProfileKey, violationDetails, dependencies);
            playerUtils.debugLog(`[FlyCheck][Sustained] Flagged ${player.nameTag}. VSpeed: ${verticalSpeed.toFixed(2)}, OffGround: ${pData.consecutiveOffGroundTicks}t`, watchedPrefix, dependencies);
        }
    }

    // Hover Detection Check
    const hoverVSpeedThreshold = config.flyHoverVerticalSpeedThreshold ?? 0.08; // Near-zero vertical speed
    const hoverOffGroundTicks = config.flyHoverOffGroundTicksThreshold ?? 20; // Hovering for at least 1 second
    const hoverMaxFallDist = config.flyHoverMaxFallDistanceThreshold ?? 1.0; // Not accumulating significant fall distance
    const hoverMinHeight = config.flyHoverNearGroundThreshold ?? 3.0; // Min height above last ground to be considered "hovering" vs near-ground jump peak

    if (!player.isOnGround &&
        Math.abs(verticalSpeed) < hoverVSpeedThreshold &&
        pData.consecutiveOffGroundTicks > hoverOffGroundTicks &&
        player.fallDistance < hoverMaxFallDist && // Use direct player.fallDistance for current state
        !player.isClimbing &&
        !player.isInWater && // Not hovering in water
        !pData.hasLevitation && // No levitation
        !pData.hasSlowFalling // Not just slow falling with minimal Y movement
    ) {
        const playerLoc = player.location;
        // Height above the last solid ground position
        const heightAboveLastGround = pData.lastOnGroundPosition ? (playerLoc.y - pData.lastOnGroundPosition.y) : (hoverMinHeight + 1.0); // Default high if no last ground pos

        if (heightAboveLastGround > hoverMinHeight) {
            const violationDetails = {
                type: 'flyHover', // Changed to camelCase
                verticalSpeed: verticalSpeed.toFixed(2),
                offGroundTicks: pData.consecutiveOffGroundTicks.toString(),
                fallDistance: player.fallDistance.toFixed(2),
                heightAboveLastGround: heightAboveLastGround.toFixed(2),
                isClimbing: player.isClimbing.toString(),
                isInWater: player.isInWater.toString(),
                hasLevitation: pData.hasLevitation?.toString() ?? 'false',
                hasSlowFalling: pData.hasSlowFalling?.toString() ?? 'false',
            };
            // Standardized action profile key
            const hoverFlyActionProfileKey = config.hoverFlyActionProfileName ?? 'movementFlyHover';
            await actionManager.executeCheckAction(player, hoverFlyActionProfileKey, violationDetails, dependencies);
            playerUtils.debugLog(`[FlyCheck][Hover] Flagged ${player.nameTag}. VSpeed: ${verticalSpeed.toFixed(2)}, OffGround: ${pData.consecutiveOffGroundTicks}t, FallDist: ${player.fallDistance.toFixed(2)}, Height: ${heightAboveLastGround.toFixed(2)}`, watchedPrefix, dependencies);
        }
    }
}
