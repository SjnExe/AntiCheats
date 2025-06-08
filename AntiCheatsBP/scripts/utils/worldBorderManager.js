/**
 * @file AntiCheatsBP/scripts/utils/worldBorderManager.js
 * Manages the storage and retrieval of world border settings using world dynamic properties.
 * @version 1.0.0
 */
import * as mc from '@minecraft/server';

const WORLD_BORDER_DYNAMIC_PROPERTY_PREFIX = "anticheat:worldborder_";

/**
 * @typedef {object} WorldBorderSettings
 * @property {"square"} shape - The shape of the border.
 * @property {number} centerX - The X-coordinate of the border's center.
 * @property {number} centerZ - The Z-coordinate of the border's center.
 * @property {number} halfSize - Half the side length of the square border.
 * @property {boolean} enabled - Whether the border is active for this dimension.
 * @property {string} dimensionId - The dimension this border applies to.
 * @property {boolean} [enableDamage] - Optional: Whether damage enforcement is on.
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
            // Basic validation of core properties
            if (settings && settings.shape === "square" &&
                typeof settings.centerX === 'number' &&
                typeof settings.centerZ === 'number' &&
                typeof settings.halfSize === 'number' &&
                // 'enabled' can be true or false
                typeof settings.enabled === 'boolean' &&
                settings.dimensionId === dimensionId) {

                // Damage properties are optional and will be handled by the caller if not present
                // No specific validation or defaulting for damage properties here in getBorderSettings
                return settings;
            }
        }
    } catch (error) {
        // This can happen if JSON.parse fails or if the property is not a string.
        // console.warn(\`[WorldBorderManager] Error parsing border settings for \${dimensionId}: \${error}\`);
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

    try {
        mc.world.setDynamicProperty(propertyKey, JSON.stringify(fullSettings));
        // console.log(\`[WorldBorderManager] Saved border settings for \${dimensionId}.\`);
        return true;
    } catch (error) {
        console.error(\`[WorldBorderManager] Error saving border settings for \${dimensionId}: \${error}\`);
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
