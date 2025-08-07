import * as mc from '@minecraft/server';
import { stringDB } from '../../core/textDatabase.js';

// Time constants
const millisecondsPerSecond = 1000;
const secondsPerMinute = 60;
const minutesPerHour = 60;
const hoursPerDay = 24;
const daysPerWeek = 7;
const avgDaysPerMonth = 30.4375;
const avgDaysPerYear = 365.25;


/**
 * @param {string} key
 * @param {Record<string, string|number>} [params]
 * @returns {string}
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
 * @param {import('@minecraft/server').Player} player
 * @param {import('../types.js').CommandDependencies} dependencies
 * @returns {boolean}
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
 * @param {import('@minecraft/server').Player} player
 * @param {string} reason
 * @param {import('../types.js').CommandDependencies} [dependencies]
 */
export function warnPlayer(player, reason, dependencies) {
    player?.sendMessage(`§c[AntiCheat] Warning: ${reason}§r`);
    if (dependencies && player) {
        playSoundForEvent(player, 'playerWarningReceived', dependencies);
    }
}

/**
 * @param {string} dimensionId
 * @returns {string}
 */
export function formatDimensionName(dimensionId) {
    if (typeof dimensionId !== 'string' || dimensionId.trim() === '') {
        return 'Unknown Dimension';
    }

    let name = dimensionId.toLowerCase().startsWith('minecraft:')
        ? dimensionId.substring(10)
        : dimensionId;

    name = name.replace(/_/g, ' ').trim();

    if (name === '') {
        return 'Unknown Dimension';
    }

    return name
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

/**
 * @param {string} baseMessage
 * @param {import('../types.js').CommandDependencies} dependencies
 * @param {import('@minecraft/server').Player|null} player
 * @param {import('../types.js').PlayerAntiCheatData|null} pData
 */
export function notifyAdmins(baseMessage, dependencies, player, pData) {
    if (!dependencies || !dependencies.config) {
        console.warn('[PlayerUtils] notifyAdmins was called without the required dependencies object or dependencies.config.');
        return;
    }
    const prefix = '§c[AC] §r';
    let fullMessage = prefix + baseMessage;

    if (player && pData && pData.flags && typeof pData.flags.totalFlags === 'number') {
        const flagType = pData.lastFlagType || 'N/A';
        const specificFlagCount = (flagType !== 'N/A' && pData.flags[flagType]) ? pData.flags[flagType].count : 0;
        fullMessage += ` §7(Player: §e${player.name}§7, Flags: §b${pData.flags.totalFlags}§7, Last: §b${flagType}§7[§b${specificFlagCount}§7])§r`;
    } else if (player) {
        fullMessage += ` §7(Player: §e${player.name}§7)§r`;
    }

    const allPlayers = mc.world.getAllPlayers();
    const notificationsOffTag = 'notifications_off';
    const notificationsOnTag = 'notifications_on';

    for (const p of allPlayers) {
        if (isAdmin(p, dependencies)) {
            const hasExplicitOn = p.hasTag(notificationsOnTag);
            const hasExplicitOff = p.hasTag(notificationsOffTag);
            const shouldReceiveMessage = hasExplicitOn || (!hasExplicitOff && dependencies.config.acGlobalNotificationsDefaultOn);
            if (shouldReceiveMessage) {
                try {
                    p.sendMessage(fullMessage);
                    playSoundForEvent(p, 'adminNotificationReceived', dependencies, null);
                } catch (e) {
                    console.error(`[playerUtils] Failed to send notification to admin ${p.name}: ${e}`);
                    debugLog(`Failed to send AC notification to admin ${p.name}: ${e}`, p.name, dependencies);
                }
            }
        }
    }
}

/**
 * @param {string} message
 */
export function log(message) {
    console.warn(`[AC] ${message}`);
}

/**
 * @param {string} message
 * @param {Error} [error]
 */
export function logError(message, error) {
    const errorMessage = `[AC ERROR] ${message}`;
    console.error(errorMessage);
    if (error && error.stack) {
        console.error(`Stack Trace: ${error.stack}`);
    }
}

export function debugLog(message, contextPlayerNameIfWatched = null, dependencies) {
    if (dependencies?.config?.enableDebugLogging) {
        const prefix = contextPlayerNameIfWatched ? `[AC Watch - ${contextPlayerNameIfWatched}]` : '[AC Debug]';
        console.warn(`${prefix} ${message}`);
    }
}

/**
 * @param {string} playerName
 * @returns {import('@minecraft/server').Player|null}
 */
export function findPlayer(playerName) {
    if (!playerName || typeof playerName !== 'string') {
        return null;
    }
    const nameToFind = playerName.toLowerCase();
    return mc.world.getAllPlayers().find(p => p.name.toLowerCase() === nameToFind) || null;
}

/**
 * @param {string} durationString
 * @returns {number|null}
 */
export function parseDuration(durationString) {
    if (!durationString || typeof durationString !== 'string') {
        return null;
    }
    const lowerDurationString = durationString.toLowerCase();
    if (lowerDurationString === 'perm' || lowerDurationString === 'permanent') {
        return Infinity;
    }

    const regex = /^(\d+)([smhdw])$/; // Added 'w' for weeks
    const match = lowerDurationString.match(regex);

    if (match) {
        const value = parseInt(match[1], 10);
        const unit = match[2];
        switch (unit) {
            case 's': return value * millisecondsPerSecond;
            case 'm': return value * secondsPerMinute * millisecondsPerSecond;
            case 'h': return value * minutesPerHour * secondsPerMinute * millisecondsPerSecond;
            case 'd': return value * hoursPerDay * minutesPerHour * secondsPerMinute * millisecondsPerSecond;
            case 'w': return value * daysPerWeek * hoursPerDay * minutesPerHour * secondsPerMinute * millisecondsPerSecond;
            default:
            // This case should ideally not be reached if the regex is correct.
                console.warn(`[PlayerUtils.parseDuration] Unexpected unit '${unit}' from regex match.`);
                return null;
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
 * @param {number} ms
 * @returns {string}
 */
export function formatSessionDuration(ms) {
    if (ms <= 0 || typeof ms !== 'number' || isNaN(ms)) {
        return 'N/A';
    }

    if (ms < 1000) {
        return '0s';
    }

    let totalSeconds = Math.floor(ms / millisecondsPerSecond);

    const days = Math.floor(totalSeconds / (hoursPerDay * secondsPerMinute));
    totalSeconds %= (hoursPerDay * secondsPerMinute);

    const hours = Math.floor(totalSeconds / (minutesPerHour * secondsPerMinute));
    totalSeconds %= (minutesPerHour * secondsPerMinute);

    const minutes = Math.floor(totalSeconds / secondsPerMinute);
    const seconds = totalSeconds % secondsPerMinute;

    const parts = [];
    if (days > 0) {
        parts.push(`${days}d`);
    }
    if (hours > 0) {
        parts.push(`${hours}h`);
    }
    if (minutes > 0) {
        parts.push(`${minutes}m`);
    }
    if (seconds > 0) {
        parts.push(`${seconds}s`);
    }

    return parts.length > 0 ? parts.join(' ') : '0s';
}

/**
 * @param {number} msDifference
 * @returns {string}
 */
export function formatTimeDifference(msDifference) {
    if (msDifference < 0 || typeof msDifference !== 'number' || isNaN(msDifference)) {
        return 'in the future';
    }
    if (msDifference < 1000) {
        return 'just now';
    }

    const seconds = Math.floor(msDifference / millisecondsPerSecond);
    const minutes = Math.floor(seconds / secondsPerMinute);
    const hours = Math.floor(minutes / minutesPerHour);
    const days = Math.floor(hours / hoursPerDay);
    const weeks = Math.floor(days / daysPerWeek);
    const months = Math.floor(days / avgDaysPerMonth);
    const years = Math.floor(days / avgDaysPerYear);

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
 * @param {import('@minecraft/server').Player|null} primaryPlayer
 * @param {string} eventName
 * @param {import('../types.js').CommandDependencies} dependencies
 * @param {import('@minecraft/server').Player|null} [targetPlayerContext]
 */
export function playSoundForEvent(primaryPlayer, eventName, dependencies, targetPlayerContext = null) {
    const { config, playerUtils } = dependencies; // playerUtils for isAdmin if needed

    if (!config?.soundEvents) {
        return;
    }

    const soundConfig = config.soundEvents[eventName];

    if (!soundConfig || !soundConfig.enabled || !soundConfig.soundId || typeof soundConfig.soundId !== 'string' || soundConfig.soundId.trim() === '') {
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
                console.warn(`[PlayerUtils.playSoundForEvent] Error playing sound '${soundConfig.soundId}' for ${playerInstance.name}: ${e.message}`);
                // playerUtils?.debugLog(`[PlayerUtils.playSoundForEvent] Error playing sound '${soundConfig.soundId}' for ${playerInstance.nameTag}: ${e.stack}`, playerInstance.name, dependencies);
            }
        }
    };

    switch (soundConfig.target) {
        case 'player':
            if (primaryPlayer) {
                playToPlayer(primaryPlayer);
            }
            break;
        case 'admin':
            mc.world.getAllPlayers().forEach(p => {
                if (playerUtils.isAdmin(p, dependencies)) {
                    playToPlayer(p);
                }
            });
            break;
        case 'targetPlayer':
            if (targetPlayerContext) {
                playToPlayer(targetPlayerContext);
            } else if (primaryPlayer) {
                playToPlayer(primaryPlayer);
            }
            break;
        case 'global':
            mc.world.getAllPlayers().forEach(p => playToPlayer(p));
            break;
        default:
            if (primaryPlayer) {
                playToPlayer(primaryPlayer);
            }
            break;
    }
}

/**
 * @param {string[]} args
 * @param {import('../types.js').CommandDependencies} dependencies
 * @param {number} [reasonStartIndex=1]
 * @param {string} [defaultReasonKey='common.value.noReasonProvided']
 * @returns {{targetPlayerName: string|undefined, reason: string}}
 */
export function parsePlayerAndReasonArgs(args, reasonStartIndex = 1, defaultReasonKey = 'common.value.noReasonProvided', dependencies) {
    const { getString } = dependencies; // playerUtils was unused here, getString is directly on dependencies or via playerUtils from caller

    const targetPlayerName = args[0];
    let reason = '';

    if (args.length > reasonStartIndex) {
        reason = args.slice(reasonStartIndex).join(' ').trim();
    }

    if (!reason) {
        reason = getString(defaultReasonKey);
    }

    return { targetPlayerName, reason };
}

/**
 * @param {import('@minecraft/server').Player} issuer
 * @param {string|undefined} targetPlayerName
 * @param {import('../types.js').Dependencies} dependencies
 * @param {object} [options]
 * @param {boolean} [options.allowSelf=false]
 * @param {string} [options.commandName='command']
 * @param {boolean} [options.requireOnline=true]
 * @returns {import('@minecraft/server').Player|null}
 */
export function validateCommandTarget(issuer, targetPlayerName, dependencies, options = {}) {
    const { getString } = dependencies; // Removed playerUtils
    const { allowSelf = false, commandName = 'command', requireOnline = true } = options;

    if (!targetPlayerName) {
        issuer.sendMessage(getString(`command.${commandName}.usage`, { prefix: dependencies.config?.prefix ?? '!' }));
        return null;
    }

    const targetPlayer = findPlayer(targetPlayerName);

    if (!targetPlayer || !targetPlayer.isValid()) {
        if (requireOnline) {
            issuer.sendMessage(getString('common.error.playerNotFoundOnline', { playerName: targetPlayerName }));
        } else {
            issuer.sendMessage(getString('common.error.playerNotFound', { playerName: targetPlayerName }));
        }
        return null;
    }

    if (!allowSelf && targetPlayer.id === issuer.id) {
        const selfTargetErrorKey = `command.${commandName}.cannotSelf`;
        if (stringDB[selfTargetErrorKey]) {
            issuer.sendMessage(getString(selfTargetErrorKey));
        } else {
            issuer.sendMessage(getString('command.error.cannotTargetSelf', { commandName }));
        }
        return null;
    }

    return targetPlayer;
}
