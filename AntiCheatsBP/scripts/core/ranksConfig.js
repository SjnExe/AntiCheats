/**
 * @file Configuration for all server ranks, their properties, and conditions.
 */

/**
 * @typedef {object} ChatFormatting
 * @property {string} [prefixText=''] - The text part of the rank prefix.
 * @property {string} [prefixColor='§7'] - Minecraft color code for the prefix text.
 * @property {string} [nameColor='§7'] - Minecraft color code for the player's name.
 * @property {string} [messageColor='§f'] - Minecraft color code for the player's chat message.
 */

/**
 * @typedef {object} RankCondition
 * @property {('owner_name'|'admin_tag'|'manual_tag_prefix'|'tag'|'default')} type - The type of condition.
 * @property {string} [prefix] - Required if type is 'manual_tag_prefix'. The prefix for the rank tag (e.g., 'rank_').
 * @property {string} [tag] - Required if type is 'tag'. The specific tag to check for.
 */

/**
 * @typedef {object} RankDefinition
 * @property {string} id - Unique identifier for the rank (e.g., 'owner', 'admin', 'vip'). Should be lowercase.
 * @property {string} name - Display name for the rank (e.g., "Owner", "Administrator").
 * @property {number} permissionLevel - Numeric permission level associated with this rank. Lower is higher privilege. (0 = Owner, 1 = Admin, etc.).
 * @property {ChatFormatting} [chatFormatting] - Optional chat formatting overrides for this rank.
 * @property {string} [nametagPrefix] - Optional nametag prefix override for this rank (e.g., '§cOwner §f'). Include newline if desired.
 * @property {RankCondition[]} conditions - An array of conditions that a player must meet to be assigned this rank.
 * @property {number} priority - Determines which rank applies if a player meets conditions for multiple ranks (lower number = higher priority).
 * @property {number} [assignableBy] - Optional. The permission level required to assign/remove this rank via commands.
 */

/**
 * Default chat formatting for players who don't match any specific rank
 * or for ranks that don't override all formatting options.
 * @type {Required<ChatFormatting>}
 */
export const defaultChatFormatting = {
    prefixText: '§7[Member] ',
    prefixColor: '§7',
    nameColor: '§7',
    messageColor: '§f',
};

/**
 * Default nametag prefix for players.
 * @type {string}
 */
export const defaultNametagPrefix = '§7Member §f\n'; // Added space and newline for better default appearance

/**
 * Default permission level for players not matching any rank with specific conditions.
 * This numeric value should correspond to a "default" or "member" rank defined below.
 * Convention: Higher number means less privilege.
 * @type {number}
 */
export const defaultPermissionLevel = 1024;

/**
 * Array of all rank definitions for the server.
 * Ensure `id` properties are lowercase for consistent lookups.
 * `priority` is crucial: lower numbers are checked first and take precedence.
 * @type {RankDefinition[]}
 */
export const rankDefinitions = [
    {
        id: 'owner', // lowercase id
        name: 'Owner',
        permissionLevel: 0, // Highest permission
        chatFormatting: {
            prefixText: '§c[Owner] ',
            prefixColor: '§c',
            nameColor: '§c',
            messageColor: '§f',
        },
        nametagPrefix: '§cOwner §f\n', // Added space and newline
        conditions: [
            { type: 'owner_name' }, // This condition type relies on config.ownerPlayerName
        ],
        priority: 0, // Highest priority
    },
    {
        id: 'admin', // lowercase id
        name: 'Admin',
        permissionLevel: 1,
        chatFormatting: {
            prefixText: '§b[Admin] ',
            prefixColor: '§b',
            nameColor: '§b',
            messageColor: '§f',
        },
        nametagPrefix: '§bAdmin §f\n', // Added space and newline
        conditions: [
            { type: 'admin_tag' }, // This condition type relies on config.adminTag
        ],
        priority: 10,
        assignableBy: 0, // Only owner can assign/remove admin rank by default
    },
    // Example VIP rank (you can add more ranks like this)
    // {
    //     id: 'vip',
    //     name: 'VIP',
    //     permissionLevel: 500,
    //     chatFormatting: {
    //         prefixText: '§e[VIP] ',
    //         prefixColor: '§e',
    //         nameColor: '§e',
    //         messageColor: '§f',
    //     },
    //     nametagPrefix: '§eVIP §f\n',
    //     conditions: [
    //         { type: 'tag', tag: 'vip_rank_tag' }, // Player must have the 'vip_rank_tag'
    //         // Or use: { type: 'manual_tag_prefix', prefix: 'rank_' } // checks for 'rank_vip'
    //     ],
    //     priority: 100,
    //     assignableBy: 1, // Admins or higher can assign/remove VIP
    // },
    {
        id: 'member', // lowercase id, Default/Fallback rank
        name: 'Member',
        permissionLevel: defaultPermissionLevel, // Use the exported default
        chatFormatting: defaultChatFormatting, // Use the exported default object
        nametagPrefix: defaultNametagPrefix,   // Use the exported default object
        conditions: [
            { type: 'default' }, // This condition should always be last or have the highest priority number
        ],
        priority: 1000, // Lowest priority (higher number)
    },
];
