/**
 * @file Manages player ranks, permission levels, and their display properties (chat/nametag prefixes).
 * @version 1.1.0
 */

import { Player } from '@minecraft/server';
// isOwner and isAdmin imports are removed as their logic is now incorporated into
// _standardizedGetPlayerPermissionLevel using config values from dependencies.

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

// permissionLevels is defined in this file and can be used directly by _standardizedGetPlayerPermissionLevel
function _standardizedGetPlayerPermissionLevel(player, dependencies) {
    if (!dependencies || !dependencies.config || !dependencies.permissionLevels) {
        // Fallback or error if dependencies are not provided correctly by the caller.
        console.warn("[RankManager] _standardizedGetPlayerPermissionLevel called without full dependencies object (config or permissionLevels missing)!");
        // Attempt to use local permissionLevels if dependencies.permissionLevels is missing
        const perms = dependencies?.permissionLevels || permissionLevels;
        return perms.member; // Default to lowest permission
    }

    // Ensure player is valid
    if (!(player instanceof Player)) {
        if (dependencies.playerUtils && dependencies.config.enableDebugLogging) {
            dependencies.playerUtils.debugLog("[RankManager] Invalid player object passed to _standardizedGetPlayerPermissionLevel.", player?.nameTag || "UnknownSource", dependencies);
        } else {
            console.warn("[RankManager] Invalid player object passed to _standardizedGetPlayerPermissionLevel.");
        }
        return dependencies.permissionLevels.member;
    }


    // Ensure config values are present before using them
    if (typeof dependencies.config.ownerPlayerName !== 'string' || typeof dependencies.config.adminTag !== 'string') {
        if (dependencies.playerUtils && dependencies.config.enableDebugLogging) {
            dependencies.playerUtils.debugLog("[RankManager] ownerPlayerName or adminTag not configured in dependencies.config!", player.nameTag, dependencies);
        } else {
            console.warn("[RankManager] ownerPlayerName or adminTag not configured in dependencies.config!");
        }
        return dependencies.permissionLevels.member;
    }

    if (player.nameTag === dependencies.config.ownerPlayerName) {
        return dependencies.permissionLevels.owner;
    }
    if (player.hasTag(dependencies.config.adminTag)) {
        return dependencies.permissionLevels.admin;
    }
    // Add other rank checks here if necessary (e.g., moderator tags from config)
    // For example:
    // const moderatorTagValue = dependencies.config.moderatorTag || "moderator";
    // if (player.hasTag(moderatorTagValue)) {
    //     return dependencies.permissionLevels.moderator;
    // }
    return dependencies.permissionLevels.member;
}

/**
 * Determines the rank ID ('owner', 'admin', 'member') for a given player.
 * @param {Player} player - The Minecraft Player object.
 * @returns {string} The rank ID. Defaults to 'member'.
 */
export function getPlayerRankId(player, dependencies) { // Added dependencies for potential future use and logging
    try {
        if (!(player instanceof Player)) {
            if (dependencies?.playerUtils?.debugLog && dependencies?.config?.enableDebugLogging) {
                dependencies.playerUtils.debugLog("[RankManager] Invalid player object passed to getPlayerRankId. Defaulting to member.", player?.nameTag || "UnknownSource", dependencies);
            } else if (!dependencies?.playerUtils?.debugLog || !dependencies?.config?.enableDebugLogging) {
                 console.warn("[RankManager] Invalid player object passed to getPlayerRankId (debug logging disabled or playerUtils not available). Defaulting to member.");
            }
            return 'member';
        }
        if (typeof player.nameTag !== 'string') {
            if (dependencies?.playerUtils?.debugLog && dependencies?.config?.enableDebugLogging) {
                dependencies.playerUtils.debugLog(`[RankManager] Player object for ID ${player.id} has no nameTag. Defaulting to member.`, player.nameTag, dependencies);
            } else if (!dependencies?.playerUtils?.debugLog || !dependencies?.config?.enableDebugLogging) {
                console.warn(`[RankManager] Player object for ID ${player.id} has no nameTag (debug logging disabled or playerUtils not available). Defaulting to member.`);
            }
            return 'member';
        }

        const permLevel = _standardizedGetPlayerPermissionLevel(player, dependencies);

        if (permLevel === permissionLevels.owner) return 'owner';
        if (permLevel === permissionLevels.admin) return 'admin';
        // Add mapping for other ranks if permissionLevels enum expands
        // e.g. if (permLevel === permissionLevels.moderator) return 'moderator';
        return 'member';
    } catch (error) {
        // No dependencies here yet for logging via playerUtils
        console.error(`[RankManager] Error in getPlayerRankId for player ${player?.nameTag || player?.id || 'unknown'}: ${error.stack || error}`);
        return 'member';
    }
}

/**
 * Retrieves the formatted chat elements (prefix, name color, message color) for a player based on their rank
 * and configurable color settings.
 *
 * @param {Player} player - The Minecraft Player object.
 * @param {import('../types.js').Dependencies} dependencies - The dependencies object.
 * @returns {{fullPrefix: string, nameColor: string, messageColor: string}} An object containing the formatted chat elements.
 */
export function getPlayerRankFormattedChatElements(player, dependencies) {
    const { config, playerUtils } = dependencies; // Destructure config
    const rankId = getPlayerRankId(player, dependencies); // Pass dependencies
    const rankProperties = ranks[rankId] || ranks.member;

    const actualPrefixColor = config?.[rankProperties.configKeys.prefixColor] ?? rankProperties.chatColors.defaultPrefixColor;
    const actualNameColor = config?.[rankProperties.configKeys.nameColor] ?? rankProperties.chatColors.defaultNameColor;
    const actualMessageColor = config?.[rankProperties.configKeys.messageColor] ?? rankProperties.chatColors.defaultMessageColor;

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
 * @param {import('../types.js').Dependencies} dependencies - The dependencies object.
 * @returns {void}
 */
export function updatePlayerNametag(player, dependencies) {
    const { config, playerUtils } = dependencies; // Destructure config and playerUtils

    if (!(player instanceof Player)) {
        console.error("[RankManager] Invalid player object passed to updatePlayerNametag.");
        return;
    }

    const vanishedTag = config.vanishedPlayerTag || "vanished"; // Use config for vanished tag

    try {
        if (player.hasTag(vanishedTag)) {
            player.nameTag = "";
            return;
        }

        const rankId = getPlayerRankId(player, dependencies); // Pass dependencies
        const rankDisplay = ranks[rankId];

        if (!rankDisplay) {
            console.error(`[RankManager] Could not find rank display properties for rankId: ${rankId} for player ${player.nameTag}. Defaulting nametag.`);
            player.nameTag = player.name;
            return;
        }

        // Potentially make nametagPrefix configurable via dependencies.config.ranks[rankId].nametagPrefix if needed in future
        // For now, using the hardcoded one from 'ranks' object.
        player.nameTag = rankDisplay.nametagPrefix + player.name;
        if (config.enableDebugLogging) {
            playerUtils.debugLog(`[RankManager] Updated nametag for ${player.nameTag} to "${player.nameTag}"`, player.nameTag, dependencies);
        }

    } catch (error) {
        let playerNameForError = "UnknownPlayer";
        try {
            if (player && typeof player.name === 'string') {
                playerNameForError = player.name;
            }
        } catch (nameAccessError) {
            // This specific console.warn can remain as it's a fallback within error handling
            console.warn(`[RankManager] Could not access name of player during nametag update error: ${nameAccessError}`);
        }
        console.error(`[RankManager] Error setting nametag for '${playerNameForError}': ${error.stack || error}`);
    }
}
