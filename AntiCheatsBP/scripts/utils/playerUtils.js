import * as mc from '@minecraft/server';
// Corrected import path for config, assuming config.js is at AntiCheatsBP/scripts/config.js
import { adminTag, enableDebugLogging, ownerPlayerName, acGlobalNotificationsDefaultOn } from '../config';
import { permissionLevels } from '../core/rankManager.js';

/**
 * Checks if a player has admin privileges based on a specific tag.
 * @param {mc.Player} player The player instance to check.
 * @returns {boolean} True if the player has the admin tag, false otherwise.
 */
export function isAdmin(player) {
    return player.hasTag(adminTag);
}

/**
 * Checks if a player is the owner based on their exact name.
 * @param {string} playerName The name of the player to check.
 * @returns {boolean} True if the player is the owner, false otherwise.
 *                  Returns false if ownerPlayerName is not set or is a placeholder.
 */
export function isOwner(playerName) {
    if (!ownerPlayerName || ownerPlayerName === "" || ownerPlayerName === "PlayerNameHere") {
        return false;
    }
    return playerName === ownerPlayerName;
}

/**
 * Determines the permission level of a given player.
 * @param {mc.Player} player The player instance to check.
 * @returns {permissionLevels} The permission level of the player.
 */
export function getPlayerPermissionLevel(player) {
    if (!(player instanceof mc.Player)) {
        console.error("[playerUtils] Invalid player object passed to getPlayerPermissionLevel.");
        // Fallback to the lowest permission level if player object is not valid.
        return permissionLevels.NORMAL; // Or DEFAULT, depending on desired strictness
    }

    if (isOwner(player.nameTag)) {
        return permissionLevels.OWNER;
    } else if (isAdmin(player)) {
        return permissionLevels.ADMIN;
    } else {
        return permissionLevels.NORMAL;
    }
}

/**
 * Clears all dropped item entities across all standard dimensions.
 * @param {mc.Player} [adminPerformingAction] Optional: The admin player who initiated the action, for logging context.
 * @returns {Promise<{clearedItemsCount: number, dimensionsProcessed: number, error: string | null}>}
 *          An object containing the count of cleared items, dimensions processed, and any error messages.
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
 * @param {mc.Player} player The player instance to warn.
 * @param {string} reason The reason for the warning, which will be displayed to the player.
 */
export function warnPlayer(player, reason) {
    player.sendMessage(`§c[AntiCheat] Warning: ${reason}§r`);
}

/**
 * Notifies all online admins with a formatted message.
 * Optionally includes context about a specific player and their flag data if provided.
 * @param {string} baseMessage The core message to send.
 * @param {mc.Player} [player] Optional: The player related to this notification.
 * @param {object} [pData] Optional: The player-specific data, typically containing a `flags` object and `lastFlagType`.
 */
export function notifyAdmins(baseMessage, player, pData) {
    let fullMessage = `§7[AC Notify] ${baseMessage}§r`;

    if (player && pData && pData.flags && typeof pData.flags.totalFlags === 'number') {
        const flagType = pData.lastFlagType || "N/A";
        const specificFlagCount = pData.flags[flagType] ? pData.flags[flagType].count : 0;
        fullMessage += ` §c(Player: ${player.nameTag}, Total Flags: ${pData.flags.totalFlags}, ${flagType}: ${specificFlagCount})§r`;
    } else if (player) {
        fullMessage += ` §c(Player: ${player.nameTag})§r`;
    }

    const allPlayers = mc.world.getAllPlayers();
    const notificationsOffTag = "ac_notifications_off"; // Tag to explicitly disable AC notifications
    const notificationsOnTag = "ac_notifications_on";   // Tag to explicitly enable AC notifications

    for (const p of allPlayers) {
        if (isAdmin(p)) {
            const hasExplicitOn = p.hasTag(notificationsOnTag);
            const hasExplicitOff = p.hasTag(notificationsOffTag);

            let shouldReceiveMessage = false;
            if (hasExplicitOn) {
                shouldReceiveMessage = true;
            } else if (hasExplicitOff) {
                shouldReceiveMessage = false;
            } else {
                // If no explicit preference, use the server default from config
                shouldReceiveMessage = acGlobalNotificationsDefaultOn;
            }

            if (shouldReceiveMessage) {
                try {
                    p.sendMessage(fullMessage);
                } catch (e) {
                    // Log error if sending message fails for a specific admin
                    console.error(`[playerUtils] Failed to send notification to admin ${p.nameTag}: ${e}`);
                    debugLog(`Failed to send AC notification to admin ${p.nameTag}: ${e}`, p.nameTag);
                }
            }
        }
    }
}

/**
 * Logs a message to the console if debug logging is enabled in the configuration.
 * Prefixes messages differently if `contextPlayerNameIfWatched` is provided, indicating a log specific to a watched player.
 * @param {string} message The message to log.
 * @param {string} [contextPlayerNameIfWatched=null] Optional: The nameTag of a player being watched.
 */
export function debugLog(message, contextPlayerNameIfWatched = null) {
    if (enableDebugLogging) {
        if (contextPlayerNameIfWatched) {
            console.warn(`[AC Watch - ${contextPlayerNameIfWatched}] ${message}`);
        } else {
            console.warn(`[AC Debug] ${message}`);
        }
    }
}
