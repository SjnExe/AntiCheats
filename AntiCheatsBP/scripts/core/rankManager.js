import { rankDefinitions, defaultPermissionLevel } from './ranksConfig.js';

let sortedRanks = [];

/**
 * Initializes the rank manager by sorting ranks.
 */
export function initialize() {
    sortedRanks = [...rankDefinitions].sort((a, b) => a.permissionLevel - b.permissionLevel);
    console.log(`[RankManager] Initialized ${sortedRanks.length} ranks.`);
}

/**
 * Gets the rank for a given player.
 * @param {import('@minecraft/server').Player} player
 * @param {object} config The addon's configuration object.
 * @returns {import('./ranksConfig.js').RankDefinition}
 */
export function getPlayerRank(player, config) {
    const ownerName = config.ownerPlayerName?.toLowerCase();
    const adminTag = config.adminTag;

    for (const rank of sortedRanks) {
        for (const condition of rank.conditions) {
            let match = false;
            switch (condition.type) {
                case 'ownerName':
                    if (ownerName && player.name.toLowerCase() === ownerName) {
                        match = true;
                    }
                    break;
                case 'adminTag':
                    if (adminTag && player.hasTag(adminTag)) {
                        match = true;
                    }
                    break;
                case 'default':
                    match = true;
                    break;
            }
            if (match) {
                return rank;
            }
        }
    }

    // Fallback to a default member-like object if no ranks are defined
    return {
        id: 'member',
        name: 'Member',
        permissionLevel: defaultPermissionLevel,
        conditions: [{ type: 'default' }],
    };
}

/**
 * Gets a rank definition by its ID.
 * @param {string} rankId The ID of the rank to get.
 * @returns {import('./ranksConfig.js').RankDefinition | undefined}
 */
export function getRankById(rankId) {
    return rankDefinitions.find(rank => rank.id === rankId);
}
