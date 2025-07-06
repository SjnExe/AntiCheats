/**
 * @file Implements a check to detect players moving horizontally faster than allowed.
 * Relies on `pData.velocity` (updated in main tick loop) and `pData.speedAmplifier`
 * (assumed to be updated by `updateTransientPlayerData` based on player effects).
 */
import * as mc from '@minecraft/server'; // For mc.GameMode constants

/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').Dependencies} Dependencies
 */

/**
 * Checks for speed-related hacks by analyzing player's horizontal movement speed.
 * Considers game mode, effects (Speed), and whether the player is on ground or airborne.
 * Flags are typically applied if speeding on ground for a consecutive number of ticks.
 * This check is typically run every tick.
 *
 * @async
 * @param {import('@minecraft/server').Player} player - The player instance to check.
 * @param {PlayerAntiCheatData} pData - Player-specific anti-cheat data.
 * @param {Dependencies} dependencies - The standard dependencies object.
 * @returns {Promise<void>}
 */
export async function checkSpeed(player, pData, dependencies) {
    const { config, playerUtils, actionManager } = dependencies;
    const playerName = player?.nameTag ?? 'UnknownPlayer';

    if (!config?.enableSpeedCheck) { // Master toggle for the speed check
        return;
    }
    if (!pData || !pData.velocity) { // pData and its velocity property are essential
        playerUtils?.debugLog(`[SpeedCheck] Skipping for ${playerName}: pData or pData.velocity is null/undefined.`, playerName, dependencies);
        return;
    }

    const watchedPlayerName = pData.isWatched ? playerName : null;

    // Exemptions for legitimate fast movement states
    if (player.isFlying || player.isGliding || player.isClimbing || player.isInWater || player.isRiding) {
        if (pData.consecutiveOnGroundSpeedingTicks > 0) {
            pData.consecutiveOnGroundSpeedingTicks = 0; // Reset counter if player enters an exempt state
            pData.isDirtyForSave = true;
        }
        if (config?.enableDebugLogging && pData.isWatched) {
            const exemptReason = player.isFlying ? 'Flying' : player.isGliding ? 'Gliding' : player.isClimbing ? 'Climbing' : player.isInWater ? 'InWater' : 'Riding';
            playerUtils?.debugLog(`[SpeedCheck] ${playerName} in exempt state (${exemptReason}). Skipping speed check.`, watchedPlayerName, dependencies);
        }
        return;
    }

    const hSpeed = Math.sqrt((pData.velocity.x ** 2) + (pData.velocity.z ** 2));
    const hSpeedBPS = hSpeed * 20; // Convert blocks per tick to blocks per second

    // Base max speed (walking speed is ~4.3, sprinting ~5.6 BPS for vanilla)
    // This config should represent max expected sprint speed without effects.
    let maxAllowedSpeedBPS = config?.maxHorizontalSpeedVanillaSprint ?? 5.7; // Slightly above vanilla sprint

    // Apply Speed effect modifier
    const speedAmplifier = pData.speedAmplifier ?? -1; // From updateTransientPlayerData
    if (speedAmplifier >= 0) {
        // Each level of Speed adds 20% to the *base* walking speed, not multiplicatively on current speed.
        // However, for simplicity in a speed check, often a direct multiplier on current max is used.
        // Assuming config.speedEffectMultiplierPerLevel is, e.g., 0.2 for 20%
        maxAllowedSpeedBPS *= (1 + ((speedAmplifier + 1) * (config?.speedEffectMultiplierPerLevel ?? 0.20)));
    }

    // Apply a general tolerance buffer
    maxAllowedSpeedBPS += (config?.speedToleranceBuffer ?? 0.5); // Default 0.5 BPS buffer

    if (pData.isWatched && config?.enableDebugLogging) {
        playerUtils?.debugLog(
            `[SpeedCheck] Processing for ${playerName}. HSpeedBPS=${hSpeedBPS.toFixed(3)}, MaxAllowedBPS=${maxAllowedSpeedBPS.toFixed(3)}, GroundSpeedingTicks=${pData.consecutiveOnGroundSpeedingTicks ?? 0}, OnGround=${player.isOnGround}`,
            watchedPlayerName, dependencies
        );
    }

    // Ensure actionProfileKey is camelCase
    const rawGroundActionProfileKey = config?.speedGroundActionProfileName ?? 'movementSpeedGround';
    const groundActionProfileKey = rawGroundActionProfileKey
        .replace(/([-_][a-z0-9])/ig, ($1) => $1.toUpperCase().replace('-', '').replace('_', ''))
        .replace(/^[A-Z]/, (match) => match.toLowerCase());

    if (player.isOnGround) {
        if (hSpeedBPS > maxAllowedSpeedBPS) {
            pData.consecutiveOnGroundSpeedingTicks = (pData.consecutiveOnGroundSpeedingTicks || 0) + 1;
            pData.isDirtyForSave = true;

            const groundTicksThreshold = config?.speedGroundConsecutiveTicksThreshold ?? 5; // Default 0.25 seconds
            if (pData.consecutiveOnGroundSpeedingTicks >= groundTicksThreshold) {
                let activeEffectsString = 'none';
                try {
                    const effects = player.getEffects();
                    if (effects.length > 0) {
                        activeEffectsString = effects.map(e => `${e.typeId.replace('minecraft:', '')}(${e.amplifier})`).join(', ') || 'none';
                    }
                } catch (e) { /* Logged by updateTransientPlayerData if debug enabled */ }

                const violationDetails = {
                    detectedSpeedBps: hSpeedBPS.toFixed(3),
                    maxAllowedBps: maxAllowedSpeedBPS.toFixed(3),
                    consecutiveTicks: (pData.consecutiveOnGroundSpeedingTicks ?? 0).toString(),
                    onGround: player.isOnGround.toString(),
                    activeEffects: activeEffectsString,
                };
                await actionManager?.executeCheckAction(player, groundActionProfileKey, violationDetails, dependencies);
                playerUtils?.debugLog(`[SpeedCheck] Flagged ${playerName} for ground speed. Speed: ${hSpeedBPS.toFixed(3)} > ${maxAllowedSpeedBPS.toFixed(3)} for ${pData.consecutiveOnGroundSpeedingTicks} ticks.`, watchedPlayerName, dependencies);
                // Optionally reset consecutiveOnGroundSpeedingTicks after flagging to require a new sequence.
                // Or let it continue to accumulate for escalating AutoMod actions if flags stack up quickly.
                // For now, let's reset it to require a new sustained period of speeding.
                pData.consecutiveOnGroundSpeedingTicks = 0;
                pData.isDirtyForSave = true;
            }
        } else {
            // If speed is normal, reset the counter
            if (pData.consecutiveOnGroundSpeedingTicks > 0) {
                pData.consecutiveOnGroundSpeedingTicks = 0;
                pData.isDirtyForSave = true;
            }
        }
    } else { // Player is airborne
        // Reset ground speeding counter if player becomes airborne
        if (pData.consecutiveOnGroundSpeedingTicks > 0) {
            pData.consecutiveOnGroundSpeedingTicks = 0;
            pData.isDirtyForSave = true;
        }
        // Airborne speed checks could be added here if desired, potentially using a different threshold/profile.
        // For example, config.maxHorizontalAirSpeed, config.airSpeedActionProfileName
        // if (config.enableAirSpeedCheck && hSpeedBPS > maxAllowedAirSpeedBPS) { ... }
    }
}
