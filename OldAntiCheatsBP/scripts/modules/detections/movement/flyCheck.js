/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').Dependencies} Dependencies
 */

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
    const playerName = player?.name ?? 'UnknownPlayer';

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
        playerUtils?.debugLog(`[FlyCheck] ${playerName} is gliding. Standard fly checks bypassed.`, watchedPlayerName, dependencies);
        return;
    }
    if (player.isFlying) {
        playerUtils?.debugLog(`[FlyCheck] ${playerName} is legitimately flying (isFlying=true). Standard fly checks bypassed.`, watchedPlayerName, dependencies);
        return;
    }

    if (config?.enableHighYVelocityCheck && !pData.hasLevitation) {
        const currentYVelocity = pData.transient.lastVelocity?.y ?? 0;
        const jumpBoostAmplifierValue = pData.jumpBoostAmplifier ?? 0;
        const jumpBoostBonus = jumpBoostAmplifierValue * (config?.jumpBoostYVelocityBonus ?? 0.2);
        const baseYVelocityPositive = config?.maxYVelocityPositive ?? 0.42;
        const effectiveMaxYVelocity = baseYVelocityPositive + jumpBoostBonus;

        if (pData.isWatched) {
            playerUtils?.debugLog(`[FlyCheck][Y-Velo] ${playerName}: CurrentYVelo: ${currentYVelocity.toFixed(3)}, BaseMax: ${baseYVelocityPositive.toFixed(3)}, JumpBoostLvl: ${jumpBoostAmplifierValue}, JumpBoostBonus: ${jumpBoostBonus.toFixed(3)}, EffectiveMax: ${effectiveMaxYVelocity.toFixed(3)}`, watchedPlayerName, dependencies);
        }

        const ticksSinceLastDamage = currentTick - (pData.lastTookDamageTick ?? -Infinity);
        const ticksSinceLastElytra = currentTick - (pData.lastUsedElytraTick ?? -Infinity);
        const ticksSinceLastOnSlime = currentTick - (pData.lastOnSlimeBlockTick ?? -Infinity);
        const ticksSinceLastLaunch = currentTick - (pData.transient?.lastLaunchTick ?? -Infinity);
        const graceTicks = config?.yVelocityGraceTicks ?? 10;

        const underGraceCondition = (
            ticksSinceLastDamage <= graceTicks ||
            ticksSinceLastElytra <= graceTicks ||
            ticksSinceLastOnSlime <= graceTicks ||
            ticksSinceLastLaunch <= graceTicks ||
            player.isClimbing ||
            (pData.hasSlowFalling && currentYVelocity < 0)
        );

        if (underGraceCondition && pData.isWatched) {
            const graceReasons = [];
            if (ticksSinceLastDamage <= graceTicks) {
                graceReasons.push(`recent damage (${ticksSinceLastDamage}t)`);
            }
            if (ticksSinceLastElytra <= graceTicks) {
                graceReasons.push(`recent elytra (${ticksSinceLastElytra}t)`);
            }
            if (ticksSinceLastOnSlime <= graceTicks) {
                graceReasons.push(`recent slime block (${ticksSinceLastOnSlime}t)`);
            }
            if (ticksSinceLastLaunch <= graceTicks) {
                graceReasons.push(`recent launch item (${ticksSinceLastLaunch}t)`);
            }
            if (player.isClimbing) {
                graceReasons.push('climbing');
            }
            if (pData.hasSlowFalling && currentYVelocity < 0) {
                graceReasons.push('slow falling downwards');
            }
            playerUtils?.debugLog(`[FlyCheck][Y-Velo] ${playerName}: Y-velocity check grace due to: ${graceReasons.join(', ')}.`, watchedPlayerName, dependencies);
        }

        if (currentYVelocity > effectiveMaxYVelocity && !underGraceCondition) {
            const violationDetails = {
                yVelocity: currentYVelocity.toFixed(3),
                effectiveMaxYVelocity: effectiveMaxYVelocity.toFixed(3),
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
            playerUtils?.debugLog(`[FlyCheck][Y-Velo] Flagged ${playerName}. Velo: ${currentYVelocity.toFixed(3)}, Max: ${effectiveMaxYVelocity.toFixed(3)}`, watchedPlayerName, dependencies);
        }
    }

    if (!config?.enableFlyCheck) {
        return;
    }

    if (pData.hasLevitation && (pData.transient.lastVelocity?.y ?? 0) > 0) {
        playerUtils?.debugLog(`[FlyCheck] ${playerName} allowing upward movement due to levitation. VSpeed: ${(pData.transient.lastVelocity?.y ?? 0).toFixed(2)}`, watchedPlayerName, dependencies);
        return;
    }
    if (pData.hasSlowFalling && (pData.transient.lastVelocity?.y ?? 0) < 0) {
        playerUtils?.debugLog(`[FlyCheck] ${playerName} noting slow descent due to Slow Falling. VSpeed: ${(pData.transient.lastVelocity?.y ?? 0).toFixed(2)}. Hover/Sustained checks might still apply if not actually falling significantly.`, watchedPlayerName, dependencies);
        // Don't return yet, as hovering with slow fall might still be an issue if not losing altitude.
    }


    const verticalSpeed = pData.transient.lastVelocity?.y ?? 0;
    if (pData.isWatched) {
        playerUtils?.debugLog(`[FlyCheck] Processing Sustained/Hover for ${playerName}. VSpeed=${verticalSpeed.toFixed(3)}, OffGroundTicks=${pData.transient.ticksSinceLastOnGround}, FallDist=${pData.fallDistance?.toFixed(2)}`, watchedPlayerName, dependencies);
    }

    const sustainedThreshold = config?.flySustainedVerticalSpeedThreshold ?? 0.45;
    const sustainedTicks = config?.flySustainedOffGroundTicksThreshold ?? 10;

    if (!player.isOnGround && verticalSpeed > sustainedThreshold && !player.isClimbing && !pData.hasLevitation && !player.isInWater) {
        if (pData.transient.ticksSinceLastOnGround > sustainedTicks) {
            const violationDetails = {
                type: 'sustainedVertical',
                verticalSpeed: verticalSpeed.toFixed(3),
                offGroundTicks: (pData.transient.ticksSinceLastOnGround ?? 0).toString(),
                isClimbing: player.isClimbing.toString(),
                isInWater: player.isInWater.toString(),
                hasLevitation: (pData.hasLevitation ?? false).toString(),
            };
            const sustainedFlyActionProfileKey = config?.sustainedFlyActionProfileName ?? 'movementSustainedFly';
            await actionManager?.executeCheckAction(player, sustainedFlyActionProfileKey, violationDetails, dependencies);
            playerUtils?.debugLog(`[FlyCheck][Sustained] Flagged ${playerName}. VSpeed: ${verticalSpeed.toFixed(3)}, OffGround: ${pData.transient.ticksSinceLastOnGround}t`, watchedPlayerName, dependencies);
        }
    }

    const hoverVSpeedThreshold = config?.flyHoverVerticalSpeedThreshold ?? 0.08;
    let hoverOffGroundTicks = config?.flyHoverOffGroundTicksThreshold ?? 20;
    let hoverMaxFallDist = config?.flyHoverMaxFallDistanceThreshold ?? 1.0;

    if (pData.hasSlowFalling) {
        hoverMaxFallDist *= 1.5;
        // Players with slow falling can hover very easily. We apply a stricter (lower) tick count to catch this.
        hoverOffGroundTicks = config?.flyHoverOffGroundTicksSlowFalling ?? Math.floor(hoverOffGroundTicks / 2);
    }

    // Check for hover/low-gravity movement
    const isHoverCandidate = !player.isOnGround &&
        Math.abs(verticalSpeed) < hoverVSpeedThreshold &&
        (pData.transient.ticksSinceLastOnGround ?? 0) > hoverOffGroundTicks &&
        (pData.fallDistance ?? 0) < hoverMaxFallDist &&
        !player.isClimbing &&
        !player.isInWater &&
        !pData.hasLevitation &&
        !(pData.hasSlowFalling && verticalSpeed < (config.flyHoverSlowFallingMinVSpeed ?? -0.01));

    if (isHoverCandidate) {
        // The original height check was flawed as it didn't account for players walking off ledges.
        // The isHoverCandidate conditions (especially ticksSinceLastOnGround) are robust enough to
        // prevent false positives from normal jumping, making the height check redundant and buggy.
        const violationDetails = {
            type: 'flyHover',
            verticalSpeed: verticalSpeed.toFixed(3),
            offGroundTicks: (pData.transient.ticksSinceLastOnGround ?? 0).toString(),
            fallDistance: (pData.fallDistance ?? 0).toFixed(2),
            isClimbing: player.isClimbing.toString(),
            isInWater: player.isInWater.toString(),
            hasLevitation: (pData.hasLevitation ?? false).toString(),
            hasSlowFalling: (pData.hasSlowFalling ?? false).toString(),
        };
        const hoverFlyActionProfileKey = config?.hoverFlyActionProfileName ?? 'movementFlyHover';
        await actionManager?.executeCheckAction(player, hoverFlyActionProfileKey, violationDetails, dependencies);
        playerUtils?.debugLog(`[FlyCheck][Hover] Flagged ${playerName}. VSpeed: ${verticalSpeed.toFixed(3)}, OffGround: ${pData.transient.ticksSinceLastOnGround}t, FallDist: ${pData.fallDistance?.toFixed(2)}`, watchedPlayerName, dependencies);
    }
}
