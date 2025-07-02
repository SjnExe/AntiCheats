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
    const { playerUtils, config } = dependencies;

    if (Array.isArray(rankDefinitions)) {
        sortedRankDefinitions = [...rankDefinitions].sort((a, b) => (a.priority ?? Infinity) - (b.priority ?? Infinity));

        const newPermissionLevels = {};
        for (const rankDef of sortedRankDefinitions) {
            if (rankDef.id && typeof rankDef.permissionLevel === 'number') {
                newPermissionLevels[rankDef.id.toLowerCase()] = rankDef.permissionLevel;
            }
        }

        const memberRankDefinition = sortedRankDefinitions.find(r => r.id.toLowerCase() === 'member');
        newPermissionLevels.member ??= memberRankDefinition?.permissionLevel ?? defaultPermissionLevel;
        if (newPermissionLevels.member === defaultPermissionLevel && !memberRankDefinition) {
            const debugMsg = `[RankManager] 'member' rank permission level not found, using default: ${defaultPermissionLevel}`;
            playerUtils?.debugLog(debugMsg, null, dependencies) || console.warn(debugMsg);
        }

        const ownerRank = sortedRankDefinitions.find(r => r.id.toLowerCase() === 'owner');
        newPermissionLevels.owner ??= ownerRank?.permissionLevel ?? 0;

        const adminRank = sortedRankDefinitions.find(r => r.id.toLowerCase() === 'admin');
        newPermissionLevels.admin ??= adminRank?.permissionLevel ?? 1;

        permissionLevels = Object.freeze(newPermissionLevels);

        const logMsg = `[RankManager] Initialized with ${sortedRankDefinitions.length} ranks. PermissionLevels map: ${JSON.stringify(permissionLevels)}`;
        playerUtils?.debugLog(logMsg, null, dependencies) || console.log(logMsg);
    } else {
        console.error('[RankManager] rankDefinitions not found or not an array in ranksConfig.js. Rank system will not function correctly.');
        sortedRankDefinitions = [];
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
        const errorMsg = '[RankManager] Invalid player object passed to getPlayerRankAndPermissions.';
        console.error(errorMsg);
        playerUtils?.debugLog(errorMsg, null, dependencies);
        const defaultMemberRank = sortedRankDefinitions.find(r => r.id.toLowerCase() === 'member');
        return { rankDefinition: defaultMemberRank || null, permissionLevel: permissionLevels.member ?? defaultPermissionLevel, rankId: 'member' };
    }

    let ownerName = '';
    let adminTag = '';

    if (config && typeof config === 'object') {
        ownerName = config.ownerPlayerName ?? '';
        adminTag = config.adminTag ?? '';
    } else {
        const configType = typeof config;
        const configValPreview = String(config).substring(0, 100);
        const errorMsg = `[RankManager] Warning: 'config' in dependencies is not a valid object (type: ${configType}, value: ${configValPreview}). Using default ownerName/adminTag.`;
        console.warn(errorMsg);
        playerUtils?.debugLog(`${errorMsg} Player: ${player?.nameTag ?? getString('common.value.notAvailable')}.`, player?.nameTag || null, dependencies);
    }

    for (const rankDef of sortedRankDefinitions) {
        if (Array.isArray(rankDef.conditions)) {
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

    const memberRankDef = sortedRankDefinitions.find(r => r.id.toLowerCase() === 'member');
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

    const chatFormatting = rankDefinition?.chatFormatting ?? defaultChatFormatting;
    const prefixText = chatFormatting.prefixText ?? defaultChatFormatting.prefixText ?? '';

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

    if (!(player instanceof mc.Player) || !player.isValid()) {
        console.error('[RankManager] Invalid player object received in updatePlayerNametag.');
        return;
    }

    if (!config || typeof config !== 'object') {
        const errorMsg = `[RankManager] Config object is invalid in updatePlayerNametag for player ${player?.nameTag ?? 'UnknownPlayer'}. Cannot update nametag.`;
        console.error(errorMsg);
        playerUtils?.debugLog(errorMsg, player?.nameTag || null, dependencies);
        try {
            if (player.isValid()) {
                player.nameTag = String(player.nameTag || player.name || '');
            }
        } catch (eSafe) { /* ignore */ }
        return;
    }

    const vanishedTagToUse = config.vanishedPlayerTag || 'vanished';

    try {
        if (player.hasTag(vanishedTagToUse)) {
            player.nameTag = '';
            return;
        }

        const { rankDefinition } = getPlayerRankAndPermissions(player, dependencies);
        const nametagToApply = rankDefinition?.nametagPrefix ?? defaultNametagPrefix;

        let baseName = player.name ?? getString('common.value.player');
        if (player.nameTag && typeof player.nameTag === 'string' && player.nameTag.length > 0) {
            let currentNameTagSeemsPrefixed = false;
            if (Array.isArray(sortedRankDefinitions)) {
                for (const rankDef of sortedRankDefinitions) {
                    if (rankDef.nametagPrefix && player.nameTag.startsWith(rankDef.nametagPrefix)) {
                        currentNameTagSeemsPrefixed = true;
                        const potentialBaseName = player.nameTag.substring(rankDef.nametagPrefix.length);
                        if (potentialBaseName.length > 0) baseName = potentialBaseName;
                        break;
                    }
                }
            }
            if (!currentNameTagSeemsPrefixed && player.nameTag !== baseName) {
                baseName = (player.name && player.name.length > 0) ? player.name : player.nameTag;
            }
        }

        player.nameTag = nametagToApply + baseName;

        if (config.enableDebugLogging && playerUtils) {
            playerUtils.debugLog(`[RankManager] Updated nametag for ${baseName} (original nameTag: '${String(player.nameTag || player.name)}') to '${player.nameTag}' (Rank: ${rankDefinition?.id || 'default'})`, player.nameTag, dependencies);
        }
    } catch (error) {
        const errorMsg = error.stack || error;
        const playerNameForError = player?.nameTag ?? player?.name ?? getString('common.value.unknownPlayer');
        console.error(`[RankManager] Error in updatePlayerNametag for '${playerNameForError}': ${errorMsg}`);
        playerUtils?.debugLog(`Error in updatePlayerNametag for ${playerNameForError}: ${error.message}`, playerNameForError, dependencies);
        try {
            if (player.isValid()) {
                player.nameTag = String(player.name ?? getString('common.value.player'));
            }
        } catch (eSafe) { /* ignore */ }
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
    if (typeof rankId !== 'string' || !rankId) {
        return undefined;
    }
    const lowerRankId = rankId.toLowerCase();
    return sortedRankDefinitions.find(rankDef => rankDef.id.toLowerCase() === lowerRankId);
}
