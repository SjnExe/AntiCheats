/**
 * @file Manages world border settings and enforcement.
 * @module AntiCheatsBP/scripts/utils/worldBorderManager
 */
import * as mc from '@minecraft/server';

const worldBorderDynamicPropertyPrefix = 'anticheat:worldborder_';

// Constants for calculations and defaults
const borderTeleportInwardOffset = 0.5;
const ticksPerSecond = 20.0;
const defaultPulseDensityMin = 0.1;
const safeTeleportYSearchDownDepth = 10;
const safeTeleportYSearchUpDepth = 5;
const playerHeightBlocks = 2;


/**
 * Calculates the current effective size of the border, accounting for resizing.
 * @param {object} borderSettings The border settings for the dimension.
 * @param {import('../types.js').CommandDependencies} dependencies Standard dependencies object.
 * @returns {{currentSize: number|null, shape: string|null}} Object with currentSize and shape, or nulls if invalid.
 */
function getCurrentEffectiveBorderSize(borderSettings, dependencies) {
    if (!borderSettings || typeof borderSettings.enabled !== 'boolean' || !borderSettings.enabled) {
        return { currentSize: null, shape: null };
    }

    let currentSize = null;
    const shape = borderSettings.shape;
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
        const rawProgress = (durationMs > 0) ? Math.min(1, elapsedMs / durationMs) : 1;
        let easedProgress = rawProgress;
        if (borderSettings.resizeInterpolationType === 'easeOutQuad') {
            easedProgress = easeOutQuad(rawProgress);
        } else if (borderSettings.resizeInterpolationType === 'easeInOutQuad') {
            easedProgress = easeInOutQuad(rawProgress);
        }
        currentSize = borderSettings.originalSize + (borderSettings.targetSize - borderSettings.originalSize) * easedProgress;
    } else if (shape === 'square' && typeof borderSettings.halfSize === 'number') {
        currentSize = borderSettings.halfSize;
    } else if (shape === 'circle' && typeof borderSettings.radius === 'number') {
        currentSize = borderSettings.radius;
    } else if (borderSettings.isResizing && typeof borderSettings.targetSize === 'number') {
        currentSize = borderSettings.targetSize;
        if (dependencies?.playerUtils && dependencies?.config?.enableDebugLogging) {
            dependencies.playerUtils.debugLog(`[WorldBorderManager] In-progress resize for dim ${borderSettings.dimensionId} has incomplete parameters. Using targetSize.`, 'System', dependencies);
        }
    }
    return { currentSize, shape };
}

/**
 * Checks if a player is outside the world border.
 * @param {import('@minecraft/server').Player} player The player to check.
 * @param {import('../types.js').CommandDependencies} dependencies Standard dependencies object.
 * @returns {boolean} True if the player is outside the border, false otherwise.
 */
export function isPlayerOutsideBorder(player, dependencies) {
    const borderSettings = getBorderSettings(player.dimension.id, dependencies);
    if (!borderSettings || !borderSettings.enabled) {
        return false;
    }
    const { currentSize, shape } = getCurrentEffectiveBorderSize(borderSettings, dependencies);
    if (currentSize === null || currentSize <= 0) {
        return false;
    }
    const loc = player.location;
    if (shape === 'square') {
        const { centerX, centerZ } = borderSettings;
        const minX = centerX - currentSize;
        const maxX = centerX + currentSize;
        const minZ = centerZ - currentSize;
        const maxZ = centerZ + currentSize;
        return loc.x < minX || loc.x > maxX || loc.z < minZ || loc.z > maxZ;
    } if (shape === 'circle') {
        const { centerX, centerZ } = borderSettings;
        const dx = loc.x - centerX;
        const dz = loc.z - centerZ;
        const distSq = dx * dx + dz * dz;
        const radiusSq = currentSize * currentSize;
        return distSq > radiusSq;
    }
    return false;
}

/**
 * Retrieves the world border settings for a specific dimension.
 * @param {string} dimensionId The ID of the dimension (e.g., 'minecraft:overworld').
 * @param {import('../types.js').CommandDependencies} dependencies Standard dependencies object.
 * @returns {object|null} The border settings object or null if not found or invalid.
 */
export function getBorderSettings(dimensionId, dependencies) {
    const { playerUtils, logManager } = dependencies; // Added logManager
    if (!dimensionId || typeof dimensionId !== 'string' || dimensionId.trim() === '') {
        // Log an actual error/warning if dimensionId is fundamentally invalid, as this is unexpected from internal calls.
        console.warn(`[WorldBorderManager] getBorderSettings: Called with invalid dimensionId: '${dimensionId}'`);
        playerUtils.debugLog(`[WorldBorderManager] getBorderSettings: Invalid dimensionId provided (type: ${typeof dimensionId}, value: '${dimensionId}').`, null, dependencies);
        return null;
    }

    const normalizedDimId = dimensionId.toLowerCase().replace('minecraft:', '');
    const propertyKey = worldBorderDynamicPropertyPrefix + normalizedDimId;

    try {
        const settingsJson = mc.world.getDynamicProperty(propertyKey);

        if (settingsJson === undefined) {
            // This is a common case (border not set for a dimension), not necessarily an error.
            playerUtils.debugLog(`[WorldBorderManager] No border settings found for dimension '${dimensionId}' (key: ${propertyKey}).`, null, dependencies);
            return null;
        }

        if (typeof settingsJson !== 'string') {
            // This indicates corrupted data type if property exists but isn't a string.
            console.warn(`[WorldBorderManager] Corrupted border settings for dimension '${dimensionId}'. Expected string, got ${typeof settingsJson}. Key: ${propertyKey}`);
            logManager?.addLog({ actionType: 'system_error', context: 'getBorderSettings_corruption', details: `Dimension ${dimensionId}: Expected string for dynamic property, got ${typeof settingsJson}. Key: ${propertyKey}` }, dependencies);
            return null;
        }

        let settings;
        try {
            settings = JSON.parse(settingsJson);
        } catch (parseError) {
            console.error(`[WorldBorderManager] Failed to parse border settings JSON for dimension '${dimensionId}'. Error: ${parseError.stack || parseError}. JSON: "${settingsJson}"`);
            logManager?.addLog({ actionType: 'system_error', context: 'getBorderSettings_json_parse_fail', details: `Dimension ${dimensionId}: JSON parse error. Error: ${parseError.message}. Key: ${propertyKey}`, errorStack: parseError.stack || parseError.toString() }, dependencies);
            return null;
        }

        // Validate core settings structure
        if (!settings || typeof settings.centerX !== 'number' || typeof settings.centerZ !== 'number' ||
            typeof settings.enabled !== 'boolean' || typeof settings.dimensionId !== 'string') {
            console.warn(`[WorldBorderManager] Invalid or corrupt common settings structure for dimension '${dimensionId}'. Settings: ${JSON.stringify(settings)}`);
            logManager?.addLog({ actionType: 'system_error', context: 'getBorderSettings_invalid_structure', details: `Dimension ${dimensionId}: Invalid common settings structure. Loaded: ${JSON.stringify(settings)}. Key: ${propertyKey}` }, dependencies);
            return null;
        }

        // Validate dimensionId consistency
        if (settings.dimensionId !== dimensionId) {
            console.warn(`[WorldBorderManager] Mismatch in dimensionId for '${dimensionId}'. Expected '${dimensionId}', got '${settings.dimensionId}' in stored data. Key: ${propertyKey}`);
            logManager?.addLog({ actionType: 'system_warning', context: 'getBorderSettings_dimension_mismatch', details: `Dimension ${dimensionId}: Mismatch in stored dimensionId. Expected ${dimensionId}, got ${settings.dimensionId}. Key: ${propertyKey}` }, dependencies);
            // Continue, but this is a warning sign. Could choose to return null if strict consistency is required.
        }

        // Validate shape-specific settings
        if (settings.shape === 'square') {
            if (typeof settings.halfSize !== 'number' || settings.halfSize <= 0) {
                console.warn(`[WorldBorderManager] Invalid or non-positive 'halfSize' for square border in '${dimensionId}'. Value: ${settings.halfSize}`);
                logManager?.addLog({ actionType: 'system_error', context: 'getBorderSettings_invalid_halfsize', details: `Dimension ${dimensionId}: Invalid square halfSize: ${settings.halfSize}. Key: ${propertyKey}` }, dependencies);
                return null;
            }
        } else if (settings.shape === 'circle') {
            if (typeof settings.radius !== 'number' || settings.radius <= 0) {
                console.warn(`[WorldBorderManager] Invalid or non-positive 'radius' for circle border in '${dimensionId}'. Value: ${settings.radius}`);
                logManager?.addLog({ actionType: 'system_error', context: 'getBorderSettings_invalid_radius', details: `Dimension ${dimensionId}: Invalid circle radius: ${settings.radius}. Key: ${propertyKey}` }, dependencies);
                return null;
            }
        } else if (settings.shape !== undefined) { // Allows shape to be undefined if border is disabled (though 'enabled' flag is primary)
            console.warn(`[WorldBorderManager] Unknown or invalid shape '${settings.shape}' for dimension '${dimensionId}'.`);
            logManager?.addLog({ actionType: 'system_error', context: 'getBorderSettings_invalid_shape', details: `Dimension ${dimensionId}: Unknown shape: ${settings.shape}. Key: ${propertyKey}` }, dependencies);
            return null; // Or default to a disabled state if preferred
        }

        // Default resizeInterpolationType if missing during an active resize
        if (settings.isResizing && settings.resizeInterpolationType === undefined) {
            settings.resizeInterpolationType = 'linear';
        }

        return settings;

    } catch (error) {
        // Catch any other unexpected errors during dynamic property access or other logic
        console.error(`[WorldBorderManager] Unexpected error in getBorderSettings for dimension '${dimensionId}': ${error.stack || error}`);
        logManager?.addLog({ actionType: 'system_error', context: 'getBorderSettings_unexpected_exception', details: `Dimension ${dimensionId}: Unexpected error: ${error.message}. Key: ${propertyKey}`, errorStack: error.stack || error.toString() }, dependencies);
    }

    return null; // Default return if any error path leads here
}

/**
 * Saves the world border settings for a specific dimension.
 * @param {string} dimensionId The ID of the dimension.
 * @param {object} settingsToSave The border settings object to save.
 * @param {import('../types.js').CommandDependencies} dependencies Standard dependencies object.
 * @returns {boolean} True if saving was successful, false otherwise.
 */
export function saveBorderSettings(dimensionId, settingsToSave, dependencies) {
    const { playerUtils } = dependencies;
    if (!dimensionId || typeof dimensionId !== 'string' || !settingsToSave) {
        playerUtils.debugLog('[WorldBorderManager] saveBorderSettings: Invalid dimensionId or settings provided.', null, dependencies);
        return false;
    }
    const propertyKey = worldBorderDynamicPropertyPrefix + dimensionId.toLowerCase().replace('minecraft:', '');
    const fullSettings = { ...settingsToSave, dimensionId };
    if (fullSettings.shape === 'square') {
        if (typeof fullSettings.halfSize !== 'number' || fullSettings.halfSize <= 0) {
            playerUtils.debugLog(`[WorldBorderManager] saveBorderSettings: Invalid 'halfSize' for square shape. Value: ${fullSettings.halfSize}`, 'System', dependencies);
            return false;
        }
        fullSettings.radius = undefined;
    } else if (fullSettings.shape === 'circle') {
        if (typeof fullSettings.radius !== 'number' || fullSettings.radius <= 0) {
            playerUtils.debugLog(`[WorldBorderManager] saveBorderSettings: Invalid or non-positive 'radius' for circle shape. Value: ${fullSettings.radius}`, 'System', dependencies);
            return false;
        }
        fullSettings.halfSize = undefined;
    } else if (fullSettings.shape) {
        playerUtils.debugLog(`[WorldBorderManager] saveBorderSettings: Unknown shape '${fullSettings.shape}' provided.`, 'System', dependencies);
        return false;
    }
    const resizeFields = ['isResizing', 'originalSize', 'targetSize', 'resizeStartTimeMs', 'resizeDurationMs'];
    const hasSomeResizeFields = resizeFields.some(field => fullSettings[field] !== undefined);
    const hasAllResizeFieldsIfResizing = fullSettings.isResizing ?
        (typeof fullSettings.originalSize === 'number' && typeof fullSettings.targetSize === 'number' &&
         typeof fullSettings.resizeStartTimeMs === 'number' && typeof fullSettings.resizeDurationMs === 'number' && fullSettings.resizeDurationMs > 0)
        : true;
    if (hasSomeResizeFields && !hasAllResizeFieldsIfResizing && fullSettings.isResizing) {
        playerUtils.debugLog('[WorldBorderManager] saveBorderSettings: Incomplete or invalid resize operation data.', 'System', dependencies);
        return false;
    }
    if (!fullSettings.isResizing) {
        fullSettings.isResizing = undefined; fullSettings.originalSize = undefined; fullSettings.targetSize = undefined;
        fullSettings.resizeStartTimeMs = undefined; fullSettings.resizeDurationMs = undefined;
        fullSettings.isPaused = undefined; fullSettings.resizePausedTimeMs = undefined; fullSettings.resizeLastPauseStartTimeMs = undefined;
        fullSettings.resizeInterpolationType = undefined;
    } else {
        if (!fullSettings.isPaused) {
            fullSettings.resizeLastPauseStartTimeMs = undefined;
        }
        const validInterpolationTypes = ['linear', 'easeOutQuad', 'easeInOutQuad'];
        if (!fullSettings.resizeInterpolationType || !validInterpolationTypes.includes(fullSettings.resizeInterpolationType)) {
            fullSettings.resizeInterpolationType = 'linear';
        }
    }
    if (typeof settingsToSave.particleNameOverride === 'string') {
        const particleOverride = settingsToSave.particleNameOverride.trim();
        if (particleOverride === '' || particleOverride.toLowerCase() === 'reset' || particleOverride.toLowerCase() === 'default') {
            fullSettings.particleNameOverride = undefined;
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

/**
 * Quadratic easing out function.
 * @param {number} t Progress ratio from 0 to 1.
 * @returns {number} Eased value.
 */
function easeOutQuad(t) {
    return t * (2 - t);
}

/**
 * Quadratic easing in and out function.
 * @param {number} t Progress ratio from 0 to 1.
 * @returns {number} Eased value.
 */
function easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

/**
 * Finds a safe Y-coordinate for teleportation.
 * @param {import('@minecraft/server').Dimension} dimension The dimension to search within.
 * @param {number} targetX The target X-coordinate.
 * @param {number} initialY The initial Y-coordinate to search from.
 * @param {number} targetZ The target Z-coordinate.
 * @returns {number} A safe Y-coordinate for teleportation.
 */
function findSafeTeleportY(dimension, targetX, initialY, targetZ) {
    const minDimensionHeight = dimension.heightRange.min;
    const maxDimensionHeight = dimension.heightRange.max - playerHeightBlocks;
    const currentY = Math.max(minDimensionHeight, Math.min(Math.floor(initialY), maxDimensionHeight));

    for (let i = 0; i < safeTeleportYSearchDownDepth; i++) {
        const checkY = currentY - i;
        if (checkY < minDimensionHeight) {
            break;
        }
        const blockFeet = dimension.getBlock({ x: targetX, y: checkY, z: targetZ });
        const blockHead = dimension.getBlock({ x: targetX, y: checkY + 1, z: targetZ });
        if (blockFeet?.isAir && blockHead?.isAir) {
            const blockBelowFeet = dimension.getBlock({ x: targetX, y: checkY - 1, z: targetZ });
            if (blockBelowFeet?.isSolid) {
                return checkY;
            }
        }
    }

    const searchUpStartY = Math.max(minDimensionHeight, Math.min(Math.floor(initialY), maxDimensionHeight));
    for (let i = 1; i < safeTeleportYSearchUpDepth; i++) {
        const checkY = searchUpStartY + i;
        if (checkY > maxDimensionHeight) {
            break;
        }
        const blockFeet = dimension.getBlock({ x: targetX, y: checkY, z: targetZ });
        const blockHead = dimension.getBlock({ x: targetX, y: checkY + 1, z: targetZ });
        if (blockFeet?.isAir && blockHead?.isAir) {
            const blockBelowFeet = dimension.getBlock({ x: targetX, y: checkY - 1, z: targetZ });
            if (blockBelowFeet?.isSolid) {
                return checkY;
            }
        }
    }
    return Math.floor(initialY);
}

/**
 * Processes active world border resizing operations.
 * @param {import('../types.js').CommandDependencies} dependencies Standard dependencies object.
 */
export function processWorldBorderResizing(dependencies) {
    const { config, playerUtils, logManager } = dependencies; // Added logManager back
    const knownBorderDimensions = config.worldBorderKnownDimensions ?? ['minecraft:overworld', 'minecraft:the_nether', 'minecraft:the_end'];
    for (const dimId of knownBorderDimensions) {
        let dimBorderSettings = null;
        dimBorderSettings = getBorderSettings(dimId, dependencies);
        if (dimBorderSettings?.isResizing && dimBorderSettings.enabled) {
            const currentTimeMs = Date.now();
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
                const lastPauseStart = dimBorderSettings.resizeLastPauseStartTimeMs || currentTimeMs;
                effectiveElapsedMs = (lastPauseStart - dimBorderSettings.resizeStartTimeMs) - accumulatedPausedMs;
            }
            effectiveElapsedMs = Math.max(0, effectiveElapsedMs);
            const durationMs = dimBorderSettings.resizeDurationMs;
            if (dimBorderSettings.isPaused) {
                continue;
            }
            if (effectiveElapsedMs >= durationMs) {
                const targetSize = dimBorderSettings.targetSize;
                if (dimBorderSettings.shape === 'square') {
                    dimBorderSettings.halfSize = targetSize;
                } else if (dimBorderSettings.shape === 'circle') {
                    dimBorderSettings.radius = targetSize;
                }
                dimBorderSettings.isResizing = false;
                dimBorderSettings.isPaused = undefined;
                dimBorderSettings.resizePausedTimeMs = undefined;
                dimBorderSettings.resizeLastPauseStartTimeMs = undefined;
                dimBorderSettings.originalSize = undefined;
                dimBorderSettings.targetSize = undefined;
                dimBorderSettings.resizeStartTimeMs = undefined;
                dimBorderSettings.resizeDurationMs = undefined;
                if (saveBorderSettings(dimId, dimBorderSettings, dependencies)) {
                    playerUtils.debugLog(`[WorldBorderManager] Border resize in ${playerUtils.formatDimensionName(dimId)} completed. New size: ${targetSize}.`, 'System', dependencies);
                    logManager.addLog({ adminName: 'System', actionType: 'worldborder_resize_complete', targetName: dimId, details: `Resize to ${targetSize} complete.` }, dependencies);
                } else {
                    playerUtils.debugLog(`[WorldBorderManager] Failed to save completed border resize for ${dimId}.`, 'System', dependencies);
                }
            }
        }
    }
}

/**
 * Enforces the world border for a given player.
 * @param {import('@minecraft/server').Player} player The player to check.
 * @param {import('../types.js').PlayerAntiCheatData} pData The player's AntiCheat data.
 * @param {import('../types.js').CommandDependencies} dependencies Standard dependencies object.
 */
export function enforceWorldBorderForPlayer(player, pData, dependencies) {
    const { config, playerUtils, getString, rankManager, permissionLevels, currentTick } = dependencies; // Renamed logManager
    if (!config.enableWorldBorderSystem) {
        return;
    }
    const borderSettings = getBorderSettings(player.dimension.id, dependencies);
    if (!borderSettings?.enabled) {
        if (pData.ticksOutsideBorder > 0 || pData.borderDamageApplications > 0) {
            pData.ticksOutsideBorder = 0;
            pData.borderDamageApplications = 0;
            pData.isDirtyForSave = true;
        }
        return;
    }
    const playerPermLevel = rankManager.getPlayerPermissionLevel(player, dependencies);
    if (playerPermLevel <= permissionLevels.admin) {
        if (pData.ticksOutsideBorder > 0 || pData.borderDamageApplications > 0) {
            pData.ticksOutsideBorder = 0;
            pData.borderDamageApplications = 0;
            pData.isDirtyForSave = true;
        }
        return;
    }
    const loc = player.location;
    let targetX = loc.x, targetZ = loc.z;
    const playerIsCurrentlyOutside = isPlayerOutsideBorder(player, dependencies);
    if (playerIsCurrentlyOutside) {
        const { currentSize, shape } = getCurrentEffectiveBorderSize(borderSettings, dependencies);
        if (currentSize !== null && currentSize > 0) {
            if (shape === 'square') {
                const { centerX, centerZ } = borderSettings;
                const minX = centerX - currentSize;
                const maxX = centerX + currentSize;
                const minZ = centerZ - currentSize;
                const maxZ = centerZ + currentSize;
                if (loc.x < minX) {
                    targetX = minX + borderTeleportInwardOffset;
                } else if (loc.x > maxX) {
                    targetX = maxX - borderTeleportInwardOffset;
                }
                if (loc.z < minZ) {
                    targetZ = minZ + borderTeleportInwardOffset;
                } else if (loc.z > maxZ) {
                    targetZ = maxZ - borderTeleportInwardOffset;
                }
            } else if (shape === 'circle') {
                const { centerX, centerZ } = borderSettings;
                const dx = loc.x - centerX;
                const dz = loc.z - centerZ;
                const distSq = dx * dx + dz * dz;
                const currentDist = Math.sqrt(distSq);
                if (currentDist === 0 || currentSize <= borderTeleportInwardOffset) {
                    targetX = centerX + (currentSize > borderTeleportInwardOffset ? currentSize - borderTeleportInwardOffset : 0);
                    targetZ = centerZ;
                } else {
                    const scale = (currentSize - borderTeleportInwardOffset) / currentDist;
                    targetX = centerX + dx * scale;
                    targetZ = centerZ + dz * scale;
                }
            }
        }
        pData.ticksOutsideBorder = (pData.ticksOutsideBorder || 0) + 1;
        const enableDamage = borderSettings.enableDamage ?? config.worldBorderDefaultEnableDamage;
        const damageAmount = borderSettings.damageAmount ?? config.worldBorderDefaultDamageAmount;
        const damageIntervalTicks = borderSettings.damageIntervalTicks ?? config.worldBorderDefaultDamageIntervalTicks;
        const teleportAfterNumDamageEvents = borderSettings.teleportAfterNumDamageEvents ?? config.worldBorderTeleportAfterNumDamageEvents;
        let performTeleport = !enableDamage;
        if (enableDamage && damageIntervalTicks > 0 && damageAmount > 0) {
            if (pData.ticksOutsideBorder % damageIntervalTicks === 0) {
                player.applyDamage(damageAmount, { cause: mc.EntityDamageCause.worldBorder });
                pData.borderDamageApplications = (pData.borderDamageApplications || 0) + 1;
                pData.isDirtyForSave = true;
                if (pData.isWatched) {
                    playerUtils.debugLog(`[WBM] Applied ${damageAmount} damage to ${player.nameTag}. Total: ${pData.borderDamageApplications}`, player.nameTag, dependencies);
                }
                if (pData.borderDamageApplications >= teleportAfterNumDamageEvents) {
                    performTeleport = true;
                    if (pData.isWatched) {
                        playerUtils.debugLog(`[WBM] ${player.nameTag} reached ${pData.borderDamageApplications} damage events. Triggering teleport.`, player.nameTag, dependencies);
                    }
                }
            }
        }
        if (performTeleport) {
            const safeY = findSafeTeleportY(player.dimension, targetX, loc.y, targetZ, dependencies);
            player.teleport({ x: targetX, y: safeY, z: targetZ }, { dimension: player.dimension });
            if (config.worldBorderWarningMessage) {
                playerUtils.warnPlayer(player, getString(config.worldBorderWarningMessage));
            }
            if (pData.isWatched) {
                playerUtils.debugLog(`[WBM] Teleported ${player.nameTag} to XZ(${targetX.toFixed(1)},${targetZ.toFixed(1)}) Y=${safeY}. Reason: ${!enableDamage ? 'Standard' : (pData.borderDamageApplications >= teleportAfterNumDamageEvents ? 'MaxDmg' : 'Error?')}`, player.nameTag, dependencies);
            }
            pData.ticksOutsideBorder = 0;
            pData.borderDamageApplications = 0;
            pData.isDirtyForSave = true;
        }
    } else {
        if (pData.ticksOutsideBorder > 0 || pData.borderDamageApplications > 0) {
            if (pData.isWatched) {
                playerUtils.debugLog(`[WBM] Player ${player.nameTag} re-entered border. Resetting counters.`, player.nameTag, dependencies);
            }
            pData.ticksOutsideBorder = 0;
            pData.borderDamageApplications = 0;
            pData.isDirtyForSave = true;
        }
    }
    if (config.worldBorderEnableVisuals && borderSettings?.enabled) {
        if (currentTick - (pData.lastBorderVisualTick || 0) >= config.worldBorderVisualUpdateIntervalTicks) {
            pData.lastBorderVisualTick = currentTick;
            const playerLoc = player.location;
            let particleNameToUse;
            const particleSequence = config.worldBorderParticleSequence;
            if (Array.isArray(particleSequence) && particleSequence.length > 0) {
                const visualUpdateInterval = config.worldBorderVisualUpdateIntervalTicks > 0 ? config.worldBorderVisualUpdateIntervalTicks : ticksPerSecond;
                particleNameToUse = particleSequence[Math.floor(currentTick / visualUpdateInterval) % particleSequence.length];
            } else {
                particleNameToUse = borderSettings.particleNameOverride || config.worldBorderParticleName;
            }
            const visualRange = config.worldBorderVisualRange;
            let density = Math.max(defaultPulseDensityMin, config.worldBorderParticleDensity);
            if (config.worldBorderEnablePulsingDensity) {
                const pulseSpeed = config.worldBorderPulseSpeed > 0 ? config.worldBorderPulseSpeed : 1.0;
                const pulseMin = config.worldBorderPulseDensityMin > 0 ? config.worldBorderPulseDensityMin : defaultPulseDensityMin;
                const pulseMax = config.worldBorderPulseDensityMax > pulseMin ? config.worldBorderPulseDensityMax : pulseMin + 1.0;
                density = pulseMin + (Math.sin((currentTick * pulseSpeed) / ticksPerSecond) + 1) * 0.5 * (pulseMax - pulseMin); // 0.5 here is for sin normalization
                density = Math.max(defaultPulseDensityMin, density);
            }
            const wallHeight = config.worldBorderParticleWallHeight;
            const segmentLength = config.worldBorderParticleSegmentLength;
            const yBase = Math.floor(playerLoc.y);
            // Get current effective size considering resizing
            const { currentSize: currentEffectiveSize, shape: currentShape } = getCurrentEffectiveBorderSize(borderSettings, dependencies);

            if (currentShape === 'square' && typeof currentEffectiveSize === 'number' && currentEffectiveSize > 0) {
                const { centerX, centerZ } = borderSettings;
                const minX = centerX - currentEffectiveSize, maxX = centerX + currentEffectiveSize;
                const minZ = centerZ - currentEffectiveSize, maxZ = centerZ + currentEffectiveSize;
                /**
                 * Spawns particles along a line segment for the world border visual.
 * @param {boolean} isXAxis True if the line is parallel to the X-axis.
 * @param {number} fixedCoord The fixed coordinate value.
 * @param {number} startDyn The starting dynamic coordinate value.
 * @param {number} endDyn The ending dynamic coordinate value.
 * @param {number} playerDynamicCoord The player's current dynamic coordinate.
                 */
                const spawnLine = (isXAxis, fixedCoord, startDyn, endDyn, playerDynamicCoord) => {
                    const lineLength = Math.min(segmentLength, Math.abs(endDyn - startDyn));
                    let actualStartDyn = playerDynamicCoord - lineLength / 2;
                    let actualEndDyn = playerDynamicCoord + lineLength / 2;
                    actualStartDyn = Math.max(startDyn, actualStartDyn);
                    actualEndDyn = Math.min(endDyn, actualEndDyn);
                    if (actualStartDyn >= actualEndDyn) {
                        return;
                    }
                    for (let dyn = actualStartDyn; dyn <= actualEndDyn; dyn += (1 / density)) {
                        for (let h = 0; h < wallHeight; h++) {
                            const particleLoc = isXAxis ? { x: fixedCoord, y: yBase + h, z: dyn } : { x: dyn, y: yBase + h, z: fixedCoord };
                            player.dimension.spawnParticle(particleNameToUse, particleLoc);
                        }
                    }
                };
                if (Math.abs(playerLoc.x - minX) < visualRange) {
                    spawnLine(true, minX, minZ, maxZ, playerLoc.z);
                }
                if (Math.abs(playerLoc.x - maxX) < visualRange) {
                    spawnLine(true, maxX, minZ, maxZ, playerLoc.z);
                }
                if (Math.abs(playerLoc.z - minZ) < visualRange) {
                    spawnLine(false, minZ, minX, maxX, playerLoc.x);
                }
                if (Math.abs(playerLoc.z - maxZ) < visualRange) {
                    spawnLine(false, maxZ, minX, maxX, playerLoc.x);
                }
            } else if (currentShape === 'circle' && typeof currentEffectiveSize === 'number' && currentEffectiveSize > 0) {
                const { centerX, centerZ } = borderSettings;
                const radiusToUse = currentEffectiveSize;
                if (Math.abs(Math.sqrt(Math.pow(playerLoc.x - centerX, 2) + Math.pow(playerLoc.z - centerZ, 2)) - radiusToUse) < visualRange) {
                    const playerAngle = Math.atan2(playerLoc.z - centerZ, playerLoc.x - centerX);
                    const halfAngleSpan = radiusToUse > 0 ? (segmentLength / 2) / radiusToUse : Math.PI; // Ensure radiusToUse is positive
                    for (let i = 0; i < segmentLength * density; i++) {
                        const currentAngleOffset = radiusToUse > 0 ? (i / (segmentLength * density) - 0.5) * (segmentLength / radiusToUse) : 0;
                        if (Math.abs(currentAngleOffset) > halfAngleSpan && segmentLength * density > 1) {
                            continue;
                        }
                        const angle = playerAngle + currentAngleOffset;
                        const pX = centerX + radiusToUse * Math.cos(angle);
                        const pZ = centerZ + radiusToUse * Math.sin(angle);
                        for (let h = 0; h < wallHeight; h++) {
                            player.dimension.spawnParticle(particleNameToUse, { x: pX, y: yBase + h, z: pZ });
                        }
                    }
                }
            }
        }
    }
}

/**
 * Clears the world border settings for a specific dimension.
 * @param {string} dimensionId The ID of the dimension.
 * @param {import('../types.js').CommandDependencies} dependencies Standard dependencies object.
 * @returns {boolean} True if clearing was successful, false on error.
 */
export function clearBorderSettings(dimensionId, dependencies) {
    const { playerUtils } = dependencies;
    if (!dimensionId || typeof dimensionId !== 'string') {
        playerUtils.debugLog('[WorldBorderManager] clearBorderSettings: Invalid dimensionId provided.', null, dependencies);
        return false;
    }
    const propertyKey = worldBorderDynamicPropertyPrefix + dimensionId.toLowerCase().replace('minecraft:', '');
    try {
        mc.world.setDynamicProperty(propertyKey, undefined);
        playerUtils.debugLog(`[WorldBorderManager] Successfully cleared border settings for ${dimensionId}.`, 'System', dependencies);
        return true;
    } catch (error) {
        console.error(`[WorldBorderManager] Error clearing border settings for ${dimensionId}: ${error.stack || error}`);
        playerUtils.debugLog(`[WorldBorderManager] Exception clearing border settings for ${dimensionId}: ${error.message}`, 'System', dependencies);
        return false;
    }
}
