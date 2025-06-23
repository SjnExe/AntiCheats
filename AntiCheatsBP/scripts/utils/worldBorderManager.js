/**
 * Manages the storage and retrieval of world border settings using world dynamic properties.
 */
import * as mc from '@minecraft/server';

const worldBorderDynamicPropertyPrefix = "anticheat:worldborder_";

export function getBorderSettings(dimensionId, dependencies) {
    const { playerUtils } = dependencies;
    if (!dimensionId || typeof dimensionId !== 'string') {
        playerUtils.debugLog("[WorldBorderManager] getBorderSettings: Invalid dimensionId provided.", null, dependencies);
        return null;
    }
    const propertyKey = worldBorderDynamicPropertyPrefix + dimensionId.replace("minecraft:", "");
    try {
        const settingsJson = mc.world.getDynamicProperty(propertyKey);
        if (typeof settingsJson === 'string') {
            const settings = JSON.parse(settingsJson);
            if (!settings || typeof settings.centerX !== 'number' || typeof settings.centerZ !== 'number' ||
                typeof settings.enabled !== 'boolean' || settings.dimensionId !== dimensionId) {
                playerUtils.debugLog(`[WorldBorderManager] Invalid or corrupt common settings for ${dimensionId}. Settings: ${JSON.stringify(settings)}`, "System", dependencies);
                return null;
            }
            if (settings.shape === "square") {
                if (typeof settings.halfSize !== 'number' || settings.halfSize <= 0) {
                    playerUtils.debugLog(`[WorldBorderManager] Invalid or non-positive 'halfSize' for square border in ${dimensionId}. Value: ${settings.halfSize}`, "System", dependencies);
                    return null;
                }
            } else if (settings.shape === "circle") {
                if (typeof settings.radius !== 'number' || settings.radius <= 0) {
                    playerUtils.debugLog(`[WorldBorderManager] Invalid or non-positive 'radius' for circle border in ${dimensionId}. Value: ${settings.radius}`, "System", dependencies);
                    return null;
                }
            } else {
                playerUtils.debugLog(`[WorldBorderManager] Unknown or invalid shape '${settings.shape}' for ${dimensionId}. Defaulting to no border.`, "System", dependencies);
                return null;
            }
            if (settings.isResizing && settings.resizeInterpolationType === undefined) {
                settings.resizeInterpolationType = "linear";
            }
            return settings;
        }
    } catch (error) {
        console.error(`[WorldBorderManager] Error in getBorderSettings for ${dimensionId}: ${error.stack || error}`);
        playerUtils.debugLog(`[WorldBorderManager] Exception in getBorderSettings for ${dimensionId}: ${error.message}`, "System", dependencies);
    }
    return null;
}

export function saveBorderSettings(dimensionId, settingsToSave, dependencies) {
    const { playerUtils } = dependencies;
    if (!dimensionId || typeof dimensionId !== 'string' || !settingsToSave) {
        playerUtils.debugLog("[WorldBorderManager] saveBorderSettings: Invalid dimensionId or settings provided.", null, dependencies);
        return false;
    }
    const propertyKey = worldBorderDynamicPropertyPrefix + dimensionId.replace("minecraft:", "");
    const fullSettings = { ...settingsToSave, dimensionId: dimensionId };

    if (fullSettings.shape === "square") {
        if (typeof fullSettings.halfSize !== 'number' || fullSettings.halfSize <= 0) {
            playerUtils.debugLog(`[WorldBorderManager] saveBorderSettings: Invalid 'halfSize' for square shape. Value: ${fullSettings.halfSize}`, "System", dependencies);
            return false;
        }
        fullSettings.radius = undefined;
    } else if (fullSettings.shape === "circle") {
        if (typeof fullSettings.radius !== 'number' || fullSettings.radius <= 0) {
            playerUtils.debugLog(`[WorldBorderManager] saveBorderSettings: Invalid or non-positive 'radius' for circle shape. Value: ${fullSettings.radius}`, "System", dependencies);
            return false;
        }
        fullSettings.halfSize = undefined;
    } else if (fullSettings.shape) {
        playerUtils.debugLog(`[WorldBorderManager] saveBorderSettings: Unknown shape '${fullSettings.shape}' provided.`, "System", dependencies);
        return false;
    } else {
        playerUtils.debugLog("[WorldBorderManager] saveBorderSettings: Shape is required.", "System", dependencies);
        return false;
    }

    const resizeFields = ['isResizing', 'originalSize', 'targetSize', 'resizeStartTimeMs', 'resizeDurationMs'];
    const hasSomeResizeFields = resizeFields.some(field => fullSettings[field] !== undefined);
    const hasAllResizeFieldsIfResizing = fullSettings.isResizing ?
        (typeof fullSettings.originalSize === 'number' && typeof fullSettings.targetSize === 'number' &&
         typeof fullSettings.resizeStartTimeMs === 'number' && typeof fullSettings.resizeDurationMs === 'number' && fullSettings.resizeDurationMs > 0)
        : true;

    if (hasSomeResizeFields && !hasAllResizeFieldsIfResizing && fullSettings.isResizing) {
        playerUtils.debugLog("[WorldBorderManager] saveBorderSettings: Incomplete or invalid resize operation data.", "System", dependencies);
        return false;
    }

    if (!fullSettings.isResizing) {
        fullSettings.isResizing = undefined; fullSettings.originalSize = undefined; fullSettings.targetSize = undefined;
        fullSettings.resizeStartTimeMs = undefined; fullSettings.resizeDurationMs = undefined;
        fullSettings.isPaused = undefined; fullSettings.resizePausedTimeMs = undefined; fullSettings.resizeLastPauseStartTimeMs = undefined;
    } else {
        if (!fullSettings.isPaused) fullSettings.resizeLastPauseStartTimeMs = undefined;
        if (fullSettings.isResizing) {
            const validInterpolationTypes = ["linear", "easeOutQuad", "easeInOutQuad"];
            if (!fullSettings.resizeInterpolationType || !validInterpolationTypes.includes(fullSettings.resizeInterpolationType)) {
                fullSettings.resizeInterpolationType = "linear";
            }
        } else {
            fullSettings.resizeInterpolationType = undefined;
        }
    }
    if (typeof settingsToSave.particleNameOverride === 'string') {
        const particleOverride = settingsToSave.particleNameOverride.trim();
        if (particleOverride === "" || particleOverride.toLowerCase() === "reset" || particleOverride.toLowerCase() === "default") {
            fullSettings.particleNameOverride = undefined;
        } else {
            fullSettings.particleNameOverride = particleOverride;
        }
    }
    try {
        mc.world.setDynamicProperty(propertyKey, JSON.stringify(fullSettings));
        playerUtils.debugLog(`[WorldBorderManager] Successfully saved border settings for ${dimensionId}.`, "System", dependencies);
        return true;
    } catch (error) {
        console.error(`[WorldBorderManager] Error saving border settings for ${dimensionId}: ${error.stack || error}`);
        playerUtils.debugLog(`[WorldBorderManager] Exception saving border settings for ${dimensionId}: ${error.message}`, "System", dependencies);
        return false;
    }
}

function easeOutQuad(t) { return t * (2 - t); }
function easeInOutQuad(t) { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; }
function mapRange(value, inMin, inMax, outMin, outMax) { return (value - inMin) * (outMax - outMin) / (inMax - inMin) + outMin; }

function findSafeTeleportY(dimension, targetX, initialY, targetZ, dependencies) {
    const { playerUtils } = dependencies; // Not used, but good practice for util functions
    const minDimensionHeight = dimension.heightRange.min;
    const maxDimensionHeight = dimension.heightRange.max - 2;
    let currentY = Math.max(minDimensionHeight, Math.min(Math.floor(initialY), maxDimensionHeight));
    const maxSearchDepthDown = 10, maxSearchDepthUp = 5;

    for (let i = 0; i < maxSearchDepthDown; i++) {
        const checkY = currentY - i;
        if (checkY < minDimensionHeight) break;
        try {
            const blockFeet = dimension.getBlock({ x: targetX, y: checkY, z: targetZ });
            const blockHead = dimension.getBlock({ x: targetX, y: checkY + 1, z: targetZ });
            if (blockFeet?.isAir && blockHead?.isAir) { // Added optional chaining
                const blockBelowFeet = dimension.getBlock({ x: targetX, y: checkY - 1, z: targetZ });
                if (blockBelowFeet?.isSolid) return checkY; // Added optional chaining
                else if (blockFeet.isAir && blockHead.isAir) return checkY; // This condition seems redundant if blockBelowFeet is not solid
            }
        } catch (e) { /* Ignored */ }
    }
    let searchUpStartY = Math.max(minDimensionHeight, Math.min(Math.floor(initialY), maxDimensionHeight));
    for (let i = 1; i < maxSearchDepthUp; i++) {
        const checkY = searchUpStartY + i;
        if (checkY > maxDimensionHeight) break;
        try {
            const blockFeet = dimension.getBlock({ x: targetX, y: checkY, z: targetZ });
            const blockHead = dimension.getBlock({ x: targetX, y: checkY + 1, z: targetZ });
             if (blockFeet?.isAir && blockHead?.isAir) { // Added optional chaining
                const blockBelowFeet = dimension.getBlock({ x: targetX, y: checkY - 1, z: targetZ });
                if (blockBelowFeet?.isSolid) return checkY; // Added optional chaining
                 else if (blockFeet.isAir && blockHead.isAir) return checkY; // Redundant
            }
        } catch(e) { /* Ignored */ }
    }
    return Math.floor(initialY);
}

export function processWorldBorderResizing(dependencies) {
    const { config, playerUtils, logManager } = dependencies; // Removed mc as it's imported globally
    const knownBorderDimensions = config.worldBorderKnownDimensions ?? ["minecraft:overworld", "minecraft:the_nether", "minecraft:the_end"];

    for (const dimId of knownBorderDimensions) {
        let dimBorderSettings = null;
        try { dimBorderSettings = getBorderSettings(dimId, dependencies); }
        catch (e) {
            console.error(`[WorldBorderManager-Resize] Error getting border settings for ${dimId} during resize check: ${e.stack || e}`);
            playerUtils.debugLog(`[WorldBorderManager-Resize] Error getting border settings for ${dimId}: ${e.message}`, "System", dependencies);
            continue;
        }
        if (dimBorderSettings?.isResizing && dimBorderSettings.enabled) {
            const currentTimeMs = Date.now();
            if (typeof dimBorderSettings.resizeStartTimeMs !== 'number' || typeof dimBorderSettings.resizeDurationMs !== 'number' || typeof dimBorderSettings.originalSize !== 'number' || typeof dimBorderSettings.targetSize !== 'number') {
                playerUtils.debugLog(`[WorldBorderManager-Resize] Invalid resize parameters for dimension ${dimId}. Cancelling.`, "System", dependencies);
                dimBorderSettings.isResizing = false; delete dimBorderSettings.originalSize; delete dimBorderSettings.targetSize;
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
            if (dimBorderSettings.isPaused) continue;

            if (effectiveElapsedMs >= durationMs) {
                const targetSize = dimBorderSettings.targetSize;
                if (dimBorderSettings.shape === "square") dimBorderSettings.halfSize = targetSize;
                else if (dimBorderSettings.shape === "circle") dimBorderSettings.radius = targetSize;
                dimBorderSettings.isResizing = false; dimBorderSettings.isPaused = undefined; dimBorderSettings.resizePausedTimeMs = undefined;
                dimBorderSettings.resizeLastPauseStartTimeMs = undefined; dimBorderSettings.originalSize = undefined; dimBorderSettings.targetSize = undefined;
                dimBorderSettings.resizeStartTimeMs = undefined; dimBorderSettings.resizeDurationMs = undefined;
                if (saveBorderSettings(dimId, dimBorderSettings, dependencies)) {
                     playerUtils.debugLog(`[WorldBorderManager] Border resize in ${dimId.replace("minecraft:","")} completed. New size: ${targetSize}.`, "System", dependencies);
                     logManager.addLog({ adminName: 'System', actionType: 'worldborder_resize_complete', targetName: dimId, details: `Resize to ${targetSize} complete.` }, dependencies);
                } else {
                    playerUtils.debugLog(`[WorldBorderManager] Failed to save completed border resize for ${dimId}.`, "System", dependencies);
                }
            }
        }
    }
}

export async function enforceWorldBorderForPlayer(player, pData, dependencies) {
    const { config, playerUtils, logManager, getString, rankManager, permissionLevels, currentTick } = dependencies; // Removed mc
    if (!config.enableWorldBorderSystem) return;
    let borderSettings = getBorderSettings(player.dimension.id, dependencies);
    if (!borderSettings?.enabled) {
        if (pData.ticksOutsideBorder > 0 || pData.borderDamageApplications > 0) { pData.ticksOutsideBorder = 0; pData.borderDamageApplications = 0; pData.isDirtyForSave = true; }
        return;
    }
    const playerPermLevel = rankManager.getPlayerPermissionLevel(player, dependencies);
    if (playerPermLevel <= permissionLevels.admin) {
        if (pData.ticksOutsideBorder > 0 || pData.borderDamageApplications > 0) { pData.ticksOutsideBorder = 0; pData.borderDamageApplications = 0; pData.isDirtyForSave = true; }
        return;
    }
    const loc = player.location;
    let isPlayerOutside = false;
    let targetX = loc.x, targetZ = loc.z;
    let currentEffectiveHalfSize = borderSettings.halfSize, currentEffectiveRadius = borderSettings.radius;

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
        if (typeof borderSettings.targetSize === 'number') {
            if (borderSettings.shape === "square") currentEffectiveHalfSize = borderSettings.targetSize;
            else if (borderSettings.shape === "circle") currentEffectiveRadius = borderSettings.targetSize;
        }
        if(pData.isWatched) playerUtils.debugLog(`[WorldBorderManager] In-progress resize for dim ${player.dimension.id} has incomplete parameters. Using targetSize or stored.`, player.nameTag, dependencies);
    }

    if (borderSettings.shape === "square" && typeof currentEffectiveHalfSize === 'number' && currentEffectiveHalfSize > 0) {
        const { centerX, centerZ } = borderSettings;
        const minX = centerX - currentEffectiveHalfSize, maxX = centerX + currentEffectiveHalfSize;
        const minZ = centerZ - currentEffectiveHalfSize, maxZ = centerZ + currentEffectiveHalfSize;
        if (loc.x < minX || loc.x > maxX || loc.z < minZ || loc.z > maxZ) {
            isPlayerOutside = true; targetX = loc.x; targetZ = loc.z;
            if (targetX < minX) targetX = minX + 0.5; else if (targetX > maxX) targetX = maxX - 0.5;
            if (targetZ < minZ) targetZ = minZ + 0.5; else if (targetZ > maxZ) targetZ = maxZ - 0.5;
        }
    } else if (borderSettings.shape === "circle" && typeof currentEffectiveRadius === 'number' && currentEffectiveRadius > 0) {
        const { centerX, centerZ } = borderSettings;
        const dx = loc.x - centerX, dz = loc.z - centerZ;
        const distSq = dx * dx + dz * dz, radiusSq = currentEffectiveRadius * currentEffectiveRadius;
        if (distSq > radiusSq) {
            isPlayerOutside = true; const currentDist = Math.sqrt(distSq); const teleportOffset = 0.5;
            if (currentDist === 0 || currentEffectiveRadius <= teleportOffset) { targetX = centerX + (currentEffectiveRadius > teleportOffset ? currentEffectiveRadius - teleportOffset : 0); targetZ = centerZ; }
            else { const scale = (currentEffectiveRadius - teleportOffset) / currentDist; targetX = centerX + dx * scale; targetZ = centerZ + dz * scale; }
        }
    } else if (borderSettings.shape) {
         if(pData.isWatched) playerUtils.debugLog(`[WBM] Invalid shape ('${borderSettings.shape}') or size (Sq: ${currentEffectiveHalfSize}, Circ: ${currentEffectiveRadius}) in ${player.dimension.id}. Skipping.`, player.nameTag, dependencies);
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
                    if(pData.isWatched) playerUtils.debugLog(`[WBM] Applied ${damageAmount} damage to ${player.nameTag}. Total: ${pData.borderDamageApplications}`, player.nameTag, dependencies);
                    if (pData.borderDamageApplications >= teleportAfterNumDamageEvents) {
                        performTeleport = true;
                        if(pData.isWatched) playerUtils.debugLog(`[WBM] ${player.nameTag} reached ${pData.borderDamageApplications} damage events. Triggering teleport.`, player.nameTag, dependencies);
                    }
                } catch (e) { console.warn(`[WBM] Failed to apply damage to ${player.nameTag}: ${e}`); playerUtils.debugLog(`[WBM] Failed to apply damage to ${player.nameTag}: ${e.message}`, player.nameTag, dependencies); }
            }
        }
        if (performTeleport) {
            const safeY = findSafeTeleportY(player.dimension, targetX, loc.y, targetZ, dependencies);
            try {
                player.teleport({ x: targetX, y: safeY, z: targetZ }, { dimension: player.dimension });
                if (config.worldBorderWarningMessage) playerUtils.warnPlayer(player, getString(config.worldBorderWarningMessage));
                if(pData.isWatched) playerUtils.debugLog(`[WBM] Teleported ${player.nameTag} to XZ(${targetX.toFixed(1)},${targetZ.toFixed(1)}) Y=${safeY}. Reason: ${!enableDamage ? 'Standard' : (pData.borderDamageApplications >= teleportAfterNumDamageEvents ? 'MaxDmg' : 'Error?')}`, player.nameTag, dependencies);
                pData.ticksOutsideBorder = 0; pData.borderDamageApplications = 0; pData.isDirtyForSave = true;
            } catch (e) { console.warn(`[WBM] Failed to teleport player ${player.nameTag}: ${e}`); if(pData.isWatched) playerUtils.debugLog(`[WBM] Teleport failed: ${e.message}`, player.nameTag, dependencies); }
        }
    } else {
        if (pData.ticksOutsideBorder > 0 || pData.borderDamageApplications > 0) {
             if(pData.isWatched) playerUtils.debugLog(`[WBM] Player ${player.nameTag} re-entered border. Resetting counters.`, player.nameTag, dependencies);
            pData.ticksOutsideBorder = 0; pData.borderDamageApplications = 0; pData.isDirtyForSave = true;
        }
    }

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
                density = mapRange(Math.sin((currentTick * pulseSpeed) / 20.0), -1, 1, config.worldBorderPulseDensityMin > 0 ? config.worldBorderPulseDensityMin : 0.1, config.worldBorderPulseDensityMax > (config.worldBorderPulseDensityMin > 0 ? config.worldBorderPulseDensityMin : 0.1) ? config.worldBorderPulseDensityMax : (config.worldBorderPulseDensityMin > 0 ? config.worldBorderPulseDensityMin : 0.1) + 1.0);
                density = Math.max(0.1, density);
            }
            const wallHeight = config.worldBorderParticleWallHeight, segmentLength = config.worldBorderParticleSegmentLength, yBase = Math.floor(playerLoc.y);
            const displayHalfSize = (borderSettings.isResizing && typeof currentEffectiveHalfSize === 'number') ? currentEffectiveHalfSize : borderSettings.halfSize;
            const displayRadius = (borderSettings.isResizing && typeof currentEffectiveRadius === 'number') ? currentEffectiveRadius : borderSettings.radius;

            if (borderSettings.shape === "square" && typeof displayHalfSize === 'number' && displayHalfSize > 0) {
                const { centerX, centerZ } = borderSettings;
                const minX = centerX - displayHalfSize, maxX = centerX + displayHalfSize, minZ = centerZ - displayHalfSize, maxZ = centerZ + displayHalfSize;
                const spawnLine = (isX, fixed, start, end, playerDyn) => {
                    const len = Math.min(segmentLength, Math.abs(end - start)); let actualStart = playerDyn - len / 2, actualEnd = playerDyn + len / 2;
                    actualStart = Math.max(start, actualStart); actualEnd = Math.min(end, actualEnd);
                    if (actualStart >= actualEnd) return;
                    for (let dyn = actualStart; dyn <= actualEnd; dyn += (1 / density)) for (let h = 0; h < wallHeight; h++) try { player.dimension.spawnParticle(particleNameToUse, isX ? { x: fixed, y: yBase + h, z: dyn } : { x: dyn, y: yBase + h, z: fixed }); } catch (e) {/*ignore particle error*/}
                };
                if (Math.abs(playerLoc.x - minX) < visualRange) spawnLine(true, minX, minZ, maxZ, playerLoc.z);
                if (Math.abs(playerLoc.x - maxX) < visualRange) spawnLine(true, maxX, minZ, maxZ, playerLoc.z);
                if (Math.abs(playerLoc.z - minZ) < visualRange) spawnLine(false, minZ, minX, maxX, playerLoc.x);
                if (Math.abs(playerLoc.z - maxZ) < visualRange) spawnLine(false, maxZ, minX, maxX, playerLoc.x);
            } else if (borderSettings.shape === "circle" && typeof displayRadius === 'number' && displayRadius > 0) {
                const { centerX, centerZ } = borderSettings; const radiusToUse = displayRadius;
                if (Math.abs(Math.sqrt(Math.pow(playerLoc.x - centerX, 2) + Math.pow(playerLoc.z - centerZ, 2)) - radiusToUse) < visualRange) {
                    const playerAngle = Math.atan2(playerLoc.z - centerZ, playerLoc.x - centerX);
                    const halfAngleSpan = radiusToUse > 0 ? (segmentLength / 2) / radiusToUse : Math.PI;
                    for (let i = 0; i < segmentLength * density; i++) {
                        const currentAngleOffset = (i / (segmentLength * density) - 0.5) * (segmentLength / radiusToUse);
                        if (Math.abs(currentAngleOffset) > halfAngleSpan && segmentLength * density > 1) continue;
                        const angle = playerAngle + currentAngleOffset;
                        const pX = centerX + radiusToUse * Math.cos(angle), pZ = centerZ + radiusToUse * Math.sin(angle);
                        for (let h = 0; h < wallHeight; h++) try { player.dimension.spawnParticle(particleNameToUse, { x: pX, y: yBase + h, z: pZ }); } catch (e) {/*ignore particle error*/}
                    }
                }
            }
        }
    }
}

export function clearBorderSettings(dimensionId, dependencies) {
    const { playerUtils } = dependencies;
    if (!dimensionId || typeof dimensionId !== 'string') {
        playerUtils.debugLog("[WorldBorderManager] clearBorderSettings: Invalid dimensionId provided.", null, dependencies);
        return false;
    }
    const propertyKey = worldBorderDynamicPropertyPrefix + dimensionId.replace("minecraft:", "");
    try {
        mc.world.setDynamicProperty(propertyKey, undefined);
        playerUtils.debugLog(`[WorldBorderManager] Successfully cleared border settings for ${dimensionId}.`, "System", dependencies);
        return true;
    } catch (error) {
        console.error(`[WorldBorderManager] Error clearing border settings for ${dimensionId}: ${error.stack || error}`);
        playerUtils.debugLog(`[WorldBorderManager] Exception clearing border settings for ${dimensionId}: ${error.message}`, "System", dependencies);
        return false;
    }
}
