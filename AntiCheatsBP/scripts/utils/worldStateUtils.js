/**
 * Provides utility functions for managing global world states like dimension locks
 * using world dynamic properties.
 */
import { world } from '@minecraft/server';

const netherLockedProp = 'anticheat:netherLocked';
const endLockedProp = 'anticheat:endLocked';

export function isNetherLocked() {
    try {
        const locked = world.getDynamicProperty(netherLockedProp);
        return typeof locked === 'boolean' ? locked : false;
    } catch (e) {
        console.warn(`[worldStateUtils] Error reading Nether lock state: ${e}. Defaulting to false.`);
        return false;
    }
}

export function setNetherLocked(isLocked) {
    try {
        world.setDynamicProperty(netherLockedProp, isLocked);
    } catch (e) {
        console.error(`[worldStateUtils] Error setting Nether lock state: ${e}`);
    }
}

export function isEndLocked() {
    try {
        const locked = world.getDynamicProperty(endLockedProp);
        return typeof locked === 'boolean' ? locked : false;
    } catch (e) {
        console.warn(`[worldStateUtils] Error reading End lock state: ${e}. Defaulting to false.`);
        return false;
    }
}

export function setEndLocked(isLocked) {
    try {
        world.setDynamicProperty(endLockedProp, isLocked);
    } catch (e) {
        console.error(`[worldStateUtils] Error setting End lock state: ${e}`);
    }
}
