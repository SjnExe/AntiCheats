/**
 * Provides utility functions for common player-related operations such as permission checks,
 * debug logging, admin notifications, player searching, and duration parsing.
 */
import * as mc from '@minecraft/server';
import { stringDB } from '../core/textDatabase.js';

/**
 * Retrieves a string from the text database and formats it with parameters.
 * @param {string} key - The key of the string to retrieve (e.g., 'ui.adminPanel.title').
 * @param {Record<string, string | number>} [params] - Optional object containing placeholder values.
 * @returns {string} The formatted string, or the key itself if not found (with a warning).
 */
export function getString(key, params) {
    let str = stringDB[key];
    if (str === undefined) {
        console.warn(`[PlayerUtils.getString] Missing string key: ${key}`);
        return key;
    }
    if (params) {
        for (const placeholder in params) {
            if (Object.prototype.hasOwnProperty.call(params, placeholder) && (typeof params[placeholder] === 'string' || typeof params[placeholder] === 'number')) {
                str = str.replace(new RegExp(`{${placeholder}}`, 'g'), String(params[placeholder]));
            }
        }
    }
    return str;
}

/**
 * Checks if a player has admin-level permissions.
 * @param {import('@minecraft/server').Player} player - The player to check.
 * @param {import('../types.js').CommandDependencies} dependencies - Object containing rankManager and permissionLevels.
 * @returns {boolean} True if the player is an admin, false otherwise.
 */
export function isAdmin(player, dependencies) {
    if (!dependencies || !dependencies.rankManager || !dependencies.permissionLevels) {
        console.warn('[PlayerUtils] isAdmin called without full dependencies object containing rankManager and permissionLevels.');
        return false;
    }
    if (!(player instanceof mc.Player) || !player.isValid()) {
        return false;
    }
    return dependencies.rankManager.getPlayerPermissionLevel(player, dependencies) <= dependencies.permissionLevels.admin;
}

/**
 * Sends a standardized warning message to a player.
 * @param {import('@minecraft/server').Player} player - The player to warn.
 * @param {string} reason - The reason for the warning.
 * @param {import('../types.js').CommandDependencies} [dependencies] - Optional dependencies, needed if playing a sound.
 */
export function warnPlayer(player, reason, dependencies) {
    player?.sendMessage(`§c[AntiCheat] Warning: ${reason}§r`);
    if (dependencies && player) { // Check if dependencies and player are provided
        playSoundForEvent(player, "playerWarningReceived", dependencies);
    }
}

/**
 * Notifies online administrators of an event.
 * @param {string} baseMessage - The core message to send.
 * @param {import('../types.js').CommandDependencies} dependencies - Standard command dependencies.
 * @param {import('@minecraft/server').Player | null} player - The player primarily involved in the event (for context), or null.
 * @param {import('../types.js').PlayerAntiCheatData | null} pData - The AntiCheat data for the involved player, or null.
 */
export function notifyAdmins(baseMessage, dependencies, player, pData) {
    if (!dependencies || !dependencies.config) {
        console.warn('[PlayerUtils] notifyAdmins was called without the required dependencies object or dependencies.config.');
        return;
    }
    // New standard prefix
    const prefix = "§c[AC] §r";
    let fullMessage = prefix + baseMessage;

    // Standardized player/flag context suffix
    if (player && pData && pData.flags && typeof pData.flags.totalFlags === 'number') {
        const flagType = pData.lastFlagType || 'N/A';
        const specificFlagCount = (flagType !== 'N/A' && pData.flags[flagType]) ? pData.flags[flagType].count : 0;
        // Using §7 for context, §e for player name, §b for values
        fullMessage += ` §7(Player: §e${player.nameTag}§7, Flags: §b${pData.flags.totalFlags}§7, Last: §b${flagType}§7[§b${specificFlagCount}§7])§r`;
    } else if (player) {
        fullMessage += ` §7(Player: §e${player.nameTag}§7)§r`;
    }

    const allPlayers = mc.world.getAllPlayers();
    const notificationsOffTag = 'ac_notifications_off';
    const notificationsOnTag = 'ac_notifications_on';

    for (const p of allPlayers) {
        if (isAdmin(p, dependencies)) {
            const hasExplicitOn = p.hasTag(notificationsOnTag);
            const hasExplicitOff = p.hasTag(notificationsOffTag);
            const shouldReceiveMessage = hasExplicitOn || (!hasExplicitOff && dependencies.config.acGlobalNotificationsDefaultOn);
            if (shouldReceiveMessage) {
                try {
                    p.sendMessage(fullMessage);
                    // Play sound for this specific admin receiving the notification
                    playSoundForEvent(p, "adminNotificationReceived", dependencies, null);
                } catch (e) {
                    console.error(`[playerUtils] Failed to send notification to admin ${p.nameTag}: ${e}`);
                    debugLog(`Failed to send AC notification to admin ${p.nameTag}: ${e}`, p.nameTag, dependencies);
                }
            }
        }
    }
}

/**
 * Logs a debug message to the console if debug logging is enabled.
 * Prefixes messages with context if a watched player's name is provided.
 * @param {string} message - The message to log.
 * @param {string | null} contextPlayerNameIfWatched - The name of the player if they are being watched, for contextual prefixing.
 * @param {import('../types.js').CommandDependencies} dependencies - Access to config for `enableDebugLogging`.
 */
export function debugLog(message, contextPlayerNameIfWatched = null, dependencies) {
    if (dependencies?.config?.enableDebugLogging) {
        const prefix = contextPlayerNameIfWatched ? `[AC Watch - ${contextPlayerNameIfWatched}]` : '[AC Debug]';
        console.warn(`${prefix} ${message}`);
    }
}

/**
 * Finds an online player by their nameTag (case-insensitive).
 * @param {string} playerName - The nameTag of the player to find.
 * @returns {import('@minecraft/server').Player | null} The player object if found, otherwise null.
 */
export function findPlayer(playerName) {
    if (!playerName || typeof playerName !== 'string') {
        return null;
    }
    const nameToFind = playerName.toLowerCase();
    return mc.world.getAllPlayers().find(p => p.nameTag.toLowerCase() === nameToFind) || null;
}

/**
 * Parses a duration string (e.g., "7d", "2h", "30m", "perm") into milliseconds.
 * Also accepts a plain number, which is interpreted as seconds.
 * @param {string} durationString - The duration string to parse.
 * @returns {number | null} The duration in milliseconds, Infinity for "perm", or null if invalid.
 */
export function parseDuration(durationString) {
    if (!durationString || typeof durationString !== 'string') {
        return null;
    }
    const lowerDurationString = durationString.toLowerCase();
    if (lowerDurationString === 'perm' || lowerDurationString === 'permanent') {
        return Infinity;
    }

    const regex = /^(\d+)([smhd])$/;
    const match = lowerDurationString.match(regex);

    if (match) {
        const value = parseInt(match[1], 10);
        const unit = match[2];
        switch (unit) {
            case 's': return value * 1000;
            case 'm': return value * 60 * 1000;
            case 'h': return value * 60 * 60 * 1000;
            case 'd': return value * 24 * 60 * 60 * 1000;
        }
    } else if (/^\d+$/.test(lowerDurationString)) {
        const value = parseInt(lowerDurationString, 10);
        if (!isNaN(value)) {
            return value * 1000;
        }
    }
    return null;
}

/**
 * Formats a duration in milliseconds into a human-readable string (e.g., "1h 23m 45s").
 * @param {number} ms - The duration in milliseconds.
 * @returns {string} A formatted string representing the duration, or "N/A" if ms is non-positive or invalid.
 */
export function formatSessionDuration(ms) {
    if (ms <= 0 || typeof ms !== 'number' || isNaN(ms)) {
        return 'N/A';
    }
    let seconds = Math.floor(ms / 1000);
    let minutes = Math.floor(seconds / 60);
    let hours = Math.floor(minutes / 60);
    seconds %= 60;
    minutes %= 60;

    const parts = [];
    if (hours > 0) {
        parts.push(`${hours}h`);
    }
    if (minutes > 0) {
        parts.push(`${minutes}m`);
    }
    if (seconds > 0 || parts.length === 0) {
        parts.push(`${seconds}s`);
    }
    return parts.join(' ');
}

/**
 * Formats a time difference (e.g., from a past timestamp to Date.now()) into a human-readable "ago" string.
 * @param {number} msDifference - The time difference in milliseconds.
 * @returns {string} A formatted string like "5m ago", "2h ago", "3d ago", or "just now".
 */
export function formatTimeDifference(msDifference) {
    if (msDifference < 0 || typeof msDifference !== 'number' || isNaN(msDifference)) {
        return 'in the future';
    }
    if (msDifference < 1000) {
        return 'just now';
    }

    const seconds = Math.floor(msDifference / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30.4375);
    const years = Math.floor(days / 365.25);

    if (years > 0) {
        return `${years}y ago`;
    }
    if (months > 0) {
        return `${months}mo ago`;
    }
    if (weeks > 0) {
        return `${weeks}w ago`;
    }
    if (days > 0) {
        return `${days}d ago`;
    }
    if (hours > 0) {
        return `${hours}h ago`;
    }
    if (minutes > 0) {
        return `${minutes}m ago`;
    }
    return `${seconds}s ago`;
}

/**
 * Plays a sound for a specific game event based on configuration.
 * @param {import('@minecraft/server').Player | null} primaryPlayer - The primary player associated with the event (e.g., the one executing a command, or an admin receiving a notification). Can be null for global sounds.
 * @param {string} eventName - The key of the sound event in `config.soundEvents` (e.g., "tpaRequestReceived", "adminNotificationReceived").
 * @param {import('../types.js').CommandDependencies} dependencies - Standard dependencies object.
 * @param {import('@minecraft/server').Player | null} [targetPlayerContext=null] - An optional secondary player, used if `soundConfig.target` is "targetPlayer".
 */
export function playSoundForEvent(primaryPlayer, eventName, dependencies, targetPlayerContext = null) {
    const { config, playerUtils } = dependencies; // playerUtils for isAdmin if needed

    if (!config?.soundEvents) {
        // console.warn(`[PlayerUtils.playSoundForEvent] soundEvents configuration is missing.`);
        return;
    }

    const soundConfig = config.soundEvents[eventName];

    if (!soundConfig || !soundConfig.enabled || !soundConfig.soundId || typeof soundConfig.soundId !== 'string' || soundConfig.soundId.trim() === '') {
        // playerUtils?.debugLog(`[PlayerUtils.playSoundForEvent] Sound for event '${eventName}' is disabled or misconfigured.`, primaryPlayer?.nameTag, dependencies);
        return;
    }

    const soundOptions = {
        volume: typeof soundConfig.volume === 'number' ? soundConfig.volume : 1.0,
        pitch: typeof soundConfig.pitch === 'number' ? soundConfig.pitch : 1.0,
    };

    const playToPlayer = (playerInstance) => {
        if (playerInstance?.isValid()) {
            try {
                playerInstance.playSound(soundConfig.soundId, soundOptions);
            } catch (e) {
                console.warn(`[PlayerUtils.playSoundForEvent] Error playing sound '${soundConfig.soundId}' for ${playerInstance.nameTag}: ${e.message}`);
                // playerUtils?.debugLog(`[PlayerUtils.playSoundForEvent] Error playing sound '${soundConfig.soundId}' for ${playerInstance.nameTag}: ${e.stack}`, playerInstance.nameTag, dependencies);
            }
        }
    };

    switch (soundConfig.target) {
        case 'player':
            if (primaryPlayer) playToPlayer(primaryPlayer);
            break;
        case 'admin':
            mc.world.getAllPlayers().forEach(p => {
                if (playerUtils.isAdmin(p, dependencies)) { // Assuming isAdmin is part of playerUtils
                    playToPlayer(p);
                }
            });
            break;
        case 'targetPlayer':
            if (targetPlayerContext) playToPlayer(targetPlayerContext);
            else if (primaryPlayer) playToPlayer(primaryPlayer); // Fallback to primary if targetPlayerContext is null
            break;
        case 'global':
            mc.world.getAllPlayers().forEach(p => playToPlayer(p));
            break;
        default: // Defaults to 'player' if target is unspecified or invalid
            if (primaryPlayer) playToPlayer(primaryPlayer);
            break;
    }
}
