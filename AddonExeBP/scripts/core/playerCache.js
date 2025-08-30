/**
 * @fileoverview Manages a cache of online players for efficient lookups.
 * Avoids iterating over world.getAllPlayers() repeatedly.
 */

/**
 * @type {Map<string, import('@minecraft/server').Player>}
 */
const playerCacheById = new Map();

/**
 * @type {Set<string>}
 */
const xrayNotificationAdmins = new Set();

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
    // Also remove from xray admin cache if they are in it
    removeAdminFromXrayCache(playerId);
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

/**
 * Adds a player's ID to the X-ray admin cache.
 * @param {string} playerId The ID of the player to add.
 */
export function addAdminToXrayCache(playerId) {
    xrayNotificationAdmins.add(playerId);
}

/**
 * Removes a player's ID from the X-ray admin cache.
 * @param {string} playerId The ID of the player to remove.
 */
export function removeAdminFromXrayCache(playerId) {
    xrayNotificationAdmins.delete(playerId);
}

/**
 * Gets all online players who are subscribed to X-ray notifications.
 * @returns {import('@minecraft/server').Player[]}
 */
export function getXrayAdmins() {
    const admins = [];
    for (const playerId of xrayNotificationAdmins) {
        const player = getPlayerFromCache(playerId);
        if (player) {
            admins.push(player);
        }
    }
    return admins;
}
