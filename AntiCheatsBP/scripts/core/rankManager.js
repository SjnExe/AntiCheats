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
 * - 1024: Normal (standard user). This value is set high to allow for the
 *         potential addition of many intermediate permission levels (e.g., Moderator, VIP)
 *         between Admin and Normal in the future.
 */

/**
 * Enum for permission levels. Lower values mean higher privileges.
 * NORMAL is set to 1024 to allow for future intermediate permission levels.
 * @readonly
 * @enum {PermissionLevel}
 */
export const permissionLevels = {
    OWNER: 0,     // Highest privilege
    ADMIN: 1,     // Intermediate privilege (e.g., server administrators)
    NORMAL: 1024  // Standard user privilege, corresponds to MEMBER_RANK.
                  // Chosen to be a higher number to leave room for many potential
                  // intermediate ranks (e.g., Moderator, VIP, etc.) between ADMIN and NORMAL.
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
export const ownerRank = {
    name: "Owner",
    chatPrefix: "§c[Owner] §f", // Red prefix, white text
    nametagPrefix: "§cOwner§f\n"   // Red "Owner" above nametag, white player name
};

/**
 * Display properties for the Admin rank.
 * @type {RankDisplayProperties}
 */
export const adminRank = {
    name: "Admin",
    chatPrefix: "§b[Admin] §f", // Aqua prefix, white text
    nametagPrefix: "§bAdmin§f\n"   // Aqua "Admin" above nametag, white player name
};

/**
 * Display properties for the Member rank.
 * @type {RankDisplayProperties}
 */
export const memberRank = {
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
        return memberRank;
    }

    if (isOwner(player.nameTag)) {
        return ownerRank;
    } else if (isAdmin(player)) {
        return adminRank;
    } else {
        return memberRank;
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

    const vanishedTag = "vanished"; // Standard tag for vanished players

    try {
        if (player.hasTag(vanishedTag)) {
            player.nameTag = ""; // Clear nametag for vanished players
            return; // No further nametag processing needed
        }

        // If not vanished, proceed with standard rank-based nametag
        const rankDisplay = getPlayerRankDisplay(player);
        // player.name is the read-only actual name of the player.
        // player.nameTag is the modifiable display name shown above the player.
        player.nameTag = rankDisplay.nametagPrefix + player.name;

    } catch (error) {
        // It's good to log the specific player if possible, especially if player.name is accessible
        // However, player object might be in a bad state if error occurs.
        let playerNameForError = "UnknownPlayer";
        try {
            if (player && player.name) {
                playerNameForError = player.name;
            }
        } catch (nameError) {
            // player or player.name might not be accessible
        }
        console.error(`[rankManager] Error setting nametag for ${playerNameForError}: ${error}`);
        // Potentially, the player object might not be valid anymore (e.g., left during the tick)
        // or some other unexpected issue.
    }
}
