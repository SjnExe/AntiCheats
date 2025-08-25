import { getPlayer, savePlayerData } from './playerDataManager.js';

/**
 * Gets the balance of a player.
 * @param {string} playerId The ID of the player.
 * @returns {number | null} The player's balance, or null if the player data is not found.
 */
export function getBalance(playerId) {
    const pData = getPlayer(playerId);
    return pData ? pData.balance : null;
}

/**
 * Sets the balance of a player.
 * @param {string} playerId The ID of the player.
 * @param {number} amount The new balance amount.
 * @returns {boolean} True if the balance was set, false otherwise.
 */
export function setBalance(playerId, amount) {
    const pData = getPlayer(playerId);
    if (pData && amount >= 0) {
        pData.balance = amount;
        savePlayerData();
        return true;
    }
    return false;
}

/**
 * Adds to a player's balance.
 * @param {string} playerId The ID of the player.
 * @param {number} amount The amount to add.
 * @returns {boolean} True if the amount was added, false otherwise.
 */
export function addBalance(playerId, amount) {
    if (amount < 0) return false;
    const pData = getPlayer(playerId);
    if (pData) {
        pData.balance += amount;
        savePlayerData();
        return true;
    }
    return false;
}

/**
 * Removes from a player's balance.
 * @param {string} playerId The ID of the player.
 * @param {number} amount The amount to remove.
 * @returns {boolean} True if the amount was removed, false otherwise.
 */
export function removeBalance(playerId, amount) {
    if (amount < 0) return false;
    const pData = getPlayer(playerId);
    if (pData && pData.balance >= amount) {
        pData.balance -= amount;
        savePlayerData();
        return true;
    }
    return false;
}

/**
 * Transfers money from one player to another.
 * @param {string} sourcePlayerId The ID of the player sending money.
 * @param {string} targetPlayerId The ID of the player receiving money.
 * @param {number} amount The amount to transfer.
 * @returns {{success: boolean, message: string}}
 */
export function transfer(sourcePlayerId, targetPlayerId, amount) {
    if (amount <= 0) {
        return { success: false, message: 'Transfer amount must be positive.' };
    }

    const sourceData = getPlayer(sourcePlayerId);
    if (!sourceData) {
        return { success: false, message: 'Could not find your player data.' };
    }
    if (sourceData.balance < amount) {
        return { success: false, message: 'You do not have enough money for this transaction.' };
    }

    const targetData = getPlayer(targetPlayerId);
    if (!targetData) {
        return { success: false, message: 'Could not find the target player\'s data.' };
    }

    sourceData.balance -= amount;
    targetData.balance += amount;

    savePlayerData();
    return { success: true, message: 'Transfer successful.' };
}
