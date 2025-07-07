/**
 * @file Configuration for all server ranks, their properties, and conditions.
 * Rank IDs should be defined in `camelCase` (e.g., `superAdmin`, `vipPlus`) but will be handled
 * case-insensitively (converted to lowercase) by the RankManager.
 * It's recommended to define IDs in lowercase here for simplicity and directness,
 * as they are effectively treated as such by the manager.
 */

/**
 * @typedef {object} ChatFormatting
 * @property {string} [prefixText=''] - The text part of the rank prefix (e.g., "[Admin] ").
 * @property {string} [prefixColor='§7'] - Minecraft color code for the prefix text (e.g., "§c").
 * @property {string} [nameColor='§7'] - Minecraft color code for the player's name (e.g., "§b").
 * @property {string} [messageColor='§f'] - Minecraft color code for the player's chat message (e.g., "§f").
 */

/**
 * @typedef {object} RankCondition
 * @property {('ownerName'|'adminTag'|'manualTagPrefix'|'tag'|'default')} type - The type of condition (camelCase).
 * - `ownerName`: Matches if player's nameTag equals `config.ownerPlayerName`.
 * - `adminTag`: Matches if player has the tag specified in `config.adminTag`.
 * - `manualTagPrefix`: Matches if player has a tag like `prefix` + `rankId` (e.g., 'rank_vip').
 * - `tag`: Matches if player has the specified `tag` string.
 * - `default`: A fallback condition, usually for the 'member' rank.
 * @property {string} [prefix] - Required if type is 'manualTagPrefix'. The prefix for the rank tag (e.g., 'rank_').
 * @property {string} [tag] - Required if type is 'tag'. The specific tag to check for.
 */

/**
 * @typedef {object} RankDefinition
 * @property {string} id - Unique identifier for the rank (e.g., 'owner', 'admin', 'vip').
 * Should be `camelCase` or `lowercase`. It will be processed as lowercase by RankManager.
 * @property {string} name - Display name for the rank (e.g., "Owner", "Administrator").
 * @property {number} permissionLevel - Numeric permission level. Lower is higher privilege (0 = Owner).
 * @property {ChatFormatting} [chatFormatting] - Optional chat formatting overrides.
 * @property {string} [nametagPrefix] - Optional nametag prefix override (e.g., '§cOwner §f\n').
 * @property {RankCondition[]} conditions - Conditions for this rank.
 * @property {number} priority - Determines precedence if multiple conditions match (lower number = higher priority).
 * @property {number} [assignableBy] - Optional. Permission level required to assign/remove this rank.
 */

/**
 * Default chat formatting.
 *
 * @type {Required<ChatFormatting>}
 */
export const defaultChatFormatting = {
    prefixText: '§7[Member] ',
    prefixColor: '§7', // Grey
    nameColor: '§7',   // Grey
    messageColor: '§f', // White
};

/**
 * Default nametag prefix.
 *
 * @type {string}
 */
export const defaultNametagPrefix = '§7Member §f\n'; // Example: "§7Member §f\nPlayerName"

/**
 * Default permission level for players not matching any specific rank.
 * Convention: Higher number = less privilege.
 *
 * @type {number}
 */
export const defaultPermissionLevel = 1024;

/**
 * Array of all rank definitions.
 * Ensure `id` properties are lowercase for consistent lookup by RankManager (which converts to lowercase).
 * `priority` is crucial: lower numbers are checked first and take precedence.
 *
 * @type {RankDefinition[]}
 */
export const rankDefinitions = [
    {
        id: 'owner', // lowercase, as handled by RankManager
        name: 'Owner',
        permissionLevel: 0, // Highest permission
        chatFormatting: {
            prefixText: '§c[Owner] ',
            prefixColor: '§c', // Red
            nameColor: '§c',   // Red
            messageColor: '§f', // White
        },
        nametagPrefix: '§cOwner §f\n',
        conditions: [
            { type: 'ownerName' }, // Relies on config.ownerPlayerName
        ],
        priority: 0, // Highest
    },
    {
        id: 'admin', // lowercase
        name: 'Admin',
        permissionLevel: 1,
        chatFormatting: {
            prefixText: '§b[Admin] ',
            prefixColor: '§b', // Aqua
            nameColor: '§b',   // Aqua
            messageColor: '§f', // White
        },
        nametagPrefix: '§bAdmin §f\n',
        conditions: [
            { type: 'adminTag' }, // Relies on config.adminTag
        ],
        priority: 10,
        assignableBy: 0, // Only Owner can assign/remove Admin by default
    },
    {
        id: 'member', // lowercase, Default/Fallback rank
        name: 'Member',
        permissionLevel: defaultPermissionLevel,
        chatFormatting: defaultChatFormatting, // Uses the exported default object
        nametagPrefix: defaultNametagPrefix,   // Uses the exported default object
        conditions: [
            { type: 'default' }, // This should always be last or have the highest priority number
        ],
        priority: 1000, // Lowest priority
    },
];
