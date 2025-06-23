/**
 * @file Provides utility functions for managing global world states like dimension locks
 * using world dynamic properties.
 */
import { world } from '@minecraft/server';

const netherLockedProp = 'anticheat:netherLocked';
const endLockedProp = 'anticheat:endLocked';

/**
 * Checks if the Nether dimension is currently locked.
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
 * @param {boolean} isLocked - True to lock the Nether, false to unlock.
 * @returns {boolean} True if the state was set successfully, false otherwise.
 */
export function setNetherLocked(isLocked) {
    try {
        world.setDynamicProperty(netherLockedProp, isLocked);
        return true;
    } catch (e) {
        console.error(`[worldStateUtils] Error setting Nether lock state: ${e}`);
        return false;
    }
}

/**
 * Checks if The End dimension is currently locked.
 * @returns {boolean} True if The End is locked, false otherwise.
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
 * Sets the lock state for The End dimension.
 * @param {boolean} isLocked - True to lock The End, false to unlock.
 * @returns {boolean} True if the state was set successfully, false otherwise.
 */
export function setEndLocked(isLocked) {
    try {
        world.setDynamicProperty(endLockedProp, isLocked);
        return true;
    } catch (e) {
        console.error(`[worldStateUtils] Error setting End lock state: ${e}`);
        return false;
    }
}
