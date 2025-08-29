/**
 * @fileoverview Manages a cache of online players for efficient lookups.
 * Avoids iterating over world.getAllPlayers() repeatedly.
 */

/**
 * @type {Map<string, import('@minecraft/server').Player>}
 */
const playerCacheById = new Map();

/**
 * Adds a player to the cache. Called on player join.
 * @param {import('@minecraft/server').Player} player The player to add.
 */
export function addPlayerToCache(player) {
    playerCacheById.set(player.id, player);
}

/**
 * Removes a player from the cache. Called on player leave.
 * @param {string} playerId The ID of the player to remove.
 */
export function removePlayerFromCache(playerId) {
    playerCacheById.delete(playerId);
}

/**
 * Gets a player from the cache by their ID.
 * @param {string} playerId The ID of the player to get.
 * @returns {import('@minecraft/server').Player | undefined}
 */
export function getPlayerFromCache(playerId) {
    return playerCacheById.get(playerId);
}

/**
 * Finds an online player by their name (case-insensitive).
 * @param {string} playerName The name of the player to find.
 * @returns {import('@minecraft/server').Player | undefined}
 */
export function findPlayerByName(playerName) {
    const lowerCasePlayerName = playerName.toLowerCase();
    for (const player of playerCacheById.values()) {
        if (player.name.toLowerCase() === lowerCasePlayerName) {
            return player;
        }
    }
    return undefined;
}

/**
 * Gets all cached players.
 * @returns {import('@minecraft/server').Player[]}
 */
export function getAllPlayersFromCache() {
    return Array.from(playerCacheById.values());
}
