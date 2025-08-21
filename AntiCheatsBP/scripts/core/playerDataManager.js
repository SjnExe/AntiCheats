/**
 * @typedef {object} HomeLocation
 * @property {number} x
 * @property {number} y
 * @property {number} z
 * @property {string} dimensionId
 */

/**
 * @typedef {object} PlayerData
 * @property {string} rankId
 * @property {number} permissionLevel
 * @property {Object.<string, HomeLocation>} homes
 */

/**
 * @type {Map<string, PlayerData>}
 */
const activePlayerData = new Map();

/**
 * Adds a player to the in-memory cache.
 * @param {import('@minecraft/server').Player} player
 * @returns {PlayerData}
 */
export function addPlayer(player) {
    const playerData = {
        rankId: 'member', // Default rank
        permissionLevel: 1024, // Default permission level
        homes: {},
    };
    activePlayerData.set(player.id, playerData);
    return playerData;
}

/**
 * Gets a player's data from the in-memory cache.
 * @param {string} playerId
 * @returns {PlayerData | undefined}
 */
export function getPlayer(playerId) {
    return activePlayerData.get(playerId);
}

/**
 * Removes a player from the in-memory cache.
 * @param {string} playerId
 */
export function removePlayer(playerId) {
    activePlayerData.delete(playerId);
}
