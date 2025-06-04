import * as mc from '@minecraft/server';
import { warnPlayer, notifyAdmins, debugLog } from './playerUtils';
import { MAX_VERTICAL_SPEED, MAX_HORIZONTAL_SPEED, SPEED_EFFECT_BONUS, MIN_FALL_DISTANCE_FOR_DAMAGE } from './config';

// This is a very basic placeholder for movement checks.
// Real checks would need to consider player state, effects, game mode, etc.
// and likely use a combination of event-driven and tick-based checks.

/**
 * Checks for fly-related hacks.
 * @param {mc.Player} player The player to check.
 * @param {any} pData Player-specific data from main.js.
 */
export function checkFly(player, pData) {
    const watchedPrefix = pData.isWatched ? player.nameTag : null;
    // Legitimate Flight Checks
    if (player.isFlying || player.isGliding) {
        debugLog(`Legitimately flying or gliding.`, watchedPrefix);
        return;
    }

    // Check for levitation effect
    const levitationEffect = player.getEffects().find(effect => effect.typeId === "levitation");
    if (levitationEffect) {
        debugLog(`Has levitation effect. Duration: ${levitationEffect.duration}, Amplifier: ${levitationEffect.amplifier}`, watchedPrefix);
        if (pData.velocity.y > 0) {
            debugLog(`Allowing upward movement due to levitation. V: ${pData.velocity.y.toFixed(2)}`, watchedPrefix);
            return; // Allow upward movement if levitating
        }
    }

    const verticalSpeed = pData.velocity.y;
    debugLog(`Fly check: isOnGround=${player.isOnGround}, VSpeed=${verticalSpeed.toFixed(2)}, OffGroundTicks=${pData.consecutiveOffGroundTicks}`, watchedPrefix);

    // Fly Detection Logic (Sustained Upward Movement)
    // Positive Y is up. MAX_VERTICAL_SPEED might be for normal jumps, flying is more sustained.
    // This threshold (0.5) is arbitrary and needs testing. Vanilla jump is ~0.42 m/tick peak.
    // A player spamming jump on a slope can also gain height.
    if (!player.isOnGround && verticalSpeed > 0.5 && !player.isClimbing) { // Added !player.isClimbing
        // Player is moving upwards without being on ground, not climbing, not flying/gliding, no levitation
        if (pData.consecutiveOffGroundTicks > 10) { // Been off ground for 0.5 seconds while consistently moving up
            pData.lastFlagType = "fly";
            pData.flags.totalFlags = (pData.flags.totalFlags || 0) + 1;
            if (!pData.flags.fly) pData.flags.fly = { count: 0, lastDetectionTime: 0 };
            pData.flags.fly.count++;
            pData.flags.fly.lastDetectionTime = Date.now();
            warnPlayer(player, "Potential fly hack detected (sustained upward movement).");
            notifyAdmins(`Flagged for Fly (sustained upward). V: ${verticalSpeed.toFixed(2)}, TicksOffGround: ${pData.consecutiveOffGroundTicks}`, player, pData);
            // Consider resetting some state here to avoid spam, e.g., pData.lastFlyWarningTick = currentTick;
            // Or add a cooldown to warnings for this specific player.
        }
    }

    // Hover Detection Logic
    // Check if player is hovering (little to no vertical movement) for an extended period while airborne
    // and not near ground (e.g. not just jumped and at apex)
    // We also need to consider if they are in water, a boat, etc. For now, basic.
    const nearGroundThreshold = 3; // Blocks above ground to not be considered "near ground" for hover check
    let isNearGround = false;
    try {
        // Check blocks below the player to see if they are near ground
        // This is a simplified check; a more robust one would use raycasting or check a small volume.
        const blockBelow = player.dimension.getBlock(player.location.offset(0, -1, 0));
        const blockFurtherBelow = player.dimension.getBlock(player.location.offset(0, -2, 0));
        if ((blockBelow && !blockBelow.isAir) || (blockFurtherBelow && !blockFurtherBelow.isAir)) {
            //isNearGround = true; // This logic is tricky, player.isOnGround is better
        }
    } catch (e) {
        // debugLog(`Error checking block below player: ${e}`);
    }


    if (!player.isOnGround &&
        Math.abs(verticalSpeed) < 0.08 && // Very little vertical movement (Minecraft gravity is approx 0.08 per tick when falling)
        pData.consecutiveOffGroundTicks > 20 && // Hovering for more than 1 second
        pData.fallDistance < 1.0 && // Not significantly falling (or just started falling)
        !player.isClimbing && // Not climbing
        !player.isInWater // Not in water
        // Add more checks: e.g. player.isRiding if entities can be ridden that hover
        ) {
        // To make sure this isn't the apex of a jump, check lastOnGroundTick or if fallDistance is very small
        // A more robust check for "near ground" would be needed if we didn't have player.isOnGround
        // For now, player.isOnGround handles the "not near ground" aspect for starting a hover.
        // The fallDistance check helps ensure they weren't just falling a long way and then stopped by a hack.

        // Check if player is significantly above where they were last on ground
        // This is a very rough way to check if they are "stuck" mid-air far from ground
        const playerLoc = player.location;
        const lastGroundLoc = pData.lastOnGroundPosition || playerLoc; // Need to store lastOnGroundPosition
        const heightAboveLastGround = playerLoc.y - (pData.lastOnGroundPosition ? pData.lastOnGroundPosition.y : playerLoc.y);


        if (heightAboveLastGround > nearGroundThreshold) { // Only flag if hovering significantly above where they last touched ground
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
 * Placeholder for speed check.
 * @param {mc.Player} player The player to check.
 * @param {any} pData Player-specific data from main.js.
 */
export function checkSpeed(player, pData) {
    // Legitimate Speed Sources
    if (player.isFlying || player.isClimbing) {
        // debugLog(`Player ${player.nameTag} is flying or climbing. Speed check bypassed.`);
        pData.consecutiveOnGroundSpeedingTicks = 0; // Reset counter if they start flying/climbing
        return;
    }

    const hSpeed = Math.sqrt(pData.velocity.x ** 2 + pData.velocity.z ** 2);
    let currentMaxSpeed = MAX_HORIZONTAL_SPEED; // Base max speed from config

    // Consider "speed" effect
    const speedEffect = player.getEffects().find(effect => effect.typeId === "speed");
    if (speedEffect) {
        // debugLog(`Player ${player.nameTag} has Speed effect. Amplifier: ${speedEffect.amplifier}`);
        // Each level of Speed effect adds 20% to speed.
        // Default player speed is ~4.317 m/s (blocks/sec) when walking.
        // MAX_HORIZONTAL_SPEED should be set for a player *without* speed effects.
        // SPEED_EFFECT_BONUS is an absolute value to add. A percentage might be better.
        // For now, let's assume SPEED_EFFECT_BONUS is a flat increase per level.
        // A common way is baseSpeed * (1 + 0.2 * amplifier).
        // If MAX_HORIZONTAL_SPEED is, say, 5.6 (sprinting), then Speed I (20%) would be 5.6 * 1.2 = 6.72
        // The current SPEED_EFFECT_BONUS = 2.0 is a direct addition.
        // Vanilla adds 20% of base per level. So (amplifier + 1) * 0.2 * baseWalkSpeed.
        // The prompt implies SPEED_EFFECT_BONUS is an absolute value added per level.
        // Example: Speed I (amplifier 0) adds SPEED_EFFECT_BONUS * 1. Speed II (amplifier 1) adds SPEED_EFFECT_BONUS * 2.
        currentMaxSpeed += (speedEffect.amplifier + 1) * SPEED_EFFECT_BONUS;
    }

    // Adding a small buffer to account for server ticks, minor variations
    currentMaxSpeed += 0.5; // Tolerance buffer

    const SPEEDING_TICKS_THRESHOLD = 5; // Number of consecutive ticks speeding before flagging

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
            pData.consecutiveOnGroundSpeedingTicks = 0; // Reset after warning
        }
    } else if (player.isOnGround) { // On ground but not speeding
        pData.consecutiveOnGroundSpeedingTicks = 0;
    } else { // Not on ground
        // Could apply different logic for air speed if desired (e.g., higher tolerance or specific air speed checks)
        // For now, if they are not on ground, we reset the on-ground speeding counter.
        // This means bunny hopping speed bursts might not be caught by this specific counter.
        // A separate air-speed counter might be needed if that's a concern.
        pData.consecutiveOnGroundSpeedingTicks = 0;
    }

    // debugLog(`Player ${player.nameTag} hSpeed: ${hSpeed.toFixed(2)}, currentMaxSpeed: ${currentMaxSpeed.toFixed(2)}, speedingTicks: ${pData.consecutiveOnGroundSpeedingTicks}`);
}

/**
 * Checks for NoFall hacks.
 * @param {mc.Player} player The player to check.
 * @param {any} pData Player-specific data from main.js.
 */
export function checkNoFall(player, pData) {
    // Legitimate No Fall Scenarios
    if (player.isFlying ||
        player.isGliding ||
        player.isInWater ||
        player.isClimbing ||
        player.getVehicle() /* Player is riding an entity */
        ) {
        // If in any of these states, they might not take fall damage or fall distance tracking is irrelevant.
        // We could reset fallDistance here, or let the main loop handle it when they become onGround.
        // For safety, if they become onGround during these states, fallDistance should be 0.
        // The main loop already does pData.fallDistance = 0 when player.isOnGround.
        // debugLog(`Player ${player.nameTag} in legitimate no-fall state (flying, gliding, water, climbing, vehicle).`);
        return;
    }

    // Check for slow_falling effect
    const slowFallingEffect = player.getEffects().find(effect => effect.typeId === "slow_falling");
    if (slowFallingEffect) {
        // debugLog(`Player ${player.nameTag} has slow_falling effect.`);
        return; // Legitimate reason not to take (full) fall damage
    }

    // NoFall Detection Logic
    // This check primarily runs when the player becomes player.isOnGround
    if (player.isOnGround) {
        if (pData.fallDistance > MIN_FALL_DISTANCE_FOR_DAMAGE) {
            // Player has landed from a significant height
            if (!pData.isTakingFallDamage) {
                // They were expected to take fall damage (based on fallDistance)
                // but the entityHurt event didn't set pData.isTakingFallDamage = true
                // in the very brief window between this check and landing.
                // This timing is critical: entityHurt runs, then this check runs.
                // If entityHurt set isTakingFallDamage, this block is skipped.
                pData.lastFlagType = "nofall";
                pData.flags.totalFlags = (pData.flags.totalFlags || 0) + 1;
                if (!pData.flags.nofall) pData.flags.nofall = { count: 0, lastDetectionTime: 0 };
                pData.flags.nofall.count++;
                pData.flags.nofall.lastDetectionTime = Date.now();
                warnPlayer(player, "Potential NoFall hack detected.");
                notifyAdmins(`Flagged for NoFall (landed from ${pData.fallDistance.toFixed(2)} blocks without expected damage). LastV: ${pData.velocity.y.toFixed(2)}`, player, pData);
            }
            // else: They took fall damage as expected, or pData.isTakingFallDamage was true from a recent event.
            // The entityHurt event already reset fallDistance for players who took damage.
            // For those who didn't (e.g. NoFall hack), we ensure it's reset here too.
        }
        // Fall distance is reset in the main loop when player.isOnGround.
        // pData.isTakingFallDamage is also reset in the main loop when player.isOnGround.
        // Redundant resets here are fine but can be removed if main loop is trusted.
        // pData.fallDistance = 0;
        // pData.isTakingFallDamage = false;
    }
    // If not on ground, fallDistance continues to accumulate in main.js
}


// Add more movement checks like NoFall, Jesus (walking on water), Spider (climbing walls), etc.
