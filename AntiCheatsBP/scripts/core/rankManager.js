/**
 * @file Manages player ranks, permission levels, and their display properties (chat/nametag prefixes).
 * @version 1.0.1
 */

import { Player } from '@minecraft/server';
import { isOwner, isAdmin } from '../utils/playerUtils.js';

/**
 * @typedef {number} PermissionLevel
 * Defines the numeric hierarchy for command permissions and access control.
 * Lower numbers indicate higher privileges.
 * - 0: Owner (highest)
 * - 1: Admin
 * - 1024: Normal (standard user). This value is set high to allow for future
 *         intermediate permission levels (e.g., Moderator, VIP) between Admin and Normal.
 */

/**
 * Enum for permission levels. Lower values correspond to higher privileges.
 * `normal` is set to 1024 to provide ample room for future intermediate ranks.
 * @readonly
 * @enum {PermissionLevel}
 */
export const permissionLevels = {
    owner: 0,
    admin: 1,
    normal: 1024
};

/**
 * @typedef {object} RankDisplayProperties
 * @property {string} name - The display name of the rank (e.g., "Owner", "Admin", "Member").
 * @property {string} chatPrefix - The prefix used before a player's chat message (e.g., "§c[Owner] §f").
 * @property {string} nametagPrefix - The prefix displayed above a player's nametag (e.g., "§cOwner§f\n").
 */

/**
 * Display properties for the Owner rank.
 * @type {RankDisplayProperties}
 */
export const ownerRank = {
    name: "Owner",
    chatPrefix: "§c[Owner] §f",    // Red prefix, white player name in chat
    nametagPrefix: "§cOwner§f\n"   // Red "Owner" text above the player's actual name
};

/**
 * Display properties for the Admin rank.
 * @type {RankDisplayProperties}
 */
export const adminRank = {
    name: "Admin",
    chatPrefix: "§b[Admin] §f",    // Aqua prefix, white player name in chat
    nametagPrefix: "§bAdmin§f\n"   // Aqua "Admin" text above the player's actual name
};

/**
 * Display properties for the Member rank (standard players).
 * @type {RankDisplayProperties}
 */
export const memberRank = {
    name: "Member",
    chatPrefix: "§7[Member] §f",   // Gray prefix, white player name in chat
    nametagPrefix: "§7Member§f\n"  // Gray "Member" text above the player's actual name
};

/**
 * Determines the rank display properties (name, chat prefix, nametag prefix) for a given player
 * based on their status (Owner, Admin, or Member).
 *
 * @param {Player} player - The Minecraft Player object.
 * @returns {RankDisplayProperties} The rank display properties object corresponding to the player's rank.
 *                                  Defaults to `memberRank` if the player object is invalid.
 */
export function getPlayerRankDisplay(player) {
    if (!(player instanceof Player)) {
        // This case should ideally not be reached if player objects are always validated upstream.
        console.error("[RankManager] Invalid player object passed to getPlayerRankDisplay. Defaulting to Member rank.");
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
 * Updates a player's nametag to reflect their current rank.
 * The nametag will be formatted as: RankPrefix + PlayerName (e.g., "§cOwner§f\nPlayerActualName").
 * If the player has a "vanished" tag, their nametag is cleared.
 *
 * @param {Player} player - The Minecraft Player object whose nametag is to be updated.
 * @returns {void}
 */
export function updatePlayerNametag(player) {
    if (!(player instanceof Player)) {
        console.error("[RankManager] Invalid player object passed to updatePlayerNametag.");
        return;
    }

    const vanishedTag = "vanished"; // Consider moving to config if used elsewhere

    try {
        if (player.hasTag(vanishedTag)) {
            player.nameTag = ""; // Clear nametag for vanished players
            return;
        }

        const rankDisplay = getPlayerRankDisplay(player);
        // player.name is the read-only actual name. player.nameTag is the modifiable display name.
        player.nameTag = rankDisplay.nametagPrefix + player.name;

    } catch (error) {
        let playerNameForError = "UnknownPlayer";
        // Attempt to get player's name for logging, but be cautious as player object might be problematic.
        try {
            if (player && typeof player.name === 'string') { // Check type of player.name
                playerNameForError = player.name;
            }
        } catch (nameAccessError) {
            // player or player.name might not be accessible if the player object is in a bad state.
            console.warn(`[RankManager] Could not access name of player during nametag update error: ${nameAccessError}`);
        }
        console.error(`[RankManager] Error setting nametag for '${playerNameForError}': ${error.stack || error}`);
    }
}
