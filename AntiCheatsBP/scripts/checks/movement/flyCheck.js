/**
 * @file Implements checks for various forms of fly-related hacks, including sustained vertical movement,
 * @module AntiCheatsBP/scripts/checks/movement/flyCheck
 * hovering, and excessively high vertical velocity.
 * Relies on player state (effects, gliding status) being updated in `pData` by other systems
 * (e.g., `updateTransientPlayerData` for effects, event handlers for gliding).
 */

/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').Dependencies} Dependencies
 */

// Constants for magic numbers
const defaultJumpBoostYVelocityBonus = 0.2;
const defaultMaxYVelocityPositive = 0.42;
const yVelocityGraceTicks = 10;
const defaultFlySustainedVerticalSpeedThreshold = 0.45;
const defaultFlySustainedOffGroundTicksThreshold = 10;
const defaultFlyHoverVerticalSpeedThreshold = 0.08;
const defaultFlyHoverOffGroundTicksThreshold = 20;
const defaultFlyHoverMaxFallDistanceThreshold = 1.0;
const defaultFlyHoverNearGroundThreshold = 2.5;
const minVerticalSpeedForSlowFallingGrace = -0.01; // If player has slow fall and is falling faster than this (more negative), they are exempt from hover.
const slowFallingHoverFallDistanceMultiplier = 1.5; // Player with slow fall can accumulate this much more fallDistance before hover triggers.
const loggingDecimalPlacesFly = 3;
const genericDecimalPlacesFly = 2;


/**
 * Checks for fly-related hacks by analyzing player's vertical movement, airborne state,
 * and active effects (expected to be pre-processed into `pData`).
 *
 * It bypasses checks if the player is legitimately flying (Creative/Spectator mode) or gliding with elytra.
 * Assumes `pData` contains fields like `jumpBoostAmplifier`, `hasSlowFalling`, `hasLevitation`,
 * `lastUsedElytraTick`, `lastTookDamageTick`, which should be updated by `updateTransientPlayerData`
 * or relevant event handlers.
 * @async
 * @param {import('@minecraft/server').Player} player - The player instance to check.
 * @param {PlayerAntiCheatData} pData - Player-specific anti-cheat data.
 * @param {Dependencies} dependencies - Object containing shared dependencies.
 * @returns {Promise<void>}
 */
export async function checkFly(player, pData, dependencies) {
    const { config, playerUtils, actionManager, currentTick } = dependencies;
    const playerName = player?.nameTag ?? 'UnknownPlayer';

    if (!config?.enableFlyCheck && !config?.enableHighYVelocityCheck) {
        return;
    }
    if (!pData) {
        playerUtils?.debugLog(`[FlyCheck] Skipping for ${playerName}: pData is null.`, playerName, dependencies);
        return;
    }

    const watchedPlayerName = pData.isWatched ? playerName : null;

    if (player.isGliding) {
        pData.lastUsedElytraTick = currentTick;
        pData.isDirtyForSave = true;
        playerUtils?.debugLog(`[FlyCheck] ${playerName} is gliding. Standard fly checks bypassed. Fall distance reset.`, watchedPlayerName, dependencies);
        if (pData.fallDistance > 0) {
            pData.fallDistance = 0; pData.isDirtyForSave = true;
        }
        return;
    }
    if (player.isFlying) {
        playerUtils?.debugLog(`[FlyCheck] ${playerName} is legitimately flying (isFlying=true). Standard fly checks bypassed. Fall distance reset.`, watchedPlayerName, dependencies);
        if (pData.fallDistance > 0) {
            pData.fallDistance = 0; pData.isDirtyForSave = true;
        }
        return;
    }

    if (config?.enableHighYVelocityCheck && !pData.hasLevitation) {
        const currentYVelocity = pData.velocity?.y ?? 0;
        const jumpBoostAmplifierValue = pData.jumpBoostAmplifier ?? 0;
        const jumpBoostBonus = jumpBoostAmplifierValue * (config?.jumpBoostYVelocityBonus ?? defaultJumpBoostYVelocityBonus);
        const baseYVelocityPositive = config?.maxYVelocityPositive ?? defaultMaxYVelocityPositive;
        const effectiveMaxYVelocity = baseYVelocityPositive + jumpBoostBonus;

        if (pData.isWatched) {
            playerUtils?.debugLog(`[FlyCheck][Y-Velo] ${playerName}: CurrentYVelo: ${currentYVelocity.toFixed(loggingDecimalPlacesFly)}, BaseMax: ${baseYVelocityPositive.toFixed(loggingDecimalPlacesFly)}, JumpBoostLvl: ${jumpBoostAmplifierValue}, JumpBoostBonus: ${jumpBoostBonus.toFixed(loggingDecimalPlacesFly)}, EffectiveMax: ${effectiveMaxYVelocity.toFixed(loggingDecimalPlacesFly)}`, watchedPlayerName, dependencies);
        }

        const ticksSinceLastDamage = currentTick - (pData.lastTookDamageTick ?? -Infinity);
        const ticksSinceLastElytra = currentTick - (pData.lastUsedElytraTick ?? -Infinity);
        const graceTicks = config?.yVelocityGraceTicks ?? yVelocityGraceTicks;

        const underGraceCondition = (
            ticksSinceLastDamage <= graceTicks ||
            ticksSinceLastElytra <= graceTicks ||
            player.isClimbing ||
            (pData.hasSlowFalling && currentYVelocity < 0) // 0 is fine
        );

        if (underGraceCondition && pData.isWatched) {
            const graceReasons = [];
            if (ticksSinceLastDamage <= graceTicks) {
                graceReasons.push(`recent damage (${ticksSinceLastDamage}t)`);
            }
            if (ticksSinceLastElytra <= graceTicks) {
                graceReasons.push(`recent elytra (${ticksSinceLastElytra}t)`);
            }
            if (player.isClimbing) {
                graceReasons.push('climbing');
            }
            if (pData.hasSlowFalling && currentYVelocity < 0) { // 0 is fine
                graceReasons.push('slow falling downwards');
            }
            playerUtils?.debugLog(`[FlyCheck][Y-Velo] ${playerName}: Y-velocity check grace due to: ${graceReasons.join(', ')}.`, watchedPlayerName, dependencies);
        }

        if (currentYVelocity > effectiveMaxYVelocity && !underGraceCondition) {
            const violationDetails = {
                yVelocity: currentYVelocity.toFixed(loggingDecimalPlacesFly),
                effectiveMaxYVelocity: effectiveMaxYVelocity.toFixed(loggingDecimalPlacesFly),
                jumpBoostLevel: (pData.jumpBoostAmplifier ?? 0).toString(),
                onGround: player.isOnGround.toString(),
                gracePeriodActive: underGraceCondition.toString(),
                ticksSinceDamage: ticksSinceLastDamage > graceTicks ? 'N/A' : ticksSinceLastDamage.toString(),
                ticksSinceElytra: ticksSinceLastElytra > graceTicks ? 'N/A' : ticksSinceLastElytra.toString(),
                isClimbing: player.isClimbing.toString(),
                hasSlowFalling: (pData.hasSlowFalling ?? false).toString(),
                hasLevitation: (pData.hasLevitation ?? false).toString(),
            };
            const highYVelocityActionProfileKey = config?.highYVelocityActionProfileName ?? 'movementHighYVelocity';
            await actionManager?.executeCheckAction(player, highYVelocityActionProfileKey, violationDetails, dependencies);
            playerUtils?.debugLog(`[FlyCheck][Y-Velo] Flagged ${playerName}. Velo: ${currentYVelocity.toFixed(loggingDecimalPlacesFly)}, Max: ${effectiveMaxYVelocity.toFixed(loggingDecimalPlacesFly)}`, watchedPlayerName, dependencies);
        }
    }

    if (!config?.enableFlyCheck) {
        return;
    }

    if (pData.hasLevitation && (pData.velocity?.y ?? 0) > 0) { // 0 is fine
        playerUtils?.debugLog(`[FlyCheck] ${playerName} allowing upward movement due to levitation. VSpeed: ${(pData.velocity?.y ?? 0).toFixed(genericDecimalPlacesFly)}`, watchedPlayerName, dependencies);
        return;
    }
    if (pData.hasSlowFalling && (pData.velocity?.y ?? 0) < 0) { // 0 is fine
        playerUtils?.debugLog(`[FlyCheck] ${playerName} noting slow descent due to Slow Falling. VSpeed: ${(pData.velocity?.y ?? 0).toFixed(genericDecimalPlacesFly)}. Hover/Sustained checks might still apply if not actually falling significantly.`, watchedPlayerName, dependencies);
        // Don't return yet, as hovering with slow fall might still be an issue if not losing altitude.
    }


    const verticalSpeed = pData.velocity?.y ?? 0; // 0 is fine
    if (pData.isWatched) {
        playerUtils?.debugLog(`[FlyCheck] Processing Sustained/Hover for ${playerName}. VSpeed=${verticalSpeed.toFixed(loggingDecimalPlacesFly)}, OffGroundTicks=${pData.consecutiveOffGroundTicks}, FallDist=${pData.fallDistance?.toFixed(genericDecimalPlacesFly)}`, watchedPlayerName, dependencies);
    }

    const sustainedThreshold = config?.flySustainedVerticalSpeedThreshold ?? defaultFlySustainedVerticalSpeedThreshold;
    const sustainedTicks = config?.flySustainedOffGroundTicksThreshold ?? defaultFlySustainedOffGroundTicksThreshold;

    if (!player.isOnGround && verticalSpeed > sustainedThreshold && !player.isClimbing && !pData.hasLevitation) {
        if (pData.consecutiveOffGroundTicks > sustainedTicks) {
            const violationDetails = {
                type: 'sustainedVertical',
                verticalSpeed: verticalSpeed.toFixed(loggingDecimalPlacesFly),
                offGroundTicks: (pData.consecutiveOffGroundTicks ?? 0).toString(),
                isClimbing: player.isClimbing.toString(),
                isInWater: player.isInWater.toString(),
                hasLevitation: (pData.hasLevitation ?? false).toString(),
            };
            const sustainedFlyActionProfileKey = config?.sustainedFlyActionProfileName ?? 'movementSustainedFly';
            await actionManager?.executeCheckAction(player, sustainedFlyActionProfileKey, violationDetails, dependencies);
            playerUtils?.debugLog(`[FlyCheck][Sustained] Flagged ${playerName}. VSpeed: ${verticalSpeed.toFixed(loggingDecimalPlacesFly)}, OffGround: ${pData.consecutiveOffGroundTicks}t`, watchedPlayerName, dependencies);
        }
    }

    const hoverVSpeedThreshold = config?.flyHoverVerticalSpeedThreshold ?? defaultFlyHoverVerticalSpeedThreshold;
    const hoverOffGroundTicks = config?.flyHoverOffGroundTicksThreshold ?? defaultFlyHoverOffGroundTicksThreshold;
    let hoverMaxFallDist = config?.flyHoverMaxFallDistanceThreshold ?? defaultFlyHoverMaxFallDistanceThreshold;
    const hoverMinHeight = config?.flyHoverNearGroundThreshold ?? defaultFlyHoverNearGroundThreshold;

    if (pData.hasSlowFalling) {
        hoverMaxFallDist *= slowFallingHoverFallDistanceMultiplier;
    }

    if (!player.isOnGround &&
        Math.abs(verticalSpeed) < hoverVSpeedThreshold &&
        (pData.consecutiveOffGroundTicks ?? 0) > hoverOffGroundTicks && // 0 is fine
        (pData.fallDistance ?? 0) < hoverMaxFallDist && // 0 is fine
        !player.isClimbing &&
        !player.isInWater &&
        !pData.hasLevitation &&
        !(pData.hasSlowFalling && verticalSpeed < minVerticalSpeedForSlowFallingGrace)
    ) {
        const playerLocY = player.location.y;
        const lastGroundY = pData.lastOnGroundPosition?.y;
        let heightAboveLastGround = hoverMinHeight + 1.0;
        if (typeof lastGroundY === 'number' && pData.lastDimensionId === player.dimension.id) {
            heightAboveLastGround = playerLocY - lastGroundY;
        }


        if (heightAboveLastGround > hoverMinHeight) {
            const violationDetails = {
                type: 'flyHover',
                verticalSpeed: verticalSpeed.toFixed(loggingDecimalPlacesFly),
                offGroundTicks: (pData.consecutiveOffGroundTicks ?? 0).toString(), // 0 is fine
                fallDistance: (pData.fallDistance ?? 0).toFixed(genericDecimalPlacesFly), // 0 is fine
                heightAboveLastGround: heightAboveLastGround.toFixed(genericDecimalPlacesFly),
                isClimbing: player.isClimbing.toString(),
                isInWater: player.isInWater.toString(),
                hasLevitation: (pData.hasLevitation ?? false).toString(),
                hasSlowFalling: (pData.hasSlowFalling ?? false).toString(),
            };
            const hoverFlyActionProfileKey = config?.hoverFlyActionProfileName ?? 'movementFlyHover';
            await actionManager?.executeCheckAction(player, hoverFlyActionProfileKey, violationDetails, dependencies);
            playerUtils?.debugLog(`[FlyCheck][Hover] Flagged ${playerName}. VSpeed: ${verticalSpeed.toFixed(loggingDecimalPlacesFly)}, OffGround: ${pData.consecutiveOffGroundTicks}t, FallDist: ${pData.fallDistance?.toFixed(genericDecimalPlacesFly)}, Height: ${heightAboveLastGround.toFixed(genericDecimalPlacesFly)}`, watchedPlayerName, dependencies);
        } else if (pData.isWatched) {
            playerUtils?.debugLog(`[FlyCheck][Hover] ${playerName} met hover speed/tick criteria but height (${heightAboveLastGround.toFixed(genericDecimalPlacesFly)}) not > min (${hoverMinHeight}). LastGroundY: ${lastGroundY}`, watchedPlayerName, dependencies);
        }
    }
}
