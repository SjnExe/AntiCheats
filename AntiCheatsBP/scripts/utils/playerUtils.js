import * as mc from '@minecraft/server';
// Corrected import path for config, assuming config.js is at AntiCheatsBP/scripts/config.js
import { adminTag, enableDebugLogging } from '../config';

/**
 * Checks if a player has admin privileges based on a specific tag.
 * @param {mc.Player} player The player instance to check.
 * @returns {boolean} True if the player has the admin tag, false otherwise.
 */
export function isAdmin(player) {
    return player.hasTag(adminTag);
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
    for (const p of allPlayers) {
        if (isAdmin(p)) {
            p.sendMessage(fullMessage);
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
