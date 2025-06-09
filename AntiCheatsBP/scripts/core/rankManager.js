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
 * @typedef {object} RankChatColors
 * @property {string} defaultPrefixColor - Default color for the rank prefix.
 * @property {string} defaultNameColor - Default color for the player's name.
 * @property {string} defaultMessageColor - Default color for the player's message.
 */

/**
 * @typedef {object} RankConfigKeys
 * @property {string} prefixColor - Config key for the rank prefix color.
 * @property {string} nameColor - Config key for the player's name color.
 * @property {string} messageColor - Config key for the player's message color.
 */

/**
 * @typedef {object} RankProperties
 * @property {string} name - The display name of the rank.
 * @property {string} prefixText - The text part of the prefix (e.g., "[Owner] ").
 * @property {string} nametagPrefix - The prefix displayed above a player's nametag.
 * @property {RankChatColors} chatColors - Default color settings for chat.
 * @property {RankConfigKeys} configKeys - Keys to look up actual colors in config.js.
 */

/**
 * Defines display and formatting properties for different player ranks.
 * @type {Object.<string, RankProperties>}
 */
export const ranks = {
    owner: {
        name: "Owner",
        prefixText: "[Owner] ",
        nametagPrefix: "§cOwner§f\n", // Nametag prefix remains as is
        chatColors: {
            defaultPrefixColor: "§c", // Red
            defaultNameColor: "§c",   // Red for owner's name
            defaultMessageColor: "§f" // White message
        },
        configKeys: {
            prefixColor: "chatFormatOwnerPrefixColor",
            nameColor: "chatFormatOwnerNameColor",
            messageColor: "chatFormatOwnerMessageColor"
        }
    },
    admin: {
        name: "Admin",
        prefixText: "[Admin] ",
        nametagPrefix: "§bAdmin§f\n", // Nametag prefix remains as is
        chatColors: {
            defaultPrefixColor: "§b", // Aqua
            defaultNameColor: "§b",   // Aqua for admin's name
            defaultMessageColor: "§f" // White message
        },
        configKeys: {
            prefixColor: "chatFormatAdminPrefixColor",
            nameColor: "chatFormatAdminNameColor",
            messageColor: "chatFormatAdminMessageColor"
        }
    },
    member: {
        name: "Member",
        prefixText: "[Member] ", // Added space for consistency
        nametagPrefix: "§7Member§f\n", // Nametag prefix remains as is
        chatColors: {
            defaultPrefixColor: "§7", // Gray
            defaultNameColor: "§7",   // Gray for member's name
            defaultMessageColor: "§f" // White message
        },
        configKeys: {
            prefixColor: "chatFormatMemberPrefixColor",
            nameColor: "chatFormatMemberNameColor",
            messageColor: "chatFormatMemberMessageColor"
        }
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
 * Retrieves the formatted chat elements (prefix, name color, message color) for a player based on their rank
 * and configurable color settings.
 *
 * @param {Player} player - The Minecraft Player object.
 * @param {object} [configValues] - Optional: The editable configuration values from `config.js` (e.g., `config.editableConfigValues`).
 *                                 If not provided, default colors from the `ranks` object will be used.
 * @returns {{fullPrefix: string, nameColor: string, messageColor: string}} An object containing the formatted chat elements.
 */
export function getPlayerRankFormattedChatElements(player, configValues = {}) {
    const rankId = getPlayerRankId(player);
    const rankProperties = ranks[rankId] || ranks.member; // Fallback to member if rankId is somehow invalid

    const actualPrefixColor = configValues?.[rankProperties.configKeys.prefixColor] ?? rankProperties.chatColors.defaultPrefixColor;
    const actualNameColor = configValues?.[rankProperties.configKeys.nameColor] ?? rankProperties.chatColors.defaultNameColor;
    const actualMessageColor = configValues?.[rankProperties.configKeys.messageColor] ?? rankProperties.chatColors.defaultMessageColor;

    return {
        fullPrefix: actualPrefixColor + rankProperties.prefixText,
        nameColor: actualNameColor,
        messageColor: actualMessageColor
    };
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
