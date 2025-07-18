/**
 * @file Implements various checks related to player building activities, such as Tower, FastPlace,
 * @module AntiCheatsBP/scripts/checks/world/buildingChecks
 * AirPlace (scaffolding), Downward Scaffold, and Flat/Static Rotation Building, and Block Spam.
 */
import * as mc from '@minecraft/server';

// Default configuration values used if not provided in config.js
const defaultTowerPlacementHistoryLength = 20;
const defaultTowerMinHeight = 5;
const defaultTowerMaxPitchWhilePillaring = -30;
const ticksPerSecond = 20;
const defaultDownwardScaffoldMinBlocks = 3;
const defaultDownwardScaffoldMinHorizontalSpeed = 3.0;
const defaultFlatRotationConsecutiveBlocks = 4;
const initialMinObservedPitch = 91;
const initialMaxObservedPitch = -91;
const defaultFlatRotationPitchHorizontalMin = -5.0;
const defaultFlatRotationPitchHorizontalMax = 5.0;
const defaultFlatRotationPitchDownwardMin = -90.0;
const defaultFlatRotationPitchDownwardMax = -85.0;
const degreesHalfCircle = 180;
const degreesFullCircle = 360;
const defaultBlockSpamMaxBlocksInWindow = 8;
const defaultBlockSpamDensityTimeWindowTicks = 60;
const defaultBlockSpamDensityThresholdPercentage = 70;


/**
 * Checks for tower-like upward building (pillaring straight up with suspicious pitch).
 * This function is typically called from a `PlayerPlaceBlockAfterEvent` handler.
 * @async
 * @param {mc.Player} player - The player who placed the block.
 * @param {import('../../types.js').PlayerAntiCheatData} pData - Player-specific anti-cheat data.
 * @param {import('../../types.js').Dependencies} dependencies - Shared dependencies.
 * @param {import('../../types.js').EventSpecificData} eventSpecificData - Expects `block` (the placed mc.Block).
 * @returns {Promise<void>}
 */
export async function checkTower(player, pData, dependencies, eventSpecificData) {
    const { config, playerUtils, actionManager, currentTick } = dependencies;
    const block = eventSpecificData?.block;

    if (!config.enableTowerCheck || !pData || !block) {
        return;
    }

    const watchedPrefix = pData.isWatched ? player.nameTag : null;
    const rotation = player.getRotation();
    const pitch = rotation.x;
    const blockLocation = block.location;

    pData.recentBlockPlacements = pData.recentBlockPlacements || [];
    const newPlacement = {
        x: blockLocation.x,
        y: blockLocation.y,
        z: blockLocation.z,
        typeId: block.typeId,
        pitch,
        yaw: rotation.y,
        tick: currentTick,
    };
    pData.recentBlockPlacements.push(newPlacement);
    if (pData.recentBlockPlacements.length > (config.towerPlacementHistoryLength ?? defaultTowerPlacementHistoryLength)) {
        pData.recentBlockPlacements.shift();
    }
    pData.isDirtyForSave = true;

    const towerMaxGapTicks = config.towerMaxTickGap ?? 10;

    if (
        pData.currentPillarX === blockLocation.x &&
        pData.currentPillarZ === blockLocation.z &&
        blockLocation.y === (pData.lastPillarBaseY ?? -Infinity) + (pData.consecutivePillarBlocks ?? 0) &&
        (currentTick - (pData.lastPillarTick ?? 0) <= towerMaxGapTicks)
    ) {
        pData.consecutivePillarBlocks = (pData.consecutivePillarBlocks ?? 0) + 1;
        pData.lastPillarTick = currentTick;
    } else {
        const playerFeetY = Math.floor(player.location.y);
        const playerFeetX = Math.floor(player.location.x);
        const playerFeetZ = Math.floor(player.location.z);

        if (
            blockLocation.x === playerFeetX && blockLocation.z === playerFeetZ &&
            (blockLocation.y === playerFeetY - 1 || blockLocation.y === playerFeetY - 2)
        ) {
            pData.consecutivePillarBlocks = 1;
            pData.lastPillarBaseY = blockLocation.y;
            pData.lastPillarTick = currentTick;
            pData.currentPillarX = blockLocation.x;
            pData.currentPillarZ = blockLocation.z;
            if (pData.isWatched) {
                playerUtils.debugLog(`[TowerCheck] Started new pillar for ${player.nameTag} at ${blockLocation.x},${blockLocation.y},${blockLocation.z}. Pitch: ${pitch.toFixed(1)}`, watchedPrefix, dependencies);
            }
        } else {
            pData.consecutivePillarBlocks = 0;
            pData.lastPillarTick = 0;
            pData.currentPillarX = null;
            pData.currentPillarZ = null;
            pData.lastPillarBaseY = -Infinity;
        }
    }
    pData.isDirtyForSave = true;

    const minHeight = config.towerMinHeight ?? defaultTowerMinHeight;
    const maxPitchValue = config.towerMaxPitchWhilePillaring ?? defaultTowerMaxPitchWhilePillaring;

    if ((pData.consecutivePillarBlocks ?? 0) >= minHeight && pitch > maxPitchValue) {
        const violationDetails = {
            height: (pData.consecutivePillarBlocks ?? 0).toString(),
            pitch: pitch.toFixed(1),
            pitchThreshold: maxPitchValue.toString(),
            x: blockLocation.x.toString(),
            y: blockLocation.y.toString(),
            z: blockLocation.z.toString(),
        };
        const actionProfileKey = config.towerBuildActionProfileName ?? 'worldTowerBuild';
        await actionManager.executeCheckAction(player, actionProfileKey, violationDetails, dependencies);
        playerUtils.debugLog(`[TowerCheck] Flagged ${player.nameTag} for tower height ${pData.consecutivePillarBlocks} with pitch ${pitch.toFixed(1)} (Threshold: >${maxPitchValue}).`, watchedPrefix, dependencies);
        pData.consecutivePillarBlocks = 0;
        pData.lastPillarTick = 0;
        pData.currentPillarX = null;
        pData.currentPillarZ = null;
        pData.lastPillarBaseY = -Infinity;
        pData.isDirtyForSave = true;
    } else if (pData.isWatched && (pData.consecutivePillarBlocks ?? 0) >= minHeight) {
        playerUtils.debugLog(`[TowerCheck] Tower for ${player.nameTag} (height ${pData.consecutivePillarBlocks}), pitch ${pitch.toFixed(1)} OK (Threshold: >${maxPitchValue}).`, watchedPrefix, dependencies);
    }
}

/**
 * Checks for overly fast block placement rate.
 * This function is typically called from a `PlayerPlaceBlockAfterEvent` handler.
 * @async
 * @param {mc.Player} player - The player who placed the block.
 * @param {import('../../types.js').PlayerAntiCheatData} pData - Player-specific anti-cheat data.
 * @param {import('../../types.js').Dependencies} dependencies - Shared dependencies.
 * @param {import('../../types.js').EventSpecificData} eventSpecificData - Expects `block` (the placed mc.Block).
 * @returns {Promise<void>}
 */
export async function checkFastPlace(player, pData, dependencies, eventSpecificData) {
    const { config, playerUtils, actionManager } = dependencies;
    const block = eventSpecificData?.block;

    if (!config.enableFastPlaceCheck || !pData || !block) {
        return;
    }

    const currentTime = Date.now();
    pData.recentPlaceTimestamps = pData.recentPlaceTimestamps || [];
    pData.recentPlaceTimestamps.push(currentTime);
    pData.isDirtyForSave = true;

    const windowMs = config.fastPlaceTimeWindowMs ?? 1000;
    const originalCount = pData.recentPlaceTimestamps.length;
    pData.recentPlaceTimestamps = pData.recentPlaceTimestamps.filter(ts => (currentTime - ts) <= windowMs);
    if (pData.recentPlaceTimestamps.length !== originalCount) {
        pData.isDirtyForSave = true;
    }

    const maxBlocks = config.fastPlaceMaxBlocksInWindow ?? 10;
    if (pData.recentPlaceTimestamps.length > maxBlocks) {
        const violationDetails = {
            count: pData.recentPlaceTimestamps.length.toString(),
            windowMs: windowMs.toString(),
            maxBlocks: maxBlocks.toString(),
            blockType: block.typeId ?? 'unknown',
        };
        const actionProfileKey = config.fastPlaceActionProfileName ?? 'worldFastPlace';
        await actionManager.executeCheckAction(player, actionProfileKey, violationDetails, dependencies);
        playerUtils.debugLog(`[FastPlaceCheck] Flagged ${player.nameTag}. Placed ${pData.recentPlaceTimestamps.length} blocks in ${windowMs}ms.`, pData.isWatched ? player.nameTag : null, dependencies);
    }
}

/**
 * Checks for blocks placed against air or liquid without proper solid adjacent support (Scaffold/AirPlace).
 * This function is typically called from a `PlayerPlaceBlockBeforeEvent` or `ItemUseOnBeforeEvent` handler.
 * @async
 * @param {mc.Player} player - The player placing the block.
 * @param {import('../../types.js').PlayerAntiCheatData} pData - Player-specific anti-cheat data.
 * @param {import('../../types.js').Dependencies} dependencies - Shared dependencies.
 * @param {mc.PlayerPlaceBlockBeforeEvent | mc.ItemUseOnBeforeEvent} eventData - The original block place/use event data.
 * @returns {Promise<void>}
 */
export async function checkAirPlace(player, pData, dependencies, eventData) {
    const { config, playerUtils, actionManager } = dependencies;

    if (!config.enableAirPlaceCheck || !pData) {
        return;
    }

    const itemStack = eventData?.itemStack;
    const faceLocation = eventData?.faceLocation;
    let blockLocation = eventData?.blockLocation;

    if (!blockLocation && eventData?.block) {
        blockLocation = eventData.block.location;
    }

    if (!itemStack || !faceLocation || !blockLocation) {
        playerUtils.debugLog(`[AirPlaceCheck] Event data incomplete for ${player.nameTag}. ItemStack, FaceLocation, or BlockLocation missing.`, pData.isWatched ? player.nameTag : null, dependencies);
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
        playerUtils.debugLog(`[AirPlaceCheck] Target block at faceLocation (${faceLocation.x},${faceLocation.y},${faceLocation.z}) undefined for ${player.nameTag}.`, pData.isWatched ? player.nameTag : null, dependencies);
        return;
    }

    if (targetBlock.isAir || targetBlock.isLiquid) {
        const neighborOffsets = [
            { x: 0, y: -1, z: 0 }, { x: 1, y: 0, z: 0 }, { x: -1, y: 0, z: 0 },
            { x: 0, y: 0, z: 1 }, { x: 0, y: 0, z: -1 },
        ];
        let hasSolidSupport = false;
        for (const offset of neighborOffsets) {
            const neighborLoc = { x: blockLocation.x + offset.x, y: blockLocation.y + offset.y, z: blockLocation.z + offset.z };
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
            const violationDetails = {
                blockType: placedBlockTypeId,
                x: blockLocation.x.toString(),
                y: blockLocation.y.toString(),
                z: blockLocation.z.toString(),
                targetFaceType: targetBlock.typeId,
            };
            const actionProfileKey = config.airPlaceActionProfileName ?? 'worldAirPlace';

            const profile = dependencies.checkActionProfiles?.[actionProfileKey]; // Use dependencies.checkActionProfiles
            const shouldCancelEvent = profile?.cancelEvent;

            if (shouldCancelEvent) {
                eventData.cancel = true;
            }

            await actionManager.executeCheckAction(player, actionProfileKey, violationDetails, dependencies);
            playerUtils.debugLog(`[AirPlaceCheck] Flagged ${player.nameTag} for placing ${placedBlockTypeId} against ${targetBlock.typeId} at (${blockLocation.x},${blockLocation.y},${blockLocation.z}) without solid support.`, pData.isWatched ? player.nameTag : null, dependencies);
        }
    }
}

/**
 * Checks for downward scaffolding behavior (placing blocks below while airborne and moving).
 * This function is typically called from a `PlayerPlaceBlockAfterEvent` handler.
 * @async
 * @param {mc.Player} player - The player who placed the block.
 * @param {import('../../types.js').PlayerAntiCheatData} pData - Player-specific anti-cheat data.
 * @param {import('../../types.js').Dependencies} dependencies - Shared dependencies.
 * @param {import('../../types.js').EventSpecificData} eventSpecificData - Expects `block` (the placed mc.Block).
 * @returns {Promise<void>}
 */
export async function checkDownwardScaffold(player, pData, dependencies, eventSpecificData) {
    const { config, playerUtils, actionManager, currentTick } = dependencies;
    const block = eventSpecificData?.block;

    if (!config.enableDownwardScaffoldCheck || !pData || !block || player.isOnGround) {
        if (pData && player.isOnGround) {
            if (pData.consecutiveDownwardBlocks && pData.consecutiveDownwardBlocks > 0) {
                pData.isDirtyForSave = true;
            }
            pData.consecutiveDownwardBlocks = 0;
            pData.lastDownwardScaffoldBlockLocation = null;
        }
        return;
    }

    const watchedPrefix = pData.isWatched ? player.nameTag : null;
    const blockLocation = block.location;
    const velocity = player.getVelocity();
    const horizontalSpeedBPS = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z) * ticksPerSecond;

    let isContinuingSequence = false;
    const maxTickGap = config.downwardScaffoldMaxTickGap ?? 10;

    if (
        pData.lastDownwardScaffoldBlockLocation &&
        (currentTick - (pData.lastDownwardScaffoldTick ?? 0) <= maxTickGap) &&
        blockLocation.y < pData.lastDownwardScaffoldBlockLocation.y &&
        Math.abs(blockLocation.x - Math.floor(player.location.x)) < 2 &&
        Math.abs(blockLocation.z - Math.floor(player.location.z)) < 2
    ) {
        isContinuingSequence = true;
    }

    pData.consecutiveDownwardBlocks = isContinuingSequence ? (pData.consecutiveDownwardBlocks ?? 0) + 1 : 1;
    pData.lastDownwardScaffoldTick = currentTick;
    pData.lastDownwardScaffoldBlockLocation = { x: blockLocation.x, y: blockLocation.y, z: blockLocation.z };
    pData.isDirtyForSave = true;

    const minBlocks = config.downwardScaffoldMinBlocks ?? defaultDownwardScaffoldMinBlocks;
    const minHSpeed = config.downwardScaffoldMinHorizontalSpeed ?? defaultDownwardScaffoldMinHorizontalSpeed;

    if ((pData.consecutiveDownwardBlocks ?? 0) >= minBlocks && horizontalSpeedBPS >= minHSpeed) {
        const violationDetails = {
            count: (pData.consecutiveDownwardBlocks ?? 0).toString(),
            horizontalSpeedBPS: horizontalSpeedBPS.toFixed(2),
            minHorizontalSpeedBPS: minHSpeed.toFixed(2),
            x: blockLocation.x.toString(),
            y: blockLocation.y.toString(),
            z: blockLocation.z.toString(),
        };
        const actionProfileKey = config.downwardScaffoldActionProfileName ?? 'worldDownwardScaffold';
        await actionManager.executeCheckAction(player, actionProfileKey, violationDetails, dependencies);
        playerUtils.debugLog(`[DownwardScaffoldCheck] Flagged ${player.nameTag}. Blocks: ${pData.consecutiveDownwardBlocks}, Speed: ${horizontalSpeedBPS.toFixed(2)} BPS`, watchedPrefix, dependencies);
        pData.consecutiveDownwardBlocks = 0;
        pData.lastDownwardScaffoldBlockLocation = null;
        pData.isDirtyForSave = true;
    }
}

/**
 * Checks for building with flat or static camera rotation, which can indicate scaffold/tower cheats.
 * This check analyzes the pitch and yaw from `pData.recentBlockPlacements`.
 * This function is typically run on a tick-based interval.
 * @async
 * @param {mc.Player} player - The player instance.
 * @param {import('../../types.js').PlayerAntiCheatData} pData - Player-specific anti-cheat data.
 * @param {import('../../types.js').Dependencies} dependencies - Shared dependencies.
 * @returns {Promise<void>}
 */
export async function checkFlatRotationBuilding(player, pData, dependencies) {
    const { config, playerUtils, actionManager } = dependencies;

    if (!config.enableFlatRotationCheck || !pData) {
        return;
    }

    const consecutiveBlocksToAnalyze = config.flatRotationConsecutiveBlocks ?? defaultFlatRotationConsecutiveBlocks;
    if (!pData.recentBlockPlacements || pData.recentBlockPlacements.length < consecutiveBlocksToAnalyze) {
        return;
    }

    const watchedPrefix = pData.isWatched ? player.nameTag : null;
    const relevantPlacements = pData.recentBlockPlacements.slice(-consecutiveBlocksToAnalyze);

    let minObservedPitch = initialMinObservedPitch;
    let maxObservedPitch = initialMaxObservedPitch;
    let allPitchesInHorizontalRange = true;
    let allPitchesInDownwardRange = true;
    const horizontalMin = config.flatRotationPitchHorizontalMin ?? defaultFlatRotationPitchHorizontalMin;
    const horizontalMax = config.flatRotationPitchHorizontalMax ?? defaultFlatRotationPitchHorizontalMax;
    const downwardMin = config.flatRotationPitchDownwardMin ?? defaultFlatRotationPitchDownwardMin;
    const downwardMax = config.flatRotationPitchDownwardMax ?? defaultFlatRotationPitchDownwardMax;

    for (const placement of relevantPlacements) {
        if (placement.pitch < minObservedPitch) {
            minObservedPitch = placement.pitch;
        }
        if (placement.pitch > maxObservedPitch) {
            maxObservedPitch = placement.pitch;
        }
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
            if (diff > degreesHalfCircle) {
                diff = degreesFullCircle - diff;
            }
            if (diff > maxIndividualYawDifference) {
                maxIndividualYawDifference = diff;
            }
            if (diff > (config.flatRotationMaxYawVariance ?? 2.0)) {
                yawIsEffectivelyStatic = false;
            }
        }
    } else {
        yawIsEffectivelyStatic = (consecutiveBlocksToAnalyze === 1);
    }

    const pitchIsStatic = pitchVariance <= (config.flatRotationMaxPitchVariance ?? 2.0);
    let detectionReasonKey = '';
    let shouldFlag = false;

    if (pitchIsStatic && yawIsEffectivelyStatic) {
        detectionReasonKey = 'check.flatRotation.reason.staticPitchYaw';
        shouldFlag = true;
    } else if (pitchIsStatic) {
        detectionReasonKey = 'check.flatRotation.reason.staticPitch';
        shouldFlag = true;
    } else if (yawIsEffectivelyStatic) {
        detectionReasonKey = 'check.flatRotation.reason.staticYaw';
        shouldFlag = true;
    } else if (allPitchesInHorizontalRange) {
        detectionReasonKey = 'check.flatRotation.reason.flatHorizontal';
        shouldFlag = true;
    } else if (allPitchesInDownwardRange) {
        detectionReasonKey = 'check.flatRotation.reason.flatDownward';
        shouldFlag = true;
    }

    if (shouldFlag) {
        const detectionReasonString = detectionReasonKey.split('.').pop();
        const violationDetails = {
            pitchVariance: pitchVariance.toFixed(1),
            yawMaxDifferenceFromFirst: maxIndividualYawDifference.toFixed(1),
            isYawConsideredStatic: yawIsEffectivelyStatic.toString(),
            detectionReason: detectionReasonString,
            analyzedBlockCount: relevantPlacements.length.toString(),
            minPitchObserved: minObservedPitch.toFixed(1),
            maxPitchObserved: maxObservedPitch.toFixed(1),
        };
        const actionProfileKey = config.flatRotationBuildingActionProfileName ?? 'worldFlatRotationBuilding';
        await actionManager.executeCheckAction(player, actionProfileKey, violationDetails, dependencies);
        playerUtils.debugLog(`[FlatRotationCheck] Flagged ${player.nameTag} for ${detectionReasonString}. PitchVar: ${pitchVariance.toFixed(1)}, YawMaxDiff: ${maxIndividualYawDifference.toFixed(1)}, YawStatic: ${yawIsEffectivelyStatic}`, watchedPrefix, dependencies);
    }
}

/**
 * Checks for block spamming based on placement rate for monitored block types.
 * Typically called from `PlayerPlaceBlockAfterEvent`.
 * @async
 * @param {mc.Player} player - The player who placed the block.
 * @param {import('../../types.js').PlayerAntiCheatData} pData - Player-specific anti-cheat data.
 * @param {import('../../types.js').Dependencies} dependencies - Shared dependencies.
 * @param {import('../../types.js').EventSpecificData} eventSpecificData - Expects `block` (the placed mc.Block).
 * @returns {Promise<void>}
 */
export async function checkBlockSpam(player, pData, dependencies, eventSpecificData) {
    const { config, playerUtils, actionManager } = dependencies;
    const block = eventSpecificData?.block;

    if (!config.enableBlockSpamAntiGrief || !pData || !block) {
        return;
    }
    if (config.blockSpamBypassInCreative && player.gameMode === mc.GameMode.creative) {
        return;
    }

    pData.recentBlockSpamTimestamps = pData.recentBlockSpamTimestamps || [];
    const blockType = block.typeId;

    if (
        config.blockSpamMonitoredBlockTypes && config.blockSpamMonitoredBlockTypes.length > 0 &&
        !config.blockSpamMonitoredBlockTypes.includes(blockType)
    ) {
        return;
    }

    const currentTime = Date.now();
    pData.recentBlockSpamTimestamps.push(currentTime);
    pData.isDirtyForSave = true;

    const windowMs = config.blockSpamTimeWindowMs || 1000;
    const originalCount = pData.recentBlockSpamTimestamps.length;
    pData.recentBlockSpamTimestamps = pData.recentBlockSpamTimestamps.filter(ts => (currentTime - ts) <= windowMs);
    if (pData.recentBlockSpamTimestamps.length !== originalCount) {
        pData.isDirtyForSave = true;
    }

    const maxBlocks = config.blockSpamMaxBlocksInWindow || defaultBlockSpamMaxBlocksInWindow;
    if (pData.recentBlockSpamTimestamps.length > maxBlocks) {
        const violationDetails = {
            playerName: player.nameTag,
            count: pData.recentBlockSpamTimestamps.length.toString(),
            maxBlocks: maxBlocks.toString(),
            windowMs: windowMs.toString(),
            blockType,
            actionTaken: config.blockSpamAction,
        };
        const actionProfileKey = config.blockSpamActionProfileName ?? 'worldAntiGriefBlockspam';
        await actionManager.executeCheckAction(player, actionProfileKey, violationDetails, dependencies);
        playerUtils.debugLog(`[BlockSpamCheck] Flagged ${player.nameTag}. Placed ${pData.recentBlockSpamTimestamps.length} monitored blocks (${blockType}) in ${windowMs}ms. Action: ${config.blockSpamAction}`, pData.isWatched ? player.nameTag : null, dependencies);

        pData.recentBlockSpamTimestamps = [];
        pData.isDirtyForSave = true;
    }
}

/**
 * Checks for high-density block spam within a defined radius and time window.
 * Typically called from `PlayerPlaceBlockAfterEvent`.
 * @async
 * @param {mc.Player} player - The player who placed the block.
 * @param {import('../../types.js').PlayerAntiCheatData} pData - Player-specific anti-cheat data.
 * @param {import('../../types.js').Dependencies} dependencies - Shared dependencies.
 * @param {import('../../types.js').EventSpecificData} eventSpecificData - Expects `block` (the placed mc.Block).
 * @returns {Promise<void>}
 */
export async function checkBlockSpamDensity(player, pData, dependencies, eventSpecificData) {
    const { config, playerUtils, actionManager, currentTick } = dependencies;
    const block = eventSpecificData?.block;

    if (!config.enableBlockSpamDensityCheck || !pData || !block) {
        return;
    }
    if ((config.blockSpamBypassInCreative ?? true) && player.gameMode === mc.GameMode.creative) {
        return;
    }
    if (!pData.recentBlockPlacements || pData.recentBlockPlacements.length === 0) {
        return;
    }

    const radius = config.blockSpamDensityCheckRadius ?? 1;
    const totalVolumeBlocks = Math.pow((2 * radius + 1), 3);
    if (totalVolumeBlocks === 0) {
        return;
    }

    const newBlockLocation = block.location;
    let playerPlacedBlocksInVolumeCount = 0;
    const densityTimeWindowTicks = config.blockSpamDensityTimeWindowTicks ?? defaultBlockSpamDensityTimeWindowTicks;
    const monitoredTypes = config.blockSpamDensityMonitoredBlockTypes ?? [];

    for (const record of pData.recentBlockPlacements) {
        if (!record.typeId) {
            continue;
        }
        if ((currentTick - record.tick) > densityTimeWindowTicks) {
            continue;
        }
        if (monitoredTypes.length > 0 && !monitoredTypes.includes(record.typeId)) {
            continue;
        }

        if (
            Math.abs(record.x - newBlockLocation.x) <= radius &&
            Math.abs(record.y - newBlockLocation.y) <= radius &&
            Math.abs(record.z - newBlockLocation.z) <= radius
        ) {
            playerPlacedBlocksInVolumeCount++;
        }
    }

    const densityPercentage = (playerPlacedBlocksInVolumeCount / totalVolumeBlocks) * 100;
    const thresholdPercentage = config.blockSpamDensityThresholdPercentage ?? defaultBlockSpamDensityThresholdPercentage;

    if (densityPercentage > thresholdPercentage) {
        const violationDetails = {
            playerName: player.nameTag,
            densityPercentage: densityPercentage.toFixed(1),
            radius: radius.toString(),
            countInVolume: playerPlacedBlocksInVolumeCount.toString(),
            totalVolumeBlocks: totalVolumeBlocks.toString(),
            blockType: block.typeId,
            actionTaken: config.blockSpamDensityAction ?? 'warn',
        };
        const actionProfileKey = config.blockSpamDensityActionProfileName ?? 'worldAntiGriefBlockspamDensity';
        await actionManager.executeCheckAction(player, actionProfileKey, violationDetails, dependencies);
        playerUtils.debugLog(`[BlockSpamDensityCheck] Flagged ${player.nameTag}. Density: ${densityPercentage.toFixed(1)}% in radius ${radius} (Count: ${playerPlacedBlocksInVolumeCount}/${totalVolumeBlocks}). Block: ${block.typeId}. Action: ${config.blockSpamDensityAction}`, pData.isWatched ? player.nameTag : null, dependencies);
    }
}
