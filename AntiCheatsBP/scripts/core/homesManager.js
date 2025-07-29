/**
 * @file Manages player homes.
 * @module AntiCheatsBP/scripts/core/homesManager
 */

/**
 * @typedef {import('../types.js').Player} Player
 * @typedef {import('../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../types.js').Dependencies} Dependencies
 * @typedef {import('../types.js').Vector3} Vector3
 */

/**
 * @typedef {object} Home
 * @property {string} name
 * @property {Vector3} location
 * @property {string} dimensionId
 */

/**
 * Sets a home for a player.
 * @param {Player} player
 * @param {string} homeName
 * @param {Dependencies} dependencies
 * @returns {{success: boolean, message: string}}
 */
export function setHome(player, homeName, dependencies) {
    const { playerDataManager, config, getString } = dependencies;
    const pData = playerDataManager.getPlayerData(player.id);
    if (!pData) return { success: false, message: getString('common.error.playerDataNotFound') };

    pData.homes = pData.homes || [];
    const maxHomes = config.homes?.maxHomes ?? 5;

    if (pData.homes.length >= maxHomes) {
        return { success: false, message: getString('command.sethome.maxHomesReached', { maxHomes }) };
    }

    if (pData.homes.some(home => home.name.toLowerCase() === homeName.toLowerCase())) {
        return { success: false, message: getString('command.sethome.nameExists', { homeName }) };
    }

    pData.homes.push({
        name: homeName,
        location: player.location,
        dimensionId: player.dimension.id,
    });
    pData.isDirtyForSave = true;

    return { success: true, message: getString('command.sethome.success', { homeName }) };
}

/**
 * Gets a player's home by name.
 * @param {Player} player
 * @param {string} homeName
 * @param {Dependencies} dependencies
 * @returns {Home|null}
 */
export function getHome(player, homeName, dependencies) {
    const { playerDataManager } = dependencies;
    const pData = playerDataManager.getPlayerData(player.id);
    if (!pData || !pData.homes) return null;

    return pData.homes.find(home => home.name.toLowerCase() === homeName.toLowerCase()) || null;
}

/**
 * Deletes a player's home by name.
 * @param {Player} player
 * @param {string} homeName
 * @param {Dependencies} dependencies
 * @returns {{success: boolean, message: string}}
 */
export function deleteHome(player, homeName, dependencies) {
    const { playerDataManager, getString } = dependencies;
    const pData = playerDataManager.getPlayerData(player.id);
    if (!pData || !pData.homes) return { success: false, message: getString('command.delhome.noHomes') };

    const homeIndex = pData.homes.findIndex(home => home.name.toLowerCase() === homeName.toLowerCase());

    if (homeIndex === -1) {
        return { success: false, message: getString('command.delhome.notFound', { homeName }) };
    }

    pData.homes.splice(homeIndex, 1);
    pData.isDirtyForSave = true;

    return { success: true, message: getString('command.delhome.success', { homeName }) };
}

/**
 * Gets all of a player's homes.
 * @param {Player} player
 * @param {Dependencies} dependencies
 * @returns {Home[]}
 */
export function getHomes(player, dependencies) {
    const { playerDataManager } = dependencies;
    const pData = playerDataManager.getPlayerData(player.id);
    return pData?.homes || [];
}
