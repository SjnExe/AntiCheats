/**
 * Implements checks for various forms of fly-related hacks, including sustained vertical movement,
 * hovering, and excessively high vertical velocity.
 * Relies on player state (effects, gliding status) being updated in `pData` by other systems
 * (e.g., `updateTransientPlayerData` for effects, event handlers for gliding).
 */
import * as mc from '@minecraft/server';
/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').Config} Config
 * @typedef {import('../../types.js').PlayerUtils} PlayerUtils
 * @typedef {import('../../types.js').PlayerDataManager} PlayerDataManager
 * @typedef {import('../../types.js').LogManager} LogManager
 * @typedef {import('../../types.js').ExecuteCheckAction} ExecuteCheckAction
 * @typedef {import('../../types.js').CommandDependencies} CommandDependencies
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
 * @param {CommandDependencies} dependencies - Object containing shared dependencies like config, playerUtils, actionManager, currentTick etc.
 * @returns {Promise<void>}
 */
export async function checkFly(
    player,
    pData,
    dependencies
) {
    const { config, playerUtils, actionManager, currentTick } = dependencies;

    if ((!config.enableFlyCheck && !config.enableHighYVelocityCheck) || !pData) {
        return;
    }

    const watchedPrefix = pData.isWatched ? player.nameTag : null;

    if (player.isGliding) {
        pData.lastUsedElytraTick = currentTick;
        pData.isDirtyForSave = true;
        playerUtils.debugLog(`[FlyCheck] ${player.nameTag} is gliding. lastUsedElytraTick updated. Standard fly checks bypassed.`, watchedPrefix, dependencies);
        return;
    }

    if (player.isFlying) {
        playerUtils.debugLog(`[FlyCheck] ${player.nameTag} is legitimately flying (Creative/Spectator). Standard fly checks bypassed.`, watchedPrefix, dependencies);
        return;
    }

    if (config.enableHighYVelocityCheck && !pData.hasLevitation) {
        const currentYVelocity = pData.velocity.y;
        const jumpBoostAmplifierValue = pData.jumpBoostAmplifier ?? 0;
        const jumpBoostYVelocityBonusValue = config.jumpBoostYVelocityBonus ?? 0.0;
        const jumpBoostBonus = jumpBoostAmplifierValue * jumpBoostYVelocityBonusValue;
        const baseYVelocityPositive = config.maxYVelocityPositive ?? 2.0;
        const effectiveMaxYVelocity = baseYVelocityPositive + jumpBoostBonus;

        if (pData.isWatched) {
            playerUtils.debugLog(`[FlyCheck] ${player.nameTag}: BaseMaxYVel: ${baseYVelocityPositive.toFixed(3)}, JumpBoostLvl: ${jumpBoostAmplifierValue}, JumpBoostBonus: ${jumpBoostBonus.toFixed(3)}, EffectiveMaxYVel: ${effectiveMaxYVelocity.toFixed(3)}`, player.nameTag, dependencies);
        }

        const ticksSinceLastDamage = currentTick - (pData.lastTookDamageTick ?? -Infinity);
        const ticksSinceLastElytra = currentTick - (pData.lastUsedElytraTick ?? -Infinity);

        const graceTicks = config.yVelocityGraceTicks ?? 10;
        const underGraceCondition = (
            ticksSinceLastDamage <= graceTicks ||
            ticksSinceLastElytra <= graceTicks ||
            player.isClimbing ||
            (pData.hasSlowFalling && currentYVelocity < 0)
        );

        if (underGraceCondition && pData.isWatched) {
            if (ticksSinceLastDamage <= graceTicks) playerUtils.debugLog(`[FlyCheck] ${player.nameTag}: Y-velocity check grace due to recent damage (Ticks: ${ticksSinceLastDamage})`, player.nameTag, dependencies);
            if (ticksSinceLastElytra <= graceTicks) playerUtils.debugLog(`[FlyCheck] ${player.nameTag}: Y-velocity check grace due to recent elytra use (Ticks: ${ticksSinceLastElytra})`, player.nameTag, dependencies);
            if (player.isClimbing) playerUtils.debugLog(`[FlyCheck] ${player.nameTag}: Y-velocity check grace due to climbing.`, player.nameTag, dependencies);
            if (pData.hasSlowFalling && currentYVelocity < 0) playerUtils.debugLog(`[FlyCheck] ${player.nameTag}: Y-velocity check grace due to slow falling and downward movement.`, player.nameTag, dependencies);
        }

        if (currentYVelocity > effectiveMaxYVelocity && !underGraceCondition) {
            const violationDetails = {
                yVelocity: currentYVelocity.toFixed(3),
                effectiveMaxYVelocity: effectiveMaxYVelocity.toFixed(3),
                jumpBoostLevel: pData.jumpBoostAmplifier ?? 0,
                onGround: player.isOnGround.toString(),
                gracePeriodActive: underGraceCondition.toString(),
                ticksSinceDamage: ticksSinceLastDamage > graceTicks ? "N/A" : ticksSinceLastDamage.toString(),
                ticksSinceElytra: ticksSinceLastElytra > graceTicks ? "N/A" : ticksSinceLastElytra.toString(),
                isClimbing: player.isClimbing.toString(),
                hasSlowFalling: pData.hasSlowFalling?.toString() ?? "false",
                hasLevitation: pData.hasLevitation?.toString() ?? "false"
            };
            await actionManager.executeCheckAction(player, config.highYVelocityActionProfileName || "movementHighYVelocity", violationDetails, dependencies);
            playerUtils.debugLog(`[FlyCheck] HighYVelocity: Flagged ${player.nameTag}. Velo: ${currentYVelocity.toFixed(3)}, Max: ${effectiveMaxYVelocity.toFixed(3)}`, watchedPrefix, dependencies);
        }
    }

    if (!config.enableFlyCheck) {
        return;
    }

    if (pData.hasLevitation && pData.velocity.y > 0) {
        playerUtils.debugLog(`[FlyCheck] ${player.nameTag} allowing upward movement due to levitation. VSpeed: ${pData.velocity.y.toFixed(2)}`, watchedPrefix, dependencies);
        return;
    }
    if (pData.hasSlowFalling && pData.velocity.y < 0) {
        playerUtils.debugLog(`[FlyCheck] ${player.nameTag} noting slow descent due to Slow Falling. VSpeed: ${pData.velocity.y.toFixed(2)}`, watchedPrefix, dependencies);
    }

    const verticalSpeed = pData.velocity.y;
    playerUtils.debugLog(`[FlyCheck] Processing for ${player.nameTag}. VSpeed=${verticalSpeed.toFixed(2)}, OffGroundTicks=${pData.consecutiveOffGroundTicks}`, watchedPrefix, dependencies);

    const sustainedThreshold = config.flySustainedVerticalSpeedThreshold ?? 0.5;
    const sustainedTicks = config.flySustainedOffGroundTicksThreshold ?? 10;

    if (!player.isOnGround && verticalSpeed > sustainedThreshold && !player.isClimbing && !pData.hasLevitation) {
        if (pData.consecutiveOffGroundTicks > sustainedTicks) {
            const violationDetails = {
                type: "sustained_vertical",
                verticalSpeed: verticalSpeed.toFixed(2),
                offGroundTicks: pData.consecutiveOffGroundTicks.toString(),
                isClimbing: player.isClimbing.toString(),
                isInWater: player.isInWater.toString(),
                hasLevitation: pData.hasLevitation?.toString() ?? "false"
            };
            await actionManager.executeCheckAction(player, config.sustainedFlyActionProfileName || "movementSustainedFly", violationDetails, dependencies);
        }
    }

    const hoverVSpeedThreshold = config.flyHoverVerticalSpeedThreshold ?? 0.08;
    const hoverOffGroundTicks = config.flyHoverOffGroundTicksThreshold ?? 20;
    const hoverMaxFallDist = config.flyHoverMaxFallDistanceThreshold ?? 1.0;
    const hoverMinHeight = config.flyHoverNearGroundThreshold ?? 3.0;

    if (!player.isOnGround &&
        Math.abs(verticalSpeed) < hoverVSpeedThreshold &&
        pData.consecutiveOffGroundTicks > hoverOffGroundTicks &&
        pData.fallDistance < hoverMaxFallDist &&
        !player.isClimbing &&
        !player.isInWater &&
        !pData.hasLevitation
    ) {
        const playerLoc = player.location;
        const heightAboveLastGround = pData.lastOnGroundPosition ? (playerLoc.y - pData.lastOnGroundPosition.y) : hoverMinHeight + 1.0;

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
            await actionManager.executeCheckAction(player, config.hoverFlyActionProfileName || "movementFlyHover", violationDetails, dependencies);
        }
    }
}
