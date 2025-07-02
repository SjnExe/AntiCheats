/**
 * @file Manages player ranks, permission levels, and their display properties (chat/nametag prefixes).
 * Ranks are defined in `ranksConfig.js` and processed here.
 */
import * as mc from '@minecraft/server';
import { rankDefinitions, defaultChatFormatting, defaultNametagPrefix, defaultPermissionLevel } from './ranksConfig.js';

/**
 * @description Dynamically generated mapping of rank IDs to their numeric permission levels.
 * Populated by `initializeRanks`.
 * @export
 * @type {Object.<string, number>}
 */
export let permissionLevels = {};

/**
 * @description Array of rank definitions, sorted by priority.
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
    const { playerUtils, config, getString } = dependencies; // Added getString

    if (rankDefinitions && Array.isArray(rankDefinitions)) {
        sortedRankDefinitions = [...rankDefinitions].sort((a, b) => (a.priority ?? Infinity) - (b.priority ?? Infinity));

        const newPermissionLevels = {};
        for (const rankDef of sortedRankDefinitions) {
            if (rankDef.id && typeof rankDef.permissionLevel === 'number') {
                newPermissionLevels[rankDef.id.toLowerCase()] = rankDef.permissionLevel; // Store keys as lowercase for consistency
            }
        }

        // Ensure 'member' level is present if not defined by a specific rank with id 'member'
        if (newPermissionLevels.member === undefined) {
            const memberRankDefinition = sortedRankDefinitions.find(r => r.id.toLowerCase() === 'member');
            if (memberRankDefinition && typeof memberRankDefinition.permissionLevel === 'number') {
                newPermissionLevels.member = memberRankDefinition.permissionLevel;
            } else {
                newPermissionLevels.member = defaultPermissionLevel; // Fallback from ranksConfig
                const debugMsg = `[RankManager] 'member' rank permission level not found in definitions, using defaultPermissionLevel: ${defaultPermissionLevel}`;
                if (playerUtils && config?.enableDebugLogging) {
                    playerUtils.debugLog(debugMsg, 'System', dependencies);
                } else {
                    console.warn(debugMsg);
                }
            }
        }

        // Ensure owner and admin are present, using their defined levels or a default
        if (newPermissionLevels.owner === undefined) {
            const ownerRank = sortedRankDefinitions.find(r => r.id.toLowerCase() === 'owner');
            newPermissionLevels.owner = ownerRank ? ownerRank.permissionLevel : 0; // Default owner to 0 if not found
        }
        if (newPermissionLevels.admin === undefined) {
            const adminRank = sortedRankDefinitions.find(r => r.id.toLowerCase() === 'admin');
            newPermissionLevels.admin = adminRank ? adminRank.permissionLevel : 1; // Default admin to 1 if not found
        }

        permissionLevels = Object.freeze(newPermissionLevels);

        const logMsg = `[RankManager] Initialized with ${sortedRankDefinitions.length} ranks. PermissionLevels map: ${JSON.stringify(permissionLevels)}`;
        if (playerUtils && config?.enableDebugLogging) {
            playerUtils.debugLog(logMsg, 'System', dependencies);
        } else {
            console.log(logMsg);
        }
    } else {
        console.error('[RankManager] rankDefinitions not found or not an array in ranksConfig.js. Rank system will not function correctly.');
        sortedRankDefinitions = [];
        // Fallback permission levels if rankDefinitions is missing
        permissionLevels = Object.freeze({ owner: 0, admin: 1, member: defaultPermissionLevel });
    }
}

/**
 * Internal helper to get the player's highest priority rank definition and effective permission level.
 * @param {import('@minecraft/server').Player} player - The player instance.
 * @param {import('../types.js').CommandDependencies} dependencies - Standard dependencies object.
 * @returns {{ rankDefinition: import('./ranksConfig.js').RankDefinition | null, permissionLevel: number, rankId: string | null }}
 *          Object containing matched rank definition, permission level, and rank ID.
 *          Returns default/member level if no specific rank matches.
 */
function getPlayerRankAndPermissions(player, dependencies) {
    const { config, playerUtils, getString } = dependencies;

    if (!(player instanceof mc.Player) || !player.isValid()) {
        console.error('[RankManager] Invalid player object passed to getPlayerRankAndPermissions.');
        const defaultMemberRank = sortedRankDefinitions.find(r => r.id.toLowerCase() === 'member');
        return { rankDefinition: defaultMemberRank || null, permissionLevel: permissionLevels.member || defaultPermissionLevel, rankId: 'member' };
    }

    let ownerName = '';
    let adminTag = '';

    if (config && typeof config === 'object') {
        ownerName = typeof config.ownerPlayerName === 'string' ? config.ownerPlayerName : '';
        adminTag = typeof config.adminTag === 'string' ? config.adminTag : '';
    } else {
        const configType = typeof config;
        const configValPreview = String(config).substring(0, 100);
        console.warn(`[RankManager] Warning: 'config' in dependencies is not a valid object (type: ${configType}, value: ${configValPreview}). Using default ownerName/adminTag.`);
        if (playerUtils && typeof playerUtils.debugLog === 'function') {
            playerUtils.debugLog(`[RankManager] 'config' in dependencies was not a valid object. Type: ${configType}. Value: ${configValPreview}. Player: ${player?.nameTag || getString('common.value.notAvailable')}. Check call stack.`, player?.nameTag || 'UnknownSource', dependencies);
        }
    }

    for (const rankDef of sortedRankDefinitions) {
        if (rankDef.conditions && Array.isArray(rankDef.conditions)) {
            for (const condition of rankDef.conditions) {
                let match = false;
                switch (condition.type) {
                    case 'owner_name':
                        if (ownerName && player.nameTag === ownerName) {
                            match = true;
                        }
                        break;
                    case 'admin_tag':
                        if (adminTag && player.hasTag(adminTag)) {
                            match = true;
                        }
                        break;
                    case 'manual_tag_prefix': // This implies a tag like "rank_vip" where "rank_" is prefix
                        if (condition.prefix && player.hasTag(condition.prefix + rankDef.id)) {
                            match = true;
                        }
                        break;
                    case 'tag': // Check for a specific tag as defined in condition.tag
                        if (condition.tag && player.hasTag(condition.tag)) {
                            match = true;
                        }
                        break;
                    case 'default': // Fallback condition, should be on lowest priority ranks
                        match = true;
                        break;
                }
                if (match) {
                    return { rankDefinition: rankDef, permissionLevel: rankDef.permissionLevel, rankId: rankDef.id };
                }
            }
        }
    }

    // Fallback to 'member' rank if no other conditions met
    const memberRankDef = sortedRankDefinitions.find(r => r.id.toLowerCase() === 'member');
    return { rankDefinition: memberRankDef || null, permissionLevel: permissionLevels.member || defaultPermissionLevel, rankId: memberRankDef ? 'member' : null };
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

    const chatFormatting = rankDefinition?.chatFormatting || defaultChatFormatting;
    const prefixText = chatFormatting.prefixText ?? defaultChatFormatting.prefixText ?? ''; // Ensure prefixText is a string

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
    const { config, playerUtils, getString } = dependencies; // Added getString

    if (!(player instanceof mc.Player) || !player.isValid()) {
        console.error('[RankManager] Invalid player object received in updatePlayerNametag.');
        return;
    }

    if (!config || typeof config !== 'object') {
        console.error(`[RankManager] Config object is invalid in updatePlayerNametag for player ${player?.nameTag || 'UnknownPlayer'}. Cannot update nametag.`);
        try {
            if (player.isValid()) {
                player.nameTag = String(player.nameTag || (player.name && typeof player.name === 'string' ? player.name : '') || '');
            }
        } catch (eSafe) { /* Silently try to reset nametag */ }
        return;
    }

    const vanishedTagToUse = config.vanishedPlayerTag || 'vanished'; // Use default if not in config

    try {
        if (player.hasTag(vanishedTagToUse)) {
            player.nameTag = ''; // Clear nametag for vanished players
            return;
        }

        const { rankDefinition } = getPlayerRankAndPermissions(player, dependencies);
        const nametagToApply = rankDefinition?.nametagPrefix ?? defaultNametagPrefix;

        // Determine base name, preferring current nameTag if it doesn't seem to already have a prefix, otherwise player.name
        let baseName = typeof player.name === 'string' ? player.name : getString('common.value.player'); // Fallback base name

        if (player.nameTag && typeof player.nameTag === 'string' && player.nameTag.length > 0) {
            let currentNameTagSeemsPrefixed = false;
            if (sortedRankDefinitions) {
                for (const rankDef of sortedRankDefinitions) {
                    if (rankDef.nametagPrefix && player.nameTag.startsWith(rankDef.nametagPrefix)) {
                        currentNameTagSeemsPrefixed = true;
                        // If current nameTag starts with a known prefix, try to use the part after it as baseName
                        const potentialBaseName = player.nameTag.substring(rankDef.nametagPrefix.length);
                        if (potentialBaseName.length > 0) {
                            baseName = potentialBaseName;
                        } // else, if stripping prefix leaves nothing, baseName remains player.name
                        break;
                    }
                }
            }
            if (!currentNameTagSeemsPrefixed && player.nameTag !== baseName) {
                // If no known prefix was found, but nameTag is different from player.name,
                // it might have an unknown prefix or be custom. Prefer player.name as base.
                // However, if player.name is empty, use the existing nameTag as base.
                baseName = (typeof player.name === 'string' && player.name.length > 0) ? player.name : player.nameTag;
            }
        }

        player.nameTag = nametagToApply + baseName;

        if (config.enableDebugLogging && playerUtils && typeof playerUtils.debugLog === 'function') {
            playerUtils.debugLog(`[RankManager] Updated nametag for ${baseName} (original nameTag: '${String(player.nameTag || player.name)}') to '${player.nameTag}' (Rank: ${rankDefinition?.id || 'default'})`, player.nameTag, dependencies);
        }
    } catch (error) {
        let playerNameForError = getString('common.value.unknownPlayer');
        try {
            if (player && (player.nameTag || player.name)) {
                playerNameForError = String(player.nameTag || player.name);
            }
        } catch (nameAccessError) {
            // Silent catch
        }
        console.error(`[RankManager] Error in updatePlayerNametag for '${playerNameForError}': ${error.message}${error.stack ? `\nStack: ${error.stack}` : ''}`);
        try {
            if (player && player.isValid()) {
                const originalName = String(player.nameTag || (typeof player.name === 'string' ? player.name : getString('common.value.player')));
                player.nameTag = originalName; // Attempt to restore
            }
        } catch (eSafe) { /* Silent fallback */ }
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
 * @param {string} rankId - The ID of the rank to retrieve (case-insensitive).
 * @returns {import('./ranksConfig.js').RankDefinition | undefined} The rank definition object if found, otherwise undefined.
 */
export function getRankById(rankId) {
    if (!rankId || typeof rankId !== 'string') {
        return undefined;
    }
    const lowerRankId = rankId.toLowerCase();
    return sortedRankDefinitions.find(rankDef => rankDef.id.toLowerCase() === lowerRankId);
}
