/**
 * @file Manages player ranks, permission levels, and their display properties (chat/nametag prefixes).
 * Ranks are defined in `ranksConfig.js` and processed here.
 */
import { Player } from '@minecraft/server';
import { rankDefinitions, defaultChatFormatting, defaultNametagPrefix, defaultPermissionLevel } from './ranksConfig.js';

/**
 * @description Dynamically generated mapping of rank IDs to their numeric permission levels.
 * Populated by `initializeRanks`. Intended for external use (e.g., command definitions).
 * @export
 * @type {Object.<string, number>}
 */
export let permissionLevels = {};

/**
 * @description Array of rank definitions, sorted by priority (lower number = higher priority).
 * Populated by `initializeRankSystem`.
 * @type {Array<import('./ranksConfig.js').RankDefinition>}
 */
let sortedRankDefinitions = [];

/**
 * Initializes the rank system by sorting rank definitions and generating the `permissionLevels` mapping.
 * This function should be called once at script startup via `initializeRanks`.
 * @param {import('../types.js').CommandDependencies} dependencies - Standard dependencies object, used for config and logging.
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

        // Ensure 'normal' and 'member' levels are present, using defaultPermissionLevel as a base.
        if (!newPermissionLevels.normal && !newPermissionLevels.member) {
            const defaultRankDefinition = sortedRankDefinitions.find(r => r.permissionLevel === defaultPermissionLevel && r.id === 'member');
            if (defaultRankDefinition) {
                newPermissionLevels.normal = defaultRankDefinition.permissionLevel;
            } else {
                // If no explicit 'member' rank with defaultPermissionLevel, create a 'normal' entry with it.
                newPermissionLevels.normal = defaultPermissionLevel;
            }
            // Ensure 'member' also reflects this default or specific 'member' rank level.
            newPermissionLevels.member = newPermissionLevels.normal;
        } else if (newPermissionLevels.member && !newPermissionLevels.normal) {
            newPermissionLevels.normal = newPermissionLevels.member;
        } else if (newPermissionLevels.normal && !newPermissionLevels.member) {
            newPermissionLevels.member = newPermissionLevels.normal;
        }

        // Ensure owner and admin are present, defaulting to 0 and 1 if not explicitly defined by a rank
        if (newPermissionLevels.owner === undefined) { // Check if 'owner' key is missing
            const ownerRank = sortedRankDefinitions.find(r => r.id === 'owner');
            newPermissionLevels.owner = ownerRank ? ownerRank.permissionLevel : 0;
        }
        if (newPermissionLevels.admin === undefined) { // Check if 'admin' key is missing
            const adminRank = sortedRankDefinitions.find(r => r.id === 'admin');
            newPermissionLevels.admin = adminRank ? adminRank.permissionLevel : 1;
        }


        permissionLevels = Object.freeze(newPermissionLevels); // Make it immutable after generation

        const { playerUtils, config } = dependencies;
        if (playerUtils && config?.enableDebugLogging) {
            playerUtils.debugLog(`[RankManager] Initialized with ${sortedRankDefinitions.length} ranks. PermissionLevels map: ${JSON.stringify(permissionLevels)}`, 'System', dependencies);
        } else {
            console.log(`[RankManager] Initialized with ${sortedRankDefinitions.length} ranks. PermissionLevels map: ${JSON.stringify(permissionLevels)}`);
        }
    } else {
        console.error('[RankManager] rankDefinitions not found or not an array in ranksConfig.js. Rank system will not function correctly.');
        sortedRankDefinitions = [];
        permissionLevels = Object.freeze({ owner: 0, admin: 1, normal: defaultPermissionLevel, member: defaultPermissionLevel }); // Basic fallback
    }
}

/**
 * Internal helper to get the player's highest priority rank definition and effective permission level.
 * @param {import('@minecraft/server').Player} player - The player instance.
 * @param {import('../types.js').CommandDependencies} dependencies - Standard dependencies object.
 * @returns {{ rankDefinition: object | null, permissionLevel: number, rankId: string | null }}
 *          An object containing the matched rank definition, permission level, and rank ID.
 *          Returns default/member level if no specific rank matches.
 */
function getPlayerRankAndPermissions(player, dependencies) {
    const { config, playerUtils } = dependencies;

    if (!(player instanceof Player) || !player.isValid()) {
        if (playerUtils && config?.enableDebugLogging) {
            playerUtils.debugLog('[RankManager] Invalid player object passed to getPlayerRankAndPermissions.', player?.nameTag || 'UnknownSource', dependencies);
        }
        const defaultMemberRank = sortedRankDefinitions.find(r => r.id === 'member' && r.permissionLevel === defaultPermissionLevel);
        return {
            rankDefinition: defaultMemberRank || null,
            permissionLevel: defaultPermissionLevel,
            rankId: defaultMemberRank ? 'member' : null,
        };
    }

    const ownerName = config?.ownerPlayerName ?? '';
    const adminTag = config?.adminTag ?? '';

    for (const rankDef of sortedRankDefinitions) {
        if (rankDef.conditions && Array.isArray(rankDef.conditions)) {
            for (const condition of rankDef.conditions) {
                let match = false;
                switch (condition.type) {
                    case 'owner_name':
                        if (ownerName && player.nameTag === ownerName) match = true;
                        break;
                    case 'admin_tag':
                        if (adminTag && player.hasTag(adminTag)) match = true;
                        break;
                    case 'manual_tag_prefix':
                        if (condition.prefix && player.hasTag(condition.prefix + rankDef.id)) match = true;
                        break;
                    case 'tag':
                        if (condition.tag && player.hasTag(condition.tag)) match = true;
                        break;
                    case 'default':
                        match = true;
                        break;
                }
                if (match) {
                    return { rankDefinition: rankDef, permissionLevel: rankDef.permissionLevel, rankId: rankDef.id };
                }
            }
        }
    }

    const memberRankDef = sortedRankDefinitions.find(r => r.id === 'member' && r.permissionLevel === defaultPermissionLevel);
    return { rankDefinition: memberRankDef || null, permissionLevel: defaultPermissionLevel, rankId: memberRankDef ? 'member' : null };
}

/**
 * Gets the effective permission level for a player.
 * @param {import('@minecraft/server').Player} player - The player.
 * @param {import('../types.js').CommandDependencies} dependencies - Standard dependencies object.
 * @returns {number} The player's permission level.
 */
export function getPlayerPermissionLevel(player, dependencies) {
    const { permissionLevel } = getPlayerRankAndPermissions(player, dependencies);
    return permissionLevel;
}

/**
 * Gets the ID of the player's highest priority rank.
 * @param {import('@minecraft/server').Player} player - The player.
 * @param {import('../types.js').CommandDependencies} dependencies - Standard dependencies object.
 * @returns {string} The player's rank ID (e.g., 'owner', 'admin', 'member').
 */
export function getPlayerRankId(player, dependencies) {
    const { rankId } = getPlayerRankAndPermissions(player, dependencies);
    return rankId || 'member'; // Fallback to 'member'
}

/**
 * Gets the formatted chat prefix, name color, and message color for a player based on their rank.
 * @param {import('@minecraft/server').Player} player - The player.
 * @param {import('../types.js').CommandDependencies} dependencies - Standard dependencies object.
 * @returns {{fullPrefix: string, nameColor: string, messageColor: string}} The chat formatting elements.
 */
export function getPlayerRankFormattedChatElements(player, dependencies) {
    const { rankDefinition } = getPlayerRankAndPermissions(player, dependencies);

    const chatFormatting = rankDefinition?.chatFormatting || defaultChatFormatting;
    const prefixText = chatFormatting.prefixText ?? defaultChatFormatting.prefixText;

    return {
        fullPrefix: (chatFormatting.prefixColor ?? defaultChatFormatting.prefixColor) + prefixText,
        nameColor: chatFormatting.nameColor ?? defaultChatFormatting.nameColor,
        messageColor: chatFormatting.messageColor ?? defaultChatFormatting.messageColor,
    };
}

/**
 * Updates a player's nametag based on their current rank and vanish status.
 * @param {import('@minecraft/server').Player} player - The player whose nametag to update.
 * @param {import('../types.js').CommandDependencies} dependencies - Standard dependencies object.
 */
export function updatePlayerNametag(player, dependencies) {
    const { config, playerUtils } = dependencies;

    if (!(player instanceof Player) || !player.isValid()) {
        console.error('[RankManager] Invalid player object passed to updatePlayerNametag.');
        return;
    }

    const vanishedTag = config?.vanishedPlayerTag || 'vanished';

    try {
        if (player.hasTag(vanishedTag)) {
            player.nameTag = ''; // Clear nametag if vanished
            return;
        }

        const { rankDefinition } = getPlayerRankAndPermissions(player, dependencies);
        const nametagToApply = rankDefinition?.nametagPrefix ?? defaultNametagPrefix;

        const baseName = typeof player.name === 'string' ? player.name : (player.nameTag || 'Player');
        player.nameTag = nametagToApply + baseName;

        if (config?.enableDebugLogging && playerUtils?.debugLog) {
            playerUtils.debugLog(`[RankManager] Updated nametag for ${baseName} to '${player.nameTag}' (Rank: ${rankDefinition?.id || 'default'})`, player.nameTag, dependencies);
        }
    } catch (error) {
        let playerNameForError = 'UnknownPlayer';
        try {
            if (player && typeof player.name === 'string') {
                playerNameForError = player.name;
            }
        } catch (nameAccessError) {
            // This inner catch is fine, means player object or name is problematic
        }
        console.error(`[RankManager] Error setting nametag for '${playerNameForError}': ${error.stack || error}`);
        try {
            player.nameTag = typeof player.name === 'string' ? player.name : 'Player'; // Fallback
        } catch (e) { /* Failsafe */ }
    }
}

/**
 * Initializes the rank system. This must be called from `main.js` after all dependencies are available.
 * @param {import('../types.js').CommandDependencies} dependencies - Standard dependencies object.
 */
export function initializeRanks(dependencies) {
    initializeRankSystem(dependencies);
}
