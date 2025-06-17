/**
 * @file AntiCheatsBP/scripts/utils/worldStateUtils.js
 * Provides utility functions for managing global world states like dimension locks
 * using world dynamic properties.
 * @version 1.0.1
 */
import { world } from '@minecraft/server';

const netherLockedProp = 'anticheat:netherLocked';
const endLockedProp = 'anticheat:endLocked';

/**
 * Checks if the Nether dimension is currently locked.
 * Reads from a world dynamic property. Defaults to false if property not set.
 * @returns {boolean} True if the Nether is locked, false otherwise.
 */
export function isNetherLocked() {
    try {
        const locked = world.getDynamicProperty(netherLockedProp);
        return typeof locked === 'boolean' ? locked : false;
    } catch (e) {
        console.warn(`[worldStateUtils] Error reading Nether lock state: ${e}. Defaulting to false.`);
        return false;
    }
}

/**
 * Sets the lock state for the Nether dimension.
 * Writes to a world dynamic property.
 * @param {boolean} isLocked - True to lock the Nether, false to unlock.
 */
export function setNetherLocked(isLocked) {
    try {
        world.setDynamicProperty(netherLockedProp, isLocked);
    } catch (e) {
        console.error(`[worldStateUtils] Error setting Nether lock state: ${e}`);
    }
}

/**
 * Checks if the End dimension is currently locked.
 * Reads from a world dynamic property. Defaults to false if property not set.
 * @returns {boolean} True if the End is locked, false otherwise.
 */
export function isEndLocked() {
    try {
        const locked = world.getDynamicProperty(endLockedProp);
        return typeof locked === 'boolean' ? locked : false;
    } catch (e) {
        console.warn(`[worldStateUtils] Error reading End lock state: ${e}. Defaulting to false.`);
        return false;
    }
}

/**
 * Sets the lock state for the End dimension.
 * Writes to a world dynamic property.
 * @param {boolean} isLocked - True to lock the End, false to unlock.
 */
export function setEndLocked(isLocked) {
    try {
        world.setDynamicProperty(endLockedProp, isLocked);
    } catch (e) {
        console.error(`[worldStateUtils] Error setting End lock state: ${e}`);
    }
}
