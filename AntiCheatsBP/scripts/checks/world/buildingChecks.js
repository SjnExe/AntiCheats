/**
 * @file AntiCheatsBP/scripts/checks/world/buildingChecks.js
 * Implements various checks related to player building activities, such as Tower, FastPlace,
 * AirPlace (scaffolding), Downward Scaffold, and Flat/Static Rotation Building.
 * @version 1.0.1
 */

import * as mc from '@minecraft/server';

/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').Config} Config
 * @typedef {import('../../types.js').PlayerUtils} PlayerUtils
 * @typedef {import('../../types.js').PlayerDataManager} PlayerDataManager
 * @typedef {import('../../types.js').LogManager} LogManager
 * @typedef {import('../../types.js').ExecuteCheckAction} ExecuteCheckAction
 * @typedef {mc.PlayerPlaceBlockBeforeEvent | mc.ItemUseOnBeforeEvent} PlaceEventData
 * // A more generic type for events that can lead to block placement checks.
 * // Ensure eventData properties used are common or safely accessed.
 */

/**
 * Checks for tower-like upward building (pillaring straight up quickly with suspicious look angles).
 * Manages `pData.recentBlockPlacements` for this and potentially other building checks.
 * @param {mc.Player} player - The player instance.
 * @param {PlayerAntiCheatData} pData - Player-specific anti-cheat data.
 * @param {mc.Block} block - The block that was just placed.
 * @param {Config} config - The server configuration object.
 * @param {PlayerUtils} playerUtils - Utility functions for player interactions.
 * @param {PlayerDataManager} playerDataManager - Manager for player data.
 * @param {LogManager} logManager - Manager for logging.
 * @param {ExecuteCheckAction} executeCheckAction - Function to execute defined actions for a check.
 * @param {number} currentTick - The current game tick.
 * @returns {Promise<void>}
 */
export async function checkTower(
    player,
    pData,
    block,
    config,
    playerUtils,
    playerDataManager,
    logManager,
    executeCheckAction,
    currentTick
) {
    if (!config.enableTowerCheck || !pData) { return; }

    const watchedPrefix = pData.isWatched ? player.nameTag : null;
    const rotation = player.getRotation();
    const pitch = rotation.x;
    const blockLocation = block.location;

    // Initialize and manage recent block placements
    pData.recentBlockPlacements = pData.recentBlockPlacements || [];
    const newPlacement = {
        x: blockLocation.x, y: blockLocation.y, z: blockLocation.z,
        pitch: pitch, yaw: rotation.y, tick: currentTick
    };
    pData.recentBlockPlacements.push(newPlacement);
    if (pData.recentBlockPlacements.length > (config.towerPlacementHistoryLength ?? 20)) {
        pData.recentBlockPlacements.shift();
    }
    pData.isDirtyForSave = true;

    // Tower check logic
    const towerMaxGap = config.towerMaxTickGap ?? 10;
    if (pData.currentPillarX === blockLocation.x &&
        pData.currentPillarZ === blockLocation.z &&
        blockLocation.y === (pData.lastPillarBaseY ?? -1) + (pData.consecutivePillarBlocks ?? 0) &&
        (currentTick - (pData.lastPillarTick ?? 0) <= towerMaxGap)) {

        pData.consecutivePillarBlocks = (pData.consecutivePillarBlocks ?? 0) + 1;
        pData.lastPillarTick = currentTick;
    } else {
        const playerFeetY = Math.floor(player.location.y);
        const playerFeetX = Math.floor(player.location.x);
        const playerFeetZ = Math.floor(player.location.z);

        if (blockLocation.x === playerFeetX &&
            blockLocation.z === playerFeetZ &&
            (blockLocation.y === playerFeetY - 1 || blockLocation.y === playerFeetY - 2)) {

            pData.consecutivePillarBlocks = 1;
            pData.lastPillarBaseY = blockLocation.y;
            pData.lastPillarTick = currentTick;
            pData.currentPillarX = blockLocation.x;
            pData.currentPillarZ = blockLocation.z;
            playerUtils.debugLog?.(`TowerCheck: Started new pillar for ${player.nameTag} at ${blockLocation.x},${blockLocation.y},${blockLocation.z}. Pitch: ${pitch.toFixed(1)}`, watchedPrefix);
        } else {
            pData.consecutivePillarBlocks = 0;
            pData.lastPillarTick = 0;
            pData.currentPillarX = null;
            pData.currentPillarZ = null;
        }
    }
    pData.isDirtyForSave = true;

    const minHeight = config.towerMinHeight ?? 5;
    const maxPitch = config.towerMaxPitchWhilePillaring ?? -30;

    if ((pData.consecutivePillarBlocks ?? 0) >= minHeight && pitch > maxPitch) {
        const dependencies = { config, playerDataManager, playerUtils, logManager };
        const violationDetails = {
            height: (pData.consecutivePillarBlocks ?? 0).toString(),
            pitch: pitch.toFixed(1),
            pitchThreshold: maxPitch.toString(),
            x: blockLocation.x.toString(),
            y: blockLocation.y.toString(),
            z: blockLocation.z.toString()
        };
        await executeCheckAction(player, "world_tower_build", violationDetails, dependencies);
        playerUtils.debugLog?.(`TowerCheck: Flagged ${player.nameTag} for tower height ${pData.consecutivePillarBlocks} with pitch ${pitch.toFixed(1)} (Threshold: >${maxPitch}).`, watchedPrefix);

        // Reset after flagging
        pData.consecutivePillarBlocks = 0;
        pData.lastPillarTick = 0;
        pData.currentPillarX = null;
        pData.currentPillarZ = null;
        pData.isDirtyForSave = true;
    } else if (pData.isWatched && (pData.consecutivePillarBlocks ?? 0) >= minHeight && playerUtils.debugLog) {
        playerUtils.debugLog(`TowerCheck: Tower for ${player.nameTag} (height ${pData.consecutivePillarBlocks}), pitch ${pitch.toFixed(1)} OK (Threshold: >${maxPitch}).`, watchedPrefix);
    }
}

/**
 * Checks for overly fast block placement by tracking timestamps of recent placements.
 * @param {mc.Player} player - The player instance.
 * @param {PlayerAntiCheatData} pData - Player-specific anti-cheat data.
 * @param {mc.Block | null} block - The block that was just placed (used for context in violation details).
 * @param {Config} config - The server configuration object.
 * @param {PlayerUtils} playerUtils - Utility functions for player interactions.
 * @param {PlayerDataManager} playerDataManager - Manager for player data.
 * @param {LogManager} logManager - Manager for logging.
 * @param {ExecuteCheckAction} executeCheckAction - Function to execute defined actions for a check.
 * @param {number} currentTick - The current game tick (not directly used as check is timestamp-based).
 * @returns {Promise<void>}
 */
export async function checkFastPlace(
    player,
    pData,
    block, // block can be null if called from a context where it's not available
    config,
    playerUtils,
    playerDataManager,
    logManager,
    executeCheckAction,
    currentTick // Not directly used
) {
    if (!config.enableFastPlaceCheck || !pData) { return; }

    const currentTime = Date.now();
    pData.recentPlaceTimestamps = pData.recentPlaceTimestamps || [];
    pData.recentPlaceTimestamps.push(currentTime);
    pData.isDirtyForSave = true;

    const windowMs = config.fastPlaceTimeWindowMs ?? 1000;
    const originalCount = pData.recentPlaceTimestamps.length;
    pData.recentPlaceTimestamps = pData.recentPlaceTimestamps.filter(
        ts => (currentTime - ts) <= windowMs
    );
    if (pData.recentPlaceTimestamps.length !== originalCount) {
        pData.isDirtyForSave = true;
    }

    const maxBlocks = config.fastPlaceMaxBlocksInWindow ?? 10;
    if (pData.recentPlaceTimestamps.length > maxBlocks) {
        const dependencies = { config, playerDataManager, playerUtils, logManager };
        const violationDetails = {
            count: pData.recentPlaceTimestamps.length.toString(),
            windowMs: windowMs.toString(),
            maxBlocks: maxBlocks.toString(),
            blockType: block?.typeId ?? "unknown"
        };
        await executeCheckAction(player, "world_fast_place", violationDetails, dependencies);

        const watchedPrefix = pData.isWatched ? player.nameTag : null;
        playerUtils.debugLog?.(`FastPlace: Flagged ${player.nameTag}. Placed ${pData.recentPlaceTimestamps.length} blocks in ${windowMs}ms.`, watchedPrefix);
    }
}

/**
 * Checks for blocks placed against air or liquid without proper solid adjacent support (Scaffolding/AirPlace).
 * @param {mc.Player} player - The player instance.
 * @param {PlayerAntiCheatData} pData - Player-specific anti-cheat data.
 * @param {PlaceEventData} eventData - The event data from block placement (e.g., `PlayerPlaceBlockBeforeEvent`).
 *                                     Must have `itemStack`, `faceLocation`, `blockLocation`.
 * @param {Config} config - The server configuration object.
 * @param {PlayerUtils} playerUtils - Utility functions for player interactions.
 * @param {PlayerDataManager} playerDataManager - Manager for player data.
 * @param {LogManager} logManager - Manager for logging.
 * @param {ExecuteCheckAction} executeCheckAction - Function to execute defined actions for a check.
 * @returns {Promise<void>}
 */
export async function checkAirPlace(
    player,
    pData,
    eventData,
    config,
    playerUtils,
    playerDataManager,
    logManager,
    executeCheckAction
) {
    if (!config.enableAirPlaceCheck || !pData) { return; }

    const { itemStack, faceLocation, blockLocation } = eventData; // Destructure required properties
    if (!itemStack || !faceLocation || !blockLocation) {
        playerUtils.debugLog?.(`AirPlaceCheck: Event data missing itemStack, faceLocation, or blockLocation for ${player.nameTag}.`, pData.isWatched ? player.nameTag : null);
        return;
    }

    const placedBlockTypeId = itemStack.typeId;
    const solidBlocksList = config.airPlaceSolidBlocks ?? [];
    // For performance on very large lists, solidBlocksList could be a Set.
    if (!solidBlocksList.includes(placedBlockTypeId)) {
        return; // Not a block type we monitor for this check
    }

    const dimension = player.dimension;
    const targetBlock = dimension.getBlock(faceLocation); // Block being placed against

    if (!targetBlock) {
        playerUtils.debugLog?.(`AirPlaceCheck: Target block at faceLocation ${JSON.stringify(faceLocation)} is undefined for ${player.nameTag}.`, pData.isWatched ? player.nameTag : null);
        return;
    }

    // Check if placing on air or liquid
    if (targetBlock.isAir || targetBlock.isLiquid) {
        const neighborOffsets = [ // Relative to newBlockLocation
            { x: 0, y: -1, z: 0 }, { x: 1, y: 0, z: 0 }, { x: -1, y: 0, z: 0 },
            { x: 0, y: 0, z: 1 }, { x: 0, y: 0, z: -1 }
        ];

        let hasSolidSupport = false;
        for (const offset of neighborOffsets) {
            const neighborLoc = {
                x: blockLocation.x + offset.x,
                y: blockLocation.y + offset.y,
                z: blockLocation.z + offset.z
            };
            // The critical support must not be the air/liquid block itself that is being targeted.
            // So, if neighborLoc is the same as targetFaceLocation, it doesn't count as valid support here.
            if (neighborLoc.x === faceLocation.x && neighborLoc.y === faceLocation.y && neighborLoc.z === faceLocation.z) {
                continue;
            }

            const neighborBlock = dimension.getBlock(neighborLoc);
            if (neighborBlock && !neighborBlock.isAir && !neighborBlock.isLiquid) {
                hasSolidSupport = true;
                break;
            }
        }

        if (!hasSolidSupport) {
            const dependencies = { config, playerDataManager, playerUtils, logManager };
            const violationDetails = {
                blockType: placedBlockTypeId,
                x: blockLocation.x.toString(),
                y: blockLocation.y.toString(),
                z: blockLocation.z.toString(),
                targetFaceType: targetBlock.typeId // e.g., "minecraft:air"
            };
            await executeCheckAction(player, "world_air_place", violationDetails, dependencies);
            // eventData.cancel = true; // Consider cancelling based on action profile.

            playerUtils.debugLog?.(`AirPlaceCheck: Flagged ${player.nameTag} for placing ${placedBlockTypeId} against ${targetBlock.typeId} at (${blockLocation.x},${blockLocation.y},${blockLocation.z}) without other solid support.`, pData.isWatched ? player.nameTag : null);
        }
    }
}

/**
 * Checks for downward scaffolding behavior (placing blocks below while airborne and moving).
 * @param {mc.Player} player - The player instance.
 * @param {PlayerAntiCheatData} pData - Player-specific anti-cheat data.
 * @param {mc.Block} block - The block that was just placed.
 * @param {Config} config - The server configuration object.
 * @param {PlayerUtils} playerUtils - Utility functions for player interactions.
 * @param {PlayerDataManager} playerDataManager - Manager for player data.
 * @param {LogManager} logManager - Manager for logging.
 * @param {ExecuteCheckAction} executeCheckAction - Function to execute defined actions for a check.
 * @param {number} currentTick - The current game tick.
 * @returns {Promise<void>}
 */
export async function checkDownwardScaffold(
    player,
    pData,
    block,
    config,
    playerUtils,
    playerDataManager,
    logManager,
    executeCheckAction,
    currentTick
) {
    if (!config.enableDownwardScaffoldCheck || !pData || player.isOnGround) {
        // Reset if on ground, as sequence ends.
        if (pData && player.isOnGround) {
            if (pData.consecutiveDownwardBlocks && pData.consecutiveDownwardBlocks > 0) pData.isDirtyForSave = true;
            pData.consecutiveDownwardBlocks = 0;
            pData.lastDownwardScaffoldBlockLocation = null;
        }
        return;
    }

    const watchedPrefix = pData.isWatched ? player.nameTag : null;
    const blockLocation = block.location;
    const velocity = player.getVelocity(); // Real-time velocity
    const horizontalSpeed = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z); // Instantaneous horizontal speed (blocks/tick)
    const horizontalSpeedBPS = horizontalSpeed * 20; // Convert to blocks per second

    let isContinuingSequence = false;
    const maxTickGap = config.downwardScaffoldMaxTickGap ?? 10;

    if (pData.lastDownwardScaffoldBlockLocation &&
        (currentTick - (pData.lastDownwardScaffoldTick ?? 0) <= maxTickGap) &&
        blockLocation.y < pData.lastDownwardScaffoldBlockLocation.y && // Must be placing downwards
        Math.abs(blockLocation.x - Math.floor(player.location.x)) < 2 && // Block placed reasonably under player
        Math.abs(blockLocation.z - Math.floor(player.location.z)) < 2) {
        isContinuingSequence = true;
    }

    if (isContinuingSequence) {
        pData.consecutiveDownwardBlocks = (pData.consecutiveDownwardBlocks ?? 0) + 1;
    } else {
        // Reset or start new sequence if current placement could be a start
        pData.consecutiveDownwardBlocks = 1; // Any airborne downward placement starts a potential sequence
    }
    pData.lastDownwardScaffoldTick = currentTick;
    pData.lastDownwardScaffoldBlockLocation = { x: blockLocation.x, y: blockLocation.y, z: blockLocation.z };
    pData.isDirtyForSave = true;

    const minBlocks = config.downwardScaffoldMinBlocks ?? 3;
    const minHSpeed = config.downwardScaffoldMinHorizontalSpeed ?? 3.0;

    if ((pData.consecutiveDownwardBlocks ?? 0) >= minBlocks && horizontalSpeedBPS >= minHSpeed) {
        const dependencies = { config, playerDataManager, playerUtils, logManager };
        const violationDetails = {
            count: (pData.consecutiveDownwardBlocks ?? 0).toString(),
            horizontalSpeedBPS: horizontalSpeedBPS.toFixed(2),
            minHorizontalSpeedBPS: minHSpeed.toFixed(2),
            x: blockLocation.x.toString(),
            y: blockLocation.y.toString(),
            z: blockLocation.z.toString()
        };
        await executeCheckAction(player, "world_downward_scaffold", violationDetails, dependencies);
        playerUtils.debugLog?.(`DownwardScaffold: Flagged ${player.nameTag}. Blocks: ${pData.consecutiveDownwardBlocks}, Speed: ${horizontalSpeedBPS.toFixed(2)} BPS`, watchedPrefix);

        // Reset after flagging
        pData.consecutiveDownwardBlocks = 0;
        pData.lastDownwardScaffoldBlockLocation = null;
        // pData.lastDownwardScaffoldTick is fine, will be updated by next placement.
        pData.isDirtyForSave = true;
    }
}

/**
 * Checks for building with flat or static camera rotation, which can indicate certain cheats.
 * Relies on `pData.recentBlockPlacements` being populated by other checks (e.g., `checkTower`) or event handlers.
 * @param {mc.Player} player - The player instance.
 * @param {PlayerAntiCheatData} pData - Player-specific anti-cheat data.
 * @param {Config} config - The server configuration object.
 * @param {PlayerUtils} playerUtils - Utility functions for player interactions.
 * @param {PlayerDataManager} playerDataManager - Manager for player data.
 * @param {LogManager} logManager - Manager for logging.
 * @param {ExecuteCheckAction} executeCheckAction - Function to execute defined actions for a check.
 * @param {number} currentTick - The current game tick (not directly used if relying on placement data ticks).
 * @returns {Promise<void>}
 */
export async function checkFlatRotationBuilding(
    player,
    pData,
    config,
    playerUtils,
    playerDataManager,
    logManager,
    executeCheckAction,
    currentTick // Not directly used if recentBlockPlacements has tick data
) {
    if (!config.enableFlatRotationCheck || !pData) { return; }

    const consecutiveBlocksToAnalyze = config.flatRotationConsecutiveBlocks ?? 4;
    if (!pData.recentBlockPlacements || pData.recentBlockPlacements.length < consecutiveBlocksToAnalyze) {
        return;
    }

    const watchedPrefix = pData.isWatched ? player.nameTag : null;
    // Get the last N placements, where N is `consecutiveBlocksToAnalyze`
    const relevantPlacements = pData.recentBlockPlacements.slice(-consecutiveBlocksToAnalyze);

    let minObservedPitch = 91, maxObservedPitch = -91;
    let allPitchesInHorizontalRange = true;
    let allPitchesInDownwardRange = true;

    const horizontalMin = config.flatRotationPitchHorizontalMin ?? -5.0;
    const horizontalMax = config.flatRotationPitchHorizontalMax ?? 5.0;
    const downwardMin = config.flatRotationPitchDownwardMin ?? -90.0;
    const downwardMax = config.flatRotationPitchDownwardMax ?? -85.0;

    for (const placement of relevantPlacements) {
        if (placement.pitch < minObservedPitch) minObservedPitch = placement.pitch;
        if (placement.pitch > maxObservedPitch) maxObservedPitch = placement.pitch;

        if (!(placement.pitch >= horizontalMin && placement.pitch <= horizontalMax)) {
            allPitchesInHorizontalRange = false;
        }
        if (!(placement.pitch >= downwardMin && placement.pitch <= downwardMax)) {
            allPitchesInDownwardRange = false;
        }
    }

    const pitchVariance = maxObservedPitch - minObservedPitch;
    const firstYaw = relevantPlacements[0].yaw;
    let maxIndividualYawDifference = 0;
    let yawIsEffectivelyStatic = true;

    if (relevantPlacements.length > 1) {
        for (let i = 1; i < relevantPlacements.length; i++) {
            let diff = Math.abs(relevantPlacements[i].yaw - firstYaw);
            if (diff > 180) diff = 360 - diff; // Normalize yaw difference
            if (diff > maxIndividualYawDifference) maxIndividualYawDifference = diff;
            if (diff > (config.flatRotationMaxYawVariance ?? 2.0)) {
                yawIsEffectivelyStatic = false;
                // No break, continue to find maxIndividualYawDifference for details
            }
        }
    } else { // Only 1 placement, considered static relative to itself if consecutiveBlocksToAnalyze is 1
        yawIsEffectivelyStatic = (consecutiveBlocksToAnalyze === 1);
    }


    const pitchIsStatic = pitchVariance <= (config.flatRotationMaxPitchVariance ?? 2.0);

    let detectionReason = "";
    let shouldFlag = false;

    if (pitchIsStatic && yawIsEffectivelyStatic) {
        detectionReason = "Static Pitch & Yaw"; shouldFlag = true;
    } else if (pitchIsStatic) {
        detectionReason = "Static Pitch"; shouldFlag = true;
    } else if (yawIsEffectivelyStatic) {
        detectionReason = "Static Yaw"; shouldFlag = true;
    } else if (allPitchesInHorizontalRange) { // Check only if not static, to avoid redundant flags
        detectionReason = "Flat Horizontal Pitch Range"; shouldFlag = true;
    } else if (allPitchesInDownwardRange) { // Check only if not static, to avoid redundant flags
        detectionReason = "Flat Downward Pitch Range"; shouldFlag = true;
    }

    if (shouldFlag) {
        const dependencies = { config, playerDataManager, playerUtils, logManager };
        const violationDetails = {
            pitchVariance: pitchVariance.toFixed(1),
            yawMaxDifferenceFromFirst: maxIndividualYawDifference.toFixed(1),
            isYawConsideredStatic: yawIsEffectivelyStatic.toString(),
            detectionReason: detectionReason,
            analyzedBlockCount: relevantPlacements.length.toString(),
            minPitchObserved: minObservedPitch.toFixed(1),
            maxPitchObserved: maxObservedPitch.toFixed(1)
        };
        await executeCheckAction(player, "world_flat_rotation_building", violationDetails, dependencies);
        playerUtils.debugLog?.(`FlatRotationCheck: Flagged ${player.nameTag} for ${detectionReason}. PitchVar: ${pitchVariance.toFixed(1)}, YawMaxDiff: ${maxIndividualYawDifference.toFixed(1)}, YawStatic: ${yawIsEffectivelyStatic}`, watchedPrefix);
    }
    // This check reads pData but doesn't modify its state in a way that needs saving,
    // as recentBlockPlacements is managed by checkTower or another source.
}
