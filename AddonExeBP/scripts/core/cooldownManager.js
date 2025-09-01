import { world, system } from '@minecraft/server';
import { getConfig } from './configManager.js';
import { debugLog } from './logger.js';

const cooldownDbKey = 'exe:cooldowns';
const saveIntervalTicks = 6000; // Every 5 minutes

/** @type {Map<string, number>} */
let cooldowns = new Map();
let needsSave = false;

/**
 * Loads cooldowns from world dynamic properties.
 */
export function loadCooldowns() {
    debugLog('[CooldownManager] Loading cooldowns...');
    const dataStr = world.getDynamicProperty(cooldownDbKey);
    if (dataStr) {
        try {
            const parsedData = JSON.parse(dataStr);
            // Reconstruct the Map from the saved array
            cooldowns = new Map(parsedData);
            debugLog(`[CooldownManager] Loaded ${cooldowns.size} cooldowns.`);
        } catch (e) {
            console.error('[CooldownManager] Failed to parse cooldown data from world property.', e);
            cooldowns = new Map();
        }
    }
}

/**
 * Saves cooldowns to world dynamic properties if a change has occurred.
 */
function saveCooldowns() {
    if (!needsSave) return;
    try {
        // Convert Map to an array for JSON serialization
        const dataToSave = Array.from(cooldowns.entries());
        world.setDynamicProperty(cooldownDbKey, JSON.stringify(dataToSave));
        needsSave = false;
        debugLog('[CooldownManager] Saved cooldowns to world properties.');
    } catch (e) {
        console.error('[CooldownManager] Failed to save cooldowns.', e);
    }
}

/**
 * Iterates through all cooldowns and removes any that have expired.
 * This is for proactive cleanup to prevent the cooldown map from growing indefinitely.
 */
export function clearExpiredCooldowns() {
    const now = Date.now();
    let clearedCount = 0;
    for (const [key, expiry] of cooldowns.entries()) {
        if (now >= expiry) {
            cooldowns.delete(key);
            clearedCount++;
        }
    }
    if (clearedCount > 0) {
        needsSave = true;
        debugLog(`[CooldownManager] Cleared ${clearedCount} expired cooldowns.`);
    }
}

function getCooldownKey(playerId, commandName) {
    return `${playerId}:${commandName}`;
}

/**
 * Sets a cooldown for a player for a specific command.
 * @param {import('@minecraft/server').Player} player
 * @param {'tpa' | 'home' | 'spawn'} commandName
 */
export function setCooldown(player, commandName) {
    const config = getConfig();
    const commandConfig = config[commandName];
    if (!commandConfig || !commandConfig.cooldownSeconds) return;

    const key = getCooldownKey(player.id, commandName);
    const cooldownMs = commandConfig.cooldownSeconds * 1000;
    cooldowns.set(key, Date.now() + cooldownMs);
    needsSave = true;
}

/**
 * Gets the remaining cooldown for a player for a specific command.
 * @param {import('@minecraft/server').Player} player
 * @param {'tpa' | 'home' | 'spawn'} commandName
 * @returns {number} Remaining cooldown in seconds, or 0 if available.
 */
export function getCooldown(player, commandName) {
    const key = getCooldownKey(player.id, commandName);
    const expiry = cooldowns.get(key);

    if (!expiry) return 0;

    const now = Date.now();
    if (now >= expiry) {
        cooldowns.delete(key);
        needsSave = true;
        return 0;
    }

    return Math.ceil((expiry - now) / 1000);
}

// Periodically clear expired cooldowns and save to the world
system.runInterval(() => {
    clearExpiredCooldowns();
    saveCooldowns();
}, saveIntervalTicks);
