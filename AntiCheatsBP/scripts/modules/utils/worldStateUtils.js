import * as mc from '@minecraft/server';

const netherLockedPropertyKey = 'anticheat:netherLocked';
const endLockedPropertyKey = 'anticheat:endLocked';

/** @returns {boolean} */
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
 * @param {boolean} newLockState
 * @returns {boolean}
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

/** @returns {boolean} */
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
 * @param {boolean} newLockState
 * @returns {boolean}
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
