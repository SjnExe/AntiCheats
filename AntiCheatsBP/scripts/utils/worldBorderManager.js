/**
 * @file AntiCheatsBP/scripts/utils/worldBorderManager.js
 * Manages the storage and retrieval of world border settings using world dynamic properties.
 * @version 1.0.0
 */
import * as mc from '@minecraft/server';

const WORLD_BORDER_DYNAMIC_PROPERTY_PREFIX = "anticheat:worldborder_";

/**
 * @typedef {object} WorldBorderSettings
 * @property {"square" | "circle"} shape - The shape of the border.
 * @property {number} centerX
 * @property {number} centerZ
 * @property {number} [halfSize] // Optional: For square borders, must be positive if present.
 * @property {number} [radius]   // Optional: For circular borders, must be positive if present.
 * @property {boolean} enabled
 * @property {string} dimensionId - The dimension these settings apply to.
 * @property {boolean} [enableDamage]
 * @property {number} [damageAmount] - Optional: Damage per interval.
 * @property {number} [damageIntervalTicks] - Optional: Interval in ticks for damage.
 * @property {number} [teleportAfterNumDamageEvents] - Optional: Teleport after this many damage events.
 * @property {boolean} [isResizing] - Optional: True if a resize operation is currently in progress.
 * @property {number} [originalSize] - Optional: The halfSize or radius at the start of the resize.
 * @property {number} [targetSize] - Optional: The target halfSize or radius for the resize.
 * @property {number} [resizeStartTimeMs] - Optional: Timestamp (ms) when the resize operation began.
 * @property {number} [resizeDurationMs] - Optional: Total duration (ms) for the resize operation.
 * @property {boolean} [isPaused] - Optional: True if an ongoing resize is currently paused.
 * @property {number} [resizePausedTimeMs] - Optional: Total accumulated time (ms) the resize has been paused.
 * @property {number} [resizeLastPauseStartTimeMs] - Optional: Timestamp (ms) when the current pause period began.
 * @property {string} [particleNameOverride] - Optional: Specific particle name to use for this dimension's border visuals, overriding global default.
 * @property {"linear" | "easeOutQuad" | "easeInOutQuad"} [resizeInterpolationType] - Optional: The type of interpolation to use for gradual resizing. Defaults to "linear".
 */

/**
 * Retrieves the world border settings for a given dimension.
 * @param {string} dimensionId - The ID of the dimension (e.g., "minecraft:overworld").
 * @param {object} dependencies - The standard dependencies object.
 * @returns {WorldBorderSettings | null} The border settings if found and valid, otherwise null.
 */
export function getBorderSettings(dimensionId, dependencies) {
    const { playerUtils } = dependencies;
    if (!dimensionId || typeof dimensionId !== 'string') {
        playerUtils.debugLog("[WorldBorderManager] getBorderSettings: Invalid dimensionId provided.", dependencies, "System");
        return null;
    }
    const propertyKey = WORLD_BORDER_DYNAMIC_PROPERTY_PREFIX + dimensionId.replace("minecraft:", "");
    try {
        const settingsJson = mc.world.getDynamicProperty(propertyKey);
        if (typeof settingsJson === 'string') {
            const settings = JSON.parse(settingsJson);

            // Basic validation for common properties
            if (!settings || typeof settings.centerX !== 'number' || typeof settings.centerZ !== 'number' ||
                typeof settings.enabled !== 'boolean' || settings.dimensionId !== dimensionId) {
                playerUtils.debugLog(`[WorldBorderManager] Invalid or corrupt common settings for ${dimensionId}. Settings: ${JSON.stringify(settings)}`, dependencies, "System");
                return null;
            }

            // Shape-specific validation
            if (settings.shape === "square") {
                if (typeof settings.halfSize !== 'number' || settings.halfSize <= 0) {
                    playerUtils.debugLog(`[WorldBorderManager] Invalid or non-positive 'halfSize' for square border in ${dimensionId}. Value: ${settings.halfSize}`, dependencies, "System");
                    return null;
                }
            } else if (settings.shape === "circle") {
                if (typeof settings.radius !== 'number' || settings.radius <= 0) {
                    playerUtils.debugLog(`[WorldBorderManager] Invalid or non-positive 'radius' for circle border in ${dimensionId}. Value: ${settings.radius}`, dependencies, "System");
                    return null;
                }
            } else {
                playerUtils.debugLog(`[WorldBorderManager] Unknown or invalid shape '${settings.shape}' for ${dimensionId}. Defaulting to no border.`, dependencies, "System");
                return null;
            }

            // Damage and resize properties are optional and will be handled by the caller if not present
            // No specific validation for resize fields here, as they are managed by commands and the tick loop

            // Default resizeInterpolationType if isResizing and it's missing
            if (settings.isResizing && settings.resizeInterpolationType === undefined) {
                settings.resizeInterpolationType = "linear";
            }
            return settings;
        }
    } catch (error) {
        console.error(`[WorldBorderManager] Error in getBorderSettings for ${dimensionId}: ${error.stack || error}`);
        playerUtils.debugLog(`[WorldBorderManager] Exception in getBorderSettings for ${dimensionId}: ${error.message}`, dependencies, "System");
    }
    return null;
}

/**
 * Saves or updates the world border settings for a given dimension.
 * @param {string} dimensionId - The ID of the dimension.
 * @param {Omit<WorldBorderSettings, "dimensionId">} settingsToSave - The border settings to save.
 *        The dimensionId from the parameter will be added to the stored object.
 * @param {object} dependencies - The standard dependencies object.
 * @returns {boolean} True if settings were saved successfully, false otherwise.
 */
export function saveBorderSettings(dimensionId, settingsToSave, dependencies) {
    const { playerUtils } = dependencies;
    if (!dimensionId || typeof dimensionId !== 'string' || !settingsToSave) {
        playerUtils.debugLog("[WorldBorderManager] saveBorderSettings: Invalid dimensionId or settings provided.", dependencies, "System");
        return false;
    }

    const propertyKey = WORLD_BORDER_DYNAMIC_PROPERTY_PREFIX + dimensionId.replace("minecraft:", "");
    const fullSettings = {
        ...settingsToSave,
        dimensionId: dimensionId // Ensure dimensionId is part of the stored object
    };

    // Validate and clean shape-specific properties
    if (fullSettings.shape === "square") {
        if (typeof fullSettings.halfSize !== 'number' || fullSettings.halfSize <= 0) {
            playerUtils.debugLog(`[WorldBorderManager] saveBorderSettings: Invalid 'halfSize' for square shape. Value: ${fullSettings.halfSize}`, dependencies, "System");
            return false;
        }
        fullSettings.radius = undefined; // Ensure radius is explicitly not part of square settings
    } else if (fullSettings.shape === "circle") {
        if (typeof fullSettings.radius !== 'number' || fullSettings.radius <= 0) {
            playerUtils.debugLog(`[WorldBorderManager] saveBorderSettings: Invalid or non-positive 'radius' for circle shape. Value: ${fullSettings.radius}`, dependencies, "System");
            return false;
        }
        fullSettings.halfSize = undefined; // Ensure halfSize is explicitly not part of circle settings
    } else if (fullSettings.shape) { // Shape exists but is not 'square' or 'circle'
        playerUtils.debugLog(`[WorldBorderManager] saveBorderSettings: Unknown shape '${fullSettings.shape}' provided.`, dependencies, "System");
        return false;
    } else { // Shape is missing
        playerUtils.debugLog("[WorldBorderManager] saveBorderSettings: Shape is required.", dependencies, "System");
        return false;
    }

    // Ensure resize fields are either all present or all absent (or handle partial cases if necessary)
    const resizeFields = ['isResizing', 'originalSize', 'targetSize', 'resizeStartTimeMs', 'resizeDurationMs'];
    const hasSomeResizeFields = resizeFields.some(field => fullSettings[field] !== undefined);
    const hasAllResizeFieldsIfResizing = fullSettings.isResizing ?
        (typeof fullSettings.originalSize === 'number' &&
         typeof fullSettings.targetSize === 'number' &&
         typeof fullSettings.resizeStartTimeMs === 'number' &&
         typeof fullSettings.resizeDurationMs === 'number' && fullSettings.resizeDurationMs > 0)
        : true; // If not resizing, other fields don't strictly need to be there or can be cleaned up

    if (hasSomeResizeFields && !hasAllResizeFieldsIfResizing && fullSettings.isResizing) {
        playerUtils.debugLog("[WorldBorderManager] saveBorderSettings: Incomplete or invalid resize operation data. All resize fields must be valid if isResizing is true.", dependencies, "System");
        // Optionally, clean up partial resize fields if isResizing is false
        // For now, we'll rely on the command layer to set these correctly or clear them.
        return false;
    }

    // If not resizing, ensure resize fields are cleaned up (set to undefined)
    if (!fullSettings.isResizing) {
        fullSettings.isResizing = undefined; // or false, but undefined is cleaner for JSON
        fullSettings.originalSize = undefined;
        fullSettings.targetSize = undefined;
        fullSettings.resizeStartTimeMs = undefined;
        fullSettings.resizeDurationMs = undefined;
        // Also clear all pause-related fields if not resizing
        fullSettings.isPaused = undefined;
        fullSettings.resizePausedTimeMs = undefined;
        fullSettings.resizeLastPauseStartTimeMs = undefined;
    } else {
        // If resizing, but not paused, ensure resizeLastPauseStartTimeMs is cleared.
        // resizePausedTimeMs should persist as it's an accumulator.
        if (!fullSettings.isPaused) {
            fullSettings.resizeLastPauseStartTimeMs = undefined;
        }
        // If isPaused is true, resizeLastPauseStartTimeMs should have a value.
        // If isPaused is explicitly set to false, resizeLastPauseStartTimeMs is cleared.
        // resizePausedTimeMs accumulates and is only cleared when isResizing becomes false.

        // Validate or default resizeInterpolationType if resizing
        if (fullSettings.isResizing) {
            const validInterpolationTypes = ["linear", "easeOutQuad", "easeInOutQuad"];
            if (!fullSettings.resizeInterpolationType || !validInterpolationTypes.includes(fullSettings.resizeInterpolationType)) {
                fullSettings.resizeInterpolationType = "linear"; // Default to linear
            }
        } else {
            fullSettings.resizeInterpolationType = undefined; // Clear if not resizing
        }
    }

    // Handle particleNameOverride
    if (typeof settingsToSave.particleNameOverride === 'string') {
        const particleOverride = settingsToSave.particleNameOverride.trim();
        if (particleOverride === "" || particleOverride.toLowerCase() === "reset" || particleOverride.toLowerCase() === "default") {
            fullSettings.particleNameOverride = undefined; // Clear override
        } else {
            fullSettings.particleNameOverride = particleOverride; // Set override
        }
    }
    // If settingsToSave.particleNameOverride is undefined, fullSettings.particleNameOverride will retain its current value from ...settingsToSave or be undefined.

    try {
        mc.world.setDynamicProperty(propertyKey, JSON.stringify(fullSettings));
        playerUtils.debugLog(`[WorldBorderManager] Successfully saved border settings for ${dimensionId}.`, dependencies, "System");
        return true;
    } catch (error) {
        console.error(`[WorldBorderManager] Error saving border settings for ${dimensionId}: ${error.stack || error}`);
        playerUtils.debugLog(`[WorldBorderManager] Exception saving border settings for ${dimensionId}: ${error.message}`, dependencies, "System");
        return false;
    }
}

// --- Helper functions moved from main.js ---
function easeOutQuad(t) {
    return t * (2 - t);
}

function easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

function mapRange(value, inMin, inMax, outMin, outMax) {
    return (value - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
}

function findSafeTeleportY(dimension, targetX, initialY, targetZ, dependencies) {
    const { playerUtils } = dependencies; // For potential debug logging
    const minDimensionHeight = dimension.heightRange.min;
    const maxDimensionHeight = dimension.heightRange.max - 2; // Leave space for player height
    let currentY = Math.floor(initialY);
    currentY = Math.max(minDimensionHeight, Math.min(currentY, maxDimensionHeight));

    const maxSearchDepthDown = 10;
    const maxSearchDepthUp = 5;

    // Search down first
    for (let i = 0; i < maxSearchDepthDown; i++) {
        const checkY = currentY - i;
        if (checkY < minDimensionHeight) break;
        try {
            const blockFeet = dimension.getBlock({ x: targetX, y: checkY, z: targetZ });
            const blockHead = dimension.getBlock({ x: targetX, y: checkY + 1, z: targetZ });
            if (blockFeet && blockHead && blockFeet.isAir && blockHead.isAir) {
                const blockBelowFeet = dimension.getBlock({ x: targetX, y: checkY - 1, z: targetZ });
                if (blockBelowFeet && blockBelowFeet.isSolid) return checkY; // Found solid ground under air
                // If no solid ground but it's air, it's still a possible (though less ideal) spot
                else if (blockFeet.isAir && blockHead.isAir) return checkY;
            }
        } catch (e) { /* Errors (e.g. unloaded chunk) mean this spot is not safe */ }
    }

    // If searching down failed, search up from original Y (or slightly above if initialY was unsafe)
    let searchUpStartY = Math.floor(initialY); // Start from original Y for upward search
    searchUpStartY = Math.max(minDimensionHeight, Math.min(searchUpStartY, maxDimensionHeight)); // Clamp
    for (let i = 1; i < maxSearchDepthUp; i++) { // Start 1 block above initial Y
        const checkY = searchUpStartY + i;
        if (checkY > maxDimensionHeight) break;
        try {
            const blockFeet = dimension.getBlock({ x: targetX, y: checkY, z: targetZ });
            const blockHead = dimension.getBlock({ x: targetX, y: checkY + 1, z: targetZ });
             if (blockFeet && blockHead && blockFeet.isAir && blockHead.isAir) {
                const blockBelowFeet = dimension.getBlock({ x: targetX, y: checkY - 1, z: targetZ });
                if (blockBelowFeet && blockBelowFeet.isSolid) return checkY;
                 else if (blockFeet.isAir && blockHead.isAir) return checkY;
            }
        } catch(e) { /* Errors mean this spot is not safe */ }
    }

    // Fallback if no clearly safe spot is found - return original initialY, hoping it's somewhat valid.
    // Could also return a default like dimension.heightRange.min + some offset if truly stuck.
    // playerUtils.debugLog(`[WorldBorderManager] findSafeTeleportY: No ideal safe spot found for X:${targetX} Z:${targetZ} around Y:${initialY}. Returning original Y.`, dependencies, "System");
    return Math.floor(initialY);
}


// --- New exported functions ---

export function processWorldBorderResizing(dependencies) {
    const { config, playerUtils, logManager, mc } = dependencies;
    const knownBorderDimensions = config.worldBorderKnownDimensions ?? ["minecraft:overworld", "minecraft:the_nether", "minecraft:the_end"];

    for (const dimId of knownBorderDimensions) {
        let dimBorderSettings = null;
        try {
            dimBorderSettings = getBorderSettings(dimId, dependencies);
        } catch (e) {
            console.error(`[WorldBorderManager-Resize] Error getting border settings for ${dimId} during resize check: ${e.stack || e}`);
            playerUtils.debugLog(`[WorldBorderManager-Resize] Error getting border settings for ${dimId}: ${e.message}`, dependencies, "System");
            continue;
        }

        if (dimBorderSettings && dimBorderSettings.isResizing && dimBorderSettings.enabled) {
            const currentTimeMs = Date.now();
            if (typeof dimBorderSettings.resizeStartTimeMs !== 'number' || typeof dimBorderSettings.resizeDurationMs !== 'number' || typeof dimBorderSettings.originalSize !== 'number' || typeof dimBorderSettings.targetSize !== 'number') {
                playerUtils.debugLog(`[WorldBorderManager-Resize] Invalid resize parameters for dimension ${dimId}. Cancelling resize.`, dependencies, "System");
                dimBorderSettings.isResizing = false;
                delete dimBorderSettings.originalSize; delete dimBorderSettings.targetSize;
                delete dimBorderSettings.resizeStartTimeMs; delete dimBorderSettings.resizeDurationMs;
                saveBorderSettings(dimId, dimBorderSettings, dependencies);
                continue;
            }

            const accumulatedPausedMs = dimBorderSettings.resizePausedTimeMs || 0;
            const effectiveElapsedMs = (currentTimeMs - dimBorderSettings.resizeStartTimeMs) - accumulatedPausedMs;
            const durationMs = dimBorderSettings.resizeDurationMs;

            if (dimBorderSettings.isPaused) continue;

            if (effectiveElapsedMs >= durationMs) {
                const targetSize = dimBorderSettings.targetSize;
                if (dimBorderSettings.shape === "square") dimBorderSettings.halfSize = targetSize;
                else if (dimBorderSettings.shape === "circle") dimBorderSettings.radius = targetSize;

                dimBorderSettings.isResizing = false;
                dimBorderSettings.isPaused = undefined;
                dimBorderSettings.resizePausedTimeMs = undefined;
                dimBorderSettings.resizeLastPauseStartTimeMs = undefined;
                dimBorderSettings.originalSize = undefined;
                dimBorderSettings.targetSize = undefined;
                dimBorderSettings.resizeStartTimeMs = undefined;
                dimBorderSettings.resizeDurationMs = undefined;

                if (saveBorderSettings(dimId, dimBorderSettings, dependencies)) {
                     playerUtils.debugLog(`[WorldBorderManager] Border resize in ${dimId.replace("minecraft:","")} completed. New size parameter: ${targetSize}.`, dependencies, "System");
                     logManager.addLog({ adminName: 'System', actionType: 'worldborder_resize_complete', targetName: dimId, details: `Resize to ${targetSize} complete.` }, dependencies);
                } else {
                    playerUtils.debugLog(`[WorldBorderManager] Failed to save completed border resize for ${dimId}.`, dependencies, "System");
                }
            }
        }
    }
}

export async function enforceWorldBorderForPlayer(player, pData, dependencies) {
    const { config, playerUtils, logManager, mc, getString, rankManager, permissionLevels, currentTick } = dependencies;

    if (!config.enableWorldBorderSystem) return;

    let borderSettings = getBorderSettings(player.dimension.id, dependencies);
    if (!borderSettings || !borderSettings.enabled) {
        if (pData.ticksOutsideBorder > 0 || pData.borderDamageApplications > 0) {
            pData.ticksOutsideBorder = 0; pData.borderDamageApplications = 0; pData.isDirtyForSave = true;
        }
        return;
    }

    const playerPermLevel = rankManager.getPlayerPermissionLevel(player, dependencies);
    if (playerPermLevel <= permissionLevels.admin) { // Assuming 'admin' is a key in permissionLevels
        if (pData.ticksOutsideBorder > 0 || pData.borderDamageApplications > 0) {
            pData.ticksOutsideBorder = 0; pData.borderDamageApplications = 0; pData.isDirtyForSave = true;
        }
        return;
    }

    const loc = player.location;
    let isPlayerOutside = false;
    let targetX = loc.x;
    let targetZ = loc.z;
    let currentEffectiveHalfSize = borderSettings.halfSize;
    let currentEffectiveRadius = borderSettings.radius;

    if (borderSettings.isResizing && typeof borderSettings.originalSize === 'number' && typeof borderSettings.targetSize === 'number' && typeof borderSettings.resizeStartTimeMs === 'number' && typeof borderSettings.resizeDurationMs === 'number') {
        const currentTimeMs = Date.now();
        const accumulatedPausedMs = borderSettings.resizePausedTimeMs || 0;
        let elapsedMs = (currentTimeMs - borderSettings.resizeStartTimeMs) - accumulatedPausedMs;
        if (borderSettings.isPaused) {
            const lastPauseStart = borderSettings.resizeLastPauseStartTimeMs || currentTimeMs;
            elapsedMs = (lastPauseStart - borderSettings.resizeStartTimeMs) - accumulatedPausedMs;
        }
        elapsedMs = Math.max(0, elapsedMs);
        const durationMs = borderSettings.resizeDurationMs;
        let rawProgress = (durationMs > 0) ? Math.min(1, elapsedMs / durationMs) : 1;
        let easedProgress = rawProgress;
        if (borderSettings.resizeInterpolationType === "easeOutQuad") easedProgress = easeOutQuad(rawProgress);
        else if (borderSettings.resizeInterpolationType === "easeInOutQuad") easedProgress = easeInOutQuad(rawProgress);

        const interpolatedSize = borderSettings.originalSize + (borderSettings.targetSize - borderSettings.originalSize) * easedProgress;
        if (borderSettings.shape === "square") currentEffectiveHalfSize = interpolatedSize;
        else if (borderSettings.shape === "circle") currentEffectiveRadius = interpolatedSize;
    } else if (borderSettings.isResizing) {
        // If resizing but parameters are incomplete, use target size or stored size as fallback
        if (typeof borderSettings.targetSize === 'number') {
            if (borderSettings.shape === "square") currentEffectiveHalfSize = borderSettings.targetSize;
            else if (borderSettings.shape === "circle") currentEffectiveRadius = borderSettings.targetSize;
        }
        if(pData.isWatched) playerUtils.debugLog(`[WorldBorderManager] In-progress resize for dim ${player.dimension.id} has incomplete parameters in player loop. Using targetSize or stored size.`, dependencies, player.nameTag);
    }


    if (borderSettings.shape === "square" && typeof currentEffectiveHalfSize === 'number' && currentEffectiveHalfSize > 0) {
        const { centerX, centerZ } = borderSettings;
        const minX = centerX - currentEffectiveHalfSize; const maxX = centerX + currentEffectiveHalfSize;
        const minZ = centerZ - currentEffectiveHalfSize; const maxZ = centerZ + currentEffectiveHalfSize;
        if (loc.x < minX || loc.x > maxX || loc.z < minZ || loc.z > maxZ) {
            isPlayerOutside = true; targetX = loc.x; targetZ = loc.z;
            if (targetX < minX) targetX = minX + 0.5; else if (targetX > maxX) targetX = maxX - 0.5;
            if (targetZ < minZ) targetZ = minZ + 0.5; else if (targetZ > maxZ) targetZ = maxZ - 0.5;
        }
    } else if (borderSettings.shape === "circle" && typeof currentEffectiveRadius === 'number' && currentEffectiveRadius > 0) {
        const { centerX, centerZ } = borderSettings;
        const dx = loc.x - centerX; const dz = loc.z - centerZ;
        const distSq = dx * dx + dz * dz; const radiusSq = currentEffectiveRadius * currentEffectiveRadius;
        if (distSq > radiusSq) {
            isPlayerOutside = true; const currentDist = Math.sqrt(distSq); const teleportOffset = 0.5;
            if (currentDist === 0 || currentEffectiveRadius <= teleportOffset) { // Avoid division by zero or negative scaling
                targetX = centerX + (currentEffectiveRadius > teleportOffset ? currentEffectiveRadius - teleportOffset : 0); targetZ = centerZ;
            } else {
                const scale = (currentEffectiveRadius - teleportOffset) / currentDist;
                targetX = centerX + dx * scale; targetZ = centerZ + dz * scale;
            }
        }
    } else if (borderSettings.shape) {
         if(pData.isWatched) playerUtils.debugLog(`[WorldBorderManager] Invalid shape ('${borderSettings.shape}') or non-positive effective size (Sq: ${currentEffectiveHalfSize}, Circ: ${currentEffectiveRadius}) in dimension ${player.dimension.id}. Skipping enforcement.`, dependencies, player.nameTag);
    }

    if (isPlayerOutside) {
        pData.ticksOutsideBorder = (pData.ticksOutsideBorder || 0) + 1;
        const enableDamage = borderSettings.enableDamage ?? config.worldBorderDefaultEnableDamage;
        const damageAmount = borderSettings.damageAmount ?? config.worldBorderDefaultDamageAmount;
        const damageIntervalTicks = borderSettings.damageIntervalTicks ?? config.worldBorderDefaultDamageIntervalTicks;
        const teleportAfterNumDamageEvents = borderSettings.teleportAfterNumDamageEvents ?? config.worldBorderTeleportAfterNumDamageEvents;
        let performTeleport = true;

        if (enableDamage && damageIntervalTicks > 0 && damageAmount > 0) {
            performTeleport = false;
            if (pData.ticksOutsideBorder % damageIntervalTicks === 0) {
                try {
                    player.applyDamage(damageAmount, { cause: mc.EntityDamageCause.worldBorder });
                    pData.borderDamageApplications = (pData.borderDamageApplications || 0) + 1;
                    pData.isDirtyForSave = true;
                    if(pData.isWatched) playerUtils.debugLog(`[WorldBorderManager] Applied ${damageAmount} damage to ${player.nameTag}. Total applications: ${pData.borderDamageApplications}`, dependencies, player.nameTag);
                    if (pData.borderDamageApplications >= teleportAfterNumDamageEvents) {
                        performTeleport = true;
                        if(pData.isWatched) playerUtils.debugLog(`[WorldBorderManager] ${player.nameTag} reached ${pData.borderDamageApplications} damage events. Triggering teleport.`, dependencies, player.nameTag);
                    }
                } catch (e) {
                    console.warn(`[WorldBorderManager] Failed to apply damage to player ${player.nameTag}: ${e}`);
                    playerUtils.debugLog(`[WorldBorderManager] Failed to apply damage to player ${player.nameTag}: ${e.message}`, dependencies, player.nameTag);
                }
            }
        }
        if (performTeleport) {
            const safeY = findSafeTeleportY(player.dimension, targetX, loc.y, targetZ, dependencies);
            try {
                player.teleport({ x: targetX, y: safeY, z: targetZ }, { dimension: player.dimension });
                if (config.worldBorderWarningMessage) playerUtils.warnPlayer(player, getString(config.worldBorderWarningMessage));
                if(pData.isWatched) playerUtils.debugLog(`[WorldBorderManager] Teleported ${player.nameTag} to XZ(${targetX.toFixed(1)},${targetZ.toFixed(1)}) Y=${safeY}. Reason: ${enableDamage && pData.borderDamageApplications >= teleportAfterNumDamageEvents ? 'Max damage events reached' : (!enableDamage ? 'Standard enforcement' : 'Damage logic did not require teleport yet')}.`, dependencies, player.nameTag);
                pData.ticksOutsideBorder = 0; pData.borderDamageApplications = 0; pData.isDirtyForSave = true;
            } catch (e) {
                console.warn(`[WorldBorderManager] Failed to teleport player ${player.nameTag}: ${e}`);
                if(pData.isWatched) playerUtils.debugLog(`[WorldBorderManager] Teleport failed for ${player.nameTag}. Error: ${e.message}`, dependencies, player.nameTag);
            }
        }
    } else {
        if (pData.ticksOutsideBorder > 0 || pData.borderDamageApplications > 0) {
             if(pData.isWatched) playerUtils.debugLog(`[WorldBorderManager] Player ${player.nameTag} re-entered border. Resetting counters.`, dependencies, player.nameTag);
            pData.ticksOutsideBorder = 0; pData.borderDamageApplications = 0; pData.isDirtyForSave = true;
        }
    }

    // Particle visualization
    if (config.worldBorderEnableVisuals) {
        // borderSettings was already fetched
        if (borderSettings && borderSettings.enabled) { // Ensure settings are valid and border is enabled
            if (currentTick - (pData.lastBorderVisualTick || 0) >= config.worldBorderVisualUpdateIntervalTicks) {
                pData.lastBorderVisualTick = currentTick;
                const playerLoc = player.location;
                let particleNameToUse;
                const particleSequence = config.worldBorderParticleSequence;
                if (Array.isArray(particleSequence) && particleSequence.length > 0) {
                    const visualUpdateInterval = config.worldBorderVisualUpdateIntervalTicks > 0 ? config.worldBorderVisualUpdateIntervalTicks : 20;
                    const sequenceIndex = Math.floor(currentTick / visualUpdateInterval) % particleSequence.length;
                    particleNameToUse = particleSequence[sequenceIndex];
                } else {
                    particleNameToUse = borderSettings.particleNameOverride || config.worldBorderParticleName;
                }
                const visualRange = config.worldBorderVisualRange;
                let density;
                if (config.worldBorderEnablePulsingDensity) {
                    const pulseSpeed = config.worldBorderPulseSpeed > 0 ? config.worldBorderPulseSpeed : 1.0;
                    const pulseTime = (currentTick * pulseSpeed) / 20.0;
                    const sineWave = Math.sin(pulseTime);
                    const minDensity = config.worldBorderPulseDensityMin > 0 ? config.worldBorderPulseDensityMin : 0.1;
                    const maxDensity = config.worldBorderPulseDensityMax > minDensity ? config.worldBorderPulseDensityMax : minDensity + 1.0;
                    density = mapRange(sineWave, -1, 1, minDensity, maxDensity);
                    density = Math.max(0.1, density);
                } else {
                    density = Math.max(0.1, config.worldBorderParticleDensity);
                }
                const wallHeight = config.worldBorderParticleWallHeight;
                const segmentLength = config.worldBorderParticleSegmentLength;
                const yBase = Math.floor(playerLoc.y);

                // Use currentEffectiveHalfSize/Radius for visuals if resizing, otherwise use stored size
                const displayHalfSize = (borderSettings.isResizing && typeof currentEffectiveHalfSize === 'number') ? currentEffectiveHalfSize : borderSettings.halfSize;
                const displayRadius = (borderSettings.isResizing && typeof currentEffectiveRadius === 'number') ? currentEffectiveRadius : borderSettings.radius;


                if (borderSettings.shape === "square" && typeof displayHalfSize === 'number' && displayHalfSize > 0) {
                    const { centerX, centerZ } = borderSettings;
                    const minX = centerX - displayHalfSize; const maxX = centerX + displayHalfSize;
                    const minZ = centerZ - displayHalfSize; const maxZ = centerZ + displayHalfSize;
                    const spawnSquareParticleLine = (isXPlane, fixedCoord, startDynamic, endDynamic, playerCoordDynamic) => {
                        const lengthToRender = Math.min(segmentLength, Math.abs(endDynamic - startDynamic));
                        let actualSegmentStart = playerCoordDynamic - lengthToRender / 2; let actualSegmentEnd = playerCoordDynamic + lengthToRender / 2;
                        actualSegmentStart = Math.max(startDynamic, actualSegmentStart); actualSegmentEnd = Math.min(endDynamic, actualSegmentEnd);
                        if (actualSegmentStart >= actualSegmentEnd) return;
                        for (let dyn = actualSegmentStart; dyn <= actualSegmentEnd; dyn += (1 / density)) {
                            for (let h = 0; h < wallHeight; h++) {
                                try { player.dimension.spawnParticle(particleNameToUse, isXPlane ? { x: fixedCoord, y: yBase + h, z: dyn } : { x: dyn, y: yBase + h, z: fixedCoord }); } catch (e) {}
                            }
                        }
                    };
                    if (Math.abs(playerLoc.x - minX) < visualRange) spawnSquareParticleLine(true, minX, minZ, maxZ, playerLoc.z);
                    if (Math.abs(playerLoc.x - maxX) < visualRange) spawnSquareParticleLine(true, maxX, minZ, maxZ, playerLoc.z);
                    if (Math.abs(playerLoc.z - minZ) < visualRange) spawnSquareParticleLine(false, minZ, minX, maxX, playerLoc.x);
                    if (Math.abs(playerLoc.z - maxZ) < visualRange) spawnSquareParticleLine(false, maxZ, minX, maxX, playerLoc.x);
                } else if (borderSettings.shape === "circle" && typeof displayRadius === 'number' && displayRadius > 0) {
                    const { centerX, centerZ } = borderSettings; const radiusToUse = displayRadius;
                    const distanceToCenter = Math.sqrt(Math.pow(playerLoc.x - centerX, 2) + Math.pow(playerLoc.z - centerZ, 2));
                    if (Math.abs(distanceToCenter - radiusToUse) < visualRange) {
                        const playerAngle = Math.atan2(playerLoc.z - centerZ, playerLoc.x - centerX);
                        const halfAngleSpan = radiusToUse > 0 ? (segmentLength / 2) / radiusToUse : Math.PI;
                        for (let i = 0; i < segmentLength * density; i++) {
                            const currentAngleOffset = (i / (segmentLength * density) - 0.5) * (segmentLength / radiusToUse);
                            const angle = playerAngle + currentAngleOffset;
                            if (Math.abs(currentAngleOffset) > halfAngleSpan && segmentLength * density > 1) continue;
                            const particleX = centerX + radiusToUse * Math.cos(angle); const particleZ = centerZ + radiusToUse * Math.sin(angle);
                            for (let h = 0; h < wallHeight; h++) {
                                try { player.dimension.spawnParticle(particleNameToUse, { x: particleX, y: yBase + h, z: particleZ }); } catch (e) {}
                            }
                        }
                    }
                }
            }
        }
    }
}

/**
 * Clears the world border settings for a given dimension.
 * This effectively disables the border by removing its configuration.
 * @param {string} dimensionId - The ID of the dimension.
 * @param {object} dependencies - The standard dependencies object.
 * @returns {boolean} True if settings were cleared successfully, false otherwise.
 */
export function clearBorderSettings(dimensionId, dependencies) {
    const { playerUtils } = dependencies;
    if (!dimensionId || typeof dimensionId !== 'string') {
        playerUtils.debugLog("[WorldBorderManager] clearBorderSettings: Invalid dimensionId provided.", dependencies, "System");
        return false;
    }
    const propertyKey = WORLD_BORDER_DYNAMIC_PROPERTY_PREFIX + dimensionId.replace("minecraft:", "");
    try {
        mc.world.setDynamicProperty(propertyKey, undefined); // Setting to undefined removes the property
        playerUtils.debugLog(`[WorldBorderManager] Successfully cleared border settings for ${dimensionId}.`, dependencies, "System");
        return true;
    } catch (error) {
        console.error(`[WorldBorderManager] Error clearing border settings for ${dimensionId}: ${error.stack || error}`);
        playerUtils.debugLog(`[WorldBorderManager] Exception clearing border settings for ${dimensionId}: ${error.message}`, dependencies, "System");
        return false;
    }
}
