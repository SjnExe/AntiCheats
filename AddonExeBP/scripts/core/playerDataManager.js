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
 * @property {HomeLocation | null} lastDeathLocation
 */

import { getConfig } from './configManager.js';
import { world } from '@minecraft/server';
import { debugLog } from './logger.js';
import { errorLog } from './errorLogger.js';

const playerPropertyPrefix = 'exe:player.';
const playerNameIdMapKey = 'exe:playerNameIdMap';

/**
 * @type {Map<string, PlayerData>}
 */
const activePlayerData = new Map();

/**
 * @type {Map<string, string>}
 */
let playerNameIdMap = new Map();

/**
 * Saves the player name-to-ID map to a dynamic property.
 */
function saveNameIdMap() {
    try {
        const dataToSave = Array.from(playerNameIdMap.entries());
        world.setDynamicProperty(playerNameIdMapKey, JSON.stringify(dataToSave));
    } catch (e) {
        errorLog(`[PlayerDataManager] Failed to save name-to-ID map: ${e.stack}`);
    }
}

/**
 * Loads the player name-to-ID map from a dynamic property.
 */
export function loadNameIdMap() {
    try {
        const dataString = world.getDynamicProperty(playerNameIdMapKey);
        if (dataString && typeof dataString === 'string') {
            const parsedData = JSON.parse(dataString);
            playerNameIdMap = new Map(parsedData);
            debugLog(`[PlayerDataManager] Loaded ${playerNameIdMap.size} entries into name-to-ID map.`);
        }
    } catch (e) {
        errorLog(`[PlayerDataManager] Failed to load name-to-ID map: ${e.stack}`);
    }
}

/**
 * Saves a single player's data to a unique dynamic property.
 * @param {string} playerId The ID of the player to save.
 */
export function savePlayerData(playerId) {
    if (!activePlayerData.has(playerId)) {
        errorLog(`[PlayerDataManager] Attempted to save data for non-cached player: ${playerId}`);
        return;
    }
    try {
        const playerData = activePlayerData.get(playerId);
        const dataString = JSON.stringify(playerData);
        world.setDynamicProperty(`${playerPropertyPrefix}${playerId}`, dataString);
    } catch (e) {
        errorLog(`[PlayerDataManager] Failed to save data for player ${playerId}: ${e.stack}`);
    }
}

/**
 * Loads a single player's data from their unique dynamic property into the cache.
 * @param {string} playerId The ID of the player to load.
 * @returns {PlayerData | null} The loaded player data, or null if not found.
 */
export function loadPlayerData(playerId) {
    try {
        const dataString = world.getDynamicProperty(`${playerPropertyPrefix}${playerId}`);
        if (dataString && typeof dataString === 'string') {
            const playerData = JSON.parse(dataString);
            activePlayerData.set(playerId, playerData);
            return playerData;
        }
    } catch (e) {
        errorLog(`[PlayerDataManager] Failed to load data for player ${playerId}: ${e.stack}`);
    }
    return null;
}

/**
 * Gets a player's data from the cache, or loads/creates it if it doesn't exist.
 * @param {import('@minecraft/server').Player} player
 * @returns {PlayerData}
 */
export function getOrCreatePlayer(player) {
    // Update the name-to-ID map every time a player is processed.
    if (playerNameIdMap.get(player.name.toLowerCase()) !== player.id) {
        playerNameIdMap.set(player.name.toLowerCase(), player.id);
        saveNameIdMap();
    }

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
        rankId: config.playerDefaults.rankId,
        permissionLevel: config.playerDefaults.permissionLevel,
        homes: {},
        balance: config.economy.startingBalance,
        kitCooldowns: {},
        bounty: config.playerDefaults.bounty,
        bounties: {},
        xrayNotifications: config.playerDefaults.xrayNotifications,
        lastDeathLocation: null
    };
    activePlayerData.set(player.id, newPlayerData);
    savePlayerData(player.id); // Save the new player's data immediately
    return newPlayerData;
}

/**
 * Gets a player's ID from their name via the lookup map.
 * @param {string} playerName The name of the player.
 * @returns {string | undefined} The player's ID, or undefined if not found.
 */
export function getPlayerIdByName(playerName) {
    return playerNameIdMap.get(playerName.toLowerCase());
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

/**
 * Gets the map of all known player names and their corresponding IDs.
 * @returns {Map<string, string>}
 */
export function getAllPlayerNameIdMap() {
    return playerNameIdMap;
}
