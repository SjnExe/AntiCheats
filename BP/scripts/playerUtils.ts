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
 * Notifies all online admins with a message.
 * @param message The message to send to admins.
 */
export function notifyAdmins(message: string): void {
    const allPlayers = mc.world.getAllPlayers();
    for (const player of allPlayers) {
        if (isAdmin(player)) {
            player.sendMessage(`§7[AC Notify] ${message}§r`);
        }
    }
}

/**
 * Logs a message to the console if debug logging is enabled.
 * @param message The message to log.
 */
export function debugLog(message: string): void {
    if (ENABLE_DEBUG_LOGGING) {
        console.warn(`[AC Debug] ${message}`);
    }
}

// Add more player utility functions as needed (e.g., kick, ban (requires more setup))
