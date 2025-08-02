const leaderboardPropertyKey = 'anticheat:economyLeaderboard';

/**
 * Gets a player's balance.
 * @param {import('../types.js').Player} player
 * @param {import('../types.js').Dependencies} dependencies
 * @returns {number}
 */
export function getBalance(player, dependencies) {
    const { playerDataManager, config } = dependencies;
    const pData = playerDataManager.getPlayerData(player.id);
    return pData?.balance ?? config.economy?.startingBalance ?? 0;
}

/**
 * Sets a player's balance.
 * @param {import('../types.js').Player} player
 * @param {number} amount
 * @param {import('../types.js').Dependencies} dependencies
 * @returns {boolean}
 */
export function setBalance(player, amount, dependencies) {
    const { playerDataManager } = dependencies;
    const pData = playerDataManager.getPlayerData(player.id);
    if (!pData) return false;

    pData.balance = amount;
    pData.isDirtyForSave = true;
    return true;
}

/**
 * Updates the economy leaderboard with a player's current balance.
 * @param {import('../types.js').Player} player
 * @param {import('../types.js').Dependencies} dependencies
 */
export function updateLeaderboard(player, dependencies) {
    const { playerDataManager, world, config } = dependencies;
    const pData = playerDataManager.getPlayerData(player.id);
    if (!pData) return;

    const maxLeaderboardSize = config.economy?.leaderboardSize ?? 10;

    let leaderboard = [];
    try {
        const rawLeaderboard = world.getDynamicProperty(leaderboardPropertyKey);
        if (typeof rawLeaderboard === 'string') {
            leaderboard = JSON.parse(rawLeaderboard);
        }
    } catch (error) {
        console.error(`[EconomyManager] Failed to load leaderboard: ${error}`);
    }

    const playerEntry = {
        playerName: player.name,
        balance: pData.balance ?? 0,
    };

    const existingIndex = leaderboard.findIndex(entry => entry.playerName === player.name);
    if (existingIndex !== -1) {
        leaderboard[existingIndex] = playerEntry;
    } else {
        leaderboard.push(playerEntry);
    }

    leaderboard.sort((a, b) => b.balance - a.balance);
    if (leaderboard.length > maxLeaderboardSize) {
        leaderboard.length = maxLeaderboardSize;
    }

    try {
        world.setDynamicProperty(leaderboardPropertyKey, JSON.stringify(leaderboard));
    } catch (error) {
        console.error(`[EconomyManager] Failed to save leaderboard: ${error}`);
    }
}

/**
 * Adds to a player's balance.
 * @param {import('../types.js').Player} player
 * @param {number} amount
 * @param {import('../types.js').Dependencies} dependencies
 * @returns {boolean}
 */
export function addBalance(player, amount, dependencies) {
    const { playerDataManager } = dependencies;
    const pData = playerDataManager.getPlayerData(player.id);
    if (!pData) return false;

    pData.balance = (pData.balance || 0) + amount;
    pData.isDirtyForSave = true;
    return true;
}

/**
 * Subtracts from a player's balance.
 * @param {import('../types.js').Player} player
 * @param {number} amount
 * @param {import('../types.js').Dependencies} dependencies
 * @returns {boolean}
 */
export function subtractBalance(player, amount, dependencies) {
    const { playerDataManager } = dependencies;
    const pData = playerDataManager.getPlayerData(player.id);
    if (!pData) return false;

    pData.balance = (pData.balance || 0) - amount;
    pData.isDirtyForSave = true;
    return true;
}
