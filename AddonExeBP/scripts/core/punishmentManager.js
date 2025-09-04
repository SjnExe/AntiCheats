import { world, system } from '@minecraft/server';
import { debugLog } from './logger.js';
import { errorLog } from './errorLogger.js';

const punishmentDbKey = 'exe:punishments';
const saveIntervalTicks = 6000; // Every 5 minutes (20 ticks/sec * 60 sec/min * 5 min)

/**
 * @typedef {'mute' | 'ban'} PunishmentType
 */

/**
 * @typedef {object} Punishment
 * @property {PunishmentType} type
 * @property {number} expires - The timestamp (in milliseconds) when the punishment expires.
 * @property {string} reason
 */

/**
 * @type {Map<string, Punishment>}
 */
let punishments = new Map();
let needsSave = false;

/**
 * Loads punishment data from world dynamic properties.
 */
export function loadPunishments() {
    debugLog('[PunishmentManager] Loading punishments...');
    const dataStr = world.getDynamicProperty(punishmentDbKey);
    if (dataStr) {
        try {
            const parsedData = JSON.parse(dataStr);
            // JSON stringifies a Map as an array of [key, value] pairs
            punishments = new Map(parsedData);
            debugLog(`[PunishmentManager] Loaded ${punishments.size} punishments.`);
        } catch (e) {
            errorLog('[PunishmentManager] Failed to parse punishment data from world property.', e);
            punishments = new Map();
        }
    }
}

/**
 * Iterates through all punishments and removes any that have expired.
 */
export function clearExpiredPunishments() {
    const now = Date.now();
    let clearedCount = 0;
    for (const [playerId, punishment] of punishments.entries()) {
        if (now > punishment.expires) {
            punishments.delete(playerId);
            clearedCount++;
        }
    }
    if (clearedCount > 0) {
        needsSave = true;
        debugLog(`[PunishmentManager] Cleared ${clearedCount} expired punishments.`);
    }
}

/**
 * Saves punishment data to world dynamic properties if a change has occurred.
 */
function savePunishments() {
    if (!needsSave) {return;}
    try {
        // JSON can't stringify a Map directly, so convert to an array first.
        const dataToSave = Array.from(punishments.entries());
        world.setDynamicProperty(punishmentDbKey, JSON.stringify(dataToSave));
        needsSave = false;
        debugLog('[PunishmentManager] Saved punishments to world properties.');
    } catch (e) {
        errorLog('[PunishmentManager] Failed to save punishments.', e);
    }
}

/**
 * Adds or updates a punishment for a player.
 * @param {string} playerId The ID of the player.
 * @param {Punishment} punishment The punishment details.
 */
export function addPunishment(playerId, punishment) {
    punishments.set(playerId, punishment);
    needsSave = true;
    debugLog(`[PunishmentManager] Added ${punishment.type} for player ${playerId}. Expires: ${new Date(punishment.expires).toLocaleString()}`);
}

/**
 * Gets a player's active punishment.
 * It also clears the punishment if it has expired.
 * @param {string} playerId The ID of the player.
 * @returns {Punishment | undefined}
 */
export function getPunishment(playerId) {
    const punishment = punishments.get(playerId);
    if (!punishment) {
        return undefined;
    }

    if (Date.now() > punishment.expires) {
        debugLog(`[PunishmentManager] Punishment for player ${playerId} has expired. Removing.`);
        removePunishment(playerId);
        return undefined;
    }

    return punishment;
}

/**
 * Removes a punishment for a player.
 * @param {string} playerId The ID of the player to unpunish.
 */
export function removePunishment(playerId) {
    if (punishments.delete(playerId)) {
        needsSave = true;
        debugLog(`[PunishmentManager] Removed punishment for player ${playerId}.`);
    }
}

// Periodically clear expired punishments and save to the world
system.runInterval(() => {
    clearExpiredPunishments();
    savePunishments();
}, saveIntervalTicks);
