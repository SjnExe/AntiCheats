import * as mc from '@minecraft/server';
import { ADMIN_TAG, PREFIX, ENABLE_DEBUG_LOGGING } from './config';

/**
 * Checks if a player has admin privileges.
 * @param player The player to check.
 * @returns True if the player is an admin, false otherwise.
 */
export function isAdmin(player: mc.Player): boolean {
    return player.hasTag(ADMIN_TAG);
}

/**
 * Sends a warning message to a specific player.
 * @param player The player to warn.
 * @param reason The reason for the warning.
 */
export function warnPlayer(player: mc.Player, reason: string): void {
    player.sendMessage(`§c[AntiCheat] Warning: ${reason}§r`);
    // Potentially add to a warning counter for this player using dynamic properties
}

/**
 * Notifies all online admins with a message, optionally including player flag context.
 * @param {string} baseMessage The base message to send.
 * @param {mc.Player | undefined} [player] Optional: The player related to the notification.
 * @param {any | undefined} [pData] Optional: The player-specific data containing flags.
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
 * Logs a message to the console if debug logging is enabled.
 * Can optionally provide a player's nameTag to identify watched player logs.
 * @param {string} message The message to log.
 * @param {string | null} [contextPlayerNameIfWatched=null] If logging for a watched player, their nameTag.
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
