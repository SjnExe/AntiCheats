import * as mc from '@minecraft/server';
// Removed: import { addFlag } from '../../core/playerDataManager.js';
// Removed: import { debugLog } from '../../utils/playerUtils.js';
// Config values are accessed via the config object passed as a parameter.

/**
 * @typedef {import('../../core/playerDataManager.js').PlayerAntiCheatData} PlayerAntiCheatData
 */

/**
 * Checks for fly-related hacks by analyzing player's vertical movement and airborne state.
 * @param {mc.Player} player The player instance to check.
 * @param {PlayerAntiCheatData} pData Player-specific data.
 * @param {object} config The server configuration object.
 * @param {object} playerUtils Utility functions for players.
 * @param {object} playerDataManager Manager for player data.
 * @param {object} logManager Manager for logging.
 * @param {function} executeCheckAction Function to execute defined actions for a check.
 */
export async function checkFly(player, pData, config, playerUtils, playerDataManager, logManager, executeCheckAction) {
    if (!config.enableFlyCheck) return;
    const watchedPrefix = pData.isWatched ? player.nameTag : null;

    if (player.isFlying || player.isGliding) {
        if (playerUtils.debugLog) playerUtils.debugLog(`FlyCheck: ${player.nameTag} legitimately flying or gliding.`, watchedPrefix);
        return;
    }

    const levitationEffect = player.getEffects().find(effect => effect.typeId === "levitation");
    if (levitationEffect && pData.velocity.y > 0) {
        if (playerUtils.debugLog) playerUtils.debugLog(`FlyCheck: ${player.nameTag} allowing upward movement due to levitation. VSpeed: ${pData.velocity.y.toFixed(2)}`, watchedPrefix);
        return;
    }

    const verticalSpeed = pData.velocity.y;
    if (pData.isWatched && playerUtils.debugLog) {
        playerUtils.debugLog(`FlyCheck: Processing for ${player.nameTag}. VSpeed=${verticalSpeed.toFixed(2)}, OffGroundTicks=${pData.consecutiveOffGroundTicks}`, watchedPrefix);
    }

    const dependencies = { config, playerDataManager, playerUtils, logManager };

    // Sustained Upward Movement
    // For sustained, we might need a different checkType key if its actions are different.
    // For now, using "example_fly_hover" but ideally this would be "fly_sustained_example" or similar.
    if (!player.isOnGround && verticalSpeed > config.flySustainedVerticalSpeedThreshold && !player.isClimbing) {
        if (pData.consecutiveOffGroundTicks > config.flySustainedOffGroundTicksThreshold) {
            const violationDetails = {
                type: "sustained_vertical",
                verticalSpeed: verticalSpeed.toFixed(2),
                offGroundTicks: pData.consecutiveOffGroundTicks,
                isClimbing: player.isClimbing,
                isInWater: player.isInWater
            };
            // Using "example_fly_hover" for now, but ideally, this might be a distinct profile like "fly_sustained_example"
            await executeCheckAction(player, "example_fly_hover", violationDetails, dependencies);
        }
    }

    // Hover Detection
    if (!player.isOnGround &&
        Math.abs(verticalSpeed) < config.flyHoverVerticalSpeedThreshold &&
        pData.consecutiveOffGroundTicks > config.flyHoverOffGroundTicksThreshold &&
        pData.fallDistance < config.flyHoverMaxFallDistanceThreshold &&
        !player.isClimbing &&
        !player.isInWater
    ) {
        const playerLoc = player.location;
        const heightAboveLastGround = playerLoc.y - (pData.lastOnGroundPosition ? pData.lastOnGroundPosition.y : playerLoc.y);

        if (heightAboveLastGround > config.flyHoverNearGroundThreshold) {
            const violationDetails = {
                type: "hover",
                verticalSpeed: verticalSpeed.toFixed(2),
                offGroundTicks: pData.consecutiveOffGroundTicks,
                fallDistance: pData.fallDistance.toFixed(2),
                heightAboveLastGround: heightAboveLastGround.toFixed(2),
                isClimbing: player.isClimbing,
                isInWater: player.isInWater
            };
            await executeCheckAction(player, "example_fly_hover", violationDetails, dependencies);
        }
    }
}
