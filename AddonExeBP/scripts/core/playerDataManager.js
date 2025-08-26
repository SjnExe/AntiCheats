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
 * @property {boolean} xrayNotifications
 */

import { getConfig } from './configManager.js';
import { world } from '@minecraft/server';
import { debugLog } from './logger.js';

const PLAYER_PROPERTY_PREFIX = 'player_';

/**
 * @type {Map<string, PlayerData>}
 */
const activePlayerData = new Map();

/**
 * Saves a single player's data to a unique dynamic property.
 * @param {string} playerId The ID of the player to save.
 */
export function savePlayerData(playerId) {
    if (!activePlayerData.has(playerId)) {
        console.warn(`[PlayerDataManager] Attempted to save data for non-cached player: ${playerId}`);
        return;
    }
    try {
        const playerData = activePlayerData.get(playerId);
        const dataString = JSON.stringify(playerData);
        world.setDynamicProperty(`${PLAYER_PROPERTY_PREFIX}${playerId}`, dataString);
    } catch (e) {
        console.error(`[PlayerDataManager] Failed to save data for player ${playerId}: ${e.stack}`);
    }
}

/**
 * Loads a single player's data from their unique dynamic property into the cache.
 * @param {string} playerId The ID of the player to load.
 * @returns {PlayerData | null} The loaded player data, or null if not found.
 */
export function loadPlayerData(playerId) {
    try {
        const dataString = world.getDynamicProperty(`${PLAYER_PROPERTY_PREFIX}${playerId}`);
        if (dataString && typeof dataString === 'string') {
            const playerData = JSON.parse(dataString);
            activePlayerData.set(playerId, playerData);
            return playerData;
        }
    } catch (e) {
        console.error(`[PlayerDataManager] Failed to load data for player ${playerId}: ${e.stack}`);
    }
    return null;
}

/**
 * Loads data for all currently online players. Typically run on startup.
 */
export function loadAllOnlinePlayerData() {
    debugLog('[PlayerDataManager] Loading data for all online players...');
    for (const player of world.getAllPlayers()) {
        getOrCreatePlayer(player);
    }
    debugLog(`[PlayerDataManager] Player data cache initialized for ${activePlayerData.size} players.`);
}


/**
 * Gets a player's data from the cache, or loads/creates it if it doesn't exist.
 * @param {import('@minecraft/server').Player} player
 * @returns {PlayerData}
 */
export function getOrCreatePlayer(player) {
    if (activePlayerData.has(player.id)) {
        return activePlayerData.get(player.id);
    }

    // Try to load from dynamic properties first
    const loadedData = loadPlayerData(player.id);
    if (loadedData) {
        return loadedData;
    }

    // If still not found, create new data
    const config = getConfig();
    const newPlayerData = {
        rankId: 'member',
        permissionLevel: 1024,
        homes: {},
        balance: config.economy.startingBalance,
        kitCooldowns: {},
        bounty: 0,
        bounties: {},
        xrayNotifications: true
    };
    activePlayerData.set(player.id, newPlayerData);
    savePlayerData(player.id); // Save the new player's data immediately
    return newPlayerData;
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
 * Handles a player leaving the server by saving their data and removing them from the cache.
 * @param {string} playerId
 */
export function handlePlayerLeave(playerId) {
    if (activePlayerData.has(playerId)) {
        savePlayerData(playerId);
        activePlayerData.delete(playerId);
    }
}

/**
 * Gets all active (online) player data from the cache.
 * @returns {Map<string, PlayerData>}
 */
export function getAllPlayerData() {
    return activePlayerData;
}
