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
 * @param {import('../types.js').CommandDependencies} dependencies Standard dependencies object.
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

        // Ensure 'member' level is present if not defined by a specific rank
        if (newPermissionLevels.member === undefined) {
            // Attempt to find a 'member' rank definition to source its permission level
            const memberRankDefinition = sortedRankDefinitions.find(r => r.id === 'member');
            if (memberRankDefinition && typeof memberRankDefinition.permissionLevel === 'number') {
                newPermissionLevels.member = memberRankDefinition.permissionLevel;
            } else {
                // Fallback to defaultPermissionLevel from ranksConfig.js if 'member' rank or its level is missing
                newPermissionLevels.member = defaultPermissionLevel;
                 if (dependencies?.playerUtils && dependencies?.config?.enableDebugLogging) {
                    dependencies.playerUtils.debugLog(`[RankManager] 'member' rank permission level not found in definitions, using defaultPermissionLevel: ${defaultPermissionLevel}`, 'System', dependencies);
                } else {
                    console.warn(`[RankManager] 'member' rank permission level not found in definitions, using defaultPermissionLevel: ${defaultPermissionLevel}`);
                }
            }
        }
        // 'normal' is no longer explicitly managed or aliased here.

        // Ensure owner and admin are present
        if (newPermissionLevels.owner === undefined) {
            const ownerRank = sortedRankDefinitions.find(r => r.id === 'owner');
            newPermissionLevels.owner = ownerRank ? ownerRank.permissionLevel : 0;
        }
        if (newPermissionLevels.admin === undefined) {
            const adminRank = sortedRankDefinitions.find(r => r.id === 'admin');
            newPermissionLevels.admin = adminRank ? adminRank.permissionLevel : 1;
        }


        permissionLevels = Object.freeze(newPermissionLevels);

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
 * @param {import('@minecraft/server').Player} player The player instance.
 * @param {import('../types.js').CommandDependencies} dependencies Standard dependencies object.
 * @returns {{ rankDefinition: object | null, permissionLevel: number, rankId: string | null }}
 *          Object containing matched rank definition, permission level, and rank ID.
 *          Returns default/member level if no specific rank matches.
 */
function getPlayerRankAndPermissions(player, dependencies) {
    // --- BEGIN TOP-LEVEL DEPENDENCIES DIAGNOSTIC ---
    console.warn(`[RankMan][ENTRY] getPlayerRankAndPermissions called for player: ${player?.nameTag || 'UnknownPlayer'}`);
    console.warn(`[RankMan][ENTRY] typeof dependencies: ${typeof dependencies}`);
    try {
        if (dependencies === undefined) {
            console.warn('[RankMan][ENTRY] dependencies is undefined.');
        } else if (dependencies === null) {
            console.warn('[RankMan][ENTRY] dependencies is null.');
        } else {
            // Attempt to log specific parts of dependencies if it's an object
            if (typeof dependencies === 'object') {
                let depsSample = {
                    configExists: Object.prototype.hasOwnProperty.call(dependencies, 'config'),
                    playerUtilsExists: Object.prototype.hasOwnProperty.call(dependencies, 'playerUtils'),
                    configType: typeof dependencies.config,
                    playerUtilsType: typeof dependencies.playerUtils,
                };
                console.warn('[RankMan][ENTRY] dependencies content sample:', JSON.stringify(depsSample));
            } else {
                // If not an object, just try to stringify it directly if possible
                console.warn('[RankMan][ENTRY] dependencies JSON (or string):', JSON.stringify(dependencies));
            }
        }
    } catch (e) {
        console.warn('[RankMan][ENTRY] Error trying to log/stringify dependencies:', e.message);
    }
    // --- END TOP-LEVEL DEPENDENCIES DIAGNOSTIC ---

    // Ensure dependencies and config are what we expect at a basic level
    if (!dependencies || typeof dependencies !== 'object' || dependencies === null) {
        console.error('[RankManager] Critical: Invalid dependencies object passed to getPlayerRankAndPermissions (checked after ENTRY logs). Falling back to default permissions.');
        // Fallback to default permissions if dependencies are totally broken
        const defaultMemberRank = sortedRankDefinitions.find(r => r.id === 'member' && r.permissionLevel === defaultPermissionLevel);
        return {
            rankDefinition: defaultMemberRank || null,
            permissionLevel: defaultPermissionLevel,
            rankId: defaultMemberRank ? 'member' : null,
        };
    }

    const { config, playerUtils } = dependencies;

    // --- BEGIN [RankMan][Detail] LOGS ---
    console.warn(`[RankMan][Detail] After destructuring in getPlayerRankAndPermissions. typeof config: ${typeof config}`);
    console.warn(`[RankMan][Detail] After destructuring. typeof playerUtils: ${typeof playerUtils}`);
    if (config) {
        console.warn('[RankMan][Detail] config is truthy after destructuring.');
    } else {
        console.warn('[RankMan][Detail] config is falsy (undefined, null, etc.) after destructuring.');
    }
    if (playerUtils) {
        console.warn('[RankMan][Detail] playerUtils is truthy after destructuring.');
    } else {
        console.warn('[RankMan][Detail] playerUtils is falsy (undefined, null, etc.) after destructuring.');
    }
    // --- END [RankMan][Detail] LOGS ---

    if (!(player instanceof mc.Player) || !player.isValid()) {
        // Use playerUtils safely after dependencies check
        // Note: config and playerUtils here are from the destructuring above.
        // Their validity is checked by the [Detail] logs and the subsequent [CONSOLE_BLOCK].
        if (playerUtils && typeof playerUtils.debugLog === 'function' && config && typeof config.enableDebugLogging === 'boolean' && config.enableDebugLogging) {
            playerUtils.debugLog('[RankManager] Invalid player object passed to getPlayerRankAndPermissions.', player?.nameTag || 'UnknownSource', dependencies);
        }
        const defaultMemberRank = sortedRankDefinitions.find(r => r.id === 'member' && r.permissionLevel === defaultPermissionLevel);
        return {
            rankDefinition: defaultMemberRank || null,
            permissionLevel: defaultPermissionLevel,
            rankId: defaultMemberRank ? 'member' : null,
        };
    }

    let ownerName = ''; // Default value
    let adminTag = '';  // Default value

    // --- BEGIN DIAGNOSTIC LOGGING for rankManager config issue (using console.warn) ---
    // This entire block is now wrapped in a try-catch to catch errors within the diagnostic logging itself.
    try {
        const diagPlayerName = player?.nameTag || 'UnknownPlayer';
        // Note: typeof dependencies and its sample is logged by [RankMan][ENTRY] logs already.
        // Here we focus on config and playerUtils after they have been destructured at the top of the function.

        // config and playerUtils are from: const { config, playerUtils } = dependencies; (after initial guards for dependencies)

        console.warn(`[RankMan][CONSOLE_BLOCK] typeof config (from function scope): ${typeof config}`);
        if (config && typeof config === 'object' && config !== null) {
            // Attempt to stringify only a few key expected properties of config
            let configSample = "Error sampling config or not an object."; // Default if stringify fails or config is bad
            try {
                configSample = JSON.stringify({
                    ownerPlayerNameExists: Object.prototype.hasOwnProperty.call(config, 'ownerPlayerName'),
                    ownerPlayerNameType: typeof config.ownerPlayerName,
                    adminTagExists: Object.prototype.hasOwnProperty.call(config, 'adminTag'),
                    adminTagType: typeof config.adminTag,
                    prefixExists: Object.prototype.hasOwnProperty.call(config, 'prefix'), // Assuming 'prefix' might exist
                    prefixType: typeof config.prefix,
                    enableDebugLoggingExists: Object.prototype.hasOwnProperty.call(config, 'enableDebugLogging'),
                    enableDebugLoggingType: typeof config.enableDebugLogging,
                }, null, 2);
            } catch(stringifyError){
                // If stringify itself errors (e.g. circular reference within these few properties, though unlikely)
                configSample = `JSON.stringify error for config sample: ${stringifyError.message}`;
            }
            console.warn(`[RankMan][CONSOLE_BLOCK] config properties sample: ${configSample}`);

            // Log individual properties carefully
            console.warn(`[RankMan][CONSOLE_BLOCK] typeof config.ownerPlayerName: ${typeof config.ownerPlayerName}`);
            console.warn(`[RankMan][CONSOLE_BLOCK] config.ownerPlayerName value: "${String(config.ownerPlayerName)}"`);
            console.warn(`[RankMan][CONSOLE_BLOCK] typeof config.adminTag: ${typeof config.adminTag}`);
            console.warn(`[RankMan][CONSOLE_BLOCK] config.adminTag value: "${String(config.adminTag)}"`);
        } else {
            console.warn('[RankMan][CONSOLE_BLOCK] config is not a valid object or is null (from function scope).');
        }

        console.warn(`[RankMan][CONSOLE_BLOCK] typeof playerUtils (from function scope): ${typeof playerUtils}`);
        if(playerUtils && typeof playerUtils === 'object' && playerUtils !== null) {
            console.warn(`[RankMan][CONSOLE_BLOCK] typeof playerUtils.debugLog: ${typeof playerUtils.debugLog}`);
        } else {
            console.warn('[RankMan][CONSOLE_BLOCK] playerUtils is not a valid object or is null (from function scope).');
        }
    } catch (e) {
        console.error(`[RankMan][CONSOLE_ERROR] Error within CONSOLE_BLOCK diagnostic logging: ${e.message}${e.stack ? ('\\nStack: ' + e.stack) : ''}`);
    }
    // --- END DIAGNOSTIC LOGGING ---

    if (config && typeof config === 'object' && config !== null) {
        // Line 103 (approximately, after additions) would be here:
        ownerName = typeof config.ownerPlayerName === 'string' ? config.ownerPlayerName : '';
        adminTag = typeof config.adminTag === 'string' ? config.adminTag : '';
    } else {
        const configType = typeof config;
        const configValPreview = String(config).substring(0, 100); // Increased preview length
        console.warn(`[RankManager] Warning: 'config' in dependencies is not a valid object (type: ${configType}, value: ${configValPreview}). Using default ownerName/adminTag.`);
        if (playerUtils && typeof playerUtils.debugLog === 'function') {
            playerUtils.debugLog(`[RankManager] 'config' in dependencies was not a valid object. Type: ${configType}. Value: ${configValPreview}. Player: ${player?.nameTag || 'N/A'}. Check call stack.`, player?.nameTag || 'UnknownSource', dependencies);
        }
    }

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
 * @param {import('@minecraft/server').Player} player The player.
 * @param {import('../types.js').CommandDependencies} dependencies Standard dependencies object.
 * @returns {number} The player's permission level.
 */
export function getPlayerPermissionLevel(player, dependencies) {
    const { permissionLevel } = getPlayerRankAndPermissions(player, dependencies);
    return permissionLevel;
}

/**
 * Gets the formatted chat prefix, name color, and message color for a player based on their rank.
 * @param {import('@minecraft/server').Player} player The player.
 * @param {import('../types.js').CommandDependencies} dependencies Standard dependencies object.
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
 * @param {import('@minecraft/server').Player} player The player whose nametag to update.
 * @param {import('../types.js').CommandDependencies} dependencies Standard dependencies object.
 */
export function updatePlayerNametag(player, dependencies) {
    console.warn(`[updatePlayerNametag][BEGIN] Function entered for player: ${player?.nameTag || 'UnknownPlayer'}`);

    // --- BEGIN DEPENDENCIES DIAGNOSTIC for updatePlayerNametag ---
    console.warn(`[updatePlayerNametag][Diag] typeof dependencies: ${typeof dependencies}`);
    try {
        if (dependencies === undefined) {
            console.warn('[updatePlayerNametag][Diag] dependencies is undefined.');
        } else if (dependencies === null) {
            console.warn('[updatePlayerNametag][Diag] dependencies is null.');
        } else if (typeof dependencies === 'object') {
            let depsSample = {
                configExists: Object.prototype.hasOwnProperty.call(dependencies, 'config'),
                playerUtilsExists: Object.prototype.hasOwnProperty.call(dependencies, 'playerUtils'),
                configType: typeof dependencies.config,
                playerUtilsType: typeof dependencies.playerUtils,
            };
            console.warn('[updatePlayerNametag][Diag] dependencies content sample:', JSON.stringify(depsSample));
        } else {
            console.warn('[updatePlayerNametag][Diag] dependencies is not an object, undefined, or null. Actual type:', typeof dependencies);
        }
    } catch (e) {
        console.warn('[updatePlayerNametag][Diag] Error trying to log/stringify dependencies:', e.message);
    }
    // --- END DEPENDENCIES DIAGNOSTIC for updatePlayerNametag ---

    if (!dependencies || typeof dependencies !== 'object') {
        console.error(`[RankManager][updatePlayerNametag] Critical: Main dependencies object is invalid (type: ${typeof dependencies}) for player ${player?.nameTag || 'UnknownPlayer'}. Cannot update nametag.`);
        try { if (player && player.isValid()) player.nameTag = player.name; } catch(e) { console.error(`[RankManager][updatePlayerNametag] Error setting fallback nametag (early exit): ${e.message}`); }
        return;
    }

    let config, playerUtils;
    try {
        console.warn('[updatePlayerNametag][PreDestructure] Attempting to destructure config and playerUtils from dependencies.');
        ({ config, playerUtils } = dependencies);
        console.warn(`[updatePlayerNametag][PostDestructure] typeof config: ${typeof config}, typeof playerUtils: ${typeof playerUtils}`);
    } catch (e) {
        console.error(`[updatePlayerNametag][DestructureError] Error destructuring 'config' or 'playerUtils' from dependencies: ${e.message}${e.stack ? '\\nStack:'+e.stack : ''}`);
        try { if (player && player.isValid()) player.nameTag = player.name; } catch(eSafe) { console.error(`[RankManager][updatePlayerNametag] Error setting fallback nametag (destructure fail): ${eSafe.message}`);}
        return;
    }

    if (!config || typeof config !== 'object' || !playerUtils || typeof playerUtils !== 'object') {
        console.error(`[RankManager][updatePlayerNametag] Critical: Destructured 'config' (type: ${typeof config}) or 'playerUtils' (type: ${typeof playerUtils}) is invalid for player ${player?.nameTag || 'UnknownPlayer'}. Cannot update nametag.`);
        try { if (player && player.isValid()) player.nameTag = player.name; } catch(eSafe) { console.error(`[RankManager][updatePlayerNametag] Error setting fallback nametag (post-destructure var check fail): ${eSafe.message}`);}
        return;
    }

    if (!(player instanceof mc.Player) || !player.isValid()) {
        console.error('[RankManager] Invalid player object passed to updatePlayerNametag.');
        return;
    }

    const vanishedTagToUse = config?.vanishedPlayerTag || 'vanished';

    try {
        if (player.hasTag(vanishedTagToUse)) {
            player.nameTag = ''; // Clear nametag if vanished
            return;
        }

        const { rankDefinition } = getPlayerRankAndPermissions(player, dependencies);
        const nametagToApply = rankDefinition?.nametagPrefix ?? defaultNametagPrefix;

        const baseName = player.name;
        player.nameTag = nametagToApply + baseName;

        if (config?.enableDebugLogging && playerUtils?.debugLog) {
            playerUtils.debugLog(`[RankManager] Updated nametag for ${baseName} to '${player.nameTag}' (Rank: ${rankDefinition?.id || 'default'})`, player.name, dependencies);
        }
    } catch (error) {
        let playerNameForError = 'UnknownPlayer';
        try {
            if (player && typeof player.name === 'string') {
                playerNameForError = player.name;
            }
        } catch (nameAccessError) {
        }
        console.error(`[RankManager] Error setting nametag for '${playerNameForError}': ${error.stack || error}`);
        try {
            player.nameTag = typeof player.name === 'string' ? player.name : 'Player';
        } catch (e) { }
    }
}

/**
 * Initializes the rank system. This must be called from `main.js` after all dependencies are available.
 * @param {import('../types.js').CommandDependencies} dependencies Standard dependencies object.
 */
export function initializeRanks(dependencies) {
    initializeRankSystem(dependencies);
}

/**
 * Retrieves a rank definition object by its unique ID.
 * @param {string} rankId - The ID of the rank to retrieve.
 * @returns {import('./ranksConfig.js').RankDefinition | undefined} The rank definition object if found, otherwise undefined.
 */
export function getRankById(rankId) {
    if (!rankId || typeof rankId !== 'string') return undefined;
    return sortedRankDefinitions.find(rankDef => rankDef.id === rankId);
}
