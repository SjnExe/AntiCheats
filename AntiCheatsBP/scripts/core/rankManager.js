/**
 * Manages player ranks, permission levels, and their display properties (chat/nametag prefixes).
 * Ranks are defined in ranksConfig.js and processed here.
 */
import { Player } from '@minecraft/server';
import { rankDefinitions, defaultChatFormatting, defaultNametagPrefix, defaultPermissionLevel } from './ranksConfig.js';

// Dynamically generated from rankDefinitions for external use (e.g., command definitions)
export let permissionLevels = {};

// Sorted rank definitions by priority (lower number = higher priority)
let sortedRankDefinitions = [];

/**
 * Initializes the rank system by sorting rank definitions and generating permissionLevels mapping.
 * This should be called once at script startup.
 */
function initializeRankSystem(dependencies) {
    if (rankDefinitions && Array.isArray(rankDefinitions)) {
        sortedRankDefinitions = [...rankDefinitions].sort((a, b) => (a.priority ?? Infinity) - (b.priority ?? Infinity));

        const newPermissionLevels = {};
        for (const rankDef of sortedRankDefinitions) {
            if (rankDef.id && typeof rankDef.permissionLevel === 'number') {
                newPermissionLevels[rankDef.id] = rankDef.permissionLevel;
            }
        }
        // Add a 'normal' or 'member' level if not explicitly defined by a rank with that ID,
        // using the defaultPermissionLevel from ranksConfig.
        if (!newPermissionLevels.normal && !newPermissionLevels.member) {
            const defaultRank = sortedRankDefinitions.find(r => r.permissionLevel === defaultPermissionLevel && r.id === "member");
            if (defaultRank) { // If a rank like "member" is defined with the default level
                 newPermissionLevels.normal = defaultRank.permissionLevel; // Alias 'normal' to 'member's level
            } else {
                 newPermissionLevels.normal = defaultPermissionLevel; // Assign default if no specific member rank
            }
        } else if (newPermissionLevels.member && !newPermissionLevels.normal) {
            newPermissionLevels.normal = newPermissionLevels.member;
        } else if (newPermissionLevels.normal && !newPermissionLevels.member) {
            newPermissionLevels.member = newPermissionLevels.normal;
        }


        permissionLevels = Object.freeze(newPermissionLevels);

        if (dependencies?.playerUtils && dependencies?.config?.enableDebugLogging) {
            dependencies.playerUtils.debugLog(`[RankManager] Initialized with ${sortedRankDefinitions.length} ranks. PermissionLevels map: ${JSON.stringify(permissionLevels)}`, "System", dependencies);
        } else {
            console.log(`[RankManager] Initialized with ${sortedRankDefinitions.length} ranks. PermissionLevels map: ${JSON.stringify(permissionLevels)}`);
        }
    } else {
        console.error("[RankManager] rankDefinitions not found or not an array in ranksConfig.js. Rank system will not function correctly.");
        sortedRankDefinitions = [];
        permissionLevels = Object.freeze({ normal: defaultPermissionLevel, member: defaultPermissionLevel }); // Basic fallback
    }
}


/**
 * Internal helper to get the player's highest priority rank definition and effective permission level.
 * @param {Player} player
 * @param {object} dependencies
 * @returns {{ rankDefinition: object | null, permissionLevel: number, rankId: string | null }}
 */
function getPlayerRankAndPermissions(player, dependencies) {
    const { config, playerUtils } = dependencies;

    if (!(player instanceof Player) || !player.isValid()) {
        if (playerUtils && config?.enableDebugLogging) {
            playerUtils.debugLog("[RankManager] Invalid player object passed to getPlayerRankAndPermissions.", player?.nameTag || "UnknownSource", dependencies);
        }
        return {
            rankDefinition: sortedRankDefinitions.find(r => r.id === 'member' && r.permissionLevel === defaultPermissionLevel) || null,
            permissionLevel: defaultPermissionLevel,
            rankId: 'member'
        };
    }

    // Ensure ownerPlayerName and adminTag are strings, even if empty, to prevent errors.
    const ownerName = config?.ownerPlayerName ?? "";
    const adminTag = config?.adminTag ?? "";

    for (const rankDef of sortedRankDefinitions) {
        if (rankDef.conditions && Array.isArray(rankDef.conditions)) {
            for (const condition of rankDef.conditions) {
                let match = false;
                switch (condition.type) {
                    case "owner_name":
                        if (ownerName && player.nameTag === ownerName) match = true;
                        break;
                    case "admin_tag":
                        if (adminTag && player.hasTag(adminTag)) match = true;
                        break;
                    case "manual_tag_prefix":
                        if (condition.prefix && player.hasTag(condition.prefix + rankDef.id)) match = true;
                        break;
                    case "tag": // General tag condition
                        if (condition.tag && player.hasTag(condition.tag)) match = true;
                        break;
                    case "default": // Explicit default rank condition
                         match = true;
                         break;
                }
                if (match) {
                    return { rankDefinition: rankDef, permissionLevel: rankDef.permissionLevel, rankId: rankDef.id };
                }
            }
        }
    }

    // Fallback to default if no conditions met for any defined rank
    const memberRankDef = sortedRankDefinitions.find(r => r.id === 'member' && r.permissionLevel === defaultPermissionLevel);
    return { rankDefinition: memberRankDef || null, permissionLevel: defaultPermissionLevel, rankId: memberRankDef ? 'member' : null };
}

export function getPlayerPermissionLevel(player, dependencies) {
    const { permissionLevel } = getPlayerRankAndPermissions(player, dependencies);
    return permissionLevel;
}

export function getPlayerRankId(player, dependencies) {
    const { rankId } = getPlayerRankAndPermissions(player, dependencies);
    return rankId || 'member'; // Fallback to 'member' if no specific rankId found
}

export function getPlayerRankFormattedChatElements(player, dependencies) {
    const { rankDefinition } = getPlayerRankAndPermissions(player, dependencies);
    const config = dependencies.config; // For accessing old color configs if needed during transition, though ideally not.

    const chatFormatting = rankDefinition?.chatFormatting || defaultChatFormatting;

    // Use rank-specific colors if defined, otherwise use defaults.
    // The new structure in ranksConfig.js directly provides these, so no need for configKeys.
    const prefixText = chatFormatting.prefixText ?? defaultChatFormatting.prefixText;
    // prefixColor, nameColor, messageColor are now directly part of chatFormatting.
    // The structure is now simpler: chatFormatting.prefixColor, chatFormatting.nameColor, etc.
    // Defaulting is handled by merging with defaultChatFormatting.

    return {
        fullPrefix: (chatFormatting.prefixColor ?? defaultChatFormatting.prefixColor) + prefixText,
        nameColor: chatFormatting.nameColor ?? defaultChatFormatting.nameColor,
        messageColor: chatFormatting.messageColor ?? defaultChatFormatting.messageColor
    };
}

export function updatePlayerNametag(player, dependencies) {
    const { config, playerUtils } = dependencies; // config might still be needed for vanishedPlayerTag

    if (!(player instanceof Player) || !player.isValid()) {
        console.error("[RankManager] Invalid player object passed to updatePlayerNametag.");
        return;
    }

    const vanishedTag = config?.vanishedPlayerTag || "vanished"; // Get from main config

    try {
        if (player.hasTag(vanishedTag)) {
            player.nameTag = ""; // Clear nametag if vanished
            return;
        }

        const { rankDefinition } = getPlayerRankAndPermissions(player, dependencies);
        const nametagToApply = rankDefinition?.nametagPrefix ?? defaultNametagPrefix;

        player.nameTag = nametagToApply + player.name;

        if (config?.enableDebugLogging && playerUtils?.debugLog) {
            playerUtils.debugLog(`[RankManager] Updated nametag for ${player.name} to "${player.nameTag}" (Rank: ${rankDefinition?.id || 'default'})`, player.nameTag, dependencies);
        }
    } catch (error) {
        let playerNameForError = "UnknownPlayer";
        try {
            if (player && typeof player.name === 'string') {
                playerNameForError = player.name;
            }
        } catch (nameAccessError) {
            // This inner catch is fine
        }
        console.error(`[RankManager] Error setting nametag for '${playerNameForError}': ${error.stack || error}`);
        // Fallback to simple name if error occurs
        try { player.nameTag = player.name; } catch (e) { /* Failsafe */ }
    }
}

// Call initializeRankSystem at the end of the module to set up sortedRanks and permissionLevels.
// This needs dependencies, which is tricky for a top-level call.
// Instead, main.js should call an exported initialization function once it has dependencies.
export function initializeRanks(dependencies) {
    initializeRankSystem(dependencies);
}
// For direct import by commands if main.js hasn't initialized yet (less ideal but provides a fallback)
// This will only work if ranksConfig.js has no external dependencies for its definitions.
if (sortedRankDefinitions.length === 0) {
    // Basic initialization without full dependencies, assumes ranksConfig is self-contained
    // This is a fallback and might not have debug logging.
    initializeRankSystem({ config: {}, playerUtils: { debugLog: () => {} } });
}

// The old `ranks` and `permissionLevels` const exports are removed as they are now dynamic/internal or re-generated.
// `permissionLevels` is now a `let` and populated by `initializeRankSystem`.
