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
 */

/**
 * Retrieves the world border settings for a given dimension.
 * @param {string} dimensionId - The ID of the dimension (e.g., "minecraft:overworld").
 * @returns {WorldBorderSettings | null} The border settings if found and valid, otherwise null.
 */
export function getBorderSettings(dimensionId) {
    if (!dimensionId || typeof dimensionId !== 'string') {
        console.warn("[WorldBorderManager] getBorderSettings: Invalid dimensionId provided.");
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
                console.warn(`[WorldBorderManager] Invalid or corrupt common settings for ${dimensionId}.`);
                return null;
            }

            // Shape-specific validation
            if (settings.shape === "square") {
                if (typeof settings.halfSize !== 'number' || settings.halfSize <= 0) {
                    console.warn(`[WorldBorderManager] Invalid or non-positive 'halfSize' for square border in ${dimensionId}.`);
                    return null;
                }
            } else if (settings.shape === "circle") {
                if (typeof settings.radius !== 'number' || settings.radius <= 0) {
                    console.warn(`[WorldBorderManager] Invalid or non-positive 'radius' for circle border in ${dimensionId}.`);
                    return null;
                }
            } else {
                console.warn(`[WorldBorderManager] Unknown or invalid shape '${settings.shape}' for ${dimensionId}. Defaulting to no border.`);
                return null;
            }

            // Damage and resize properties are optional and will be handled by the caller if not present
            // No specific validation for resize fields here, as they are managed by commands and the tick loop
            return settings;
        }
    } catch (error) {
        // This can happen if JSON.parse fails or if the property is not a string.
        // It's also possible for getDynamicProperty to throw if the key is invalid, though unlikely with prefixing.
        // console.warn(`[WorldBorderManager] Error parsing border settings for ${dimensionId}: ${error}`);
    }
    return null;
}

/**
 * Saves or updates the world border settings for a given dimension.
 * @param {string} dimensionId - The ID of the dimension.
 * @param {Omit<WorldBorderSettings, "dimensionId">} settingsToSave - The border settings to save.
 *        The dimensionId from the parameter will be added to the stored object.
 * @returns {boolean} True if settings were saved successfully, false otherwise.
 */
export function saveBorderSettings(dimensionId, settingsToSave) {
    if (!dimensionId || typeof dimensionId !== 'string' || !settingsToSave) {
        console.warn("[WorldBorderManager] saveBorderSettings: Invalid dimensionId or settings provided.");
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
            console.warn("[WorldBorderManager] saveBorderSettings: Invalid 'halfSize' for square shape.");
            return false;
        }
        fullSettings.radius = undefined; // Ensure radius is explicitly not part of square settings
    } else if (fullSettings.shape === "circle") {
        if (typeof fullSettings.radius !== 'number' || fullSettings.radius <= 0) {
            console.warn("[WorldBorderManager] saveBorderSettings: Invalid or non-positive 'radius' for circle shape.");
            return false;
        }
        fullSettings.halfSize = undefined; // Ensure halfSize is explicitly not part of circle settings
    } else if (fullSettings.shape) { // Shape exists but is not 'square' or 'circle'
        console.warn(`[WorldBorderManager] saveBorderSettings: Unknown shape '${fullSettings.shape}' provided.`);
        return false;
    } else { // Shape is missing
        console.warn("[WorldBorderManager] saveBorderSettings: Shape is required.");
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
        console.warn("[WorldBorderManager] saveBorderSettings: Incomplete or invalid resize operation data. All resize fields must be valid if isResizing is true.");
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
        // console.log(`[WorldBorderManager] Saved border settings for ${dimensionId}.`);
        return true;
    } catch (error) {
        console.error(`[WorldBorderManager] Error saving border settings for ${dimensionId}: ${error}`);
        return false;
    }
}

/**
 * Clears the world border settings for a given dimension.
 * This effectively disables the border by removing its configuration.
 * @param {string} dimensionId - The ID of the dimension.
 * @returns {boolean} True if settings were cleared successfully, false otherwise.
 */
export function clearBorderSettings(dimensionId) {
    if (!dimensionId || typeof dimensionId !== 'string') {
        console.warn("[WorldBorderManager] clearBorderSettings: Invalid dimensionId provided.");
        return false;
    }
    const propertyKey = WORLD_BORDER_DYNAMIC_PROPERTY_PREFIX + dimensionId.replace("minecraft:", "");
    try {
        mc.world.setDynamicProperty(propertyKey, undefined); // Setting to undefined removes the property
        // console.log(\`[WorldBorderManager] Cleared border settings for \${dimensionId}.\`);
        return true;
    } catch (error) {
        console.error(\`[WorldBorderManager] Error clearing border settings for \${dimensionId}: \${error}\`);
        return false;
    }
}
