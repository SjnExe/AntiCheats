/**
 * Manages the storage and retrieval of world border settings using world dynamic properties.
 * Also handles the logic for enforcing the border on players and processing border resizing.
 */
import * as mc from '@minecraft/server';

const worldBorderDynamicPropertyPrefix = 'anticheat:worldborder_';

/**
 * Retrieves the world border settings for a specific dimension.
 * @param {string} dimensionId - The ID of the dimension (e.g., 'minecraft:overworld').
 * @param {import('../types.js').CommandDependencies} dependencies - Standard dependencies object.
 * @returns {object | null} The border settings object or null if not found or invalid.
 */
export function getBorderSettings(dimensionId, dependencies) {
    const { playerUtils } = dependencies;
    if (!dimensionId || typeof dimensionId !== 'string') {
        playerUtils.debugLog('[WorldBorderManager] getBorderSettings: Invalid dimensionId provided.', null, dependencies);
        return null;
    }

    const propertyKey = worldBorderDynamicPropertyPrefix + dimensionId.replace('minecraft:', '');
    try {
        const settingsJson = mc.world.getDynamicProperty(propertyKey);
        if (typeof settingsJson === 'string') {
            const settings = JSON.parse(settingsJson);
            // Basic validation
            if (!settings || typeof settings.centerX !== 'number' || typeof settings.centerZ !== 'number' ||
                typeof settings.enabled !== 'boolean' || settings.dimensionId !== dimensionId) {
                playerUtils.debugLog(`[WorldBorderManager] Invalid or corrupt common settings for ${dimensionId}. Settings: ${JSON.stringify(settings)}`, 'System', dependencies);
                return null;
            }
            // Shape specific validation
            if (settings.shape === 'square') {
                if (typeof settings.halfSize !== 'number' || settings.halfSize <= 0) {
                    playerUtils.debugLog(`[WorldBorderManager] Invalid or non-positive 'halfSize' for square border in ${dimensionId}. Value: ${settings.halfSize}`, 'System', dependencies);
                    return null;
                }
            } else if (settings.shape === 'circle') {
                if (typeof settings.radius !== 'number' || settings.radius <= 0) {
                    playerUtils.debugLog(`[WorldBorderManager] Invalid or non-positive 'radius' for circle border in ${dimensionId}. Value: ${settings.radius}`, 'System', dependencies);
                    return null;
                }
            } else {
                playerUtils.debugLog(`[WorldBorderManager] Unknown or invalid shape '${settings.shape}' for ${dimensionId}. Defaulting to no border.`, 'System', dependencies);
                return null;
            }
            // Default interpolation type if missing during resize
            if (settings.isResizing && settings.resizeInterpolationType === undefined) {
                settings.resizeInterpolationType = 'linear';
            }
            return settings;
        }
    } catch (error) {
        console.error(`[WorldBorderManager] Error in getBorderSettings for ${dimensionId}: ${error.stack || error}`);
        playerUtils.debugLog(`[WorldBorderManager] Exception in getBorderSettings for ${dimensionId}: ${error.message}`, 'System', dependencies);
    }
    return null;
}

/**
 * Saves the world border settings for a specific dimension.
 * @param {string} dimensionId - The ID of the dimension.
 * @param {object} settingsToSave - The border settings object to save.
 * @param {import('../types.js').CommandDependencies} dependencies - Standard dependencies object.
 * @returns {boolean} True if saving was successful, false otherwise.
 */
export function saveBorderSettings(dimensionId, settingsToSave, dependencies) {
    const { playerUtils } = dependencies;
    if (!dimensionId || typeof dimensionId !== 'string' || !settingsToSave) {
        playerUtils.debugLog('[WorldBorderManager] saveBorderSettings: Invalid dimensionId or settings provided.', null, dependencies);
        return false;
    }

    const propertyKey = worldBorderDynamicPropertyPrefix + dimensionId.replace('minecraft:', '');
    const fullSettings = { ...settingsToSave, dimensionId: dimensionId };

    // Validate and clean shape-specific size properties
    if (fullSettings.shape === 'square') {
        if (typeof fullSettings.halfSize !== 'number' || fullSettings.halfSize <= 0) {
            playerUtils.debugLog(`[WorldBorderManager] saveBorderSettings: Invalid 'halfSize' for square shape. Value: ${fullSettings.halfSize}`, 'System', dependencies);
            return false;
        }
        fullSettings.radius = undefined; // Ensure radius is not present for square
    } else if (fullSettings.shape === 'circle') {
        if (typeof fullSettings.radius !== 'number' || fullSettings.radius <= 0) {
            playerUtils.debugLog(`[WorldBorderManager] saveBorderSettings: Invalid or non-positive 'radius' for circle shape. Value: ${fullSettings.radius}`, 'System', dependencies);
            return false;
        }
        fullSettings.halfSize = undefined; // Ensure halfSize is not present for circle
    } else if (fullSettings.shape) { // If shape is defined but not square or circle
        playerUtils.debugLog(`[WorldBorderManager] saveBorderSettings: Unknown shape '${fullSettings.shape}' provided.`, 'System', dependencies);
        return false;
    } else { // Shape is mandatory
        playerUtils.debugLog('[WorldBorderManager] saveBorderSettings: Shape is required.', 'System', dependencies);
        return false;
    }

    // Validate resize parameters if isResizing is true
    const resizeFields = ['isResizing', 'originalSize', 'targetSize', 'resizeStartTimeMs', 'resizeDurationMs'];
    const hasSomeResizeFields = resizeFields.some(field => fullSettings[field] !== undefined);
    const hasAllResizeFieldsIfResizing = fullSettings.isResizing ?
        (typeof fullSettings.originalSize === 'number' && typeof fullSettings.targetSize === 'number' &&
         typeof fullSettings.resizeStartTimeMs === 'number' && typeof fullSettings.resizeDurationMs === 'number' && fullSettings.resizeDurationMs > 0)
        : true; // If not resizing, this condition is met

    if (hasSomeResizeFields && !hasAllResizeFieldsIfResizing && fullSettings.isResizing) {
        playerUtils.debugLog('[WorldBorderManager] saveBorderSettings: Incomplete or invalid resize operation data.', 'System', dependencies);
        return false;
    }

    // Clean up resize fields if not resizing, or set defaults
    if (!fullSettings.isResizing) {
        fullSettings.isResizing = undefined; fullSettings.originalSize = undefined; fullSettings.targetSize = undefined;
        fullSettings.resizeStartTimeMs = undefined; fullSettings.resizeDurationMs = undefined;
        fullSettings.isPaused = undefined; fullSettings.resizePausedTimeMs = undefined; fullSettings.resizeLastPauseStartTimeMs = undefined;
        fullSettings.resizeInterpolationType = undefined;
    } else {
        // Ensure resizeLastPauseStartTimeMs is undefined if not paused
        if (!fullSettings.isPaused) {
            fullSettings.resizeLastPauseStartTimeMs = undefined;
        }
        // Default interpolation type if resizing and not set
        const validInterpolationTypes = ['linear', 'easeOutQuad', 'easeInOutQuad'];
        if (!fullSettings.resizeInterpolationType || !validInterpolationTypes.includes(fullSettings.resizeInterpolationType)) {
            fullSettings.resizeInterpolationType = 'linear';
        }
    }

    // Handle particleNameOverride
    if (typeof settingsToSave.particleNameOverride === 'string') {
        const particleOverride = settingsToSave.particleNameOverride.trim();
        if (particleOverride === '' || particleOverride.toLowerCase() === 'reset' || particleOverride.toLowerCase() === 'default') {
            fullSettings.particleNameOverride = undefined; // Reset to global default
        } else {
            fullSettings.particleNameOverride = particleOverride;
        }
    }

    try {
        mc.world.setDynamicProperty(propertyKey, JSON.stringify(fullSettings));
        playerUtils.debugLog(`[WorldBorderManager] Successfully saved border settings for ${dimensionId}.`, 'System', dependencies);
        return true;
    } catch (error) {
        console.error(`[WorldBorderManager] Error saving border settings for ${dimensionId}: ${error.stack || error}`);
        playerUtils.debugLog(`[WorldBorderManager] Exception saving border settings for ${dimensionId}: ${error.message}`, 'System', dependencies);
        return false;
    }
}

// --- Interpolation Helper Functions ---
/**
 * Quadratic easing out function.
 * @param {number} t - Progress ratio (0 to 1).
 * @returns {number} Eased value.
 */
function easeOutQuad(t) { return t * (2 - t); }

/**
 * Quadratic easing in and out function.
 * @param {number} t - Progress ratio (0 to 1).
 * @returns {number} Eased value.
 */
function easeInOutQuad(t) { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; }

/**
 * Maps a value from one range to another.
 * @param {number} value - The value to map.
 * @param {number} inMin - The minimum of the input range.
 * @param {number} inMax - The maximum of the input range.
 * @param {number} outMin - The minimum of the output range.
 * @param {number} outMax - The maximum of the output range.
 * @returns {number} The mapped value.
 */
function mapRange(value, inMin, inMax, outMin, outMax) { return (value - inMin) * (outMax - outMin) / (inMax - inMin) + outMin; }

/**
 * Finds a safe Y-coordinate for teleportation near a target X, Z.
 * Searches downwards first, then upwards from the initial Y.
 * @param {import('@minecraft/server').Dimension} dimension - The dimension to search in.
 * @param {number} targetX - The target X-coordinate.
 * @param {number} initialY - The initial Y-coordinate to start searching from.
 * @param {number} targetZ - The target Z-coordinate.
 * @param {import('../types.js').CommandDependencies} dependencies - Dependencies (currently unused here but good for consistency).
 * @returns {number} A safe Y-coordinate.
 */
function findSafeTeleportY(dimension, targetX, initialY, targetZ, dependencies) {
    // const { playerUtils } = dependencies; // Not used, but good practice for util functions
    const minDimensionHeight = dimension.heightRange.min;
    const maxDimensionHeight = dimension.heightRange.max - 2; // Leave space for player head
    let currentY = Math.max(minDimensionHeight, Math.min(Math.floor(initialY), maxDimensionHeight));
    const maxSearchDepthDown = 10;
    const maxSearchDepthUp = 5;

    // Search downwards for a 2-block air gap with solid ground below
    for (let i = 0; i < maxSearchDepthDown; i++) {
        const checkY = currentY - i;
        if (checkY < minDimensionHeight) break;
        try {
            const blockFeet = dimension.getBlock({ x: targetX, y: checkY, z: targetZ });
            const blockHead = dimension.getBlock({ x: targetX, y: checkY + 1, z: targetZ });
            if (blockFeet?.isAir && blockHead?.isAir) {
                const blockBelowFeet = dimension.getBlock({ x: targetX, y: checkY - 1, z: targetZ });
                if (blockBelowFeet?.isSolid) return checkY;
            }
        } catch (e) { /* Ignored, block might be unloaded */ }
    }

    // Search upwards if no suitable spot found downwards
    let searchUpStartY = Math.max(minDimensionHeight, Math.min(Math.floor(initialY), maxDimensionHeight));
    for (let i = 1; i < maxSearchDepthUp; i++) { // Start 1 block above initialY if searching up
        const checkY = searchUpStartY + i;
        if (checkY > maxDimensionHeight) break;
        try {
            const blockFeet = dimension.getBlock({ x: targetX, y: checkY, z: targetZ });
            const blockHead = dimension.getBlock({ x: targetX, y: checkY + 1, z: targetZ });
            if (blockFeet?.isAir && blockHead?.isAir) {
                const blockBelowFeet = dimension.getBlock({ x: targetX, y: checkY - 1, z: targetZ });
                if (blockBelowFeet?.isSolid) return checkY;
            }
        } catch (e) { /* Ignored */ }
    }
    return Math.floor(initialY); // Fallback to initial Y if no safe spot found
}

/**
 * Processes active world border resizing operations. Called periodically (e.g., every tick).
 * @param {import('../types.js').CommandDependencies} dependencies - Standard dependencies object.
 */
export function processWorldBorderResizing(dependencies) {
    const { config, playerUtils, logManager } = dependencies;
    const knownBorderDimensions = config.worldBorderKnownDimensions ?? ['minecraft:overworld', 'minecraft:the_nether', 'minecraft:the_end'];

    for (const dimId of knownBorderDimensions) {
        let dimBorderSettings = null;
        try {
            dimBorderSettings = getBorderSettings(dimId, dependencies);
        } catch (e) {
            console.error(`[WorldBorderManager-Resize] Error getting border settings for ${dimId} during resize check: ${e.stack || e}`);
            playerUtils.debugLog(`[WorldBorderManager-Resize] Error getting border settings for ${dimId}: ${e.message}`, 'System', dependencies);
            continue;
        }

        if (dimBorderSettings?.isResizing && dimBorderSettings.enabled) {
            const currentTimeMs = Date.now();

            // Validate essential resize parameters
            if (typeof dimBorderSettings.resizeStartTimeMs !== 'number' ||
                typeof dimBorderSettings.resizeDurationMs !== 'number' ||
                typeof dimBorderSettings.originalSize !== 'number' ||
                typeof dimBorderSettings.targetSize !== 'number') {
                playerUtils.debugLog(`[WorldBorderManager-Resize] Invalid resize parameters for dimension ${dimId}. Cancelling.`, 'System', dependencies);
                dimBorderSettings.isResizing = false;
                delete dimBorderSettings.originalSize; delete dimBorderSettings.targetSize;
                delete dimBorderSettings.resizeStartTimeMs; delete dimBorderSettings.resizeDurationMs;
                saveBorderSettings(dimId, dimBorderSettings, dependencies);
                continue;
            }

            const accumulatedPausedMs = dimBorderSettings.resizePausedTimeMs || 0;
            let effectiveElapsedMs = (currentTimeMs - dimBorderSettings.resizeStartTimeMs) - accumulatedPausedMs;

            if (dimBorderSettings.isPaused) {
                // If paused, elapsed time is fixed to the moment it was paused
                const lastPauseStart = dimBorderSettings.resizeLastPauseStartTimeMs || currentTimeMs; // Use currentTimeMs if somehow undefined
                effectiveElapsedMs = (lastPauseStart - dimBorderSettings.resizeStartTimeMs) - accumulatedPausedMs;
            }
            effectiveElapsedMs = Math.max(0, effectiveElapsedMs); // Ensure non-negative

            const durationMs = dimBorderSettings.resizeDurationMs;
            if (dimBorderSettings.isPaused) {
                continue; // Skip further processing if paused
            }

            if (effectiveElapsedMs >= durationMs) {
                // Resize complete
                const targetSize = dimBorderSettings.targetSize;
                if (dimBorderSettings.shape === 'square') dimBorderSettings.halfSize = targetSize;
                else if (dimBorderSettings.shape === 'circle') dimBorderSettings.radius = targetSize;

                // Clear resize state
                dimBorderSettings.isResizing = false;
                dimBorderSettings.isPaused = undefined;
                dimBorderSettings.resizePausedTimeMs = undefined;
                dimBorderSettings.resizeLastPauseStartTimeMs = undefined;
                dimBorderSettings.originalSize = undefined;
                dimBorderSettings.targetSize = undefined;
                dimBorderSettings.resizeStartTimeMs = undefined;
                dimBorderSettings.resizeDurationMs = undefined;

                if (saveBorderSettings(dimId, dimBorderSettings, dependencies)) {
                    playerUtils.debugLog(`[WorldBorderManager] Border resize in ${dimId.replace('minecraft:', '')} completed. New size: ${targetSize}.`, 'System', dependencies);
                    logManager.addLog({ adminName: 'System', actionType: 'worldborder_resize_complete', targetName: dimId, details: `Resize to ${targetSize} complete.` }, dependencies);
                } else {
                    playerUtils.debugLog(`[WorldBorderManager] Failed to save completed border resize for ${dimId}.`, 'System', dependencies);
                }
            }
            // No 'else' needed here; if not completed, the border size is interpolated during enforcement.
        }
    }
}

/**
 * Enforces the world border for a given player. Called periodically (e.g., every tick).
 * @param {import('@minecraft/server').Player} player - The player to check.
 * @param {import('../types.js').PlayerAntiCheatData} pData - The player's AntiCheat data.
 * @param {import('../types.js').CommandDependencies} dependencies - Standard dependencies object.
 */
export async function enforceWorldBorderForPlayer(player, pData, dependencies) {
    const { config, playerUtils, logManager, getString, rankManager, permissionLevels, currentTick } = dependencies;

    if (!config.enableWorldBorderSystem) return;

    let borderSettings = getBorderSettings(player.dimension.id, dependencies);
    if (!borderSettings?.enabled) {
        if (pData.ticksOutsideBorder > 0 || pData.borderDamageApplications > 0) {
            pData.ticksOutsideBorder = 0;
            pData.borderDamageApplications = 0;
            pData.isDirtyForSave = true;
        }
        return;
    }

    const playerPermLevel = rankManager.getPlayerPermissionLevel(player, dependencies);
    if (playerPermLevel <= permissionLevels.admin) { // Admins and above bypass
        if (pData.ticksOutsideBorder > 0 || pData.borderDamageApplications > 0) {
            pData.ticksOutsideBorder = 0;
            pData.borderDamageApplications = 0;
            pData.isDirtyForSave = true;
        }
        return;
    }

    const loc = player.location;
    let isPlayerOutside = false;
    let targetX = loc.x, targetZ = loc.z; // Teleport target coordinates
    let currentEffectiveHalfSize = borderSettings.halfSize;
    let currentEffectiveRadius = borderSettings.radius;

    // Calculate current size if resizing
    if (borderSettings.isResizing &&
        typeof borderSettings.originalSize === 'number' &&
        typeof borderSettings.targetSize === 'number' &&
        typeof borderSettings.resizeStartTimeMs === 'number' &&
        typeof borderSettings.resizeDurationMs === 'number') {
        const currentTimeMs = Date.now();
        const accumulatedPausedMs = borderSettings.resizePausedTimeMs || 0;
        let elapsedMs = (currentTimeMs - borderSettings.resizeStartTimeMs) - accumulatedPausedMs;

        if (borderSettings.isPaused) {
            const lastPauseStart = borderSettings.resizeLastPauseStartTimeMs || currentTimeMs;
            elapsedMs = (lastPauseStart - borderSettings.resizeStartTimeMs) - accumulatedPausedMs;
        }
        elapsedMs = Math.max(0, elapsedMs);

        const durationMs = borderSettings.resizeDurationMs;
        let rawProgress = (durationMs > 0) ? Math.min(1, elapsedMs / durationMs) : 1; // If duration is 0, assume complete
        let easedProgress = rawProgress;

        if (borderSettings.resizeInterpolationType === 'easeOutQuad') easedProgress = easeOutQuad(rawProgress);
        else if (borderSettings.resizeInterpolationType === 'easeInOutQuad') easedProgress = easeInOutQuad(rawProgress);

        const interpolatedSize = borderSettings.originalSize + (borderSettings.targetSize - borderSettings.originalSize) * easedProgress;
        if (borderSettings.shape === 'square') currentEffectiveHalfSize = interpolatedSize;
        else if (borderSettings.shape === 'circle') currentEffectiveRadius = interpolatedSize;

    } else if (borderSettings.isResizing) { // Resizing but params might be off, use target or stored
        if (typeof borderSettings.targetSize === 'number') {
            if (borderSettings.shape === 'square') currentEffectiveHalfSize = borderSettings.targetSize;
            else if (borderSettings.shape === 'circle') currentEffectiveRadius = borderSettings.targetSize;
        }
        if (pData.isWatched) playerUtils.debugLog(`[WorldBorderManager] In-progress resize for dim ${player.dimension.id} has incomplete parameters. Using targetSize or stored.`, player.nameTag, dependencies);
    }


    // Check if player is outside
    if (borderSettings.shape === 'square' && typeof currentEffectiveHalfSize === 'number' && currentEffectiveHalfSize > 0) {
        const { centerX, centerZ } = borderSettings;
        const minX = centerX - currentEffectiveHalfSize, maxX = centerX + currentEffectiveHalfSize;
        const minZ = centerZ - currentEffectiveHalfSize, maxZ = centerZ + currentEffectiveHalfSize;
        if (loc.x < minX || loc.x > maxX || loc.z < minZ || loc.z > maxZ) {
            isPlayerOutside = true;
            targetX = loc.x; targetZ = loc.z;
            if (targetX < minX) targetX = minX + 0.5; else if (targetX > maxX) targetX = maxX - 0.5;
            if (targetZ < minZ) targetZ = minZ + 0.5; else if (targetZ > maxZ) targetZ = maxZ - 0.5;
        }
    } else if (borderSettings.shape === 'circle' && typeof currentEffectiveRadius === 'number' && currentEffectiveRadius > 0) {
        const { centerX, centerZ } = borderSettings;
        const dx = loc.x - centerX, dz = loc.z - centerZ;
        const distSq = dx * dx + dz * dz, radiusSq = currentEffectiveRadius * currentEffectiveRadius;
        if (distSq > radiusSq) {
            isPlayerOutside = true;
            const currentDist = Math.sqrt(distSq);
            const teleportOffset = 0.5; // Small offset to ensure player is inside
            if (currentDist === 0 || currentEffectiveRadius <= teleportOffset) { // Avoid division by zero or negative radius
                targetX = centerX + (currentEffectiveRadius > teleportOffset ? currentEffectiveRadius - teleportOffset : 0);
                targetZ = centerZ;
            } else {
                const scale = (currentEffectiveRadius - teleportOffset) / currentDist;
                targetX = centerX + dx * scale;
                targetZ = centerZ + dz * scale;
            }
        }
    } else if (borderSettings.shape) { // Invalid shape or size
        if (pData.isWatched) playerUtils.debugLog(`[WBM] Invalid shape ('${borderSettings.shape}') or size (Sq: ${currentEffectiveHalfSize}, Circ: ${currentEffectiveRadius}) in ${player.dimension.id}. Skipping.`, player.nameTag, dependencies);
    }

    if (isPlayerOutside) {
        pData.ticksOutsideBorder = (pData.ticksOutsideBorder || 0) + 1;
        const enableDamage = borderSettings.enableDamage ?? config.worldBorderDefaultEnableDamage;
        const damageAmount = borderSettings.damageAmount ?? config.worldBorderDefaultDamageAmount;
        const damageIntervalTicks = borderSettings.damageIntervalTicks ?? config.worldBorderDefaultDamageIntervalTicks;
        const teleportAfterNumDamageEvents = borderSettings.teleportAfterNumDamageEvents ?? config.worldBorderTeleportAfterNumDamageEvents;
        let performTeleport = !enableDamage; // Default to teleport if damage is off

        if (enableDamage && damageIntervalTicks > 0 && damageAmount > 0) {
            if (pData.ticksOutsideBorder % damageIntervalTicks === 0) {
                try {
                    player.applyDamage(damageAmount, { cause: mc.EntityDamageCause.worldBorder });
                    pData.borderDamageApplications = (pData.borderDamageApplications || 0) + 1;
                    pData.isDirtyForSave = true;
                    if (pData.isWatched) playerUtils.debugLog(`[WBM] Applied ${damageAmount} damage to ${player.nameTag}. Total: ${pData.borderDamageApplications}`, player.nameTag, dependencies);
                    if (pData.borderDamageApplications >= teleportAfterNumDamageEvents) {
                        performTeleport = true;
                        if (pData.isWatched) playerUtils.debugLog(`[WBM] ${player.nameTag} reached ${pData.borderDamageApplications} damage events. Triggering teleport.`, player.nameTag, dependencies);
                    }
                } catch (e) {
                    console.warn(`[WBM] Failed to apply damage to ${player.nameTag}: ${e}`);
                    playerUtils.debugLog(`[WBM] Failed to apply damage to ${player.nameTag}: ${e.message}`, player.nameTag, dependencies);
                }
            }
        }

        if (performTeleport) {
            const safeY = findSafeTeleportY(player.dimension, targetX, loc.y, targetZ, dependencies);
            try {
                player.teleport({ x: targetX, y: safeY, z: targetZ }, { dimension: player.dimension });
                if (config.worldBorderWarningMessage) playerUtils.warnPlayer(player, getString(config.worldBorderWarningMessage));
                if (pData.isWatched) playerUtils.debugLog(`[WBM] Teleported ${player.nameTag} to XZ(${targetX.toFixed(1)},${targetZ.toFixed(1)}) Y=${safeY}. Reason: ${!enableDamage ? 'Standard' : (pData.borderDamageApplications >= teleportAfterNumDamageEvents ? 'MaxDmg' : 'Error?')}`, player.nameTag, dependencies);
                pData.ticksOutsideBorder = 0;
                pData.borderDamageApplications = 0;
                pData.isDirtyForSave = true;
            } catch (e) {
                console.warn(`[WBM] Failed to teleport player ${player.nameTag}: ${e}`);
                if (pData.isWatched) playerUtils.debugLog(`[WBM] Teleport failed: ${e.message}`, player.nameTag, dependencies);
            }
        }
    } else { // Player is inside
        if (pData.ticksOutsideBorder > 0 || pData.borderDamageApplications > 0) {
            if (pData.isWatched) playerUtils.debugLog(`[WBM] Player ${player.nameTag} re-entered border. Resetting counters.`, player.nameTag, dependencies);
            pData.ticksOutsideBorder = 0;
            pData.borderDamageApplications = 0;
            pData.isDirtyForSave = true;
        }
    }

    // Visuals
    if (config.worldBorderEnableVisuals && borderSettings?.enabled) {
        if (currentTick - (pData.lastBorderVisualTick || 0) >= config.worldBorderVisualUpdateIntervalTicks) {
            pData.lastBorderVisualTick = currentTick;
            const playerLoc = player.location;
            let particleNameToUse;
            const particleSequence = config.worldBorderParticleSequence;

            if (Array.isArray(particleSequence) && particleSequence.length > 0) {
                const visualUpdateInterval = config.worldBorderVisualUpdateIntervalTicks > 0 ? config.worldBorderVisualUpdateIntervalTicks : 20;
                particleNameToUse = particleSequence[Math.floor(currentTick / visualUpdateInterval) % particleSequence.length];
            } else {
                particleNameToUse = borderSettings.particleNameOverride || config.worldBorderParticleName;
            }

            const visualRange = config.worldBorderVisualRange;
            let density = Math.max(0.1, config.worldBorderParticleDensity);

            if (config.worldBorderEnablePulsingDensity) {
                const pulseSpeed = config.worldBorderPulseSpeed > 0 ? config.worldBorderPulseSpeed : 1.0;
                const pulseMin = config.worldBorderPulseDensityMin > 0 ? config.worldBorderPulseDensityMin : 0.1;
                const pulseMax = config.worldBorderPulseDensityMax > pulseMin ? config.worldBorderPulseDensityMax : pulseMin + 1.0;
                density = mapRange(Math.sin((currentTick * pulseSpeed) / 20.0), -1, 1, pulseMin, pulseMax);
                density = Math.max(0.1, density);
            }

            const wallHeight = config.worldBorderParticleWallHeight;
            const segmentLength = config.worldBorderParticleSegmentLength;
            const yBase = Math.floor(playerLoc.y);

            const displayHalfSize = (borderSettings.isResizing && typeof currentEffectiveHalfSize === 'number') ? currentEffectiveHalfSize : borderSettings.halfSize;
            const displayRadius = (borderSettings.isResizing && typeof currentEffectiveRadius === 'number') ? currentEffectiveRadius : borderSettings.radius;

            if (borderSettings.shape === 'square' && typeof displayHalfSize === 'number' && displayHalfSize > 0) {
                const { centerX, centerZ } = borderSettings;
                const minX = centerX - displayHalfSize, maxX = centerX + displayHalfSize;
                const minZ = centerZ - displayHalfSize, maxZ = centerZ + displayHalfSize;

                const spawnLine = (isXAxis, fixedCoord, startDyn, endDyn, playerDynamicCoord) => {
                    const lineLength = Math.min(segmentLength, Math.abs(endDyn - startDyn));
                    let actualStartDyn = playerDynamicCoord - lineLength / 2;
                    let actualEndDyn = playerDynamicCoord + lineLength / 2;
                    actualStartDyn = Math.max(startDyn, actualStartDyn);
                    actualEndDyn = Math.min(endDyn, actualEndDyn);

                    if (actualStartDyn >= actualEndDyn) return;

                    for (let dyn = actualStartDyn; dyn <= actualEndDyn; dyn += (1 / density)) {
                        for (let h = 0; h < wallHeight; h++) {
                            try {
                                const particleLoc = isXAxis ? { x: fixedCoord, y: yBase + h, z: dyn } : { x: dyn, y: yBase + h, z: fixedCoord };
                                player.dimension.spawnParticle(particleNameToUse, particleLoc);
                            } catch (e) { /* ignore particle error */ }
                        }
                    }
                };

                if (Math.abs(playerLoc.x - minX) < visualRange) spawnLine(true, minX, minZ, maxZ, playerLoc.z);
                if (Math.abs(playerLoc.x - maxX) < visualRange) spawnLine(true, maxX, minZ, maxZ, playerLoc.z);
                if (Math.abs(playerLoc.z - minZ) < visualRange) spawnLine(false, minZ, minX, maxX, playerLoc.x);
                if (Math.abs(playerLoc.z - maxZ) < visualRange) spawnLine(false, maxZ, minX, maxX, playerLoc.x);

            } else if (borderSettings.shape === 'circle' && typeof displayRadius === 'number' && displayRadius > 0) {
                const { centerX, centerZ } = borderSettings;
                const radiusToUse = displayRadius;
                if (Math.abs(Math.sqrt(Math.pow(playerLoc.x - centerX, 2) + Math.pow(playerLoc.z - centerZ, 2)) - radiusToUse) < visualRange) {
                    const playerAngle = Math.atan2(playerLoc.z - centerZ, playerLoc.x - centerX);
                    const halfAngleSpan = radiusToUse > 0 ? (segmentLength / 2) / radiusToUse : Math.PI; // Angular span for the segment

                    for (let i = 0; i < segmentLength * density; i++) {
                        // Distribute particles along an arc segment centered around the player's angle to the border
                        const currentAngleOffset = (i / (segmentLength * density) - 0.5) * (segmentLength / radiusToUse);
                        if (Math.abs(currentAngleOffset) > halfAngleSpan && segmentLength * density > 1) continue; // Stay within the defined segment length

                        const angle = playerAngle + currentAngleOffset;
                        const pX = centerX + radiusToUse * Math.cos(angle);
                        const pZ = centerZ + radiusToUse * Math.sin(angle);
                        for (let h = 0; h < wallHeight; h++) {
                            try {
                                player.dimension.spawnParticle(particleNameToUse, { x: pX, y: yBase + h, z: pZ });
                            } catch (e) { /* ignore particle error */ }
                        }
                    }
                }
            }
        }
    }
}

/**
 * Clears the world border settings for a specific dimension from persistent storage.
 * @param {string} dimensionId - The ID of the dimension.
 * @param {import('../types.js').CommandDependencies} dependencies - Standard dependencies object.
 * @returns {boolean} True if clearing was successful or property didn't exist, false on error.
 */
export function clearBorderSettings(dimensionId, dependencies) {
    const { playerUtils } = dependencies;
    if (!dimensionId || typeof dimensionId !== 'string') {
        playerUtils.debugLog('[WorldBorderManager] clearBorderSettings: Invalid dimensionId provided.', null, dependencies);
        return false;
    }
    const propertyKey = worldBorderDynamicPropertyPrefix + dimensionId.replace('minecraft:', '');
    try {
        mc.world.setDynamicProperty(propertyKey, undefined); // Setting to undefined removes the property
        playerUtils.debugLog(`[WorldBorderManager] Successfully cleared border settings for ${dimensionId}.`, 'System', dependencies);
        return true;
    } catch (error) {
        console.error(`[WorldBorderManager] Error clearing border settings for ${dimensionId}: ${error.stack || error}`);
        playerUtils.debugLog(`[WorldBorderManager] Exception clearing border settings for ${dimensionId}: ${error.message}`, 'System', dependencies);
        return false;
    }
}
