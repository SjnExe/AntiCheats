import * as mc from '@minecraft/server';
import { ADMIN_TAG, PREFIX, ENABLE_DEBUG_LOGGING } from './config';

/**
 * Checks if a player has admin privileges based on a specific tag.
 * @param {mc.Player} player The player instance to check.
 * @returns {boolean} True if the player has the admin tag, false otherwise.
 */
export function isAdmin(player: mc.Player): boolean { // Keep TS type for context, JSDoc is for JS docs
    return player.hasTag(ADMIN_TAG);
}

/**
 * Sends a formatted warning message directly to a specific player.
 * @param {mc.Player} player The player instance to warn.
 * @param {string} reason The reason for the warning, which will be displayed to the player.
 */
export function warnPlayer(player: mc.Player, reason: string): void { // Keep TS type for context
    player.sendMessage(`§c[AntiCheat] Warning: ${reason}§r`);
    // Potentially add to a warning counter for this player using dynamic properties
}

/**
 * Notifies all online admins with a formatted message.
 * Optionally includes context about a specific player and their flag data if provided.
 * @param {string} baseMessage The core message to send.
 * @param {mc.Player} [player] Optional: The player related to this notification.
 * @param {object} [pData] Optional: The player-specific data, typically containing a `flags` object and `lastFlagType`.
 */
export function notifyAdmins(baseMessage, player?, pData?): void {
    let fullMessage = `§7[AC Notify] ${baseMessage}§r`;

    if (player && pData && pData.flags && typeof pData.flags.totalFlags === 'number') {
        const flagType = pData.lastFlagType || "N/A";
        const specificFlagCount = pData.flags[flagType] ? pData.flags[flagType].count : 0;
        fullMessage += ` §c(Player: ${player.nameTag}, Total Flags: ${pData.flags.totalFlags}, ${flagType}: ${specificFlagCount})§r`;
    } else if (player) {
        // Fallback if pData or flags structure is not as expected, but player is provided
        fullMessage += ` §c(Player: ${player.nameTag})§r`;
    }

    const allPlayers = mc.world.getAllPlayers();
    for (const p of allPlayers) { // Renamed 'player' loop variable to 'p'
        if (isAdmin(p)) {
            p.sendMessage(fullMessage);
        }
    }
}

/**
 * Loads persisted player-specific anti-cheat data from a dynamic property on the player entity.
 * The data is expected to be a JSON string.
 * @param {mc.Player} player The player entity to load data from.
 * @returns {Promise<object|null>} The parsed pData object if successful, or null if no data is found or an error occurs.
 */
export async function loadPlayerDataFromDynamicProperties(player) {
    if (!player) {
        debugLog("loadPlayerDataFromDynamicProperties: Invalid player object provided.");
        return null;
    }

    const dynamicPropertyKey = "anticheat:pdata_v1";
    let jsonString;

    try {
        jsonString = player.getDynamicProperty(dynamicPropertyKey);
    } catch (error) {
        debugLog(`Failed to get dynamic property '${dynamicPropertyKey}' for ${player.nameTag}. Error: ${error}`, player.nameTag);
        if (error.message) debugLog(`Error message: ${error.message}`, player.nameTag);
        return null;
    }

    if (typeof jsonString === 'string') {
        try {
            const parsedData = JSON.parse(jsonString);
            debugLog(`Successfully retrieved and parsed pData from dynamic property for ${player.nameTag}.`, player.nameTag);
            return parsedData;
        } catch (error) {
            debugLog(`Failed to parse JSON string for pData for ${player.nameTag}. JSON: "${jsonString}". Error: ${error}`, player.nameTag);
            if (error.message) debugLog(`Parse error message: ${error.message}`, player.nameTag);
            return null;
        }
    } else if (typeof jsonString === 'undefined') {
        debugLog(`No dynamic property '${dynamicPropertyKey}' found for ${player.nameTag}. Assuming new or non-persisted player.`, player.nameTag);
        return null;
    } else {
        debugLog(`Unexpected data type for dynamic property '${dynamicPropertyKey}' for ${player.nameTag}: ${typeof jsonString}`, player.nameTag);
        return null;
    }
}

/**
 * Saves a subset of player-specific anti-cheat data to a dynamic property on the player entity.
 * The data is serialized as a JSON string.
 * @param {mc.Player} player The player entity to save data to.
 * @param {object} pDataToSave The subset of pData object to serialize and save.
 *                             Expected to contain fields like `flags`, `isWatched`, `lastFlagType`, `playerNameTag`.
 * @returns {Promise<boolean>} True if saving was successful, false otherwise.
 */
export async function savePlayerDataToDynamicProperties(player, pDataToSave) {
    if (!player || !pDataToSave) {
        debugLog("savePlayerDataToDynamicProperties: Invalid player or pDataToSave object provided.", player?.nameTag);
        return false;
    }

    const dynamicPropertyKey = "anticheat:pdata_v1";
    let jsonString;

    try {
        jsonString = JSON.stringify(pDataToSave);
    } catch (error) {
        debugLog(`Failed to stringify pData for ${player.nameTag}. Error: ${error}`, player.nameTag);
        return false;
    }

    if (jsonString.length > 32760) { // A common, though not always exact, limit for string dynamic properties
        debugLog(`Serialized pData for ${player.nameTag} is too large (${jsonString.length} bytes). Cannot save to dynamic property.`, player.nameTag);
        // Consider logging the oversized object if possible, or parts of it, for diagnostics
        // console.warn(JSON.stringify(pDataToSave, null, 2)); // Example: Log pretty-printed object for inspection
        return false;
    }

    try {
        player.setDynamicProperty(dynamicPropertyKey, jsonString);
        debugLog(`Successfully saved pData to dynamic property for ${player.nameTag}.`, player.nameTag);
        return true;
    } catch (error) {
        debugLog(`Failed to set dynamic property for ${player.nameTag}. Error: ${error}`, player.nameTag);
        // Additional logging if error object has more details, e.g. error.message, error.stack
        if (error.message) debugLog(`Error message: ${error.message}`, player.nameTag);
        return false;
    }
}

/**
 * Logs a message to the console if debug logging is enabled in the configuration.
 * Prefixes messages differently if `contextPlayerNameIfWatched` is provided, indicating a log specific to a watched player.
 * @param {string} message The message to log.
 * @param {string} [contextPlayerNameIfWatched=null] Optional: The nameTag of a player being watched. If provided, the log message will be prefixed to indicate it's a watched player log.
 */
export function debugLog(message, contextPlayerNameIfWatched = null): void {
    if (ENABLE_DEBUG_LOGGING) {
        if (contextPlayerNameIfWatched) {
            console.warn(`[AC Watch - ${contextPlayerNameIfWatched}] ${message}`);
        } else {
            console.warn(`[AC Debug] ${message}`);
        }
    }
}

// Add more player utility functions as needed (e.g., kick, ban (requires more setup))
