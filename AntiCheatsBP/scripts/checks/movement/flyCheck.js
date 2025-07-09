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
const DEFAULT_JUMP_BOOST_Y_VELOCITY_BONUS = 0.2;
const DEFAULT_MAX_Y_VELOCITY_POSITIVE = 0.42;
const Y_VELOCITY_GRACE_TICKS = 10;
const DEFAULT_FLY_SUSTAINED_VERTICAL_SPEED_THRESHOLD = 0.45;
const DEFAULT_FLY_SUSTAINED_OFF_GROUND_TICKS_THRESHOLD = 10;
const DEFAULT_FLY_HOVER_VERTICAL_SPEED_THRESHOLD = 0.08;
const DEFAULT_FLY_HOVER_OFF_GROUND_TICKS_THRESHOLD = 20;
const DEFAULT_FLY_HOVER_MAX_FALL_DISTANCE_THRESHOLD = 1.0;
const DEFAULT_FLY_HOVER_NEAR_GROUND_THRESHOLD = 2.5;
const MIN_VERTICAL_SPEED_FOR_SLOW_FALLING_GRACE = -0.01; // If player has slow fall and is falling faster than this (more negative), they are exempt from hover.
const SLOW_FALLING_HOVER_FALL_DISTANCE_MULTIPLIER = 1.5; // Player with slow fall can accumulate this much more fallDistance before hover triggers.
const LOGGING_DECIMAL_PLACES_FLY = 3;
const GENERIC_DECIMAL_PLACES_FLY = 2;


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
        const jumpBoostBonus = jumpBoostAmplifierValue * (config?.jumpBoostYVelocityBonus ?? DEFAULT_JUMP_BOOST_Y_VELOCITY_BONUS);
        const baseYVelocityPositive = config?.maxYVelocityPositive ?? DEFAULT_MAX_Y_VELOCITY_POSITIVE;
        const effectiveMaxYVelocity = baseYVelocityPositive + jumpBoostBonus;

        if (pData.isWatched) {
            playerUtils?.debugLog(`[FlyCheck][Y-Velo] ${playerName}: CurrentYVelo: ${currentYVelocity.toFixed(LOGGING_DECIMAL_PLACES_FLY)}, BaseMax: ${baseYVelocityPositive.toFixed(LOGGING_DECIMAL_PLACES_FLY)}, JumpBoostLvl: ${jumpBoostAmplifierValue}, JumpBoostBonus: ${jumpBoostBonus.toFixed(LOGGING_DECIMAL_PLACES_FLY)}, EffectiveMax: ${effectiveMaxYVelocity.toFixed(LOGGING_DECIMAL_PLACES_FLY)}`, watchedPlayerName, dependencies);
        }

        const ticksSinceLastDamage = currentTick - (pData.lastTookDamageTick ?? -Infinity);
        const ticksSinceLastElytra = currentTick - (pData.lastUsedElytraTick ?? -Infinity);
        const graceTicks = config?.yVelocityGraceTicks ?? Y_VELOCITY_GRACE_TICKS;

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
                yVelocity: currentYVelocity.toFixed(LOGGING_DECIMAL_PLACES_FLY),
                effectiveMaxYVelocity: effectiveMaxYVelocity.toFixed(LOGGING_DECIMAL_PLACES_FLY),
                jumpBoostLevel: (pData.jumpBoostAmplifier ?? 0).toString(),
                onGround: player.isOnGround.toString(),
                gracePeriodActive: underGraceCondition.toString(),
                ticksSinceDamage: ticksSinceLastDamage > graceTicks ? 'N/A' : ticksSinceLastDamage.toString(),
                ticksSinceElytra: ticksSinceLastElytra > graceTicks ? 'N/A' : ticksSinceLastElytra.toString(),
                isClimbing: player.isClimbing.toString(),
                hasSlowFalling: (pData.hasSlowFalling ?? false).toString(),
                hasLevitation: (pData.hasLevitation ?? false).toString(),
            };
            const rawHighYVelocityActionProfileKey = config?.highYVelocityActionProfileName ?? 'movementHighYVelocity';
            const highYVelocityActionProfileKey = rawHighYVelocityActionProfileKey
                .replace(/([-_][a-z0-9])/ig, ($1) => $1.toUpperCase().replace('-', '').replace('_', ''))
                .replace(/^[A-Z]/, (match) => match.toLowerCase());
            await actionManager?.executeCheckAction(player, highYVelocityActionProfileKey, violationDetails, dependencies);
            playerUtils?.debugLog(`[FlyCheck][Y-Velo] Flagged ${playerName}. Velo: ${currentYVelocity.toFixed(LOGGING_DECIMAL_PLACES_FLY)}, Max: ${effectiveMaxYVelocity.toFixed(LOGGING_DECIMAL_PLACES_FLY)}`, watchedPlayerName, dependencies);
        }
    }

    if (!config?.enableFlyCheck) {
        return;
    }

    if (pData.hasLevitation && (pData.velocity?.y ?? 0) > 0) { // 0 is fine
        playerUtils?.debugLog(`[FlyCheck] ${playerName} allowing upward movement due to levitation. VSpeed: ${(pData.velocity?.y ?? 0).toFixed(GENERIC_DECIMAL_PLACES_FLY)}`, watchedPlayerName, dependencies);
        return;
    }
    if (pData.hasSlowFalling && (pData.velocity?.y ?? 0) < 0) { // 0 is fine
        playerUtils?.debugLog(`[FlyCheck] ${playerName} noting slow descent due to Slow Falling. VSpeed: ${(pData.velocity?.y ?? 0).toFixed(GENERIC_DECIMAL_PLACES_FLY)}. Hover/Sustained checks might still apply if not actually falling significantly.`, watchedPlayerName, dependencies);
        // Don't return yet, as hovering with slow fall might still be an issue if not losing altitude.
    }


    const verticalSpeed = pData.velocity?.y ?? 0; // 0 is fine
    if (pData.isWatched) {
        playerUtils?.debugLog(`[FlyCheck] Processing Sustained/Hover for ${playerName}. VSpeed=${verticalSpeed.toFixed(LOGGING_DECIMAL_PLACES_FLY)}, OffGroundTicks=${pData.consecutiveOffGroundTicks}, FallDist=${pData.fallDistance?.toFixed(GENERIC_DECIMAL_PLACES_FLY)}`, watchedPlayerName, dependencies);
    }

    const sustainedThreshold = config?.flySustainedVerticalSpeedThreshold ?? DEFAULT_FLY_SUSTAINED_VERTICAL_SPEED_THRESHOLD;
    const sustainedTicks = config?.flySustainedOffGroundTicksThreshold ?? DEFAULT_FLY_SUSTAINED_OFF_GROUND_TICKS_THRESHOLD;

    if (!player.isOnGround && verticalSpeed > sustainedThreshold && !player.isClimbing && !pData.hasLevitation) {
        if (pData.consecutiveOffGroundTicks > sustainedTicks) {
            const violationDetails = {
                type: 'sustainedVertical',
                verticalSpeed: verticalSpeed.toFixed(LOGGING_DECIMAL_PLACES_FLY),
                offGroundTicks: (pData.consecutiveOffGroundTicks ?? 0).toString(),
                isClimbing: player.isClimbing.toString(),
                isInWater: player.isInWater.toString(),
                hasLevitation: (pData.hasLevitation ?? false).toString(),
            };
            const rawSustainedFlyActionProfileKey = config?.sustainedFlyActionProfileName ?? 'movementSustainedFly';
            const sustainedFlyActionProfileKey = rawSustainedFlyActionProfileKey
                .replace(/([-_][a-z0-9])/ig, ($1) => $1.toUpperCase().replace('-', '').replace('_', ''))
                .replace(/^[A-Z]/, (match) => match.toLowerCase());
            await actionManager?.executeCheckAction(player, sustainedFlyActionProfileKey, violationDetails, dependencies);
            playerUtils?.debugLog(`[FlyCheck][Sustained] Flagged ${playerName}. VSpeed: ${verticalSpeed.toFixed(LOGGING_DECIMAL_PLACES_FLY)}, OffGround: ${pData.consecutiveOffGroundTicks}t`, watchedPlayerName, dependencies);
        }
    }

    const hoverVSpeedThreshold = config?.flyHoverVerticalSpeedThreshold ?? DEFAULT_FLY_HOVER_VERTICAL_SPEED_THRESHOLD;
    const hoverOffGroundTicks = config?.flyHoverOffGroundTicksThreshold ?? DEFAULT_FLY_HOVER_OFF_GROUND_TICKS_THRESHOLD;
    let hoverMaxFallDist = config?.flyHoverMaxFallDistanceThreshold ?? DEFAULT_FLY_HOVER_MAX_FALL_DISTANCE_THRESHOLD;
    const hoverMinHeight = config?.flyHoverNearGroundThreshold ?? DEFAULT_FLY_HOVER_NEAR_GROUND_THRESHOLD;

    if (pData.hasSlowFalling) {
        hoverMaxFallDist *= SLOW_FALLING_HOVER_FALL_DISTANCE_MULTIPLIER;
    }

    if (!player.isOnGround &&
        Math.abs(verticalSpeed) < hoverVSpeedThreshold &&
        (pData.consecutiveOffGroundTicks ?? 0) > hoverOffGroundTicks && // 0 is fine
        (pData.fallDistance ?? 0) < hoverMaxFallDist && // 0 is fine
        !player.isClimbing &&
        !player.isInWater &&
        !pData.hasLevitation &&
        !(pData.hasSlowFalling && verticalSpeed < MIN_VERTICAL_SPEED_FOR_SLOW_FALLING_GRACE)
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
                verticalSpeed: verticalSpeed.toFixed(LOGGING_DECIMAL_PLACES_FLY),
                offGroundTicks: (pData.consecutiveOffGroundTicks ?? 0).toString(), // 0 is fine
                fallDistance: (pData.fallDistance ?? 0).toFixed(GENERIC_DECIMAL_PLACES_FLY), // 0 is fine
                heightAboveLastGround: heightAboveLastGround.toFixed(GENERIC_DECIMAL_PLACES_FLY),
                isClimbing: player.isClimbing.toString(),
                isInWater: player.isInWater.toString(),
                hasLevitation: (pData.hasLevitation ?? false).toString(),
                hasSlowFalling: (pData.hasSlowFalling ?? false).toString(),
            };
            const rawHoverFlyActionProfileKey = config?.hoverFlyActionProfileName ?? 'movementFlyHover';
            const hoverFlyActionProfileKey = rawHoverFlyActionProfileKey
                .replace(/([-_][a-z0-9])/ig, ($1) => $1.toUpperCase().replace('-', '').replace('_', ''))
                .replace(/^[A-Z]/, (match) => match.toLowerCase());
            await actionManager?.executeCheckAction(player, hoverFlyActionProfileKey, violationDetails, dependencies);
            playerUtils?.debugLog(`[FlyCheck][Hover] Flagged ${playerName}. VSpeed: ${verticalSpeed.toFixed(LOGGING_DECIMAL_PLACES_FLY)}, OffGround: ${pData.consecutiveOffGroundTicks}t, FallDist: ${pData.fallDistance?.toFixed(GENERIC_DECIMAL_PLACES_FLY)}, Height: ${heightAboveLastGround.toFixed(GENERIC_DECIMAL_PLACES_FLY)}`, watchedPlayerName, dependencies);
        } else if (pData.isWatched) {
            playerUtils?.debugLog(`[FlyCheck][Hover] ${playerName} met hover speed/tick criteria but height (${heightAboveLastGround.toFixed(GENERIC_DECIMAL_PLACES_FLY)}) not > min (${hoverMinHeight}). LastGroundY: ${lastGroundY}`, watchedPlayerName, dependencies);
        }
    }
}
