/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').Dependencies} Dependencies
 */

/**
 * Calculates the maximum allowed speed for a player, considering a base speed and any active Speed effects.
 * @param {number} baseSpeed - The base speed in blocks per second (BPS).
 * @param {number} speedAmplifier - The amplifier level of the Speed effect (-1 if not present).
 * @param {Dependencies} dependencies - The standard dependencies object.
 * @returns {number} The calculated maximum allowed speed in BPS.
 */
function calculateMaxSpeed(baseSpeed, speedAmplifier, dependencies) {
    const { config } = dependencies;
    let maxSpeed = baseSpeed;
    if (speedAmplifier >= 0) {
        const multiplier = 1 + ((speedAmplifier + 1) * (config?.checks?.speed?.speedEffectMultiplierPerLevel ?? 0.20));
        maxSpeed *= multiplier;
    }
    maxSpeed += (config?.checks?.speed?.speedToleranceBuffer ?? 0.5);
    return maxSpeed;
}

/**
 * Checks for speed-related hacks by analyzing player's horizontal movement speed.
 * Considers game mode, effects (Speed), and whether the player is on ground or airborne.
 * Flags are typically applied if speeding on ground for a consecutive number of ticks.
 * This check is typically run every tick.
 * @async
 * @param {import('@minecraft/server').Player} player - The player instance to check.
 * @param {PlayerAntiCheatData} pData - Player-specific anti-cheat data.
 * @param {Dependencies} dependencies - The standard dependencies object.
 * @returns {Promise<void>}
 */
export async function checkSpeed(player, pData, dependencies) {
    const { config, playerUtils, actionManager } = dependencies;
    const playerName = player?.name ?? 'UnknownPlayer';

    if (!config?.enableSpeedCheck) {
        return;
    }
    if (!pData || !pData.transient.lastVelocity) {
        playerUtils?.debugLog(`[SpeedCheck] Skipping for ${playerName}: pData or pData.transient.lastVelocity is null/undefined.`, playerName, dependencies);
        return;
    }

    const watchedPlayerName = pData.isWatched ? playerName : null;

    const blockBelow = player.dimension.getBlock(player.location.offset(0, -1, 0));
    const onIce = blockBelow && (blockBelow.typeId.includes('ice'));

    const ticksSinceLastLaunch = dependencies.currentTick - (pData.transient?.lastLaunchTick ?? -Infinity);
    const launchGraceTicks = 20; // 1 second grace for high speed after a launch

    if (ticksSinceLastLaunch <= launchGraceTicks) {
        pData.lastSpeedExemptTick = dependencies.currentTick;
        pData.isDirtyForSave = true;
        playerUtils?.debugLog(`[SpeedCheck] ${playerName} in exempt state due to recent launch item usage.`, watchedPlayerName, dependencies);
        return;
    }

    if (player.isFlying || player.isGliding || player.isClimbing || player.isInWater || player.isRiding || onIce) {
        if (pData.consecutiveOnGroundSpeedingTicks > 0) {
            pData.consecutiveOnGroundSpeedingTicks = 0;
            pData.isDirtyForSave = true;
        }
        // Record the tick of the last exempt state to provide a grace period.
        pData.lastSpeedExemptTick = dependencies.currentTick;
        pData.isDirtyForSave = true;

        if (config?.enableDebugLogging && pData.isWatched) {
            const exemptReason = player.isFlying ? 'Flying' : player.isGliding ? 'Gliding' : player.isClimbing ? 'Climbing' : player.isInWater ? 'InWater' : player.isRiding ? 'Riding' : 'OnIce';
            playerUtils?.debugLog(`[SpeedCheck] ${playerName} in exempt state (${exemptReason}). Skipping speed check.`, watchedPlayerName, dependencies);
        }
        return;
    }

    // Grace period after an exempt state ends (e.g., dismounting a horse, landing from elytra)
    const gracePeriodTicks = config?.checks?.speed?.postExemptionGraceTicks ?? 20; // 1 second grace period
    if (pData.lastSpeedExemptTick && (dependencies.currentTick - pData.lastSpeedExemptTick) < gracePeriodTicks) {
        playerUtils?.debugLog(`[SpeedCheck] ${playerName} is within post-exemption grace period. Skipping speed check.`, watchedPlayerName, dependencies);
        return;
    }

    const hSpeed = Math.sqrt((pData.transient.lastVelocity.x ** 2) + (pData.transient.lastVelocity.z ** 2));
    const hSpeedBPS = hSpeed * 20;
    const speedAmplifier = pData.speedAmplifier ?? -1;

    const maxAllowedSpeedBPS = calculateMaxSpeed(config?.checks?.speed?.maxHorizontalSpeedVanillaSprint ?? 5.7, speedAmplifier, dependencies);

    if (pData.isWatched && config?.enableDebugLogging) {
        playerUtils?.debugLog(
            `[SpeedCheck] Processing for ${playerName}. HSpeedBPS=${hSpeedBPS.toFixed(3)}, MaxAllowedBPS=${maxAllowedSpeedBPS.toFixed(3)}, GroundSpeedingTicks=${pData.consecutiveOnGroundSpeedingTicks ?? 0}, OnGround=${player.isOnGround}`,
            watchedPlayerName, dependencies,
        );
    }

    const groundActionProfileKey = config?.checks?.speed?.speedGroundActionProfileName ?? 'movementSpeedGround';

    if (player.isOnGround) {
        // Reset air speed counter when landing
        if (pData.consecutiveAirSpeedingTicks > 0) {
            pData.consecutiveAirSpeedingTicks = 0;
            pData.isDirtyForSave = true;
        }

        if (hSpeedBPS > maxAllowedSpeedBPS) {
            pData.consecutiveOnGroundSpeedingTicks = (pData.consecutiveOnGroundSpeedingTicks || 0) + 1;
            pData.isDirtyForSave = true;

            const groundTicksThreshold = config?.checks?.speed?.speedGroundConsecutiveTicksThreshold ?? 5;
            if (pData.consecutiveOnGroundSpeedingTicks >= groundTicksThreshold) {
                const violationDetails = {
                    type: 'ground',
                    detectedSpeedBps: hSpeedBPS.toFixed(3),
                    maxAllowedBps: maxAllowedSpeedBPS.toFixed(3),
                    consecutiveTicks: (pData.consecutiveOnGroundSpeedingTicks ?? 0).toString(),
                    onGround: player.isOnGround.toString(),
                };
                await actionManager?.executeCheckAction(player, groundActionProfileKey, violationDetails, dependencies);
                playerUtils?.debugLog(`[SpeedCheck][Ground] Flagged ${playerName}. Speed: ${hSpeedBPS.toFixed(3)} > ${maxAllowedSpeedBPS.toFixed(3)} for ${pData.consecutiveOnGroundSpeedingTicks} ticks.`, watchedPlayerName, dependencies);
                pData.consecutiveOnGroundSpeedingTicks = 0; // Reset after flagging
            }
        } else {
            if (pData.consecutiveOnGroundSpeedingTicks > 0) {
                pData.consecutiveOnGroundSpeedingTicks = 0;
            }
        }
    } else { // Player is in the air
        // Reset ground speed counter when airborne
        if (pData.consecutiveOnGroundSpeedingTicks > 0) {
            pData.consecutiveOnGroundSpeedingTicks = 0;
            pData.isDirtyForSave = true;
        }

        if (config?.checks?.speed?.enableAir) {
            const baseMaxAirSpeed = config?.checks?.speed?.maxHorizontalSpeedAirborne ?? 7.5;
            const effectiveMaxAirSpeed = calculateMaxSpeed(baseMaxAirSpeed, speedAmplifier, dependencies);

            if (hSpeedBPS > effectiveMaxAirSpeed) {
                pData.consecutiveAirSpeedingTicks = (pData.consecutiveAirSpeedingTicks || 0) + 1;
                pData.isDirtyForSave = true;

                const airTicksThreshold = config?.checks?.speed?.speedAirConsecutiveTicksThreshold ?? 4;
                if (pData.consecutiveAirSpeedingTicks >= airTicksThreshold) {
                    const airActionProfileKey = config?.checks?.speed?.speedAirActionProfileName ?? 'movementSpeedAir';
                    const violationDetails = {
                        type: 'air',
                        detectedSpeedBps: hSpeedBPS.toFixed(3),
                        maxAllowedBps: effectiveMaxAirSpeed.toFixed(3),
                        consecutiveTicks: (pData.consecutiveAirSpeedingTicks ?? 0).toString(),
                        onGround: player.isOnGround.toString(),
                    };
                    await actionManager?.executeCheckAction(player, airActionProfileKey, violationDetails, dependencies);
                    playerUtils?.debugLog(`[SpeedCheck][Air] Flagged ${playerName}. Speed: ${hSpeedBPS.toFixed(3)} > ${effectiveMaxAirSpeed.toFixed(3)} for ${pData.consecutiveAirSpeedingTicks} ticks.`, watchedPlayerName, dependencies);
                    pData.consecutiveAirSpeedingTicks = 0; // Reset after flagging
                }
            } else {
                if (pData.consecutiveAirSpeedingTicks > 0) {
                    pData.consecutiveAirSpeedingTicks = 0;
                }
            }
        }
    }
}
