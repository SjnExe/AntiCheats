import * as mc from '@minecraft/server';

/**
 * Checks if player is moving faster than allowed for actions that should slow them down.
 * @param {mc.Player} player The player instance.
 * @param {import('../../core/playerDataManager.js').PlayerAntiCheatData} pData Player-specific anti-cheat data.
 * @param {object} config The configuration object.
 * @param {object} playerUtils Utility functions for players.
 * @param {object} playerDataManager Manager for player data.
 * @param {object} logManager Manager for logging.
 * @param {function} executeCheckAction Function to execute defined actions for a check.
 * @param {number} currentTick The current game tick.
 */
export async function checkNoSlow(player, pData, config, playerUtils, playerDataManager, logManager, executeCheckAction, currentTick) {
    if (!config.enableNoSlowCheck) return;

    const velocity = player.getVelocity(); // Current, real-time velocity
    const horizontalSpeed = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z) * 20; // Blocks per second

    let action = null;
    let maxAllowedSpeed = Infinity;

    if (pData.isUsingConsumable) {
        action = "Eating/Drinking";
        maxAllowedSpeed = config.noSlowMaxSpeedEating;
    } else if (pData.isChargingBow) {
        action = "Charging Bow";
        maxAllowedSpeed = config.noSlowMaxSpeedChargingBow;
    } else if (pData.isUsingShield) {
        // Vanilla shield usage (raised) doesn't slow movement unless blocking specific damage types or if custom logic implies it.
        // The config value noSlowMaxSpeedUsingShield might be set to normal walking speed.
        // This check is more for "not being slowed by other means while shield is up".
        // If speed > normal walking speed while shield is up, it might be an issue if other conditions are met.
        // For now, this check is simple: if isUsingShield and speed > configured threshold.
        action = "Using Shield";
        maxAllowedSpeed = config.noSlowMaxSpeedUsingShield;
    } else if (player.isSneaking) {
        action = "Sneaking";
        maxAllowedSpeed = config.noSlowMaxSpeedSneaking;
    }

    if (action && horizontalSpeed > maxAllowedSpeed) {
        // Consider active speed effects. If player has Speed effect, this check might need adjustment or careful thresholding.
        // For now, assuming thresholds are absolute maximums during these actions.
        // A more advanced version could calculate expected slowed speed based on base speed + effects, then compare.
        const effects = player.getEffects();
        const speedEffect = effects.find(e => e.typeId === "speed");
        let effectiveMaxSpeed = maxAllowedSpeed;

        // A simple way to somewhat account for speed effect: allow a small fixed tolerance if speed effect is active.
        // This is a basic approach; true NoSlow detection often needs to factor in the exact speed reduction percentage.
        if (speedEffect) {
            effectiveMaxSpeed += 0.5; // Allow a small buffer if Speed effect is active.
                                     // This isn't a perfect model of how NoSlow interacts with Speed but a starting point.
        }

        if (horizontalSpeed > effectiveMaxSpeed) {
            const dependencies = { config, playerDataManager, playerUtils, logManager };
            const violationDetails = {
                action: action,
                speed: horizontalSpeed.toFixed(2),
                maxSpeed: effectiveMaxSpeed.toFixed(2), // Report the speed limit that was exceeded
                baseMaxSpeed: maxAllowedSpeed.toFixed(2),
                hasSpeedEffect: !!speedEffect,
                speedEffectLevel: speedEffect ? speedEffect.amplifier : 0
            };
            await executeCheckAction(player, "movement_noslow", violationDetails, dependencies);

            const watchedPrefix = pData.isWatched ? player.nameTag : null;
            if (pData.isWatched && playerUtils.debugLog) {
                playerUtils.debugLog(\`NoSlow: Flagged \${player.nameTag}. Action: \${action}, Speed: \${horizontalSpeed.toFixed(2)}bps, Max: \${effectiveMaxSpeed.toFixed(2)}bps\`, watchedPrefix);
            }
        }
    }
}
