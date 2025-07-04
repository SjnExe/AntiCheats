/**
 * @file Manages player ranks, permission levels, and their display properties (chat/nametag prefixes).
 * Ranks are defined in `ranksConfig.js` and processed here. All rank IDs are handled case-insensitively (lowerCased).
 */
import * as mc from '@minecraft/server';
import { rankDefinitions, defaultChatFormatting, defaultNametagPrefix, defaultPermissionLevel } from './ranksConfig.js';

/**
 * @description Dynamically generated mapping of rank IDs (lowerCase) to their numeric permission levels.
 * Populated by `initializeRanks`.
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
 * @param {import('../types.js').CommandDependencies} dependencies - Standard dependencies object.
 */
function initializeRankSystem(dependencies) {
    const { playerUtils, config } = dependencies;

    if (!Array.isArray(rankDefinitions)) {
        console.error('[RankManager.initializeRankSystem] rankDefinitions is not an array. Rank system may not function.');
        sortedRankDefinitions = [];
        permissionLevels = Object.freeze({ owner: 0, admin: 1, member: defaultPermissionLevel }); // Minimal fallback
        return;
    }

    // Ensure all rank IDs in definitions are lowercase for consistent internal use.
    const standardizedRankDefinitions = rankDefinitions.map(rd => ({ ...rd, id: rd.id.toLowerCase() }));
    sortedRankDefinitions = [...standardizedRankDefinitions].sort((a, b) => (a.priority ?? Infinity) - (b.priority ?? Infinity));

    const newPermissionLevels = {};
    for (const rankDef of sortedRankDefinitions) {
        if (rankDef.id && typeof rankDef.permissionLevel === 'number') {
            newPermissionLevels[rankDef.id] = rankDef.permissionLevel; // id is already lowercased
        }
    }

    // Ensure essential permission levels ('member', 'owner', 'admin') are defined, using defaults if necessary.
    const memberRank = sortedRankDefinitions.find(r => r.id === 'member');
    newPermissionLevels.member = newPermissionLevels.member ?? memberRank?.permissionLevel ?? defaultPermissionLevel;
    if (newPermissionLevels.member === defaultPermissionLevel && !memberRank) {
        playerUtils?.debugLog(`[RankManager.initializeRankSystem] 'member' rank not explicitly defined, using default permission: ${defaultPermissionLevel}`, null, dependencies);
    }

    const ownerRank = sortedRankDefinitions.find(r => r.id === 'owner');
    newPermissionLevels.owner = newPermissionLevels.owner ?? ownerRank?.permissionLevel ?? 0; // Owner defaults to 0 (highest)

    const adminRank = sortedRankDefinitions.find(r => r.id === 'admin');
    newPermissionLevels.admin = newPermissionLevels.admin ?? adminRank?.permissionLevel ?? 1; // Admin defaults to 1

    permissionLevels = Object.freeze(newPermissionLevels); // Make it immutable after initialization

    playerUtils?.debugLog(`[RankManager.initializeRankSystem] Initialized ${sortedRankDefinitions.length} ranks. PermissionLevels: ${JSON.stringify(permissionLevels)}`, null, dependencies);
}

/**
 * Internal helper to get the player's highest priority rank definition and effective permission level.
 * @param {import('@minecraft/server').Player} player - The player instance.
 * @param {import('../types.js').CommandDependencies} dependencies - Standard dependencies object.
 * @returns {{ rankDefinition: import('./ranksConfig.js').RankDefinition | null, permissionLevel: number, rankId: string | null }}
 *          Object containing matched rank definition, permission level, and rank ID (lowerCase).
 *          Returns default/member level if no specific rank matches.
 */
function getPlayerRankAndPermissions(player, dependencies) {
    const { config, playerUtils, getString } = dependencies;
    const playerName = player?.nameTag ?? player?.id ?? 'UnknownPlayer';

    if (!(player instanceof mc.Player) || !player.isValid()) {
        console.error(`[RankManager.getPlayerRankAndPermissions] Invalid player object for ${playerName}.`);
        playerUtils?.debugLog(`[RankManager.getPlayerRankAndPermissions] Invalid player object for ${playerName}.`, playerName, dependencies);
        const defaultMemberRank = sortedRankDefinitions.find(r => r.id === 'member');
        return { rankDefinition: defaultMemberRank || null, permissionLevel: permissionLevels.member ?? defaultPermissionLevel, rankId: 'member' };
    }

    const ownerName = config?.ownerPlayerName?.toLowerCase() ?? ''; // Compare names case-insensitively
    const adminTag = config?.adminTag ?? '';

    for (const rankDef of sortedRankDefinitions) { // rankDef.id is already lowercased
        if (Array.isArray(rankDef.conditions)) {
            for (const condition of rankDef.conditions) {
                let match = false;
                switch (condition.type) {
                    case 'owner_name':
                        if (ownerName && player.nameTag.toLowerCase() === ownerName) match = true;
                        break;
                    case 'admin_tag':
                        if (adminTag && player.hasTag(adminTag)) match = true;
                        break;
                    case 'manual_tag_prefix':
                        // Ensure condition.prefix and rankDef.id are defined. rankDef.id is already lowercased.
                        if (condition.prefix && rankDef.id && player.hasTag(condition.prefix + rankDef.id)) match = true;
                        break;
                    case 'tag':
                        if (condition.tag && player.hasTag(condition.tag)) match = true;
                        break;
                    case 'default': // Fallback condition
                        match = true;
                        break;
                }
                if (match) {
                    return { rankDefinition: rankDef, permissionLevel: rankDef.permissionLevel, rankId: rankDef.id };
                }
            }
        }
    }

    // Fallback to member rank if no other conditions met
    const memberRankDef = sortedRankDefinitions.find(r => r.id === 'member');
    return { rankDefinition: memberRankDef || null, permissionLevel: permissionLevels.member ?? defaultPermissionLevel, rankId: memberRankDef ? 'member' : null };
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
 * Gets the formatted chat prefix, name color, and message color for a player based on their rank.
 * @param {import('@minecraft/server').Player} player - The player.
 * @param {import('../types.js').CommandDependencies} dependencies - Standard dependencies object.
 * @returns {{fullPrefix: string, nameColor: string, messageColor: string}} The chat formatting elements.
 */
export function getPlayerRankFormattedChatElements(player, dependencies) {
    const { rankDefinition } = getPlayerRankAndPermissions(player, dependencies);

    // Use optional chaining and nullish coalescing for robust default handling
    const chatFormatting = rankDefinition?.chatFormatting ?? defaultChatFormatting;
    const prefixText = chatFormatting.prefixText ?? defaultChatFormatting.prefixText ?? ''; // Ensure prefixText is always a string

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
    const { config, playerUtils, getString } = dependencies;
    const playerNameForLog = player?.nameTag ?? player?.id ?? 'UnknownPlayer';

    if (!(player instanceof mc.Player) || !player.isValid()) {
        console.error(`[RankManager.updatePlayerNametag] Invalid player object for ${playerNameForLog}.`);
        return;
    }

    if (!config || typeof config !== 'object') {
        console.error(`[RankManager.updatePlayerNametag] Config object invalid for ${playerNameForLog}. Nametag not updated.`);
        playerUtils?.debugLog(`[RankManager.updatePlayerNametag] Config invalid for ${playerNameForLog}.`, playerNameForLog, dependencies);
        try { if (player.isValid()) player.nameTag = String(player.nameTag || player.name || ''); } catch (e) { /* ignore */ }
        return;
    }

    const vanishedTagToUse = config.vanishedPlayerTag || 'vanished'; // Default vanish tag

    try {
        if (player.hasTag(vanishedTagToUse)) {
            player.nameTag = ''; // Vanished players have no visible nametag
            return;
        }

        const { rankDefinition } = getPlayerRankAndPermissions(player, dependencies);
        const nametagToApply = rankDefinition?.nametagPrefix ?? defaultNametagPrefix;

        // Attempt to derive base name more reliably if current nameTag seems to have a prefix
        let baseName = player.name ?? getString('common.value.player'); // Default to system name
        const currentNameTag = player.nameTag;

        if (currentNameTag && typeof currentNameTag === 'string' && currentNameTag.length > 0) {
            let currentTagSeemsPrefixed = false;
            // Check against all known rank prefixes to strip existing one if present
            for (const def of sortedRankDefinitions) {
                if (def.nametagPrefix && currentNameTag.startsWith(def.nametagPrefix)) {
                    const potentialBase = currentNameTag.substring(def.nametagPrefix.length);
                    if (potentialBase.length > 0) { // Ensure stripping prefix doesn't leave an empty name
                        baseName = potentialBase;
                        currentTagSeemsPrefixed = true;
                    }
                    break;
                }
            }
            // If no known prefix was stripped, but nameTag is different from system name, use nameTag as base.
            // This handles cases where a name might have been set by other means or an unknown prefix.
            if (!currentTagSeemsPrefixed && currentNameTag !== baseName) {
                baseName = currentNameTag;
            }
        }
        // If after all checks baseName is empty (e.g. player.name was empty), default again.
        if (!baseName || baseName.trim() === '') baseName = getString('common.value.player');


        player.nameTag = nametagToApply + baseName;

        if (config.enableDebugLogging && playerUtils) {
            playerUtils.debugLog(`[RankManager.updatePlayerNametag] Updated nametag for ${playerNameForLog} (Original: '${currentNameTag}') to '${player.nameTag}' (Rank: ${rankDefinition?.id ?? 'default'})`, playerNameForLog, dependencies);
        }
    } catch (error) {
        console.error(`[RankManager.updatePlayerNametag] Error for '${playerNameForLog}': ${error.stack || error}`);
        playerUtils?.debugLog(`[RankManager.updatePlayerNametag] Error for ${playerNameForLog}: ${error.message}`, playerNameForLog, dependencies);
        try { if (player.isValid()) player.nameTag = String(player.name ?? getString('common.value.player')); } catch (e) { /* ignore */ }
    }
}

/**
 * Initializes the rank system. This must be called from `main.js` after all dependencies are available.
 * @param {import('../types.js').CommandDependencies} dependencies - Standard dependencies object.
 */
export function initializeRanks(dependencies) {
    initializeRankSystem(dependencies);
}

/**
 * Retrieves a rank definition object by its unique ID.
 * @param {string} rankId - The ID (case-insensitive) of the rank to retrieve.
 * @returns {import('./ranksConfig.js').RankDefinition | undefined} The rank definition object if found, otherwise undefined.
 */
export function getRankById(rankId) {
    if (typeof rankId !== 'string' || !rankId) {
        return undefined;
    }
    const lowerRankId = rankId.toLowerCase(); // Ensure lookup is case-insensitive
    return sortedRankDefinitions.find(rankDef => rankDef.id === lowerRankId); // rankDef.id is already lowercased
}
