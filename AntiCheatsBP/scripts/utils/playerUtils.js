/**
 * @file AntiCheatsBP/scripts/utils/playerUtils.js
 * Provides utility functions for common player-related operations such as permission checks,
 * debug logging, admin notifications, player searching, and duration parsing.
 * @version 1.0.1
 */
import * as mc from '@minecraft/server';
// Corrected import path for config, assuming config.js is at AntiCheatsBP/scripts/config.js
import { editableConfigValues } from '../config.js'; // Import editableConfigValues
import { permissionLevels } from '../core/rankManager.js';

/**
 * Checks if a player has admin privileges based on a specific tag.
 * @param {mc.Player} player The player instance to check.
 * @returns {boolean} True if the player has the admin tag, false otherwise.
 */
export function isAdmin(player) {
    return player.hasTag(editableConfigValues.adminTag);
}

/**
 * Checks if a player is the owner based on their exact name.
 * @param {string} playerName The name of the player to check.
 * @returns {boolean} True if the player is the owner, false otherwise.
 *                  Returns false if ownerPlayerName is not set or is a placeholder.
 */
export function isOwner(playerName) {
    if (!editableConfigValues.ownerPlayerName || editableConfigValues.ownerPlayerName === "" || editableConfigValues.ownerPlayerName === "PlayerNameHere") {
        return false;
    }
    return playerName === editableConfigValues.ownerPlayerName;
}

/**
 * Determines the permission level of a given player (e.g., normal, admin, owner).
 * @param {mc.Player} player The player instance to check.
 * @returns {permissionLevels} The permission level of the player.
 *                             Defaults to `permissionLevels.normal` if player object is invalid.
 */
export function getPlayerPermissionLevel(player) {
    if (!(player instanceof mc.Player)) {
        console.error("[playerUtils] Invalid player object passed to getPlayerPermissionLevel.");
        // Fallback to the lowest permission level if player object is not valid.
        return permissionLevels.normal;
    }

    return isOwner(player.nameTag) ? permissionLevels.owner :
        isAdmin(player) ? permissionLevels.admin :
            permissionLevels.normal;
}

/**
 * Clears all dropped item entities across standard dimensions (Overworld, Nether, End).
 * Useful for reducing server lag.
 * @param {mc.Player} [adminPerformingAction] Optional: The admin player who initiated the action, for logging context.
 * @returns {Promise<{clearedItemsCount: number, dimensionsProcessed: number, error: string | null}>}
 *          An object containing the count of cleared items, the number of dimensions processed,
 *          and any error messages encountered (null if no errors).
 */
export async function executeLagClear(adminPerformingAction) {
    let clearedItemsCount = 0;
    let dimensionsProcessed = 0;
    let errorMessages = [];
    const dimensionIds = ["minecraft:overworld", "minecraft:nether", "minecraft:the_end"];

    debugLog(`LagClear: Initiated by ${adminPerformingAction?.nameTag || 'SYSTEM'}. Processing dimensions: ${dimensionIds.join(', ')}.`, adminPerformingAction?.nameTag);

    for (const dimensionId of dimensionIds) {
        try {
            const dimension = mc.world.getDimension(dimensionId);
            dimensionsProcessed++;
            const itemEntities = dimension.getEntities({ type: "minecraft:item" });

            let countInDimension = 0;
            for (const entity of itemEntities) {
                try {
                    entity.kill();
                    clearedItemsCount++;
                    countInDimension++;
                } catch (killError) {
                    const errMsg = `LagClear: Error killing item entity ${entity.id} in ${dimensionId}: ${killError}`;
                    errorMessages.push(errMsg);
                    debugLog(errMsg, adminPerformingAction?.nameTag);
                }
            }
            debugLog(`LagClear: Cleared ${countInDimension} items in ${dimensionId}.`, adminPerformingAction?.nameTag);

        } catch (dimError) {
            const errMsg = `LagClear: Error processing dimension ${dimensionId}: ${dimError}`;
            errorMessages.push(errMsg);
            debugLog(errMsg, adminPerformingAction?.nameTag);
        }
    }

    debugLog(`LagClear: Finished. Processed ${dimensionsProcessed} dimensions. Total items cleared: ${clearedItemsCount}. Errors: ${errorMessages.length}`, adminPerformingAction?.nameTag);
    return {
        clearedItemsCount,
        dimensionsProcessed,
        error: errorMessages.length > 0 ? errorMessages.join('\n') : null
    };
}

/**
 * Sends a formatted warning message directly to a specific player.
 * The message is prefixed with "[AntiCheat] Warning: " and colored red.
 * @param {mc.Player} player The player instance to warn.
 * @param {string} reason The reason for the warning, which will be displayed to the player.
 * @returns {void}
 */
export function warnPlayer(player, reason) {
    player.sendMessage(`§c[AntiCheat] Warning: ${reason}§r`);
}

/**
 * Notifies all online admins with a formatted message.
 * Admin notification delivery respects individual admin preferences (via tags like "ac_notifications_off")
 * and the global default setting `acGlobalNotificationsDefaultOn`.
 * Optionally includes context about a specific player and their flag data if provided.
 * @param {string} baseMessage The core message to send.
 * @param {mc.Player} [player] Optional: The player related to this notification.
 * @param {object} [pData] Optional: The player-specific data, typically from playerDataManager,
 *                         expected to have `flags.totalFlags` and `lastFlagType` if player context is relevant.
 * @returns {void}
 */
export function notifyAdmins(baseMessage, player, pData) {
    let fullMessage = `§7[AC Notify] ${baseMessage}§r`;

    if (player && pData && pData.flags && typeof pData.flags.totalFlags === 'number') {
        const flagType = pData.lastFlagType || "N/A";
        const specificFlagCount = pData.flags[flagType] ? pData.flags[flagType].count : 0;
        fullMessage += ` §c(Player: ${player.nameTag}, Total Flags: ${pData.flags.totalFlags}, Last: ${flagType} [${specificFlagCount}])§r`;
    } else if (player) {
        fullMessage += ` §c(Player: ${player.nameTag})§r`;
    }

    const allPlayers = mc.world.getAllPlayers();
    const notificationsOffTag = "ac_notifications_off";
    const notificationsOnTag = "ac_notifications_on";

    for (const p of allPlayers) {
        if (isAdmin(p)) {
            const hasExplicitOn = p.hasTag(notificationsOnTag);
            const hasExplicitOff = p.hasTag(notificationsOffTag);

            // Determine if the admin should receive the message based on tags and global default
            const shouldReceiveMessage = hasExplicitOn || (!hasExplicitOff && editableConfigValues.acGlobalNotificationsDefaultOn);

            if (shouldReceiveMessage) {
                try {
                    p.sendMessage(fullMessage);
                } catch (e) {
                    console.error(`[playerUtils] Failed to send notification to admin ${p.nameTag}: ${e}`);
                    debugLog(`Failed to send AC notification to admin ${p.nameTag}: ${e}`, p.nameTag);
                }
            }
        }
    }
}


/**
 * Logs a message to the console if debug logging (`enableDebugLogging` in config) is enabled.
 * Prefixes messages with "[AC Debug]" or "[AC Watch - PlayerName]" if `contextPlayerNameIfWatched` is provided.
 * @param {string} message The message to log.
 * @param {string} [contextPlayerNameIfWatched=null] Optional: The nameTag of a player being watched.
 *                                                  If provided, the log prefix changes to indicate context.
 * @returns {void}
 */
export function debugLog(message, contextPlayerNameIfWatched = null) {
    if (editableConfigValues.enableDebugLogging) {
        const prefix = contextPlayerNameIfWatched ? `[AC Watch - ${contextPlayerNameIfWatched}]` : `[AC Debug]`;
        console.warn(`${prefix} ${message}`); // console.warn is often used for better visibility in Bedrock consoles
    }
}

/**
 * Finds an online player by their nameTag (case-insensitive).
 * @param {string} playerName The nameTag of the player to find.
 * @returns {mc.Player | null} The player object if found online, otherwise null.
 *                             Returns null if playerName is invalid.
 */
export function findPlayer(playerName) {
    if (!playerName || typeof playerName !== 'string') return null;
    const nameToFind = playerName.toLowerCase();
    // world.getAllPlayers() is preferable to world.getPlayers() if available and suitable,
    // as getPlayers() often requires EntityQueryOptions.
    // Assuming getAllPlayers() is the modern standard.
    return mc.world.getAllPlayers().find(p => p.nameTag.toLowerCase() === nameToFind) || null;
}

/**
 * Parses a duration string (e.g., "5m", "1h", "2d", "perm") into milliseconds.
 * If only a number is provided, it's assumed to be in minutes.
 * @param {string} durationString The duration string to parse.
 * @returns {number | null | Infinity} Duration in milliseconds, `Infinity` for "perm" or "permanent",
 *                                     or `null` if the format is invalid.
 */
export function parseDuration(durationString) {
    if (!durationString || typeof durationString !== 'string') return null; // Added type check
    const lowerDurationString = durationString.toLowerCase(); // Use a new var for lowercase
    if (lowerDurationString === "perm" || lowerDurationString === "permanent") return Infinity;

    const regex = /^(\d+)([smhd])$/;
    const match = lowerDurationString.match(regex);

    if (match) {
        const value = parseInt(match[1]);
        const unit = match[2];
        switch (unit) {
            case 's': return value * 1000;
            case 'm': return value * 60 * 1000;
            case 'h': return value * 60 * 60 * 1000;
            case 'd': return value * 24 * 60 * 60 * 1000;
        }
    } else if (/^\d+$/.test(lowerDurationString)) { // If only a number
        const value = parseInt(lowerDurationString);
        if (!isNaN(value)) return value * 60 * 1000; // Assume minutes
    }
    return null; // Invalid format
}
