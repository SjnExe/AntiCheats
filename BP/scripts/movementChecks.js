/**
 * @file movementChecks.js
 * Contains functions for detecting various movement-related hacks such as Fly, Speed, and NoFall.
 * These checks are typically called from the main tick loop in main.js.
 */

import * as mc from '@minecraft/server';
import { warnPlayer, notifyAdmins, debugLog } from './playerUtils';
import { MAX_VERTICAL_SPEED, MAX_HORIZONTAL_SPEED, SPEED_EFFECT_BONUS, MIN_FALL_DISTANCE_FOR_DAMAGE } from './config';

/**
 * Checks for fly-related hacks by analyzing player's vertical movement and airborne state.
 * Detects sustained upward movement while airborne (potential fly) and prolonged hovering.
 * @param {mc.Player} player The player instance to check.
 * @param {import('../main.js').PlayerAntiCheatData} pData Player-specific data, including velocity, position, and flags.
 *        Requires `pData.isWatched`, `pData.velocity`, `pData.consecutiveOffGroundTicks`,
 *        `pData.fallDistance`, `pData.lastOnGroundPosition`, `pData.flags`, `pData.lastFlagType`.
 */
export function checkFly(player, pData) {
    const watchedPrefix = pData.isWatched ? player.nameTag : null;

    // Section: Legitimate Flight Checks
    // Ignore players who are legitimately flying (Creative/Spectator) or gliding with Elytra.
    if (player.isFlying || player.isGliding) {
        debugLog(`Legitimately flying or gliding.`, watchedPrefix);
        return;
    }

    // Ignore players with levitation effect if moving upwards.
    const levitationEffect = player.getEffects().find(effect => effect.typeId === "levitation");
    if (levitationEffect) {
        debugLog(`Has levitation effect. Duration: ${levitationEffect.duration}, Amplifier: ${levitationEffect.amplifier}`, watchedPrefix);
        if (pData.velocity.y > 0) {
            debugLog(`Allowing upward movement due to levitation. V: ${pData.velocity.y.toFixed(2)}`, watchedPrefix);
            return;
        }
    }

    const verticalSpeed = pData.velocity.y;
    debugLog(`Fly check: isOnGround=${player.isOnGround}, VSpeed=${verticalSpeed.toFixed(2)}, OffGroundTicks=${pData.consecutiveOffGroundTicks}`, watchedPrefix);

    // Section: Fly Detection Logic (Sustained Upward Movement)
    // Checks for players moving upwards significantly while airborne for several ticks.
    if (!player.isOnGround && verticalSpeed > 0.5 && !player.isClimbing) {
        if (pData.consecutiveOffGroundTicks > 10) {
            pData.lastFlagType = "fly";
            pData.flags.totalFlags = (pData.flags.totalFlags || 0) + 1;
            if (!pData.flags.fly) pData.flags.fly = { count: 0, lastDetectionTime: 0 };
            pData.flags.fly.count++;
            pData.flags.fly.lastDetectionTime = Date.now();
            warnPlayer(player, "Potential fly hack detected (sustained upward movement).");
            notifyAdmins(`Flagged for Fly (sustained upward). V: ${verticalSpeed.toFixed(2)}, TicksOffGround: ${pData.consecutiveOffGroundTicks}`, player, pData);
            debugLog(`Sustained upward movement detected. V: ${verticalSpeed.toFixed(2)}, TicksOffGround: ${pData.consecutiveOffGroundTicks}`, watchedPrefix);
        }
    }

    // Section: Hover Detection Logic
    // Checks for players hovering (minimal vertical speed) while airborne for an extended period,
    // away from the ground, and not in water or climbing.
    const nearGroundThreshold = 3;
    if (!player.isOnGround &&
        Math.abs(verticalSpeed) < 0.08 &&
        pData.consecutiveOffGroundTicks > 20 &&
        pData.fallDistance < 1.0 &&
        !player.isClimbing &&
        !player.isInWater
        ) {
        const playerLoc = player.location;
        const lastGroundLoc = pData.lastOnGroundPosition || playerLoc;
        const heightAboveLastGround = playerLoc.y - (pData.lastOnGroundPosition ? pData.lastOnGroundPosition.y : playerLoc.y);

        if (heightAboveLastGround > nearGroundThreshold) {
            pData.lastFlagType = "fly";
            pData.flags.totalFlags = (pData.flags.totalFlags || 0) + 1;
            if (!pData.flags.fly) pData.flags.fly = { count: 0, lastDetectionTime: 0 };
            pData.flags.fly.count++;
            pData.flags.fly.lastDetectionTime = Date.now();
            warnPlayer(player, "Potential fly hack detected (hovering).");
            notifyAdmins(`Flagged for Fly (hovering). V: ${verticalSpeed.toFixed(2)}, TicksOffGround: ${pData.consecutiveOffGroundTicks}, FallD: ${pData.fallDistance.toFixed(2)}, HeightAboveLastGround: ${heightAboveLastGround.toFixed(2)}`, player, pData);
            debugLog(`Hover detected: VSpeed=${verticalSpeed.toFixed(2)}, OffGroundTicks=${pData.consecutiveOffGroundTicks}, FallDist=${pData.fallDistance.toFixed(2)}, HeightAboveLastGround=${heightAboveLastGround.toFixed(2)}`, watchedPrefix);
        }
    }
}

/**
 * Checks for speed-related hacks by analyzing player's horizontal movement speed.
 * Considers legitimate speed sources like flying, climbing, and speed effects.
 * Flags players moving faster than configured limits on the ground.
 * @param {mc.Player} player The player instance to check.
 * @param {import('../main.js').PlayerAntiCheatData} pData Player-specific data, including velocity and flags.
 *        Requires `pData.isWatched`, `pData.velocity`, `pData.consecutiveOnGroundSpeedingTicks`,
 *        `pData.flags`, `pData.lastFlagType`.
 */
export function checkSpeed(player, pData) {
    const watchedPrefix = pData.isWatched ? player.nameTag : null;

    // Section: Legitimate Speed Sources
    // Ignore players who are flying or climbing, as their speed can be legitimately high.
    if (player.isFlying || player.isClimbing) {
        debugLog(`Flying or climbing, speed check bypassed.`, watchedPrefix);
        pData.consecutiveOnGroundSpeedingTicks = 0;
        return;
    }

    const hSpeed = Math.sqrt(pData.velocity.x ** 2 + pData.velocity.z ** 2);
    let currentMaxSpeed = MAX_HORIZONTAL_SPEED;

    // Adjust max speed for "speed" potion effects.
    const speedEffect = player.getEffects().find(effect => effect.typeId === "speed");
    if (speedEffect) {
        currentMaxSpeed += (speedEffect.amplifier + 1) * SPEED_EFFECT_BONUS;
        debugLog(`Speed effect active. Amplifier: ${speedEffect.amplifier}. Adjusted MaxSpeed to: ${currentMaxSpeed.toFixed(2)}`, watchedPrefix);
    }

    currentMaxSpeed += 0.5; // Tolerance buffer

    debugLog(`Speed check: isOnGround=${player.isOnGround}, HSpeed=${hSpeed.toFixed(2)}, MaxSpeed=${currentMaxSpeed.toFixed(2)}, SpeedingTicks=${pData.consecutiveOnGroundSpeedingTicks}`, watchedPrefix);

    // Section: Speed Detection Logic
    // Flags players exceeding max horizontal speed while on ground for several consecutive ticks.
    const SPEEDING_TICKS_THRESHOLD = 5;
    if (player.isOnGround && hSpeed > currentMaxSpeed) {
        pData.consecutiveOnGroundSpeedingTicks = (pData.consecutiveOnGroundSpeedingTicks || 0) + 1;
        if (pData.consecutiveOnGroundSpeedingTicks > SPEEDING_TICKS_THRESHOLD) {
            pData.lastFlagType = "speed";
            pData.flags.totalFlags = (pData.flags.totalFlags || 0) + 1;
            if (!pData.flags.speed) pData.flags.speed = { count: 0, lastDetectionTime: 0 };
            pData.flags.speed.count++;
            pData.flags.speed.lastDetectionTime = Date.now();
            warnPlayer(player, `Potential speed hack detected. Speed: ${hSpeed.toFixed(2)} m/s, Max: ${currentMaxSpeed.toFixed(2)} m/s`);
            notifyAdmins(`Flagged for Speed. Speed: ${hSpeed.toFixed(2)}, Max: ${currentMaxSpeed.toFixed(2)}, Ticks: ${pData.consecutiveOnGroundSpeedingTicks}`, player, pData);
            debugLog(`Speeding detected: HSpeed=${hSpeed.toFixed(2)}, Max=${currentMaxSpeed.toFixed(2)}, Ticks=${pData.consecutiveOnGroundSpeedingTicks}`, watchedPrefix);
            pData.consecutiveOnGroundSpeedingTicks = 0;
        }
    } else if (player.isOnGround) {
        pData.consecutiveOnGroundSpeedingTicks = 0;
    } else {
        pData.consecutiveOnGroundSpeedingTicks = 0; // Also reset if airborne for this specific on-ground check
    }
}

/**
 * Checks for NoFall hacks by comparing accumulated fall distance with expected fall damage.
 * If a player lands from a significant height without taking damage (and without legitimate reasons), they are flagged.
 * @param {mc.Player} player The player instance to check.
 * @param {import('../main.js').PlayerAntiCheatData} pData Player-specific data, including fallDistance, isTakingFallDamage, and flags.
 *        Requires `pData.isWatched`, `pData.fallDistance`, `pData.isTakingFallDamage`,
 *        `pData.flags`, `pData.lastFlagType`.
 */
export function checkNoFall(player, pData) {
    const watchedPrefix = pData.isWatched ? player.nameTag : null;

    // Section: Legitimate No Fall Scenarios
    // Ignore if player is in a state where fall damage is not applicable.
    if (player.isFlying ||
        player.isGliding ||
        player.isInWater ||
        player.isClimbing ||
        player.getVehicle()
        ) {
        debugLog(`In legitimate no-fall state (flying, gliding, water, climbing, vehicle). FallDistance=${pData.fallDistance.toFixed(2)}`, watchedPrefix);
        return;
    }

    // Ignore if player has slow_falling effect.
    const slowFallingEffect = player.getEffects().find(effect => effect.typeId === "slow_falling");
    if (slowFallingEffect) {
        debugLog(`Has slow_falling effect. Duration: ${slowFallingEffect.duration}, Amplifier: ${slowFallingEffect.amplifier}`, watchedPrefix);
        return;
    }

    // Section: NoFall Detection Logic
    // This logic primarily acts when the player lands (isOnGround becomes true).
    if (player.isOnGround) {
        debugLog(`Landed. FallDistance=${pData.fallDistance.toFixed(2)}, IsTakingFallDamage=${pData.isTakingFallDamage}`, watchedPrefix);
        if (pData.fallDistance > MIN_FALL_DISTANCE_FOR_DAMAGE) {
            if (!pData.isTakingFallDamage) {
                // Player fell a significant distance but no fall damage was registered via entityHurt event.
                pData.lastFlagType = "nofall";
                pData.flags.totalFlags = (pData.flags.totalFlags || 0) + 1;
                if (!pData.flags.nofall) pData.flags.nofall = { count: 0, lastDetectionTime: 0 };
                pData.flags.nofall.count++;
                pData.flags.nofall.lastDetectionTime = Date.now();
                warnPlayer(player, "Potential NoFall hack detected.");
                notifyAdmins(`Flagged for NoFall (landed from ${pData.fallDistance.toFixed(2)} blocks without expected damage). LastV: ${pData.velocity.y.toFixed(2)}`, player, pData);
                debugLog(`NoFall detected: Landed from ${pData.fallDistance.toFixed(2)} blocks. isTakingFallDamage=${pData.isTakingFallDamage}`, watchedPrefix);
            } else {
                debugLog(`Landed with fallDistance ${pData.fallDistance.toFixed(2)} and took damage, no flag.`, watchedPrefix);
            }
        }
        // Fall distance and isTakingFallDamage are reset in main.js's tick loop after this check.
    }
}
