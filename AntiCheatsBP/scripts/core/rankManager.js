/**
 * @file Manages player ranks, permission levels, and their display properties (chat/nametag prefixes).
 * @version 1.1.0
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
 * @typedef {object} RankProperties
 * @property {string} name - The display name of the rank (e.g., "Owner", "Admin", "Member").
 * @property {string} prefixText - The text part of the prefix (e.g., "[Owner] ").
 * @property {string} defaultColor - The default Minecraft color code for this rank (e.g., "§c").
 * @property {string} nametagPrefix - The prefix displayed above a player's nametag (e.g., "§cOwner§f\n").
 */

/**
 * Defines display and formatting properties for different player ranks.
 * @type {Object.<string, RankProperties>}
 */
export const ranks = {
    owner: {
        name: "Owner",
        prefixText: "[Owner] ",
        defaultColor: "§c", // Red
        nametagPrefix: "§cOwner§f\n"
    },
    admin: {
        name: "Admin",
        prefixText: "[Admin] ",
        defaultColor: "§b", // Aqua
        nametagPrefix: "§bAdmin§f\n"
    },
    member: {
        name: "Member",
        prefixText: "[Member] ",
        defaultColor: "§7", // Gray
        nametagPrefix: "§7Member§f\n"
    }
};

/**
 * Determines the rank ID ('owner', 'admin', 'member') for a given player.
 * @param {Player} player - The Minecraft Player object.
 * @returns {string} The rank ID. Defaults to 'member'.
 */
export function getPlayerRankId(player) {
    if (!(player instanceof Player)) {
         console.warn("[RankManager] Invalid player object passed to getPlayerRankId. Defaulting to member.");
         return 'member';
    }
    // Ensure player.nameTag is available, which it should be for a valid Player object.
    if (typeof player.nameTag !== 'string') {
        console.warn(`[RankManager] Player object for ID ${player.id} has no nameTag. Defaulting to member.`);
        return 'member';
    }
    if (isOwner(player.nameTag)) return 'owner';
    if (isAdmin(player)) return 'admin';
    return 'member';
}

// Old constants and function are removed/commented out as per instructions.
// /**
//  * Display properties for the Owner rank.
//  * @type {RankDisplayProperties}
//  */
// export const ownerRank = {
//     name: "Owner",
//     chatPrefix: "§c[Owner] §f",
//     nametagPrefix: "§cOwner§f\n"
// };
// // ... (adminRank, memberRank, getPlayerRankDisplay commented or removed) ...


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

        const rankId = getPlayerRankId(player);
        const rankDisplay = ranks[rankId];

        if (!rankDisplay) {
            console.error(`[RankManager] Could not find rank display properties for rankId: ${rankId} for player ${player.nameTag}. Defaulting nametag.`);
            player.nameTag = player.name; // Fallback to just player name
            return;
        }

        player.nameTag = rankDisplay.nametagPrefix + player.name;

    } catch (error) {
        let playerNameForError = "UnknownPlayer";
        try {
            if (player && typeof player.name === 'string') {
                playerNameForError = player.name;
            }
        } catch (nameAccessError) {
            console.warn(`[RankManager] Could not access name of player during nametag update error: ${nameAccessError}`);
        }
        console.error(`[RankManager] Error setting nametag for '${playerNameForError}': ${error.stack || error}`);
    }
}
