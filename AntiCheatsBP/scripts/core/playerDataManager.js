/**
 * @typedef {object} HomeLocation
 * @property {number} x
 * @property {number} y
 * @property {number} z
 * @property {string} dimensionId
 */

/**
 * @typedef {object} PlayerData
 * @property {string} name
 * @property {string} rankId
 * @property {number} permissionLevel
 * @property {Object.<string, HomeLocation>} homes
 * @property {number} balance
 * @property {Object.<string, number>} kitCooldowns
 */

import { world } from '@minecraft/server';
import { getConfig } from './configManager.js';

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
    // If player data already exists (e.g., from a previous session), just update their name and return it.
    if (activePlayerData.has(player.id)) {
        const pData = activePlayerData.get(player.id);
        pData.name = player.name; // Update name in case it changed
        return pData;
    }

    // Otherwise, create a new entry for the player.
    const config = getConfig();
    const playerData = {
        name: player.name,
        rankId: 'member', // Default rank
        permissionLevel: 1024, // Default permission level
        homes: {},
        balance: config.economy.startingBalance,
        kitCooldowns: {},
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
 * Does nothing. Player data is now persistent and should not be removed on leave.
 * @param {string} playerId
 */
export function removePlayer(playerId) {
    // Player data is now persistent.
}

/**
 * Loads all player data from a world dynamic property into the cache.
 * Should be called on startup.
 */
export function loadAllPlayerData() {
    const dataStr = world.getDynamicProperty('ac:allPlayerData');
    if (dataStr) {
        try {
            const dataObj = JSON.parse(dataStr);
            // Clear the current map and load the persistent data
            activePlayerData.clear();
            for (const [playerId, playerData] of Object.entries(dataObj)) {
                activePlayerData.set(playerId, playerData);
            }
            console.log(`[PlayerDataManager] Loaded data for ${activePlayerData.size} players.`);
        } catch (e) {
            console.error(`[PlayerDataManager] Failed to parse allPlayerData: ${e}. Starting fresh.`);
            activePlayerData.clear();
        }
    } else {
        console.log('[PlayerDataManager] No persistent player data found.');
    }
}

/**
 * Saves all player data from the cache to a world dynamic property.
 * Should be called periodically or on world save.
 */
export function saveAllPlayerData() {
    if (activePlayerData.size === 0) return; // Don't save if empty
    try {
        const dataObj = Object.fromEntries(activePlayerData);
        world.setDynamicProperty('ac:allPlayerData', JSON.stringify(dataObj));
        console.log(`[PlayerDataManager] Saved data for ${activePlayerData.size} players.`);
    } catch (e) {
        console.error(`[PlayerDataManager] Failed to save allPlayerData: ${e}`);
    }
}

/**
 * Gets all active player data.
 * @returns {Map<string, PlayerData>}
 */
export function getAllPlayerData() {
    return activePlayerData;
}
