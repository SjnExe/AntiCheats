/**
 * Manages player ranks, permission levels, and their display properties (chat/nametag prefixes).
 */
import { Player } from '@minecraft/server';

export const permissionLevels = {
    owner: 0,
    admin: 1,
    normal: 1024
};

export const ranks = {
    owner: {
        name: "Owner",
        prefixText: "[Owner] ",
        nametagPrefix: "§cOwner§f\n",
        chatColors: {
            defaultPrefixColor: "§c",
            defaultNameColor: "§c",
            defaultMessageColor: "§f"
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
        nametagPrefix: "§bAdmin§f\n",
        chatColors: {
            defaultPrefixColor: "§b",
            defaultNameColor: "§b",
            defaultMessageColor: "§f"
        },
        configKeys: {
            prefixColor: "chatFormatAdminPrefixColor",
            nameColor: "chatFormatAdminNameColor",
            messageColor: "chatFormatAdminMessageColor"
        }
    },
    member: {
        name: "Member",
        prefixText: "[Member] ",
        nametagPrefix: "§7Member§f\n",
        chatColors: {
            defaultPrefixColor: "§7",
            defaultNameColor: "§7",
            defaultMessageColor: "§f"
        },
        configKeys: {
            prefixColor: "chatFormatMemberPrefixColor",
            nameColor: "chatFormatMemberNameColor",
            messageColor: "chatFormatMemberMessageColor"
        }
    }
};

// Renamed and exported for direct use by other modules like commandManager via main.js dependencies
// Original name was _standardizedGetPlayerPermissionLevel
export function getPlayerPermissionLevel(player, dependencies) {
    if (!dependencies || !dependencies.config || !dependencies.permissionLevels) {
        console.warn("[RankManager] getPlayerPermissionLevel called without full dependencies object (config or permissionLevels missing)!");
        const perms = dependencies.permissionLevels || permissionLevels; // Fallback to local permissionLevels if not in dependencies
        return perms.member;
    }

    if (!(player instanceof Player)) {
        if (dependencies.playerUtils && dependencies.config.enableDebugLogging) {
            dependencies.playerUtils.debugLog("[RankManager] Invalid player object passed to getPlayerPermissionLevel.", player?.nameTag || "UnknownSource", dependencies);
        } else {
            console.warn("[RankManager] Invalid player object passed to getPlayerPermissionLevel.");
        }
        return dependencies.permissionLevels.member;
    }

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
    return dependencies.permissionLevels.member;
}

export function getPlayerRankId(player, dependencies) {
    try {
        if (!(player instanceof Player)) {
            if (dependencies.playerUtils && dependencies.config.enableDebugLogging) {
                dependencies.playerUtils.debugLog("[RankManager] Invalid player object passed to getPlayerRankId. Defaulting to member.", player?.nameTag || "UnknownSource", dependencies);
            } else if (!dependencies.playerUtils || !dependencies.config.enableDebugLogging) {
                 console.warn("[RankManager] Invalid player object passed to getPlayerRankId (debug logging disabled or playerUtils not available). Defaulting to member.");
            }
            return 'member';
        }
        if (typeof player.nameTag !== 'string') {
            if (dependencies.playerUtils && dependencies.config.enableDebugLogging) {
                dependencies.playerUtils.debugLog(`[RankManager] Player object for ID ${player.id} has no nameTag. Defaulting to member.`, player.nameTag, dependencies);
            } else if (!dependencies.playerUtils || !dependencies.config.enableDebugLogging) {
                console.warn(`[RankManager] Player object for ID ${player.id} has no nameTag (debug logging disabled or playerUtils not available). Defaulting to member.`);
            }
            return 'member';
        }

        const permLevel = getPlayerPermissionLevel(player, dependencies); // Use the exported version

        if (permLevel === permissionLevels.owner) return 'owner';
        if (permLevel === permissionLevels.admin) return 'admin';
        return 'member';
    } catch (error) {
        console.error(`[RankManager] Error in getPlayerRankId for player ${player?.nameTag || player?.id || 'unknown'}: ${error.stack || error}`);
        return 'member';
    }
}

export function getPlayerRankFormattedChatElements(player, dependencies) {
    const { config } = dependencies; // Removed playerUtils as it's not used directly
    const rankId = getPlayerRankId(player, dependencies);
    const rankProperties = ranks[rankId] || ranks.member;

    const actualPrefixColor = config[rankProperties.configKeys.prefixColor] ?? rankProperties.chatColors.defaultPrefixColor;
    const actualNameColor = config[rankProperties.configKeys.nameColor] ?? rankProperties.chatColors.defaultNameColor;
    const actualMessageColor = config[rankProperties.configKeys.messageColor] ?? rankProperties.chatColors.defaultMessageColor;

    return {
        fullPrefix: actualPrefixColor + rankProperties.prefixText,
        nameColor: actualNameColor,
        messageColor: actualMessageColor
    };
}

export function updatePlayerNametag(player, dependencies) {
    const { config, playerUtils } = dependencies;

    if (!(player instanceof Player)) {
        console.error("[RankManager] Invalid player object passed to updatePlayerNametag.");
        return;
    }

    const vanishedTag = config.vanishedPlayerTag || "vanished";

    try {
        if (player.hasTag(vanishedTag)) {
            player.nameTag = "";
            return;
        }

        const rankId = getPlayerRankId(player, dependencies);
        const rankDisplay = ranks[rankId];

        if (!rankDisplay) {
            console.error(`[RankManager] Could not find rank display properties for rankId: ${rankId} for player ${player.nameTag}. Defaulting nametag.`);
            player.nameTag = player.name; // Use player.name as a fallback
            return;
        }

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
            console.warn(`[RankManager] Could not access name of player during nametag update error: ${nameAccessError}`);
        }
        console.error(`[RankManager] Error setting nametag for '${playerNameForError}': ${error.stack || error}`);
    }
}
