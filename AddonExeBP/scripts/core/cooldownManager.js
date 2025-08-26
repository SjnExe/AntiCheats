import { getConfig } from './configManager.js';

/**
 * @type {Map<string, number>}
 */
const cooldowns = new Map();

function getCooldownKey(playerId, commandName) {
    return `${playerId}:${commandName}`;
}

/**
 * Sets a cooldown for a player for a specific command.
 * @param {import('@minecraft/server').Player} player
 * @param {'tpa' | 'home'} commandName
 */
export function setCooldown(player, commandName) {
    const config = getConfig();
    const commandConfig = config[commandName];
    if (!commandConfig || !commandConfig.cooldownSeconds) return;

    const key = getCooldownKey(player.id, commandName);
    const cooldownMs = commandConfig.cooldownSeconds * 1000;
    cooldowns.set(key, Date.now() + cooldownMs);
}

/**
 * Gets the remaining cooldown for a player for a specific command.
 * @param {import('@minecraft/server').Player} player
 * @param {'tpa' | 'home'} commandName
 * @returns {number} Remaining cooldown in seconds, or 0 if available.
 */
export function getCooldown(player, commandName) {
    const key = getCooldownKey(player.id, commandName);
    const expiry = cooldowns.get(key);

    if (!expiry) return 0;

    const now = Date.now();
    if (now >= expiry) {
        cooldowns.delete(key);
        return 0;
    }

    return Math.ceil((expiry - now) / 1000);
}
