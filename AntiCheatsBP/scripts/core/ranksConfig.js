/**
 * @file Configuration for server ranks, properties, and conditions.
 * @module AntiCheatsBP/scripts/core/ranksConfig
 */

/**
 * @typedef {object} ChatFormatting
 * @property {string} [prefixText=''] The text part of the rank prefix.
 * @property {string} [nameColor='§7'] The color code for the player's name.
 * @property {string} [messageColor='§f'] The color code for the player's chat message.
 */

/**
 * @typedef {object} RankCondition
 * @property {('ownerName'|'adminTag'|'manualTagPrefix'|'tag'|'default')} type The type of condition.
 * @property {string} [prefix] The prefix for the rank tag (for 'manualTagPrefix').
 * @property {string} [tag] The specific tag to check for (for 'tag').
 */

/**
 * @typedef {object} RankDefinition
 * @property {string} id Unique identifier for the rank.
 * @property {string} name Display name for the rank.
 * @property {number} permissionLevel Numeric permission level (lower is higher).
 * @property {ChatFormatting} [chatFormatting] Optional chat formatting overrides.
 * @property {string} [nametagPrefix] Optional nametag prefix override.
 * @property {RankCondition[]} conditions Conditions for this rank.
 * @property {number} [assignableBy] Permission level required to assign/remove this rank.
 */

/**
 * Default chat formatting.
 * @type {Required<ChatFormatting>}
 */
export const defaultChatFormatting = {
    prefixText: '§8[§7Member§8] ',
    nameColor: '§7',   // Grey
    messageColor: '§f', // White
};

/**
 * Default nametag prefix.
 * @type {string}
 */
export const defaultNametagPrefix = '§7Member §f\n'; // Example: "§7Member §f\nPlayerName"

/**
 * Default permission level for players not matching any specific rank.
 * Convention: Higher number = less privilege.
 * @type {number}
 */
export const defaultPermissionLevel = 1024;

/**
 * Array of all rank definitions.
 * Ensure `id` properties are lowercase for consistent lookup by RankManager (which converts to lowercase).
 * `priority` is crucial: lower numbers are checked first and take precedence.
 * @type {RankDefinition[]}
 */
export const rankDefinitions = [
    {
        id: 'owner', // lowercase, as handled by RankManager
        name: 'Owner',
        priority: 0, // The lowest number, checked first.
        permissionLevel: 0, // Highest permission
        chatFormatting: {
            prefixText: '§8[§cOwner§8] ',
            nameColor: '§c',   // Red
            messageColor: '§f', // White
        },
        nametagPrefix: '§cOwner §f\n',
        conditions: [
            { type: 'ownerName' }, // Relies on config.ownerPlayerName
        ],
    },
    {
        id: 'admin', // lowercase
        name: 'Admin',
        priority: 10,
        permissionLevel: 1,
        chatFormatting: {
            prefixText: '§8[§bAdmin§8] ',
            nameColor: '§b',   // Aqua
            messageColor: '§f', // White
        },
        nametagPrefix: '§bAdmin §f\n',
        conditions: [
            { type: 'adminTag' }, // Relies on config.adminTag
        ],
        assignableBy: 0, // Only Owner can assign/remove Admin by default
    },
    {
        id: 'member', // lowercase, Default/Fallback rank
        name: 'Member',
        priority: 1000, // The highest number, checked last.
        permissionLevel: defaultPermissionLevel,
        chatFormatting: defaultChatFormatting, // Uses the exported default object
        nametagPrefix: defaultNametagPrefix,   // Uses the exported default object
        conditions: [
            { type: 'default' }, // This should always be last or have the highest priority number
        ],
    },
];
