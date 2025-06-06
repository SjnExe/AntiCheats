import * as mc from '@minecraft/server';

/**
 * Checks for tower-like upward building.
 * @param {mc.Player} player The player instance.
 * @param {import('../../core/playerDataManager.js').PlayerAntiCheatData} pData Player-specific anti-cheat data.
 * @param {mc.Block} block The block that was just placed.
 * @param {object} config The configuration object.
 * @param {object} playerUtils Utility functions for players.
 * @param {object} playerDataManager Manager for player data.
 * @param {object} logManager Manager for logging.
 * @param {function} executeCheckAction Function to execute defined actions for a check.
 * @param {number} currentTick The current game tick.
 */
export async function checkTower(player, pData, block, config, playerUtils, playerDataManager, logManager, executeCheckAction, currentTick) {
    if (!config.enableTowerCheck) return;

    const watchedPrefix = pData.isWatched ? player.nameTag : null;
    const rotation = player.getRotation();
    const pitch = rotation.x;
    const blockLocation = block.location;

    // Record recent placements (optional, but good for general scaffold data)
    const newPlacement = { x: blockLocation.x, y: blockLocation.y, z: blockLocation.z, pitch: pitch, yaw: rotation.y, tick: currentTick };
    if (!pData.recentBlockPlacements) pData.recentBlockPlacements = [];
    pData.recentBlockPlacements.push(newPlacement);
    if (pData.recentBlockPlacements.length > config.towerPlacementHistoryLength) {
        pData.recentBlockPlacements.shift();
    }

    // Tower check logic
    if (pData.currentPillarX === blockLocation.x &&
        pData.currentPillarZ === blockLocation.z &&
        blockLocation.y === pData.lastPillarBaseY + pData.consecutivePillarBlocks && // Correct Y sequence for upward pillar
        (currentTick - pData.lastPillarTick <= config.towerMaxTickGap)) {
        // Continuing an existing pillar
        pData.consecutivePillarBlocks++;
        pData.lastPillarTick = currentTick;
    } else {
        // Not continuing a recognized pillar, or gap too long. Start new pillar tracking.
        // Check if this placement is directly under the player's feet to qualify as a new pillar base.
        const playerFeetY = Math.floor(player.location.y);

        // Condition: Player is standing on or near the column of the block they just placed
        // and the block is at their feet level or one below (common for jump-placing).
        if (blockLocation.x === Math.floor(player.location.x) &&
            blockLocation.z === Math.floor(player.location.z) &&
            (blockLocation.y === playerFeetY -1 || blockLocation.y === playerFeetY -2)
        ) {
            pData.consecutivePillarBlocks = 1;
            pData.lastPillarBaseY = blockLocation.y;
            pData.lastPillarTick = currentTick;
            pData.currentPillarX = blockLocation.x;
            pData.currentPillarZ = blockLocation.z;
            if (pData.isWatched && playerUtils.debugLog) {
                 playerUtils.debugLog(\`TowerCheck: Started new pillar tracking for \${player.nameTag} at \${blockLocation.x},\${blockLocation.y},\${blockLocation.z}. Pitch: \${pitch.toFixed(1)}\`, watchedPrefix);
            }
        } else {
             // Placement does not look like a new pillar base directly under player, reset.
            pData.consecutivePillarBlocks = 0;
            pData.lastPillarTick = 0; // Reset lastPillarTick as well
            pData.currentPillarX = null;
            pData.currentPillarZ = null;
            // No need to reset lastPillarBaseY here, it's only relevant when a pillar is active.
        }
    }

    if (pData.consecutivePillarBlocks >= config.towerMinHeight) {
        // Unusual look angle: pitch > towerMaxPitchWhilePillaring means looking too far up/ahead.
        // Vanilla players usually look down (e.g. pitch -60 to -90) when pillaring.
        // config.towerMaxPitchWhilePillaring is likely a negative value like -30 or -45.
        // So, if current pitch is -20, it's > -30, meaning "less downward" / "more upward" than threshold.
        if (pitch > config.towerMaxPitchWhilePillaring) {
            const dependencies = { config, playerDataManager, playerUtils, logManager };
            const violationDetails = {
                height: pData.consecutivePillarBlocks,
                pitch: pitch.toFixed(1),
                pitchThreshold: config.towerMaxPitchWhilePillaring,
                x: blockLocation.x,
                y: blockLocation.y,
                z: blockLocation.z
            };
            await executeCheckAction(player, "world_tower_build", violationDetails, dependencies);
            if (pData.isWatched && playerUtils.debugLog) {
                playerUtils.debugLog(\`TowerCheck: Flagged \${player.nameTag} for tower height \${pData.consecutivePillarBlocks} with pitch \${pitch.toFixed(1)} (Threshold: >\${config.towerMaxPitchWhilePillaring}).\`, watchedPrefix);
            }
            // Reset after flagging to prevent immediate re-flags for the same continuous pillar.
            pData.consecutivePillarBlocks = 0;
            pData.lastPillarTick = 0;
            pData.currentPillarX = null;
            pData.currentPillarZ = null;
        } else {
            if (pData.isWatched && playerUtils.debugLog) {
                 playerUtils.debugLog(\`TowerCheck: Tower detected for \${player.nameTag} (height \${pData.consecutivePillarBlocks}), but pitch \${pitch.toFixed(1)} is okay (Threshold: >\${config.towerMaxPitchWhilePillaring}).\`, watchedPrefix);
            }
        }
    }
}

/**
 * Checks for downward scaffolding behavior.
 * @param {mc.Player} player The player instance.
 * @param {import('../../core/playerDataManager.js').PlayerAntiCheatData} pData Player-specific anti-cheat data.
 * @param {mc.Block} block The block that was just placed.
 * @param {object} config The configuration object.
 * @param {object} playerUtils Utility functions for players.
 * @param {object} playerDataManager Manager for player data.
 * @param {object} logManager Manager for logging.
 * @param {function} executeCheckAction Function to execute defined actions for a check.
 * @param {number} currentTick The current game tick.
 */
export async function checkDownwardScaffold(player, pData, block, config, playerUtils, playerDataManager, logManager, executeCheckAction, currentTick) {
    if (!config.enableDownwardScaffoldCheck || player.isOnGround) return;

    const watchedPrefix = pData.isWatched ? player.nameTag : null;
    const blockLocation = block.location;
    const velocity = player.getVelocity();
    const horizontalSpeed = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z);

    let isContinuingSequence = false;
    if (pData.lastDownwardScaffoldBlockLocation &&
        (currentTick - pData.lastDownwardScaffoldTick <= config.downwardScaffoldMaxTickGap) &&
        blockLocation.y < pData.lastDownwardScaffoldBlockLocation.y &&
        Math.abs(blockLocation.x - player.location.x) < 2 && // Block placed reasonably under player
        Math.abs(blockLocation.z - player.location.z) < 2) {
        isContinuingSequence = true;
    }

    if (isContinuingSequence) {
        pData.consecutiveDownwardBlocks++;
    } else {
        // Reset or start new sequence if current placement could be a start
        // For downward scaffold, any airborne placement could be a start if other conditions met later.
        pData.consecutiveDownwardBlocks = 1;
    }

    pData.lastDownwardScaffoldTick = currentTick;
    pData.lastDownwardScaffoldBlockLocation = { x: blockLocation.x, y: blockLocation.y, z: blockLocation.z };

    if (pData.consecutiveDownwardBlocks >= config.downwardScaffoldMinBlocks &&
        horizontalSpeed >= config.downwardScaffoldMinHorizontalSpeed) {

        const dependencies = { config, playerDataManager, playerUtils, logManager };
        const violationDetails = {
            count: pData.consecutiveDownwardBlocks,
            hSpeed: horizontalSpeed.toFixed(2),
            minHSpeed: config.downwardScaffoldMinHorizontalSpeed,
            x: blockLocation.x,
            y: blockLocation.y,
            z: blockLocation.z
        };
        await executeCheckAction(player, "world_downward_scaffold", violationDetails, dependencies);

        if (pData.isWatched && playerUtils.debugLog) {
            playerUtils.debugLog(\`DownwardScaffold: Flagged \${player.nameTag}. Blocks: \${pData.consecutiveDownwardBlocks}, Speed: \${horizontalSpeed.toFixed(2)}\`, watchedPrefix);
        }

        // Reset after flagging to prevent immediate re-flags for the same sequence
        pData.consecutiveDownwardBlocks = 0;
        pData.lastDownwardScaffoldBlockLocation = null;
        // lastDownwardScaffoldTick will be updated by the next placement, so no need to reset to 0 here.
    }
}

/**
 * Checks for flat or static rotation while building.
 * This function assumes pData.recentBlockPlacements is populated by the event that calls this check (e.g. from checkTower or directly from block place handler).
 * @param {mc.Player} player The player instance.
 * @param {import('../../core/playerDataManager.js').PlayerAntiCheatData} pData Player-specific anti-cheat data.
 * @param {object} config The configuration object.
 * @param {object} playerUtils Utility functions for players.
 * @param {object} playerDataManager Manager for player data.
 * @param {object} logManager Manager for logging.
 * @param {function} executeCheckAction Function to execute defined actions for a check.
 * @param {number} currentTick The current game tick (optional, might not be needed if relying on placement data ticks).
 */
export async function checkFlatRotationBuilding(player, pData, config, playerUtils, playerDataManager, logManager, executeCheckAction, currentTick) {
    if (!config.enableFlatRotationCheck) return;
    if (!pData.recentBlockPlacements || pData.recentBlockPlacements.length < config.flatRotationConsecutiveBlocks) return;

    const watchedPrefix = pData.isWatched ? player.nameTag : null;
    const relevantPlacements = pData.recentBlockPlacements.slice(-config.flatRotationConsecutiveBlocks);

    let minPitch = 91, maxPitch = -91;
    // Yaw values are typically -180 to 180.
    // For simple range check, this initialization is okay, but variance calculation needs care.

    let allPitchesInHorizontalRange = true;
    let allPitchesInDownwardRange = true;

    for (const placement of relevantPlacements) {
        if (placement.pitch < minPitch) minPitch = placement.pitch;
        if (placement.pitch > maxPitch) maxPitch = placement.pitch;
        // Min/max for yaw for simple range is less reliable due to wrap-around.
        // The static yaw check below is more robust.

        if (!(placement.pitch >= config.flatRotationPitchHorizontalMin && placement.pitch <= config.flatRotationPitchHorizontalMax)) {
            allPitchesInHorizontalRange = false;
        }
        if (!(placement.pitch >= config.flatRotationPitchDownwardMin && placement.pitch <= config.flatRotationPitchDownwardMax)) {
            allPitchesInDownwardRange = false;
        }
    }

    const pitchVariance = maxPitch - minPitch;

    // Static Yaw Check: Check if all yaw values in the window are close to the first one.
    const firstYaw = relevantPlacements[0].yaw;
    let isYawEffectivelyStatic = true; // Assume static until proven otherwise
    let maxIndividualYawDiff = 0;

    for (let i = 1; i < relevantPlacements.length; i++) {
        let diff = Math.abs(relevantPlacements[i].yaw - firstYaw);
        if (diff > 180) diff = 360 - diff; // Handle wrap-around (e.g., -170 vs 170 should be 20 deg diff)
        if (diff > maxIndividualYawDiff) maxIndividualYawDiff = diff;

        if (diff > config.flatRotationMaxYawVariance) {
            isYawEffectivelyStatic = false;
            // No need to break; continue to calculate maxIndividualYawDiff for logging,
            // but we already know it's not "static" by this definition.
        }
    }
    // If only one placement in window (relevantPlacements.length === 1, though check above requires >= flatRotationConsecutiveBlocks)
    // then maxIndividualYawDiff would be 0. isYawEffectivelyStatic remains true.
    if (relevantPlacements.length === 1 && config.flatRotationConsecutiveBlocks === 1) {
        isYawEffectivelyStatic = true; // A single placement is "static" relative to itself.
        maxIndividualYawDiff = 0;
    } else if (relevantPlacements.length > 1) {
        // isYawEffectivelyStatic is determined by loop
    } else { // Should not happen due to guard clause
        isYawEffectivelyStatic = false;
    }


    const isStaticPitch = pitchVariance <= config.flatRotationMaxPitchVariance;
    const isStaticYaw = isYawEffectivelyStatic; // Using the refined check

    let detectionDetail = "";
    let shouldFlag = false;

    if (isStaticPitch && isStaticYaw) {
        detectionDetail = "Static Pitch & Yaw";
        shouldFlag = true;
    } else if (isStaticPitch) {
        detectionDetail = "Static Pitch";
        shouldFlag = true;
    } else if (isStaticYaw) {
        detectionDetail = "Static Yaw";
        shouldFlag = true;
    } else if (allPitchesInHorizontalRange && relevantPlacements.length >= config.flatRotationConsecutiveBlocks) {
        detectionDetail = "Flat Horizontal Pitch";
        shouldFlag = true;
    } else if (allPitchesInDownwardRange && relevantPlacements.length >= config.flatRotationConsecutiveBlocks) {
        detectionDetail = "Flat Downward Pitch";
        shouldFlag = true;
    }

    if (shouldFlag) {
        const dependencies = { config, playerDataManager, playerUtils, logManager };
        const violationDetails = {
            pitchVariance: pitchVariance.toFixed(1),
            yawMaxDifference: maxIndividualYawDiff.toFixed(1), // Report the max difference found
            isYawConsideredStatic: isStaticYaw,
            details: detectionDetail,
            analyzedBlockCount: relevantPlacements.length,
            minPitchObserved: minPitch.toFixed(1),
            maxPitchObserved: maxPitch.toFixed(1)
        };
        await executeCheckAction(player, "world_flat_rotation_building", violationDetails, dependencies);
        if (pData.isWatched && playerUtils.debugLog) {
            playerUtils.debugLog(\`FlatRotationCheck: Flagged \${player.nameTag} for \${detectionDetail}. PitchVar: \${pitchVariance.toFixed(1)}, YawMaxDiff: \${maxIndividualYawDiff.toFixed(1)}, YawStatic: \${isStaticYaw}\`, watchedPrefix);
        }
    }
}
