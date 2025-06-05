/**
 * @file Manages player ranks and their display properties.
 * @author YourName // Replace with actual author if known, or leave generic
 * @version 1.0.0
 */

import { Player } from '@minecraft/server';
import { isOwner, isAdmin } from '../utils/playerUtils.js';

/**
 * @typedef {number} PermissionLevel
 * Defines the numeric hierarchy for command permissions.
 * Lower numbers indicate higher privileges.
 * - 0: Owner
 * - 1: Admin
 * - 2: Normal (standard user)
 */

/**
 * Enum for permission levels. Lower values mean higher privileges.
 * @readonly
 * @enum {PermissionLevel}
 */
export const PermissionLevels = {
    OWNER: 0,  // Highest privilege
    ADMIN: 1,  // Intermediate privilege
    NORMAL: 2 // Standard user privilege, corresponds to MEMBER_RANK
};

/**
 * @typedef {object} RankDisplayProperties
 * @property {string} name - The display name of the rank (e.g., "Owner", "Admin").
 * @property {string} chatPrefix - The prefix to use before a player's chat message.
 * @property {string} nametagPrefix - The prefix to display above a player's nametag.
 */

/**
 * Display properties for the Owner rank.
 * @type {RankDisplayProperties}
 */
export const OWNER_RANK = {
    name: "Owner",
    chatPrefix: "§c[Owner] §f", // Red prefix, white text
    nametagPrefix: "§cOwner§f\n"   // Red "Owner" above nametag, white player name
};

/**
 * Display properties for the Admin rank.
 * @type {RankDisplayProperties}
 */
export const ADMIN_RANK = {
    name: "Admin",
    chatPrefix: "§b[Admin] §f", // Aqua prefix, white text
    nametagPrefix: "§bAdmin§f\n"   // Aqua "Admin" above nametag, white player name
};

/**
 * Display properties for the Member rank.
 * @type {RankDisplayProperties}
 */
export const MEMBER_RANK = {
    name: "Member",
    chatPrefix: "§7[Member] §f", // Gray prefix, white text
    nametagPrefix: "§7Member§f\n"  // Gray "Member" above nametag, white player name
};

/**
 * Determines the rank display properties for a given player.
 *
 * @param {Player} player - The Minecraft Player object.
 * @returns {RankDisplayProperties} The rank display properties object (OWNER_RANK, ADMIN_RANK, or MEMBER_RANK).
 */
export function getPlayerRankDisplay(player) {
    if (!(player instanceof Player)) {
        console.error("[rankManager] Invalid player object passed to getPlayerRankDisplay.");
        // Fallback to member if player object is not valid, though this shouldn't happen in normal use.
        return MEMBER_RANK;
    }

    if (isOwner(player.nameTag)) {
        return OWNER_RANK;
    } else if (isAdmin(player)) {
        return ADMIN_RANK;
    } else {
        return MEMBER_RANK;
    }
}

/**
 * Updates a player's nametag based on their rank.
 * The nametag will be formatted as: RankPrefix + PlayerName.
 * Example: "§cOwner§f\nPlayerActualName"
 *
 * @param {Player} player - The Minecraft Player object whose nametag is to be updated.
 */
export function updatePlayerNametag(player) {
    if (!(player instanceof Player)) {
        console.error("[rankManager] Invalid player object passed to updatePlayerNametag.");
        return;
    }

    const rankDisplay = getPlayerRankDisplay(player);
    // player.name is the read-only actual name of the player.
    // player.nameTag is the modifiable display name shown above the player.
    try {
        player.nameTag = rankDisplay.nametagPrefix + player.name;
    } catch (error) {
        console.error(`[rankManager] Error setting nametag for ${player.name}: ${error}`);
        // Potentially, the player object might not be valid anymore (e.g., left during the tick)
        // or some other unexpected issue.
    }
}
