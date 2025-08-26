import { getPlayer, savePlayerData } from './playerDataManager.js';
import { getConfig } from './configManager.js';
import { world } from '@minecraft/server';

/**
 * @typedef {object} PendingPayment
 * @property {string} sourcePlayerId
 * @property {string} targetPlayerId
 * @property {number} amount
 * @property {number} timestamp
 */

/**
 * @type {Map<string, PendingPayment>}
 */
const pendingPayments = new Map();

// --- Pending Payment Management ---

export function createPendingPayment(sourcePlayerId, targetPlayerId, amount) {
    pendingPayments.set(sourcePlayerId, {
        sourcePlayerId,
        targetPlayerId,
        amount,
        timestamp: Date.now()
    });
}

export function getPendingPayment(sourcePlayerId) {
    return pendingPayments.get(sourcePlayerId);
}

export function clearPendingPayment(sourcePlayerId) {
    pendingPayments.delete(sourcePlayerId);
}

export function clearExpiredPayments() {
    const config = getConfig();
    const timeout = config.economy.paymentConfirmationTimeout * 1000; // convert to ms
    const now = Date.now();

    for (const [playerId, payment] of pendingPayments.entries()) {
        if (now - payment.timestamp > timeout) {
            pendingPayments.delete(playerId);
            const player = world.getPlayer(playerId);
            if (player) {
                player.sendMessage('§cYour pending payment has expired.');
            }
        }
    }
}


// --- Balance Management ---

export function getBalance(playerId) {
    const pData = getPlayer(playerId);
    return pData ? pData.balance : null;
}

export function setBalance(playerId, amount) {
    const pData = getPlayer(playerId);
    if (pData && amount >= 0) {
        pData.balance = amount;
        savePlayerData(playerId);
        return true;
    }
    return false;
}

export function addBalance(playerId, amount) {
    if (amount < 0) return false;
    const pData = getPlayer(playerId);
    if (pData) {
        pData.balance += amount;
        savePlayerData(playerId);
        return true;
    }
    return false;
}

export function removeBalance(playerId, amount) {
    if (amount < 0) return false;
    const pData = getPlayer(playerId);
    if (pData && pData.balance >= amount) {
        pData.balance -= amount;
        savePlayerData(playerId);
        return true;
    }
    return false;
}

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

    savePlayerData(sourcePlayerId);
    savePlayerData(targetPlayerId);
    return { success: true, message: 'Transfer successful.' };
}
