import { world } from '@minecraft/server';

const BAN_PROPERTY_ID = 'anticheats:bans';

/**
 * Retrieves the ban list from world dynamic properties.
 * @returns {object} The ban list object.
 */
function getBans() {
    const rawBans = world.getDynamicProperty(BAN_PROPERTY_ID);
    if (!rawBans) {
        return {};
    }
    try {
        return JSON.parse(rawBans);
    } catch (e) {
        console.error('Failed to parse ban list, returning empty list.', e);
        return {};
    }
}

/**
 * Saves the ban list to world dynamic properties.
 * @param {object} bans The ban list object to save.
 */
function saveBans(bans) {
    world.setDynamicProperty(BAN_PROPERTY_ID, JSON.stringify(bans));
}

/**
 * Adds a player to the ban list.
 * @param {import('@minecraft/server').Player} targetPlayer The player to ban.
 * @param {object} banInfo Information about the ban.
 * @param {string} banInfo.reason The reason for the ban.
 * @param {string} banInfo.bannedBy The name of the player who issued the ban.
 */
export function addBan(targetPlayer, banInfo) {
    const bans = getBans();
    const banData = {
        reason: banInfo.reason,
        bannedBy: banInfo.bannedBy,
        timestamp: new Date().toISOString()
    };
    // Use player's name as the key for easy lookup. Note that players can change names.
    // A more robust system would use the player's ID, but that's not available when they are offline.
    bans[targetPlayer.name] = banData;
    saveBans(bans);
}

/**
 * Removes a player from the ban list.
 * @param {string} targetName The name of the player to unban.
 * @returns {boolean} True if the player was unbanned, false if they were not found in the list.
 */
export function removeBan(targetName) {
    const bans = getBans();
    if (bans[targetName]) {
        delete bans[targetName];
        saveBans(bans);
        return true;
    }
    return false;
}

/**
 * Checks if a player is banned.
 * @param {string} playerName The name of the player to check.
 * @returns {object | null} The ban information object if the player is banned, otherwise null.
 */
export function getBanInfo(playerName) {
    const bans = getBans();
    return bans[playerName] || null;
}
