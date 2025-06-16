/**
 * @file AntiCheatsBP/scripts/checks/world/buildingChecks.js
 * Implements various checks related to player building activities, such as Tower, FastPlace,
 * AirPlace (scaffolding), Downward Scaffold, and Flat/Static Rotation Building.
 * @version 1.0.2
 */

import * as mc from '@minecraft/server';
import { getString } from '../../../core/i18n.js'; // Corrected import path

/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').Config} Config
 * @typedef {import('../../types.js').PlayerUtils} PlayerUtils
 * @typedef {import('../../types.js').PlayerDataManager} PlayerDataManager
 * @typedef {import('../../types.js').LogManager} LogManager
 * @typedef {import('../../types.js').ExecuteCheckAction} ExecuteCheckAction
 * @typedef {mc.PlayerPlaceBlockBeforeEvent | mc.ItemUseOnBeforeEvent} PlaceEventData
 */

/**
 * Checks for tower-like upward building (pillaring straight up quickly with suspicious look angles).
 * Manages `pData.recentBlockPlacements` for this and potentially other building checks.
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

    pData.recentBlockPlacements = pData.recentBlockPlacements || [];
    const newPlacement = {
        x: blockLocation.x, y: blockLocation.y, z: blockLocation.z,
        typeId: block.typeId,
        pitch: pitch, yaw: rotation.y, tick: currentTick
    };
    pData.recentBlockPlacements.push(newPlacement);
    if (pData.recentBlockPlacements.length > (config.towerPlacementHistoryLength ?? 20)) {
        pData.recentBlockPlacements.shift();
    }
    pData.isDirtyForSave = true;

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
        await executeCheckAction(player, "worldTowerBuild", violationDetails, dependencies);
        playerUtils.debugLog?.(`TowerCheck: Flagged ${player.nameTag} for tower height ${pData.consecutivePillarBlocks} with pitch ${pitch.toFixed(1)} (Threshold: >${maxPitch}).`, watchedPrefix);
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
 * Checks for overly fast block placement.
 */
export async function checkFastPlace(
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
        await executeCheckAction(player, "worldFastPlace", violationDetails, dependencies);
        const watchedPrefix = pData.isWatched ? player.nameTag : null;
        playerUtils.debugLog?.(`FastPlace: Flagged ${player.nameTag}. Placed ${pData.recentPlaceTimestamps.length} blocks in ${windowMs}ms.`, watchedPrefix);
    }
}

/**
 * Checks for blocks placed against air or liquid without proper solid adjacent support.
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
    const { itemStack, faceLocation, blockLocation } = eventData;
    if (!itemStack || !faceLocation || !blockLocation) {
        playerUtils.debugLog?.(`AirPlaceCheck: Event data missing itemStack, faceLocation, or blockLocation for ${player.nameTag}.`, pData.isWatched ? player.nameTag : null);
        return;
    }
    const placedBlockTypeId = itemStack.typeId;
    const solidBlocksList = config.airPlaceSolidBlocks ?? [];
    if (!solidBlocksList.includes(placedBlockTypeId)) {
        return;
    }
    const dimension = player.dimension;
    const targetBlock = dimension.getBlock(faceLocation);
    if (!targetBlock) {
        playerUtils.debugLog?.(`AirPlaceCheck: Target block at faceLocation ${JSON.stringify(faceLocation)} is undefined for ${player.nameTag}.`, pData.isWatched ? player.nameTag : null);
        return;
    }
    if (targetBlock.isAir || targetBlock.isLiquid) {
        const neighborOffsets = [
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
                targetFaceType: targetBlock.typeId
            };
            await executeCheckAction(player, "worldAirPlace", violationDetails, dependencies);
            playerUtils.debugLog?.(`AirPlaceCheck: Flagged ${player.nameTag} for placing ${placedBlockTypeId} against ${targetBlock.typeId} at (${blockLocation.x},${blockLocation.y},${blockLocation.z}) without other solid support.`, pData.isWatched ? player.nameTag : null);
        }
    }
}

/**
 * Checks for downward scaffolding behavior.
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
        if (pData && player.isOnGround) {
            if (pData.consecutiveDownwardBlocks && pData.consecutiveDownwardBlocks > 0) pData.isDirtyForSave = true;
            pData.consecutiveDownwardBlocks = 0;
            pData.lastDownwardScaffoldBlockLocation = null;
        }
        return;
    }
    const watchedPrefix = pData.isWatched ? player.nameTag : null;
    const blockLocation = block.location;
    const velocity = player.getVelocity();
    const horizontalSpeed = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z);
    const horizontalSpeedBPS = horizontalSpeed * 20;
    let isContinuingSequence = false;
    const maxTickGap = config.downwardScaffoldMaxTickGap ?? 10;
    if (pData.lastDownwardScaffoldBlockLocation &&
        (currentTick - (pData.lastDownwardScaffoldTick ?? 0) <= maxTickGap) &&
        blockLocation.y < pData.lastDownwardScaffoldBlockLocation.y &&
        Math.abs(blockLocation.x - Math.floor(player.location.x)) < 2 &&
        Math.abs(blockLocation.z - Math.floor(player.location.z)) < 2) {
        isContinuingSequence = true;
    }
    if (isContinuingSequence) {
        pData.consecutiveDownwardBlocks = (pData.consecutiveDownwardBlocks ?? 0) + 1;
    } else {
        pData.consecutiveDownwardBlocks = 1;
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
        await executeCheckAction(player, "worldDownwardScaffold", violationDetails, dependencies);
        playerUtils.debugLog?.(`DownwardScaffold: Flagged ${player.nameTag}. Blocks: ${pData.consecutiveDownwardBlocks}, Speed: ${horizontalSpeedBPS.toFixed(2)} BPS`, watchedPrefix);
        pData.consecutiveDownwardBlocks = 0;
        pData.lastDownwardScaffoldBlockLocation = null;
        pData.isDirtyForSave = true;
    }
}

/**
 * Checks for building with flat or static camera rotation.
 */
export async function checkFlatRotationBuilding(
    player,
    pData,
    config,
    playerUtils,
    playerDataManager,
    logManager,
    executeCheckAction,
    currentTick
) {
    if (!config.enableFlatRotationCheck || !pData) { return; }
    const consecutiveBlocksToAnalyze = config.flatRotationConsecutiveBlocks ?? 4;
    if (!pData.recentBlockPlacements || pData.recentBlockPlacements.length < consecutiveBlocksToAnalyze) {
        return;
    }
    const watchedPrefix = pData.isWatched ? player.nameTag : null;
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
            if (diff > 180) diff = 360 - diff;
            if (diff > maxIndividualYawDifference) maxIndividualYawDifference = diff;
            if (diff > (config.flatRotationMaxYawVariance ?? 2.0)) {
                yawIsEffectivelyStatic = false;
            }
        }
    } else {
        yawIsEffectivelyStatic = (consecutiveBlocksToAnalyze === 1);
    }
    const pitchIsStatic = pitchVariance <= (config.flatRotationMaxPitchVariance ?? 2.0);
    let detectionReasonKey = "";
    let shouldFlag = false;
    if (pitchIsStatic && yawIsEffectivelyStatic) {
        detectionReasonKey = "check.flatRotation.reason.staticPitchYaw"; shouldFlag = true;
    } else if (pitchIsStatic) {
        detectionReasonKey = "check.flatRotation.reason.staticPitch"; shouldFlag = true;
    } else if (yawIsEffectivelyStatic) {
        detectionReasonKey = "check.flatRotation.reason.staticYaw"; shouldFlag = true;
    } else if (allPitchesInHorizontalRange) {
        detectionReasonKey = "check.flatRotation.reason.flatHorizontal"; shouldFlag = true;
    } else if (allPitchesInDownwardRange) {
        detectionReasonKey = "check.flatRotation.reason.flatDownward"; shouldFlag = true;
    }
    if (shouldFlag) {
        const localizedDetectionReason = getString(detectionReasonKey);
        const dependencies = { config, playerDataManager, playerUtils, logManager };
        const violationDetails = {
            pitchVariance: pitchVariance.toFixed(1),
            yawMaxDifferenceFromFirst: maxIndividualYawDifference.toFixed(1),
            isYawConsideredStatic: yawIsEffectivelyStatic.toString(),
            detectionReason: localizedDetectionReason,
            analyzedBlockCount: relevantPlacements.length.toString(),
            minPitchObserved: minObservedPitch.toFixed(1),
            maxPitchObserved: maxObservedPitch.toFixed(1)
        };
        await executeCheckAction(player, "worldFlatRotationBuilding", violationDetails, dependencies);
        playerUtils.debugLog?.(`FlatRotationCheck: Flagged ${player.nameTag} for ${localizedDetectionReason}. PitchVar: ${pitchVariance.toFixed(1)}, YawMaxDiff: ${maxIndividualYawDifference.toFixed(1)}, YawStatic: ${yawIsEffectivelyStatic}`, watchedPrefix);
    }
}

/**
 * Checks for block spamming based on placement rate.
 */
export async function checkBlockSpam(
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
    if (!config.enableBlockSpamAntiGrief || !pData) {
        return;
    }
    if (config.blockSpamBypassInCreative && player.gameMode === mc.GameMode.creative) {
        return;
    }
    pData.recentBlockSpamTimestamps = pData.recentBlockSpamTimestamps || [];
    const blockType = block.typeId;
    if (config.blockSpamMonitoredBlockTypes &&
        config.blockSpamMonitoredBlockTypes.length > 0 &&
        !config.blockSpamMonitoredBlockTypes.includes(blockType)) {
        return;
    }
    const currentTime = Date.now();
    pData.recentBlockSpamTimestamps.push(currentTime);
    pData.isDirtyForSave = true;
    const windowMs = config.blockSpamTimeWindowMs || 1000;
    const originalCount = pData.recentBlockSpamTimestamps.length;
    pData.recentBlockSpamTimestamps = pData.recentBlockSpamTimestamps.filter(
        ts => (currentTime - ts) <= windowMs
    );
    if (pData.recentBlockSpamTimestamps.length !== originalCount) {
        pData.isDirtyForSave = true;
    }
    const maxBlocks = config.blockSpamMaxBlocksInWindow || 8;
    if (pData.recentBlockSpamTimestamps.length > maxBlocks) {
        const actionDependencies = { config, playerDataManager, playerUtils, logManager };
        const violationDetails = {
            playerName: player.nameTag,
            count: pData.recentBlockSpamTimestamps.length.toString(),
            maxBlocks: maxBlocks.toString(),
            windowMs: windowMs.toString(),
            blockType: blockType,
            actionTaken: config.blockSpamAction
        };
        await executeCheckAction(player, "worldAntigriefBlockspam", violationDetails, actionDependencies);
        playerUtils.debugLog?.(`BlockSpam: Flagged ${player.nameTag}. Placed ${pData.recentBlockSpamTimestamps.length} monitored blocks (${blockType}) in ${windowMs}ms. Action: ${config.blockSpamAction}`, pData.isWatched ? player.nameTag : null);
        pData.recentBlockSpamTimestamps = [];
        pData.isDirtyForSave = true;
    }
}

/**
 * Checks for high-density block spam.
 */
export async function checkBlockSpamDensity(
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
    if (!config.enableBlockSpamDensityCheck || !pData) {
        return;
    }
    if ((config.blockSpamBypassInCreative ?? true) && player.gameMode === mc.GameMode.creative) {
        return;
    }
    if (!pData.recentBlockPlacements || pData.recentBlockPlacements.length === 0) {
        return;
    }
    const R = config.blockSpamDensityCheckRadius ?? 1;
    const totalVolumeBlocks = Math.pow((2 * R + 1), 3);
    if (totalVolumeBlocks === 0) return;
    const newBlockLocation = block.location;
    let playerPlacedBlocksInVolumeCount = 0;
    const densityTimeWindow = config.blockSpamDensityTimeWindowTicks ?? 60;
    const monitoredTypes = config.blockSpamDensityMonitoredBlockTypes ?? [];
    for (const record of pData.recentBlockPlacements) {
        if (!record.typeId) continue;
        if ((currentTick - record.tick) > densityTimeWindow) {
            continue;
        }
        if (monitoredTypes.length > 0 && !monitoredTypes.includes(record.typeId)) {
            continue;
        }
        if (
            Math.abs(record.x - newBlockLocation.x) <= R &&
            Math.abs(record.y - newBlockLocation.y) <= R &&
            Math.abs(record.z - newBlockLocation.z) <= R
        ) {
            playerPlacedBlocksInVolumeCount++;
        }
    }
    const densityPercentage = (playerPlacedBlocksInVolumeCount / totalVolumeBlocks) * 100;
    const thresholdPercentage = config.blockSpamDensityThresholdPercentage ?? 70;
    if (densityPercentage > thresholdPercentage) {
        const actionDependencies = { config, playerDataManager, playerUtils, logManager };
        const violationDetails = {
            playerName: player.nameTag,
            densityPercentage: densityPercentage.toFixed(1),
            radius: R.toString(),
            countInVolume: playerPlacedBlocksInVolumeCount.toString(),
            totalVolumeBlocks: totalVolumeBlocks.toString(),
            blockType: block.typeId,
            actionTaken: config.blockSpamDensityAction ?? "warn"
        };
        await executeCheckAction(player, "worldAntigriefBlockspamDensity", violationDetails, actionDependencies);
        playerUtils.debugLog?.(`BlockSpamDensity: Flagged ${player.nameTag}. Density: ${densityPercentage.toFixed(1)}% in radius ${R} (Count: ${playerPlacedBlocksInVolumeCount}/${totalVolumeBlocks}). Block: ${block.typeId}. Action: ${config.blockSpamDensityAction}`, pData.isWatched ? player.nameTag : null);
    }
}
