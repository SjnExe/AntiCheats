import { findPlayerByName as findPlayerInCache } from '../../core/playerCache.js';

/**
 * Finds an online player by their name using the player cache.
 * @param {string} playerName The name of the player to find.
 * @returns {import('@minecraft/server').Player | undefined} The player object if found, otherwise undefined.
 */
export function findPlayerByName(playerName) {
    return findPlayerInCache(playerName);
}
