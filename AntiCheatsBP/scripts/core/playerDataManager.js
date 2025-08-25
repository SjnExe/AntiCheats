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
 * @property {number} balance
 * @property {Object.<string, number>} kitCooldowns
 * @property {number} bounty
 * @property {Object.<string, number>} bounties
 */

import { getConfig } from './configManager.js';
import { world } from '@minecraft/server';

const PLAYER_DATA_PROPERTY = 'playerDataV1';

/**
 * @type {Map<string, PlayerData>}
 */
const activePlayerData = new Map();

/**
 * Saves all player data to a dynamic property.
 */
export function savePlayerData() {
    try {
        const dataString = JSON.stringify(Array.from(activePlayerData.entries()));
        world.setDynamicProperty(PLAYER_DATA_PROPERTY, dataString);
    } catch (e) {
        console.error(`[PlayerDataManager] Failed to save player data: ${e.stack}`);
    }
}

/**
 * Loads all player data from a dynamic property.
 */
export function loadPlayerData() {
    try {
        const dataString = world.getDynamicProperty(PLAYER_DATA_PROPERTY);
        if (dataString && typeof dataString === 'string') {
            const dataArray = JSON.parse(dataString);
            for (const [playerId, playerData] of dataArray) {
                activePlayerData.set(playerId, playerData);
            }
            console.log(`[PlayerDataManager] Loaded data for ${activePlayerData.size} players.`);
        }
    } catch (e) {
        console.error(`[PlayerDataManager] Failed to load player data: ${e.stack}`);
    }
}

/**
 * Gets a player's data from the cache, or creates it if it doesn't exist.
 * @param {import('@minecraft/server').Player} player
 * @returns {PlayerData}
 */
export function getOrCreatePlayer(player) {
    if (activePlayerData.has(player.id)) {
        return activePlayerData.get(player.id);
    }
    const config = getConfig();
    const playerData = {
        rankId: 'member', // Default rank
        permissionLevel: 1024, // Default permission level
        homes: {},
        balance: config.economy.startingBalance,
        kitCooldowns: {},
        bounty: 0,
        bounties: {},
        xrayNotifications: true
    };
    activePlayerData.set(player.id, playerData);
    savePlayerData();
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
 * Handles a player leaving the server by saving all player data.
 * @param {string} playerId
 */
export function handlePlayerLeave(playerId) {
    savePlayerData();
}

/**
 * Gets all active player data.
 * @returns {Map<string, PlayerData>}
 */
export function getAllPlayerData() {
    return activePlayerData;
}
