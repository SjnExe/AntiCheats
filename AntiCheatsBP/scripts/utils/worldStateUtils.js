/**
 * @file Manages global world states like dimension locks.
 * @module AntiCheatsBP/scripts/utils/worldStateUtils
 */
import * as mc from '@minecraft/server';

const netherLockedPropertyKey = 'anticheat:netherLocked';
const endLockedPropertyKey = 'anticheat:endLocked';

/**
 * Checks if the Nether dimension is locked.
 * @returns {boolean} True if locked, false otherwise.
 */
export function isNetherLocked() {
    try {
        const locked = mc.world.getDynamicProperty(netherLockedPropertyKey);
        return typeof locked === 'boolean' ? locked : false;
    } catch (e) {
        console.error(`[WorldStateUtils.isNetherLocked] Error reading Nether lock state: ${e.stack || e}. Defaulting to false.`);
        return false;
    }
}

/**
 * Sets the lock state for the Nether dimension.
 * @param {boolean} newLockState True to lock, false to unlock.
 * @returns {boolean} True on success, false on failure.
 */
export function setNetherLocked(newLockState) {
    if (typeof newLockState !== 'boolean') {
        console.error(`[WorldStateUtils.setNetherLocked] Invalid lock state provided: ${newLockState}. Must be boolean.`);
        return false;
    }
    try {
        mc.world.setDynamicProperty(netherLockedPropertyKey, newLockState);
        return true;
    } catch (e) {
        console.error(`[WorldStateUtils.setNetherLocked] Error setting Nether lock state: ${e.stack || e}`);
        return false;
    }
}

/**
 * Checks if The End dimension is locked.
 * @returns {boolean} True if locked, false otherwise.
 */
export function isEndLocked() {
    try {
        const locked = mc.world.getDynamicProperty(endLockedPropertyKey);
        return typeof locked === 'boolean' ? locked : false;
    } catch (e) {
        console.error(`[WorldStateUtils.isEndLocked] Error reading End lock state: ${e.stack || e}. Defaulting to false.`);
        return false;
    }
}

/**
 * Sets the lock state for The End dimension.
 * @param {boolean} newLockState True to lock, false to unlock.
 * @returns {boolean} True on success, false on failure.
 */
export function setEndLocked(newLockState) {
    if (typeof newLockState !== 'boolean') {
        console.error(`[WorldStateUtils.setEndLocked] Invalid lock state provided: ${newLockState}. Must be boolean.`);
        return false;
    }
    try {
        mc.world.setDynamicProperty(endLockedPropertyKey, newLockState);
        return true;
    } catch (e) {
        console.error(`[WorldStateUtils.setEndLocked] Error setting End lock state: ${e.stack || e}`);
        return false;
    }
}
