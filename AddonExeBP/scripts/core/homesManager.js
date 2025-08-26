import { getPlayer } from './playerDataManager.js';
import { getConfig } from './configManager.js';

/**
 * Sets a home for a player.
 * @param {import('@minecraft/server').Player} player The player setting the home.
 * @param {string} homeName The name of the home.
 * @returns {{success: boolean, message: string}}
 */
export function setHome(player, homeName) {
    const pData = getPlayer(player.id);
    if (!pData) {
        return { success: false, message: 'Could not find your player data.' };
    }

    const config = getConfig();
    const homeCount = Object.keys(pData.homes).length;

    if (homeCount >= config.homes.maxHomes && !pData.homes[homeName]) {
        return { success: false, message: `You have reached the maximum number of homes (${config.homes.maxHomes}).` };
    }

    if (homeName.length > 20) {
        return { success: false, message: 'Home name cannot be longer than 20 characters.' };
    }

    pData.homes[homeName.toLowerCase()] = {
        x: player.location.x,
        y: player.location.y,
        z: player.location.z,
        dimensionId: player.dimension.id
    };

    return { success: true, message: `Home '${homeName}' has been set.` };
}

/**
 * Gets a player's home location.
 * @param {import('@minecraft/server').Player} player The player.
 * @param {string} homeName The name of the home.
 * @returns {import('./playerDataManager.js').HomeLocation | null}
 */
export function getHome(player, homeName) {
    const pData = getPlayer(player.id);
    if (!pData) return null;
    return pData.homes[homeName.toLowerCase()] || null;
}

/**
 * Deletes a player's home.
 * @param {import('@minecraft/server').Player} player The player.
 * @param {string} homeName The name of the home.
 * @returns {{success: boolean, message: string}}
 */
export function deleteHome(player, homeName) {
    const pData = getPlayer(player.id);
    if (!pData) {
        return { success: false, message: 'Could not find your player data.' };
    }

    if (!pData.homes[homeName.toLowerCase()]) {
        return { success: false, message: `Home '${homeName}' does not exist.` };
    }

    delete pData.homes[homeName.toLowerCase()];
    return { success: true, message: `Home '${homeName}' has been deleted.` };
}

/**
 * Lists all of a player's homes.
 * @param {import('@minecraft/server').Player} player The player.
 * @returns {string[]} An array of home names.
 */
export function listHomes(player) {
    const pData = getPlayer(player.id);
    if (!pData) return [];
    return Object.keys(pData.homes);
}

/**
 * Gets the number of homes a player has set.
 * @param {import('@minecraft/server').Player} player The player.
 * @returns {number}
 */
export function getHomeCount(player) {
    const pData = getPlayer(player.id);
    if (!pData) return 0;
    return Object.keys(pData.homes).length;
}
