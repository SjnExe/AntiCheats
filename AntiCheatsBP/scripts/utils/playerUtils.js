/**
 * Provides utility functions for common player-related operations such as permission checks,
 * debug logging, admin notifications, player searching, and duration parsing.
 */
import * as mc from '@minecraft/server';

export function isAdmin(player, dependencies) {
    if (!dependencies || !dependencies.rankManager || !dependencies.permissionLevels) {
        console.warn("[PlayerUtils] isAdmin called without full dependencies object containing rankManager and permissionLevels.");
        return false;
    }
    if (!(player instanceof mc.Player) || !player.isValid()) {
        return false;
    }
    return dependencies.rankManager.getPlayerPermissionLevel(player, dependencies) === dependencies.permissionLevels.admin;
}

export function isOwner(player, dependencies) {
    if (!dependencies || !dependencies.rankManager || !dependencies.permissionLevels) {
        console.warn("[PlayerUtils] isOwner called without full dependencies object containing rankManager and permissionLevels.");
        return false;
    }
    if (!(player instanceof mc.Player) || !player.isValid()) {
        return false;
    }
    return dependencies.rankManager.getPlayerPermissionLevel(player, dependencies) === dependencies.permissionLevels.owner;
}

export async function executeLagClear(dependencies, adminPerformingAction) {
    let clearedItemsCount = 0;
    let dimensionsProcessed = 0;
    let errorMessages = [];
    const dimensionIds = ["minecraft:overworld", "minecraft:nether", "minecraft:the_end"];

    debugLog(`LagClear: Initiated by ${adminPerformingAction?.nameTag || 'SYSTEM'}. Processing dimensions: ${dimensionIds.join(', ')}.`, dependencies, adminPerformingAction?.nameTag);

    for (const dimensionId of dimensionIds) {
        try {
            const dimension = mc.world.getDimension(dimensionId);
            dimensionsProcessed++;
            const itemEntities = dimension.getEntities({ type: "minecraft:item" });

            let countInDimension = 0;
            for (const entity of itemEntities) {
                try {
                    entity.kill();
                    clearedItemsCount++;
                    countInDimension++;
                } catch (killError) {
                    const errMsg = `LagClear: Error killing item entity ${entity.id} in ${dimensionId}: ${killError}`;
                    errorMessages.push(errMsg);
                    debugLog(errMsg, dependencies, adminPerformingAction?.nameTag);
                }
            }
            debugLog(`LagClear: Cleared ${countInDimension} items in ${dimensionId}.`, dependencies, adminPerformingAction?.nameTag);

        } catch (dimError) {
            const errMsg = `LagClear: Error processing dimension ${dimensionId}: ${dimError}`;
            errorMessages.push(errMsg);
            debugLog(errMsg, dependencies, adminPerformingAction?.nameTag);
        }
    }

    debugLog(`LagClear: Finished. Processed ${dimensionsProcessed} dimensions. Total items cleared: ${clearedItemsCount}. Errors: ${errorMessages.length}`, dependencies, adminPerformingAction?.nameTag);
    return {
        clearedItemsCount,
        dimensionsProcessed,
        error: errorMessages.length > 0 ? errorMessages.join('\n') : null
    };
}

export function warnPlayer(player, reason) {
    player.sendMessage(`§c[AntiCheat] Warning: ${reason}§r`);
}

export function notifyAdmins(baseMessage, dependencies, player, pData) {
    if (!dependencies || !dependencies.config) {
        console.warn("[PlayerUtils] notifyAdmins was called without the required dependencies object or dependencies.config.");
        return;
    }
    let fullMessage = `§7[AC Notify] ${baseMessage}§r`;

    if (player && pData && pData.flags && typeof pData.flags.totalFlags === 'number') {
        const flagType = pData.lastFlagType || "N/A";
        const specificFlagCount = pData.flags[flagType] ? pData.flags[flagType].count : 0;
        fullMessage += ` §c(Player: ${player.nameTag}, Total Flags: ${pData.flags.totalFlags}, Last: ${flagType} [${specificFlagCount}])§r`;
    } else if (player) {
        fullMessage += ` §c(Player: ${player.nameTag})§r`;
    }

    const allPlayers = mc.world.getAllPlayers();
    const notificationsOffTag = "ac_notifications_off";
    const notificationsOnTag = "ac_notifications_on";

    for (const p of allPlayers) {
        if (isAdmin(p, dependencies)) {
            const hasExplicitOn = p.hasTag(notificationsOnTag);
            const hasExplicitOff = p.hasTag(notificationsOffTag);
            const shouldReceiveMessage = hasExplicitOn || (!hasExplicitOff && dependencies.config.acGlobalNotificationsDefaultOn);
            if (shouldReceiveMessage) {
                try {
                    p.sendMessage(fullMessage);
                } catch (e) {
                    console.error(`[playerUtils] Failed to send notification to admin ${p.nameTag}: ${e}`);
                    debugLog(`Failed to send AC notification to admin ${p.nameTag}: ${e}`, dependencies, p.nameTag);
                }
            }
        }
    }
}

export function debugLog(message, dependencies, contextPlayerNameIfWatched = null) {
    if (dependencies?.config?.enableDebugLogging) { // Simplified
        const prefix = contextPlayerNameIfWatched ? `[AC Watch - ${contextPlayerNameIfWatched}]` : `[AC Debug]`;
        console.warn(`${prefix} ${message}`);
    }
}

export function findPlayer(playerName) {
    if (!playerName || typeof playerName !== 'string') return null;
    const nameToFind = playerName.toLowerCase();
    return mc.world.getAllPlayers().find(p => p.nameTag.toLowerCase() === nameToFind) || null;
}

export function parseDuration(durationString) {
    if (!durationString || typeof durationString !== 'string') return null;
    const lowerDurationString = durationString.toLowerCase();
    if (lowerDurationString === "perm" || lowerDurationString === "permanent") return Infinity;

    const regex = /^(\d+)([smhd])$/;
    const match = lowerDurationString.match(regex);

    if (match) {
        const value = parseInt(match[1]);
        const unit = match[2];
        switch (unit) {
            case 's': return value * 1000;
            case 'm': return value * 60 * 1000;
            case 'h': return value * 60 * 60 * 1000;
            case 'd': return value * 24 * 60 * 60 * 1000;
        }
    } else if (/^\d+$/.test(lowerDurationString)) {
        const value = parseInt(lowerDurationString);
        if (!isNaN(value)) return value * 60 * 1000;
    }
    return null;
}
/**
 * Formats a duration in milliseconds into a human-readable string (e.g., "1h 23m 45s").
 * @param {number} ms - The duration in milliseconds.
 * @returns {string} A formatted string representing the duration, or "N/A" if ms is non-positive.
 */
export function formatSessionDuration(ms) {
    if (ms <= 0) {
        return "N/A";
    }
    let seconds = Math.floor(ms / 1000);
    let minutes = Math.floor(seconds / 60);
    let hours = Math.floor(minutes / 60);
    seconds %= 60;
    minutes %= 60;

    const parts = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);
    return parts.join(' ');
}
