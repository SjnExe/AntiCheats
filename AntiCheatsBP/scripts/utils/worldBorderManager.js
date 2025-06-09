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

            // Damage properties are optional and will be handled by the caller if not present
            return settings;
        }
    } catch (error) {
        // This can happen if JSON.parse fails or if the property is not a string.
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
    } else {
        console.warn("[WorldBorderManager] saveBorderSettings: Invalid or missing shape provided.");
        return false;
    }

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
