/**
 * @typedef {object} RankDefinition
 * @property {string} id
 * @property {string} name
 * @property {number} permissionLevel
 */

// A minimal implementation for now.
const defaultRank = { id: 'member', name: 'Member', permissionLevel: 1024 };

/**
 * Gets a player's rank.
 * @param {import('@minecraft/server').Player} player
 * @returns {RankDefinition}
 */
export function getPlayerRank(player) {
    // For now, everyone is a member.
    return defaultRank;
}
